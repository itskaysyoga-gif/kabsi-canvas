// Sign-up and log-in (P0.4-02; K-91, R-11, K-100, G-16, D225): "Continue with Google" first, a 6-digit email code
// second, no passwords. Google sign-in asks only for openid, email and profile (R-11) and never touches the Business
// Profile. Email codes are requested through the auth-code Edge Function (Turnstile, the code limits, throwaway
// domains); the code itself is checked by Supabase Auth.
import { anonHeaders, supabase, supabaseUrl } from "@/lib/supabase";

/** Supabase Auth always asks Google for email and profile; openid is added so Google returns an ID token. */
export const GOOGLE_SCOPES = "openid";
export const GOOGLE_SCOPES_REQUESTED = ["email", "profile", "openid"] as const;

/** Only same-site paths: "/x", never "//host" or "/\\host" (browsers treat both as another site). */
export function safeNext(next?: string) {
  return next && /^\/(?![/\\])/.test(next) && !next.includes("\\") ? next : "/app";
}

export class SignupError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function requestEmailCode(email: string, turnstile: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/auth-code`, {
      method: "POST",
      headers: { ...anonHeaders, "content-type": "application/json" },
      body: JSON.stringify({ email, turnstile }),
    });
  } catch {
    throw new SignupError(
      "network",
      "We couldn't reach Kabsi. Check your connection and try again.",
    );
  }
  const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
  if (!res.ok)
    throw new SignupError(
      body.error ?? "error",
      body.message ?? "Something went wrong. Please try again.",
    );
}

/** Starts Google sign-in. Supabase sends the owner to Google and back to /login, which finishes and moves on. */
export async function continueWithGoogle(
  next: string,
  opts: { skipBrowserRedirect?: boolean } = {},
) {
  const redirectTo = `${window.location.origin}/login?next=${encodeURIComponent(safeNext(next))}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      scopes: GOOGLE_SCOPES,
      queryParams: { prompt: "select_account" },
      skipBrowserRedirect: opts.skipBrowserRedirect ?? false,
    },
  });
  if (error)
    throw new SignupError(
      "google",
      "Google sign-in isn't available right now. Use the email code.",
    );
  return data.url;
}

// The snapshot the owner saw before signing up ("Save your snapshot and continue"). Kept in this browser for a day
// so it survives the trip to Google and back; onboarding step 3 starts from it and then forgets it.
const KEY = "kabsi.snapshot";
const DAY = 24 * 60 * 60 * 1000;
export type KeptSnapshot = {
  place_id: string;
  name: string;
  address: string;
  /** The free check's code (8 letters and digits), so /start can join the check to the new business (claim_free_check). */
  check?: string;
};

export function keepSnapshot(s: KeptSnapshot) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, at: Date.now() }));
  } catch {
    /* private mode: the owner searches again */
  }
}
export function keptSnapshot(): KeptSnapshot | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as
      (KeptSnapshot & { at: number }) | null;
    if (!v || typeof v.place_id !== "string" || Date.now() - v.at > DAY) return null;
    const check = typeof v.check === "string" && /^[A-Z2-9]{8}$/.test(v.check) ? v.check : null;
    return { place_id: v.place_id, name: v.name, address: v.address, ...(check ? { check } : {}) };
  } catch {
    return null;
  }
}
export function forgetSnapshot() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing kept */
  }
}
