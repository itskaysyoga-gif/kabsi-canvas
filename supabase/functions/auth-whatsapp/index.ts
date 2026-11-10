// auth-whatsapp: Continue with WhatsApp and the new sign-in notice (Signup 1, master plan 30.50 item 3, R-150).
//   POST /auth-whatsapp/start    the browser: { turnstile, browser_hash, geo } -> { id, code, expires_at }. Turnstile and the
//                                limits first; the code is stored hashed with the hash of the browser's own secret.
//   POST /auth-whatsapp/check    the starting browser: { id, secret } -> { state } or, once after the owner's tap, the session.
//   POST /auth-whatsapp/notices  internal (x-cron-secret, from the scan every minute): the new sign-in notices.
// verify_jwt is off (the cron call carries no JWT); every browser call is checked in code (Turnstile, the limits, the
// hashes). The WhatsApp side (the owner's message and the two buttons) runs in the whatsapp function's agent.
import { serve } from "../_shared/kabsi.ts";
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, isInternal, json, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { BODY_LIMITS, withBodyCap } from "../_shared/body-cap.ts";
import { makeHandler } from "../_shared/wa-signin.ts";
import { checkSignin, mintSession, startSignin } from "../_shared/wa-signin-db.ts";
import { type NoticeRow, noticeEmail, sendSigninNotices } from "../_shared/whatsapp/signin.ts";
import { agentDeps, whatsappCtx } from "../_shared/whatsapp/db.ts";
import { notify } from "../_shared/whatsapp/outbox.ts";
import { notify as notifyEmail } from "../_shared/notify.ts";

async function hmacHex(key: string, text: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(text));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const browser = makeHandler({
  env: (name) => Deno.env.get(name),
  ip: (req) => clientIp(req),
  sha256Hex,
  hmacHex,
  randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
  rateLimit,
  verifyTurnstile,
  start: startSignin,
  check: checkSignin,
  mint: (userId, req) => mintSession(userId, { ua: req.headers.get("user-agent"), ip: clientIp(req) }),
  captureError,
  cors: CORS,
});

async function notices(): Promise<Record<string, unknown>> {
  const ctx = await whatsappCtx();
  const deps = await agentDeps();
  const db = admin();
  return await sendSigninNotices({
    claim: async (n) => {
      const { data, error } = await db.rpc("signin_notices_claim", { p_limit: n });
      if (error) throw error;
      return (data ?? []) as NoticeRow[];
    },
    // While WhatsApp is off for owners every notice goes by email (the window reads closed).
    state: async (phone) => ctx.on ? await deps.out.db.state(phone) : { ...(await deps.out.db.state(phone)), window_expires_at: null },
    whatsapp: (row, body, buttons) =>
      notify(deps.out, { phone: row.phone!, userId: row.user_id, locationId: null, kind: "signin_notice", body, buttons, urgent: true, dedupe: `signin:${row.id}` }),
    email: async (row, device) => {
      const r = await notifyEmail({ category: "direct", kind: "signin_notice", key: `signin:${row.id}`, to: [{ email: row.email, userId: row.user_id }],
        content: noticeEmail(device) });
      if (r.failed > 0) throw new Error("signin_email_failed");
    },
    mark: async (id, state) => {
      const { error } = await db.rpc("signin_notice_mark", { p_id: id, p_state: state });
      if (error) throw error;
    },
    now: () => new Date(),
  });
}

serve(withBodyCap(async (req) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  if (path.endsWith("/notices")) {
    if (req.method !== "POST" || !(await isInternal(req))) return json({ error: "forbidden" }, 403);
    try {
      return json({ ok: true, ...(await notices()) });
    } catch (e) {
      await captureError("auth-whatsapp", e, { step: "notices" });
      return json({ ok: false }, 500);
    }
  }
  return await browser(req);
}, BODY_LIMITS.small, CORS));
