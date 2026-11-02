/**
 * System 6.9 build gallery.
 * GET  /api/builds  -> approved builds only (newest first)
 * POST /api/builds  -> submit a build; it waits in a pending queue until approved.
 * Store: SYSTEM69_WAITLIST KV, keys build:pending:<id> and build:ok:<id>.
 * Same-origin only (no CORS headers). Photos are links, never uploaded here.
 */
import { validateBuild, json, isJson, ipHash, MAX_PENDING, RATE_PER_HOUR } from "../_lib/builds.js";

export async function onRequestGet(context) {
  const kv = context.env.SYSTEM69_WAITLIST;
  if (!kv) return json(500, { error: "Store not configured." });
  const list = await kv.list({ prefix: "build:ok:", limit: 100 });
  const rows = [];
  for (const k of list.keys) {
    const raw = await kv.get(k.name);
    if (!raw) continue;
    try {
      const b = JSON.parse(raw);
      rows.push({ id: b.id, name: b.name, by: b.by, image: b.image, parts: b.parts, other: b.other, notes: b.notes, approved_at: b.approved_at });
    } catch {}
  }
  rows.sort((a, b) => String(b.approved_at).localeCompare(String(a.approved_at)));
  return json(200, { builds: rows });
}

export async function onRequestPost(context) {
  const kv = context.env.SYSTEM69_WAITLIST;
  if (!kv) return json(500, { error: "Store not configured." });

  // JSON only, so a cross-site form post can't skip the browser preflight.
  if (!isJson(context.request)) return json(415, { error: "Send JSON." });
  let p;
  try {
    p = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  // Honeypot: the hidden "company" field is only filled by bots.
  if (String(p?.company || "").trim()) return json(400, { error: "Could not submit." });

  const v = validateBuild(p);
  if (v.error) return json(400, { error: v.error });

  // Rate limit: a few submissions per IP per hour.
  const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";
  const hour = new Date().toISOString().slice(0, 13);
  const rlKey = `rl:builds:${await ipHash(ip)}:${hour}`;
  const count = Number((await kv.get(rlKey)) || 0);
  if (count >= RATE_PER_HOUR) return json(429, { error: "Too many submissions. Try again in an hour." });
  await kv.put(rlKey, String(count + 1), { expirationTtl: 7200 });

  // Keep the queue bounded so nobody can fill the store.
  const pending = await kv.list({ prefix: "build:pending:", limit: MAX_PENDING });
  if (pending.keys.length >= MAX_PENDING) return json(503, { error: "The review queue is full. Try again later." });

  const id = crypto.randomUUID();
  const record = { id, ...v.build, status: "pending", at: new Date().toISOString() };
  await kv.put(`build:pending:${id}`, JSON.stringify(record));
  return json(200, { message: "Thanks. Your build is in the review queue and shows here once it's approved." });
}
