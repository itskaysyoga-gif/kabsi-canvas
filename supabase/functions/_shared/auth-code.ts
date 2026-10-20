// auth-code: the one way the app asks for a 6-digit sign-in code (P0.4-02; K-91, K-100, G-16, D225). The Edge
// Function (auth-code/index.ts) is a thin wrapper; the logic lives here so the Deno tests run it on stubs.
//
//   POST { email, turnstile } -> { ok: true }
//
// Order: a valid address, Turnstile, no throwaway domain, then the limits (K-100): at most 10 code requests per
// visitor an hour and 3 per address per 15 minutes; the fourth is refused. Only then does Supabase Auth send the code
// (6 digits, never a link, no password). The visitor and the address are hashed in the limiter keys, never stored in
// plain text. The code's 10 minute life is the Auth "Email OTP Expiration" setting (600 seconds).
import { isDisposable } from "./disposable-domains.ts";

export const LIMITS = { perAddress: 3, perAddressSeconds: 15 * 60, perVisitor: 10, perVisitorSeconds: 3600 };
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export type Deps = {
  env: (name: string) => string | undefined;
  ip: (req: Request) => string;
  sha256Hex: (text: string) => Promise<string>;
  rateLimit: (key: string, max: number, windowSeconds: number, opts?: { failClosed?: boolean }) => Promise<boolean>;
  verifyTurnstile: (token: string | undefined, ip?: string) => Promise<boolean>;
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
    if (!EMAIL_RE.test(email)) return fail("bad_email", "That email address doesn't look right.");
    const ip = d.ip(req);
    if (!(await d.verifyTurnstile(typeof b.turnstile === "string" && b.turnstile ? b.turnstile : undefined, ip))) {
      return fail("challenge_failed", "Please complete the check and try again.");
    }
    if (isDisposable(email)) {
      return fail("disposable_email", "Please use an email address you keep. Throwaway addresses can't sign up.");
    }
    const salt = d.env("SUPABASE_URL") ?? "";
    const visitor = (await d.sha256Hex(`${salt}:ip:${ip}`)).slice(0, 24);
    const address = (await d.sha256Hex(`${salt}:email:${email}`)).slice(0, 24);
    if (!(await d.rateLimit(`authcode:ip:${visitor}`, LIMITS.perVisitor, LIMITS.perVisitorSeconds, { failClosed: true }))) {
      return fail("rate_limited", "That is a lot of codes. Please try again in an hour.", 429);
    }
    if (!(await d.rateLimit(`authcode:email:${address}`, LIMITS.perAddress, LIMITS.perAddressSeconds, { failClosed: true }))) {
      return fail("rate_limited", "We have sent 3 codes to this address. Please wait 15 minutes and use the newest one.", 429);
    }
    try {
      const err = await d.sendCode(email, ip);
      if (err) {
        const m = err.toLowerCase();
        if (m.includes("rate") || m.includes("seconds")) {
          return fail("rate_limited", "Please wait a minute before asking for another code.", 429);
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
