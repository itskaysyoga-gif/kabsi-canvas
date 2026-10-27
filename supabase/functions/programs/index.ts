// programs (master plan 30.17 section 1, 29.3, 30.15 section 5): the server side of /founding and /partners.
// Public, no JWT (verify_jwt off): every write passes Turnstile and a rate limit, and the database functions it calls
// are open to the service role only, so a browser never writes a table directly (plan 2.3).
//   GET  /programs/founding   the real number of Founding 25 places left, with the mix (cached 5 minutes)
//   POST /programs/founding   a Founding 25 application
//   GET  /programs/partners   the Founding Partner places left (the first 20 approved)
//   POST /programs/partners   a Kabsi Partners application ("Apply by email" on /partners; WhatsApp is PA2)
// Staff alerts on WhatsApp (R-64) tell Rashid a new application is waiting; the staff page decides.
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, fail, json, log, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { staffAlert } from "../_shared/billing.ts";
import { checkFounding, checkPartner } from "../_shared/programs.ts";

const CACHE = { "cache-control": "public, max-age=300" };

async function count(fn: "founding_places" | "partner_places"): Promise<Response> {
  const { data, error } = await admin().rpc(fn);
  if (error || !data) return json({ error: "unavailable" }, 503);
  return json(data, 200, CACHE);
}

// Sec 1: the limits fail closed: a limiter outage stops applications (the insert would fail anyway) and the staff alert.
async function gate(req: Request, body: Record<string, unknown>, what: string): Promise<Response | null> {
  const ip = clientIp(req);
  const visitor = await sha256Hex(`programs:${ip}`);
  if (!(await rateLimit(`programs:${what}:${visitor}`, 5, 3600, { failClosed: true }))) return fail("slow_down", "Please wait a little and try again.", 429);
  if (!(await rateLimit(`programs:${what}:all`, 300, 86400, { failClosed: true }))) return fail("busy", "Applications are busy right now. Please try again tomorrow.", 503);
  if (!(await verifyTurnstile(typeof body.turnstile === "string" ? body.turnstile : undefined, ip))) {
    return fail("challenge_failed", "Please complete the check and try again.", 400);
  }
  return null;
}

const known = (e: { message?: string } | null, code: string) => !!e?.message && e.message.includes(code);

async function applyFounding(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const stop = await gate(req, body, "founding");
  if (stop) return stop;
  const c = checkFounding(body);
  if (!c.ok) return json({ error: "bad_request", field: c.field, message: c.message }, 400);
  const { data, error } = await admin().rpc("founding_apply", { p: c.value });
  if (known(error, "already_applied")) return fail("already_applied", "We already have an application from this WhatsApp number. We answer within 2 working days.", 409);
  if (error) {
    await captureError("programs", error, { step: "founding_apply" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  log("programs", { ok: true, op: "founding_apply", trade: c.value.trade, country: c.value.country });
  await staffAlert(`New Founding 25 application: ${c.value.business_name} (${c.value.country}, ${c.value.business_kind})`, `f25:${data}`)
    .catch((e) => captureError("programs", e, { step: "founding_alert" }));
  return json({ ok: true });
}

async function applyPartner(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const stop = await gate(req, body, "partners");
  if (stop) return stop;
  const c = checkPartner(body);
  if (!c.ok) return json({ error: "bad_request", field: c.field, message: c.message }, 400);
  const { data, error } = await admin().rpc("partner_apply", { p: c.value });
  if (known(error, "already_applied")) return fail("already_applied", "We already have your application. We answer within 2 working days.", 409);
  if (known(error, "reapply_later")) return fail("reapply_later", "You can apply again 90 days after the last answer.", 409);
  if (error) {
    await captureError("programs", error, { step: "partner_apply" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  log("programs", { ok: true, op: "partner_apply", kind: c.value.kind });
  await staffAlert(`New Kabsi Partners application: ${c.value.name} (${c.value.kind})`, `partner:${data}`)
    .catch((e) => captureError("programs", e, { step: "partner_alert" }));
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  const founding = path.endsWith("/founding");
  const partners = path.endsWith("/partners");
  if (!founding && !partners) return json({ error: "not_found" }, 404);
  if (req.method === "GET") return await count(founding ? "founding_places" : "partner_places");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  return founding ? await applyFounding(req) : await applyPartner(req);
});
