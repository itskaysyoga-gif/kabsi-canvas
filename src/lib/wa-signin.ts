// Signup 1 (master plan 30.50 item 3, R-150): the browser's side of Continue with WhatsApp, and whether Google sign-in is on.
// The browser makes a secret of 32 random bytes and keeps it in this tab; Kabsi gets only its hash when the sign-in starts,
// and the secret itself only when this tab checks for its session. A code from another browser never signs this one in.
// The server parts are supabase/functions/_shared/wa-signin.ts and the auth-whatsapp function.
import { anonHeaders, supabase, supabaseUrl } from "@/lib/supabase";
import { WHATSAPP_DIGITS } from "@/lib/site";
import {
  signinHref,
  WA_CONSENT_LINES,
  WA_CONSENT_SHORT,
  WHATSAPP_SIGNIN_CONSENT,
} from "../../supabase/functions/_shared/wa-signin.ts";

export { signinHref, WA_CONSENT_LINES, WA_CONSENT_SHORT, WHATSAPP_SIGNIN_CONSENT };

// ─── Google: read Auth's public settings once per page load; the button shows only when the provider is on.
let googleOn: Promise<boolean> | null = null;
export function googleSignInOn(): Promise<boolean> {
  googleOn ??= fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: anonHeaders.apikey } })
    .then(async (r) => {
      if (!r.ok) return true;
      const j = (await r.json()) as { external?: Record<string, unknown> };
      // Only a clear "false" hides the button: an answer Kabsi cannot read keeps it, as before.
      return j.external?.["google"] !== false;
    })
    .catch(() => true);
  return googleOn;
}

// ─── The order of the three ways (30.50 item 3, Signup 1).
export type Way = "whatsapp" | "google" | "email";
/** On a phone: WhatsApp, Google, email code. On a desktop: Google, WhatsApp, email code. */
export function waysOrder(phone: boolean): Way[] {
  return phone ? ["whatsapp", "google", "email"] : ["google", "whatsapp", "email"];
}
export function isPhoneNow(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPhone|iPod|Android.+Mobile|Mobile Safari|Windows Phone/i.test(ua)) return true;
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(pointer: coarse)").matches &&
    window.innerWidth < 768
  );
}

// ─── The sign-in itself.
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type WaStart = { id: string; code: string; expiresAt: number; secret: string; href: string };
export class WaSigninError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

// The secret lives only in this page's memory, never in browser storage (CodeQL, clear text storage): a tab the phone
// reloads while WhatsApp is open starts again. Kept across a remount of the sheet within the same page.
let kept: WaStart | null = null;
export function keptStart(): WaStart | null {
  return kept && kept.expiresAt > Date.now() ? kept : null;
}
export function forgetStart() {
  kept = null;
}

async function geoToken(): Promise<string | null> {
  try {
    const r = await fetch("/api/geo?sign=1", { signal: AbortSignal.timeout(2000) });
    const j = (await r.json()) as { token?: string };
    return typeof j.token === "string" ? j.token : null;
  } catch {
    return null;
  }
}

export async function startWhatsapp(turnstile: string): Promise<WaStart> {
  const secret = b64url(crypto.getRandomValues(new Uint8Array(32)));
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/auth-whatsapp/start`, {
      method: "POST",
      headers: { ...anonHeaders, "content-type": "application/json" },
      body: JSON.stringify({
        turnstile,
        browser_hash: await sha256Hex(secret),
        geo: await geoToken(),
      }),
    });
  } catch {
    throw new WaSigninError("network", "Kabsi can't be reached right now. Try again in a minute.");
  }
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    code?: string;
    expires_at?: string;
    error?: string;
    message?: string;
  };
  if (!res.ok || !body.id || !body.code)
    throw new WaSigninError(
      body.error ?? "error",
      body.message ?? "Something went wrong. Please try again.",
    );
  const start: WaStart = {
    id: body.id,
    code: body.code,
    secret,
    expiresAt: Date.parse(body.expires_at ?? "") || Date.now() + 10 * 60_000,
    href: signinHref(WHATSAPP_DIGITS, body.code),
  };
  kept = start;
  return start;
}

export type WaState = "waiting" | "asked" | "expired" | "used" | "unknown" | "failed" | "signed_in";

/** One check. When the owner has tapped "Yes, it's me", the session comes back once and this tab signs in. */
export async function checkWhatsapp(
  s: Pick<WaStart, "id" | "secret">,
  onPhoneEnd?: (end: string | null) => void,
): Promise<WaState> {
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/auth-whatsapp/check`, {
      method: "POST",
      headers: { ...anonHeaders, "content-type": "application/json" },
      body: JSON.stringify({ id: s.id, secret: s.secret }),
    });
  } catch {
    return "waiting";
  }
  const body = (await res.json().catch(() => ({}))) as {
    state?: WaState;
    phone_end?: string | null;
    session?: { access_token: string; refresh_token: string };
  };
  // Signup 1 (review finding 3): the last 2 digits of the phone that sent this tab's code, so a code someone else sent shows.
  if (body.state === "asked")
    onPhoneEnd?.(
      typeof body.phone_end === "string" && /^\d{2}$/.test(body.phone_end) ? body.phone_end : null,
    );
  if (body.state === "signed_in" && body.session) {
    const { error } = await supabase.auth.setSession(body.session);
    forgetStart();
    return error ? "failed" : "signed_in";
  }
  return body.state ?? "waiting";
}

// ─── The contact email of an owner who signed up with WhatsApp ("Where should receipts go?").
export async function contactEmailStatus(): Promise<{ needed: boolean; email: string | null }> {
  const { data, error } = await supabase.rpc("contact_email_status");
  if (error) throw error;
  const d = (data ?? {}) as { needed?: boolean; email?: string | null };
  return { needed: d.needed === true, email: d.email ?? null };
}
export async function setContactEmail(email: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("set_contact_email", { p_email: email });
  if (error) throw error;
  return (data as { ok?: boolean } | null)?.ok === true;
}
