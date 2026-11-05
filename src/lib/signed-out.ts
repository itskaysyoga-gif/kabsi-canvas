// Why this tab was last signed out (App 4, master plan 30.31 items 1 and 2). Kept in sessionStorage, so it belongs to
// this tab only and is read once by the page that shows the line: Home after "Log out" ("You are signed out."), the
// log in page after a sign-out for time away. Every read and write is wrapped, because storage can be blocked.
export type SignedOutReason = "you" | "away-owner" | "away-staff" | "ended";

const KEY = "kabsi:signed-out";
/** A reason left unread (a tab that never showed a page with the line) is forgotten after 10 minutes. */
const FRESH_MS = 10 * 60_000;
const REASONS: readonly SignedOutReason[] = ["you", "away-owner", "away-staff", "ended"];

export const SIGNED_OUT_LINE = "You are signed out.";
export const AWAY_OWNER_LINE = "You were signed out after 30 days away. Log in again.";
export const AWAY_STAFF_LINE = "You were signed out after 12 hours away. Log in again.";
/** After the session-ended screen (session-ended.ts says the same words there). */
export const ENDED_LINE = "Your session ended. Log in again.";
/** Sent when the reason is set, so a page already on screen can show its line. */
export const SIGNED_OUT_EVENT = "kabsi:signed-out";

export function setSignedOutReason(reason: SignedOutReason) {
  try {
    window.sessionStorage.setItem(KEY, `${reason}|${Date.now()}`);
  } catch {
    /* storage blocked: the line is not shown, the sign-out still happens */
  }
  try {
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  } catch {
    /* no window */
  }
}

export function peekSignedOutReason(): SignedOutReason | null {
  try {
    const [v, at] = (window.sessionStorage.getItem(KEY) ?? "").split("|");
    const age = Date.now() - Number(at);
    if (!REASONS.includes(v as SignedOutReason) || !(age >= 0 && age < FRESH_MS)) return null;
    return v as SignedOutReason;
  } catch {
    return null;
  }
}

/** Reads the reason and forgets it, so the line shows once. */
export function takeSignedOutReason(only?: readonly SignedOutReason[]): SignedOutReason | null {
  const r = peekSignedOutReason();
  if (!r || (only && !only.includes(r))) return null;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to forget */
  }
  return r;
}

export function signedOutLine(reason: SignedOutReason | null): string | null {
  if (reason === "you") return SIGNED_OUT_LINE;
  if (reason === "away-owner") return AWAY_OWNER_LINE;
  if (reason === "away-staff") return AWAY_STAFF_LINE;
  if (reason === "ended") return ENDED_LINE;
  return null;
}
