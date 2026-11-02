/**
 * System 6.9 update list: stores emails in Cloudflare KV (SYSTEM69_WAITLIST).
 */
function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Optional intent fields from the signup form. Anything else is dropped.
const USE = ["Foil", "Wake / skim", "Snow / sled", "Skate", "Not sure yet"];
const WANT = ["guide", "builds", "contribute"];

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
    },
  });
}

export async function onRequestPost(context) {
  const kv = context.env.SYSTEM69_WAITLIST;
  if (!kv) {
    return json(500, { error: "Waitlist store not configured." });
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  // Honeypot: the hidden "company" field is only filled by bots.
  if (String(payload?.company || "").trim()) {
    return json(400, { error: "Could not sign up." });
  }

  const email = String(payload?.email || "").trim().toLowerCase();
  const source = String(payload?.source || "").slice(0, 120);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: "Enter a valid email." });
  }
  if (email.length > 200) {
    return json(400, { error: "Email too long." });
  }

  const key = `email:${email}`;
  const existing = await kv.get(key);
  const now = new Date().toISOString();
  let prev = null;
  if (existing) {
    try {
      prev = JSON.parse(existing);
    } catch {
      prev = null;
    }
  }
  const use = USE.includes(payload?.use) ? payload.use : (prev && prev.use) || "";
  const want = WANT.includes(payload?.want) ? payload.want : (prev && prev.want) || "";
  const record = {
    email,
    source: source || "unknown",
    use,
    want,
    status: "pending",
    // Keep the first signup time; repeat signups only bump updated_at.
    at: (prev && prev.at) || now,
    updated_at: now,
    updated: Boolean(existing),
  };
  await kv.put(key, JSON.stringify(record));

  const merch = source.startsWith("merch:");
  return json(200, {
    message: existing
      ? merch
        ? "You’re already on the merch waitlist — we’ll email when it drops."
        : "You’re already on the list — we’ll be in touch."
      : merch
        ? "You’re on the list for when this merch drops. No charge — we’ll email you."
        : "You’re on the list. We’ll be in touch.",
  });
}
