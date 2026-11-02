/**
 * Moderation for /builds. Needs header "Authorization: Bearer <BUILDS_ADMIN_TOKEN>".
 * The maintainer sets the token as an encrypted Pages environment variable; until it's set, every call returns 503.
 * GET  /api/builds-admin                       -> pending builds
 * POST /api/builds-admin {action, id}          -> action "approve" or "reject"
 */
import { json } from "../_lib/builds.js";

async function same(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(a)), crypto.subtle.digest("SHA-256", enc.encode(b))]);
  const ax = new Uint8Array(x), ay = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < ax.length; i++) d |= ax[i] ^ ay[i];
  return d === 0;
}

async function authorize(context) {
  const token = context.env.BUILDS_ADMIN_TOKEN;
  if (!token || String(token).length < 24) return json(503, { error: "Moderation is not set up." });
  const h = context.request.headers.get("Authorization") || "";
  const given = h.startsWith("Bearer ") ? h.slice(7) : "";
  if (!given || !(await same(given, String(token)))) return json(401, { error: "Not allowed." });
  return null;
}

export async function onRequestGet(context) {
  const deny = await authorize(context);
  if (deny) return deny;
  const kv = context.env.SYSTEM69_WAITLIST;
  const list = await kv.list({ prefix: "build:pending:", limit: 200 });
  const rows = [];
  for (const k of list.keys) {
    const raw = await kv.get(k.name);
    if (raw) {
      try { rows.push(JSON.parse(raw)); } catch {}
    }
  }
  return json(200, { pending: rows });
}

export async function onRequestPost(context) {
  const deny = await authorize(context);
  if (deny) return deny;
  const kv = context.env.SYSTEM69_WAITLIST;
  let p;
  try {
    p = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const id = String(p?.id || "");
  if (!/^[0-9a-f-]{36}$/.test(id)) return json(400, { error: "Bad id." });
  const key = `build:pending:${id}`;
  const raw = await kv.get(key);
  if (!raw) return json(404, { error: "Not in the queue." });
  if (p?.action === "approve") {
    const b = JSON.parse(raw);
    b.status = "approved";
    b.approved_at = new Date().toISOString();
    await kv.put(`build:ok:${id}`, JSON.stringify(b));
    await kv.delete(key);
    return json(200, { ok: true, approved: id });
  }
  if (p?.action === "reject") {
    await kv.delete(key);
    return json(200, { ok: true, rejected: id });
  }
  return json(400, { error: "Action must be approve or reject." });
}
