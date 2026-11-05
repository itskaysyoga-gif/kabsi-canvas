// Plain words for every way a log in can go wrong (App 4, master plan 30.31 item 3; COPY.md 51). Kept apart from the
// sign-in sheet so each case is unit-tested.
export const OFFLINE = "You are offline. Check your connection, then try again.";
export const UNREACHABLE = "Kabsi can't be reached right now. Try again in a minute.";
export const WRONG_CODE = "That code did not work. Check it, or send a new one.";
export const EXPIRED_CODE = "That code has expired. Send a new one.";
export const GOOGLE_STOPPED =
  "Google sign-in did not finish. Use the email code below, or try Google again.";
export const GOOGLE_UNAVAILABLE = "Google sign-in isn't available right now. Use the email code.";
export const IN_APP_LINE =
  "Google sign-in does not work inside this app. Open kabsi.co in your browser to use it.";
/** A code works for 10 minutes (the email says so). */
export const CODE_LIFE_MS = 10 * 60_000;

/** "Wait 42 seconds" or "Wait 2 minutes", from a number of seconds. */
export function waitWords(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 90) return `Wait ${s} ${s === 1 ? "second" : "seconds"}, then try again.`;
  const m = Math.ceil(s / 60);
  return `Wait ${m} minutes, then try again.`;
}

/** Supabase Auth's 429 says "...after 42 seconds"; anything else is a short wait. */
export function tooManyWords(message: string): string {
  const n = /(\d+)\s*second/i.exec(message);
  if (n) return waitWords(Number(n[1]));
  return "Too many tries for now. Wait a few minutes, then try again.";
}

/**
 * The line for a failed code check. `status` and `message` come from Supabase Auth's error; `sentAt` is when the code
 * was sent, so an expired code is told apart from a wrong one (Auth gives both the same answer).
 */
export function codeErrorWords(
  err: { status?: number | undefined; message?: string | undefined; name?: string | undefined },
  opts: { online: boolean; sentAt: number | null; now: number },
): string {
  if (!opts.online) return OFFLINE;
  const m = (err.message ?? "").toLowerCase();
  if (err.status === 429 || m.includes("rate limit") || m.includes("too many"))
    return tooManyWords(err.message ?? "");
  if (
    !err.status ||
    err.status >= 500 ||
    err.name === "AuthRetryableFetchError" ||
    m.includes("fetch")
  )
    return UNREACHABLE;
  if (m.includes("expired") || m.includes("invalid") || err.status === 403 || err.status === 400)
    return opts.sentAt !== null && opts.now - opts.sentAt > CODE_LIFE_MS
      ? EXPIRED_CODE
      : WRONG_CODE;
  return "Something went wrong. Please try again.";
}
