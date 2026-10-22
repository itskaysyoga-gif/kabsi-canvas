// Whether this browser holds a Supabase session, read from storage without loading supabase-js. The client keeps it in
// localStorage under sb-<project>-auth-token (and a code verifier while a Google sign-in is in flight). A public page
// that finds none has nothing to load (lane R, 22 Oct 2026, performance).
const KEY = /^sb-.+-auth-token(-code-verifier)?$/;

export function hasStoredSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const s = window.localStorage;
    for (let i = 0; i < s.length; i++) if (KEY.test(s.key(i) ?? "")) return true;
  } catch {
    /* storage blocked: treat as no session */
  }
  return false;
}

/** A sign-in coming back to this page: a Google code in the query, or tokens in the hash. */
export function signInInUrl(search: string, hash: string): boolean {
  return /[?&](code|error_code)=/.test(search) || /[#&](access_token|error_code|type)=/.test(hash);
}

/** Sent by `@/lib/supabase` when the client is created, so the auth provider can follow a client that another part of the page loaded. */
export const SUPABASE_READY_EVENT = "kabsi:supabase-ready";
