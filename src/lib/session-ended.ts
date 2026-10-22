// When the signed-in session is no longer accepted, the app says so and sends the person to sign in again; it never
// leaves a button on screen that sends nothing (lane R, 22 Oct 2026). Every signed-in call goes through
// `sessionFetch`: the Supabase client (its database, function and storage calls) and the app's own function calls.
//
// - 401 from Kabsi's backend: the session ended.
// - 403: the session ended only when Auth itself no longer accepts the token (checked once, directly). A 403 that
//   means "not allowed" (a staff member trying to approve) keeps its own message.
// - No token at all where one is needed: the session ended.
import { supabaseUrl } from "@/lib/supabase-config";

export const SESSION_ENDED = "Your session ended. Sign in again.";
export const SESSION_ENDED_EVENT = "kabsi:session-ended";

export class SessionEnded extends Error {
  override name = "SessionEnded";
  constructor() {
    super(SESSION_ENDED);
  }
}

let ended = false;
export const sessionHasEnded = () => ended;
/** After a fresh sign-in. */
export const resetSessionEnded = () => {
  ended = false;
};

/** Marks the session as ended once and tells the screen; returns the error to throw. */
export function endSession(): SessionEnded {
  if (!ended) {
    ended = true;
    if (typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_ENDED_EVENT));
  }
  return new SessionEnded();
}

const bearer = (init?: RequestInit) => {
  const h = new Headers(init?.headers);
  return (h.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
};

/** A token that carries a person (a session), not the public anon key. */
export function isUserToken(token: string): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.sub === "string" && json.sub.length > 0;
  } catch {
    return false;
  }
}

/** Whether Auth still accepts this token, asked once without going through sessionFetch. */
async function tokenAccepted(
  token: string,
  fetchImpl: typeof fetch,
  apikey: string,
): Promise<boolean> {
  try {
    const r = await fetchImpl(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey, authorization: `Bearer ${token}` },
    });
    return r.ok;
  } catch {
    // No answer: not proof the session ended; the call's own error is shown.
    return true;
  }
}

/** The fetch every signed-in call uses. Only Kabsi's own backend is judged; any other address passes through. */
export function makeSessionFetch(fetchImpl: typeof fetch, apikey: string): typeof fetch {
  return async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const res = await fetchImpl(input, init);
    if (!url.startsWith(supabaseUrl) || (res.status !== 401 && res.status !== 403)) return res;
    const token =
      bearer(init) || (input instanceof Request ? bearer({ headers: input.headers }) : "");
    // Only a call made as a person can end that person's session; a signed-out visitor's call keeps its own answer.
    if (!isUserToken(token)) return res;
    // Signing in and signing out answer their own errors (signing out with an ended session must still clear it here).
    if (url.includes("/auth/v1/token") || url.includes("/auth/v1/logout")) return res;
    if (res.status === 401 || !(await tokenAccepted(token, fetchImpl, apikey))) throw endSession();
    return res;
  };
}
