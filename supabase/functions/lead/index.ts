// lead: a business enquiry form (no page sends it today). Partner applications are retired (K-127, P0.8-01);
// Kabsi Partners applications arrive with P0.8-12 as their own rows, not leads.
// POST { kind: "business", name, email, instagram?, country?, volume?, message?, website? }
// `website` is a honeypot: humans never fill it. Rate limit uses a daily-salted hash, never the raw IP.
import { admin, captureError, CORS, esc, fail, json, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { notify } from "../_shared/notify.ts";
import * as copy from "../_shared/email/copy.ts";

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

  const b = await req.json().catch(() => ({})) as Record<string, string | undefined>;
  if (b.website) return json({ ok: true }); // bot: pretend success

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const day = new Date().toISOString().slice(0, 10);
  if (!(await rateLimit(`lead:${await sha256Hex(`${ip}|${day}`)}`, 5, 3600))) {
    return fail("rate_limited", "Too many requests. Try again later.", 429);
  }

  if (!(await verifyTurnstile(b.turnstile, ip))) return fail("challenge_failed", "Please complete the check and try again.", 400);

  const name = (b.name ?? "").trim().slice(0, 120);
  const email = (b.email ?? "").trim().toLowerCase().slice(0, 254);
  if (!name || !EMAIL_RE.test(email)) return fail("bad_input", "Please enter your name and a valid email.");
  if (b.kind !== "business") return fail("bad_input", "Write to hello@kabsi.co instead.");
  const kind = "business";
  const row = {
    kind, name, email,
    instagram: b.instagram?.trim().slice(0, 80) || null,
    country: b.country?.trim().slice(0, 60) || null,
    volume: b.volume?.trim().slice(0, 60) || null,
    message: b.message?.trim().slice(0, 2000) || null,
  };

  try {
    const { data, error } = await admin().from("leads").insert(row).select("id").single();
    if (error) throw error;
    const lines = Object.entries(row).filter(([, v]) => v).map(([k, v]) => `<p style="margin:0 0 6px 0;"><strong>${esc(k)}:</strong> ${esc(String(v))}</p>`).join("");
    await notify({
      category: "internal", kind: "lead_alert", key: `lead:${data.id}`, to: [{ email: "hello@kabsi.co", userId: null }],
      content: copy.leadAlert(kind, name, email, lines, Object.entries(row).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")),
    }).catch((e) => captureError("lead", e));
    return json({ ok: true });
  } catch (e) {
    await captureError("lead", e);
    return fail("internal", "Something went wrong. Email hello@kabsi.co instead.", 500);
  }
});
