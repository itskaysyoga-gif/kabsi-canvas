// auth-code: the one way the app asks for a 6-digit sign-in code (P0.4-02; K-91, K-100, G-16, D225). The Edge
// Function (auth-code/index.ts) is a thin wrapper; the logic lives here so the Deno tests run it on stubs.
//
//   POST { email } -> { ok: true }
//
// FIX-6 (R-168): no Turnstile on /login. A bot check cost a real owner about 5 minutes, so the gate is the limits here
// instead. Order: a valid address, no throwaway domain, then the limits: at most 10 code requests per visitor an hour,
// and per address 1 a minute and 5 an hour. Over any limit the answer is one line, TOO_MANY. Supabase Auth's own limits
// stay as they are (its answer reads the same). Only then does Supabase Auth send the code (6 digits, never a link, no
// password). The visitor and the address are hashed in the limiter keys, never stored in plain text. The code's 10 minute
// life is the Auth "Email OTP Expiration" setting (600 seconds).
import { isDisposable } from "./disposable-domains.ts";

export const LIMITS = {
  perAddressMinute: 1,
  perAddressMinuteSeconds: 60,
  perAddressHour: 5,
  perAddressHourSeconds: 3600,
  perVisitor: 10,
  perVisitorSeconds: 3600,
};
/** The one line for every limit (COPY.md, Login). */
export const TOO_MANY = "Too many codes asked for. Try again in a few minutes.";
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

/** The address as the limiter sees it: the part after a plus sign is dropped, and Gmail's dots and googlemail.com are folded,
 *  so victim+1@gmail.com and v.ictim@gmail.com share one inbox's limits. Only the limiter key uses this; the code goes to the typed address. */
export function limiterAddress(email: string): string {
  const at = email.lastIndexOf("@");
  let local = email.slice(0, at).split("+")[0] || email.slice(0, at);
  let domain = email.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

export type Deps = {
  env: (name: string) => string | undefined;
  ip: (req: Request) => string;
  sha256Hex: (text: string) => Promise<string>;
  rateLimit: (key: string, max: number, windowSeconds: number, opts?: { failClosed?: boolean }) => Promise<boolean>;
  /** Asks Supabase Auth to email the code; resolves to an error message or null. */
  sendCode: (email: string, ip: string) => Promise<string | null>;
  captureError: (fn: string, error: unknown, extra?: Record<string, unknown>) => Promise<void>;
  cors: Record<string, string>;
};

export function makeHandler(d: Deps) {
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...d.cors, "content-type": "application/json" } });
  const fail = (code: string, message: string, status = 400) => reply({ error: code, message }, status);

  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: d.cors });
    if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
    const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const email = (typeof b.email === "string" ? b.email : "").trim().toLowerCase();
    // Signup 1: the placeholder addresses of WhatsApp sign-ups (wa.kabsi.co) are not real inboxes and never get a code.
    if (!EMAIL_RE.test(email) || email.endsWith("@wa.kabsi.co")) return fail("bad_email", "That email address doesn't look right.");
    const ip = d.ip(req);
    if (isDisposable(email)) {
      return fail("disposable_email", "Please use an email address you keep. Throwaway addresses can't sign up.");
    }
    const salt = d.env("SUPABASE_URL") ?? "";
    const visitor = (await d.sha256Hex(`${salt}:ip:${ip}`)).slice(0, 24);
    const address = (await d.sha256Hex(`${salt}:email:${limiterAddress(email)}`)).slice(0, 24);
    if (!(await d.rateLimit(`authcode:ip:${visitor}`, LIMITS.perVisitor, LIMITS.perVisitorSeconds, { failClosed: true }))) {
      return fail("rate_limited", TOO_MANY, 429);
    }
    // The minute is checked before the hour, so a refused second tap does not use up one of the 5.
    if (!(await d.rateLimit(`authcode:email1m:${address}`, LIMITS.perAddressMinute, LIMITS.perAddressMinuteSeconds, { failClosed: true }))) {
      return fail("rate_limited", TOO_MANY, 429);
    }
    if (!(await d.rateLimit(`authcode:email1h:${address}`, LIMITS.perAddressHour, LIMITS.perAddressHourSeconds, { failClosed: true }))) {
      return fail("rate_limited", TOO_MANY, 429);
    }
    try {
      const err = await d.sendCode(email, ip);
      if (err) {
        const m = err.toLowerCase();
        if (m.includes("rate") || m.includes("seconds")) {
          return fail("rate_limited", TOO_MANY, 429);
        }
        await d.captureError("auth-code", new Error(err));
        return fail("send_failed", "We couldn't send the code. Please try again.", 502);
      }
    } catch (e) {
      await d.captureError("auth-code", e);
      return fail("send_failed", "We couldn't send the code. Please try again.", 502);
    }
    return reply({ ok: true });
  };
}
