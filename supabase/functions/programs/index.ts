// programs (master plan 30.17 section 1, 29.3, 30.15 section 5): the server side of /founding and /partners.
// Public, no JWT (verify_jwt off): every write passes Turnstile and a rate limit, and the database functions it calls
// are open to the service role only, so a browser never writes a table directly (plan 2.3).
//   GET  /programs/founding (header x-founding-invite: SLUG)   the real number of Founding 25 places left, with the mix; only with the private
//                             invite slug (Founding 1, R-151), else 404; never cached, so a rotated slug stops at once
//   POST /programs/founding   a Founding 25 application; the body carries the same invite, else 404
//   GET  /programs/partners   the Founding Partner places left (the first 20 reviewed)
//   POST /programs/partners   the old partner application: gone (Partners 2, 30.50 item 4); 308 to kabsi.co/partners/join
// Partners 2 (30.50 items 4 to 7, 30.51 item 6), the signed-in partner (the session is read from the bearer token):
//   POST /programs/partners/join     { name, email, kind, country, reach, uae_permit | uae_private, terms } -> { code }
//   GET  /programs/partner           the partner home: link code, numbers from the one ledger, payout method (last 4)
//   POST /programs/partner/payout    { method, detail } -> a fresh confirm on the partner's WhatsApp, or an email code
//   POST /programs/partner/payout/confirm { id, code }  the email code
//   POST /programs/partner/visit     { code } a visit through a partner link (public, limited per visitor)
// Staff alerts on WhatsApp (R-64) tell Rashid a new application is waiting or a partner joined.
import { serve } from "../_shared/kabsi.ts";
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, fail, json, log, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { staffAlert } from "../_shared/billing.ts";
import {
  checkFounding, checkJoin, checkPayout, emailCode, inviteMatches, PARTNER_KIND_LABEL, type PartnerKind, payoutChannel, payoutCodeEmail,
} from "../_shared/programs.ts";
import { currentUser } from "../_shared/kabsi.ts";
import { agentDeps, whatsappCtx } from "../_shared/whatsapp/db.ts";
import { notify } from "../_shared/whatsapp/outbox.ts";
import { inWindow } from "../_shared/whatsapp/policy.ts";
import { PARTNERS_SAY } from "../_shared/whatsapp/partners.ts";
import { notify as notifyEmail } from "../_shared/notify.ts";
import { BODY_LIMITS, capBody } from "../_shared/body-cap.ts";

const CACHE = { "cache-control": "public, max-age=300" };

async function count(fn: "partner_places"): Promise<Response> {
  const { data, error } = await admin().rpc(fn);
  if (error || !data) return json({ error: "unavailable" }, 503);
  return json(data, 200, CACHE);
}

const NO_STORE = { "cache-control": "no-store" };

/** Founding 1: true only for the current private invite slug (app_settings founding_invite_slug, read with the service role). */
async function invited(given: unknown): Promise<boolean> {
  if (typeof given !== "string" || given.length !== 24) return false;
  const { data, error } = await admin().from("app_settings").select("value").eq("key", "founding_invite_slug").maybeSingle();
  if (error) throw error;
  return inviteMatches(given, data?.value);
}
const notFound = () => json({ error: "not_found" }, 404, NO_STORE);

