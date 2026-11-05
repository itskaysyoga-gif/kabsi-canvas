// How long a sign-in lasts (App 4, master plan 30.31 item 2; was D301): an owner stays signed in on a device for 30 days
// after the last visit, and every visit starts the 30 days again; staff pages sign staff out after 12 hours without
// use. A visit is a signed-in page load or an action (a click, a key, the tab coming back). The time of the last visit
// lives in this browser only (localStorage), written at most once a minute. Supabase's Free plan cannot time-box
// sessions on the server, so this is enforced in the app (a known limit until Supabase Pro, 30.25).
import type { SignedOutReason } from "@/lib/signed-out";

const KEY = "kabsi:last-seen";
export const OWNER_IDLE_MS = 30 * 86_400_000;
export const STAFF_IDLE_MS = 12 * 3_600_000;
/** At most one write a minute. */
export const WRITE_EVERY_MS = 60_000;

export function lastSeen(): number | null {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Records a visit, unless one was recorded in the last minute. A stamp in the future (the clock was moved back) is
 * replaced. Returns whether it wrote.
 */
export function touch(now = Date.now()): boolean {
  const seen = lastSeen();
  if (seen !== null && seen <= now && now - seen < WRITE_EVERY_MS) return false;
  try {
    window.localStorage.setItem(KEY, String(now));
    return true;
  } catch {
    /* storage blocked: no time-away sign-out on this device; the session still ends in Supabase's own time */
    return false;
  }
}

export function clearSeen() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Whether a page is a staff page (12 hours) rather than an owner's (30 days). */
export const isStaffPath = (pathname: string) =>
  pathname === "/staff" || pathname.startsWith("/staff/");

/**
 * The rule itself. `seen` is the last visit before this one (null when none is recorded: the first visit on this
 * device, or storage blocked, signs nobody out). A staff session on a staff page has 12 hours, every other page 30 days.
 */
export function awayVerdict(
  seen: number | null,
  now: number,
  opts: { staff: boolean; pathname: string },
): Extract<SignedOutReason, "away-owner" | "away-staff"> | null {
  if (seen === null || seen > now) return null;
  const gap = now - seen;
  if (opts.staff && isStaffPath(opts.pathname) && gap > STAFF_IDLE_MS) return "away-staff";
  if (gap > OWNER_IDLE_MS) return "away-owner";
  return null;
}
