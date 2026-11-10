// Signup 1 (master plan 30.50 item 3): Continue with WhatsApp wired to the database and to Supabase Auth. Used by the
// auth-whatsapp Edge Function (the browser's start and check, the notices) and by the whatsapp agent (the seam's three
// messages). The logic and its refusals are in wa-signin.ts and whatsapp/signin.ts, tested on fakes.
//
// How the session is minted (chosen after reading Supabase's docs for admin.generateLink and verifyOtp with token_hash):
// only after the owner's tap, and only for the browser that holds the secret, the Auth admin API makes a one-time magic
// link token for the user (generateLink sends no email) and this server verifies it at once with verifyOtp({ token_hash }).
// The session (access and refresh token) goes back in the answer to that browser only. Nothing is stored: the token is
// spent in the same call. No phone provider, no SMS, no paid message, no custom JWT signing.
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { admin, rateLimit, sha256Hex } from "./kabsi.ts";
import { codeHash, type CheckResult, LIMITS, type Session, type StartRow, WHATSAPP_SIGNIN_CONSENT } from "./wa-signin.ts";
import type { SigninDb } from "./whatsapp/signin.ts";

/** The placeholder sign-in address of an owner who signed up with WhatsApp. Never mailed (the email sender and notification_recipients skip it). */
export const WA_EMAIL_DOMAIN = "wa.kabsi.co";
export const isWhatsappEmail = (email: string | null | undefined) => !!email && email.toLowerCase().endsWith(`@${WA_EMAIL_DOMAIN}`);

const env = (name: string) => Deno.env.get(name);
const one = <T>(data: unknown) => data as T;

export async function startSignin(row: StartRow): Promise<string> {
  const { data, error } = await admin().rpc("wa_signin_start", {
    p_code_hash: row.codeHash, p_browser_hash: row.browserHash, p_browser: row.browser, p_os: row.os, p_city: row.city, p_country: row.country,
  });
  if (error) throw error;
  return String(data);
}

export async function checkSignin(id: string, browserHash: string): Promise<CheckResult> {
  const { data, error } = await admin().rpc("wa_signin_check", { p_id: id, p_browser_hash: browserHash });
  if (error) throw error;
  return one<CheckResult>(data);
}

/** The session for a user, after the tap. The browser's user agent and address go along, so the session row names the browser. */
export async function mintSession(userId: string, from: { ua: string | null; ip: string }): Promise<Session | null> {
  const db = admin();
  const { data: u, error: ue } = await db.auth.admin.getUserById(userId);
  const email = u?.user?.email;
  if (ue || !email) return null;
  const { data: link, error: le } = await db.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (le || !tokenHash) throw le ?? new Error("no token");
  const headers: Record<string, string> = {};
  if (from.ua) headers["user-agent"] = from.ua.slice(0, 512);
  if (from.ip && from.ip !== "unknown") headers["sb-forwarded-for"] = from.ip;
  const auth = createClient(env("SUPABASE_URL")!, env("SUPABASE_ANON_KEY") ?? env("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers },
  }).auth;
  const { data, error } = await auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error || !data.session) throw error ?? new Error("no session");
  return { access_token: data.session.access_token, refresh_token: data.session.refresh_token, expires_at: data.session.expires_at ?? null };
}

/** The agent's three messages, against the database. */
export function signinDb(): SigninDb {
  const salt = env("SUPABASE_URL") ?? "";
  return {
    async allow(phone) {
      const key = (await sha256Hex(`${salt}:wasignin:phone:${phone}`)).slice(0, 24);
      return await rateLimit(`wasignin:phone:${key}`, LIMITS.perPhone, LIMITS.perPhoneSeconds, { failClosed: true });
    },
    async claim(code, phone) {
      const { data, error } = await admin().rpc("wa_signin_claim", { p_code_hash: await codeHash({ sha256Hex, env }, code), p_phone: phone });
      if (error) throw error;
      const r = one<{ result: string; id?: string; browser?: string | null; os?: string | null; city?: string | null }>(data);
      return r.result === "asked" && r.id
        ? { result: "asked", id: r.id, device: { browser: r.browser ?? null, os: r.os ?? null }, city: r.city ?? null }
        : { result: "unknown" };
    },
    async confirm(id, phone) {
      const db = admin();
      const call = async (newUser: string | null) => {
        const { data, error } = await db.rpc("wa_signin_confirm", { p_id: id, p_phone: phone, p_consent: WHATSAPP_SIGNIN_CONSENT, p_new_user: newUser });
        if (error) throw error;
        return one<{ result: string }>(data).result;
      };
      let r = await call(null);
      if (r === "need_user") {
        // A new phone: a new user with a placeholder address that is never mailed. Onboarding asks for the contact email.
        const { data, error } = await db.auth.admin.createUser({
          email: `wa-${crypto.randomUUID()}@${WA_EMAIL_DOMAIN}`, email_confirm: true, user_metadata: { signup: "whatsapp" },
        });
        if (error || !data.user) throw error ?? new Error("no user");
        r = await call(data.user.id);
      }
      return { result: r === "confirmed" ? "confirmed" : "unknown" };
    },
    async signOut(noticeId, phone) {
      const { data, error } = await admin().rpc("signout_everywhere", { p_notice: noticeId, p_phone: phone });
      if (error) throw error;
      return { result: one<{ result: string }>(data).result === "done" ? "done" : "unknown" };
    },
  };
}