async function foundingCount(req: Request): Promise<Response> {
  if (!(await invited(req.headers.get("x-founding-invite")))) return notFound();
  const { data, error } = await admin().rpc("founding_places");
  if (error || !data) return json({ error: "unavailable" }, 503, NO_STORE);
  return json(data, 200, NO_STORE);
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
  // Founding 1: an application needs the private invite, checked before anything else is read or counted.
  if (!(await invited(body.invite))) return notFound();
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

// ─── Partners 2: join, home, payout method, visits ────────────────────────────────────────────────────────────────
const JOIN_URL = "https://kabsi.co/partners/join";
const NO_CACHE = { "cache-control": "no-store" };
const one = <T>(d: unknown) => d as T;

async function signedIn(req: Request) {
  const user = await currentUser(req);
  return user ? { id: user.id, email: user.email ?? null } : null;
}
const signIn = () => fail("sign_in", "Please sign in first.", 401);

async function joinPartner(req: Request): Promise<Response> {
  const user = await signedIn(req);
  if (!user) return signIn();
  if (!(await rateLimit(`programs:join:${user.id}`, 10, 3600, { failClosed: true }))) return fail("slow_down", "Please wait a little and try again.", 429);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const c = checkJoin(body);
  if (!c.ok) return json({ error: "bad_request", field: c.field, message: c.message }, 400);
  const { data, error } = await admin().rpc("partner_join", { p_user: user.id, p: c.value });
  if (known(error, "email_taken")) return fail("email_taken", "This email already has a partner account. Sign in with the account you joined with.", 409);
  if (known(error, "uae_permit")) return json({ error: "bad_request", field: "uae_permit", message: "In the UAE, write your advertiser permit number, or tick that you will only share privately." }, 400);
  if (error) {
    await captureError("programs", error, { step: "partner_join" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  const r = one<{ result: string; id: string; code: string }>(data);
  if (r.result === "joined") {
    log("programs", { ok: true, op: "partner_join", kind: c.value.kind, country: c.value.country });
    // 30.50 item 4: a staff notice says a partner joined; review waits for the first payout.
    await staffAlert(`New Kabsi partner: ${c.value.name} (${PARTNER_KIND_LABEL[c.value.kind as PartnerKind]}, ${c.value.country}), code ${r.code}. Review comes at the first payout`, `partner_join:${r.id}`)
      .catch((e) => captureError("programs", e, { step: "partner_join_alert" }));
  }
  return json({ ok: true, code: r.code, joined: r.result === "joined" }, 200, NO_CACHE);
}

async function partnerHome(req: Request): Promise<Response> {
  const user = await signedIn(req);
  if (!user) return signIn();
  const { data, error } = await admin().rpc("partner_home", { p_user: user.id });
  if (error) {
    await captureError("programs", error, { step: "partner_home" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  return json(data, 200, NO_CACHE);
}

async function partnerVisit(req: Request): Promise<Response> {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^(P-)?[A-Z0-9]{3,20}$/.test(code)) return json({ ok: false }, 200);
  const visitor = await sha256Hex(`programs:visit:${clientIp(req)}`);
  // One visit per visitor and code a day is counted; past the limit nothing is said (the page works the same).
  if (!(await rateLimit(`programs:visit:${visitor}:${code}`, 1, 86400)) || !(await rateLimit(`programs:visit:${visitor}`, 30, 86400))) {
    return json({ ok: true }, 200);
  }
  const { error } = await admin().rpc("partner_visit", { p_code: code });
  if (error) await captureError("programs", error, { step: "partner_visit" });
  return json({ ok: true }, 200);
}

const codeHash = (userId: string, code: string) => sha256Hex(`${Deno.env.get("SUPABASE_URL") ?? ""}:partner_payout:${userId}:${code}`);

async function payoutRequest(req: Request): Promise<Response> {
  const user = await signedIn(req);
  if (!user) return signIn();
  if (!(await rateLimit(`programs:payout:${user.id}`, 5, 3600, { failClosed: true }))) return fail("slow_down", "Please wait a little and try again.", 429);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const c = checkPayout(body);
  if (!c.ok) return json({ error: "bad_request", field: c.field, message: c.message }, 400);
  const db = admin();
  const { data: who, error: we } = await db.rpc("partner_contact", { p_user: user.id });
  if (we) throw we;
  const contact = one<{ id: string; phone: string | null; email: string } | null>(who);
  if (!contact) return fail("not_partner", "Join Kabsi Partners first.", 403);
  const ctx = await whatsappCtx();
  const deps = await agentDeps();
  const state = contact.phone ? await deps.out.db.state(contact.phone) : null;
  const channel = payoutChannel({ phone: contact.phone, windowOpen: !!state && ctx.on && inWindow(state, new Date()), stopped: !!state?.stopped });
  const code = channel === "email" ? emailCode((n) => crypto.getRandomValues(new Uint8Array(n))) : null;
  const { data, error } = await db.rpc("partner_payout_request", {
    p_user: user.id, p_method: c.value.method, p_detail: c.value.detail, p_channel: channel, p_code_hash: code ? await codeHash(user.id, code) : null,
  });
  if (error) {
    await captureError("programs", error, { step: "payout_request" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  const r = one<{ result: string; id?: string; phone?: string | null; email?: string; method?: string; last4?: string }>(data);
  if (r.result === "not_yet") return fail("not_yet", "Kabsi asks how you want to be paid once 50 US dollars has cleared.", 409);
  if (r.result === "slow_down") return fail("slow_down", "Please wait a little and try again.", 429);
  if (r.result !== "asked" || !r.id) return fail("not_partner", "Join Kabsi Partners first.", 403);
  if (channel === "whatsapp") {
    const sent = await notify(deps.out, { phone: r.phone!, userId: user.id, locationId: null, kind: "partner_payout_confirm", urgent: true,
      body: PARTNERS_SAY.payoutAsk(r.method!, r.last4!), buttons: [{ id: `pc:${r.id}`, title: PARTNERS_SAY.payoutYes }], dedupe: `payout:${r.id}` });
    if (sent === "sent" || sent === "mock_sent" || sent === "duplicate") return json({ ok: true, id: r.id, channel }, 200, NO_CACHE);
    // The message did not go: the same request is confirmed by email instead (a new one, so the code is fresh).
    return await payoutRequestByEmail(user.id, c.value.method, c.value.detail);
  }
  await sendCode(user.id, r.email!, r.id, code!, r.method!, r.last4!);
  return json({ ok: true, id: r.id, channel }, 200, NO_CACHE);
}

async function payoutRequestByEmail(userId: string, method: string, detail: string): Promise<Response> {
  const code = emailCode((n) => crypto.getRandomValues(new Uint8Array(n)));
  const { data, error } = await admin().rpc("partner_payout_request", {
    p_user: userId, p_method: method, p_detail: detail, p_channel: "email", p_code_hash: await codeHash(userId, code),
  });
  const r = one<{ result: string; id?: string; email?: string; method?: string; last4?: string }>(data);
  if (error || r.result !== "asked" || !r.id) return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  await sendCode(userId, r.email!, r.id, code, r.method!, r.last4!);
  return json({ ok: true, id: r.id, channel: "email" }, 200, NO_CACHE);
}

async function sendCode(userId: string, email: string, id: string, code: string, method: string, last4: string) {
  const r = await notifyEmail({ category: "direct", kind: "partner_payout_code", key: `payout:${id}`, to: [{ email, userId }],
    content: payoutCodeEmail(code, method, last4) });
  if (r.failed > 0) throw new Error("payout_code_email_failed");
}

async function payoutConfirm(req: Request): Promise<Response> {
  const user = await signedIn(req);
  if (!user) return signIn();
  if (!(await rateLimit(`programs:payout_confirm:${user.id}`, 20, 3600, { failClosed: true }))) return fail("slow_down", "Please wait a little and try again.", 429);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const id = typeof body.id === "string" && /^[0-9a-f-]{36}$/.test(body.id) ? body.id : null;
  const code = typeof body.code === "string" ? body.code.replace(/\s+/g, "") : "";
  if (!id || !/^[0-9]{6}$/.test(code)) return json({ error: "bad_request", field: "code", message: "Please write the 6-digit code from the email." }, 400);
  const { data, error } = await admin().rpc("partner_payout_confirm_code", { p_user: user.id, p_id: id, p_code_hash: await codeHash(user.id, code) });
  if (error) {
    await captureError("programs", error, { step: "payout_confirm" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  const r = one<{ result: string; method?: string; last4?: string }>(data);
  if (r.result === "wrong_code") return fail("wrong_code", "That code is not right. Please check the email and try again.", 400);
  if (r.result !== "confirmed") return fail("ended", "This change has ended. Please start again.", 410);
  return json({ ok: true, method: r.method, last4: r.last4 }, 200, NO_CACHE);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  // Sec 2: the body is capped before anything reads it (413 past BODY_LIMITS.form).
  const capped = await capBody(req, BODY_LIMITS.form, CORS);
  if (capped instanceof Response) return capped;
  req = capped;
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  try {
    if (req.method === "POST" && path.endsWith("/partners/join")) return await joinPartner(req);
    if (req.method === "POST" && path.endsWith("/partner/payout/confirm")) return await payoutConfirm(req);
    if (req.method === "POST" && path.endsWith("/partner/payout")) return await payoutRequest(req);
    if (req.method === "POST" && path.endsWith("/partner/visit")) return await partnerVisit(req);
    if (req.method === "GET" && path.endsWith("/partner")) return await partnerHome(req);
  } catch (e) {
    await captureError("programs", e, { step: "partners2" });
    return fail("try_again", "Something went wrong. Please try again in a minute.", 500);
  }
  const founding = path.endsWith("/founding");
  const partners = path.endsWith("/partners");
  if (!founding && !partners) return json({ error: "not_found" }, 404);
  if (req.method === "GET") return founding ? await foundingCount(req) : await count("partner_places");
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (partners) {
    // Partners 2 (30.50 item 4): there is no application any more. Partners join at kabsi.co/partners/join.
    return json({ error: "moved", message: "Kabsi Partners has no application any more. Join at kabsi.co/partners/join.", location: JOIN_URL }, 308,
      { location: JOIN_URL, ...NO_CACHE });
  }
  return await applyFounding(req);
});
