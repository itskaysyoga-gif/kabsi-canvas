// How long a sign-in lasts (App 4, master plan 30.31 item 2; was D301): an owner stays signed in on a device for 30 days
// after the last visit, and every visit starts the 30 days again; staff pages sign staff out after 12 hours without
// use. A visit is a signed-in page load or an action (a click, a key, the tab coming back). The time of the last visit
// lives in this browser only (localStorage), written at most once a minute. Supabase's Free plan cannot time-box
// sessions on the server, so this is enforced in the app (a known limit until Supabase Pro, 30.25).
import type { SignedOutReason } from "@/lib/signed-out";

const KEY = "kabsi:last-seen";
/** The last visit to a staff page, apart, so a visit to the website or the dashboard does not restart the 12 hours. */
const STAFF_KEY = "kabsi:last-seen-staff";
export const OWNER_IDLE_MS = 30 * 86_400_000;
export const STAFF_IDLE_MS = 12 * 3_600_000;
/** At most one write a minute. */
export const WRITE_EVERY_MS = 60_000;

export function lastSeen(staff = false): number | null {
  try {
    const v = Number(window.localStorage.getItem(staff ? STAFF_KEY : KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

/**
 * Records a visit, unless one was recorded in the last minute. A stamp in the future (the clock was moved back) is
 * replaced. Returns whether it wrote.
 */
export function touch(now = Date.now(), staff = false): boolean {
  const seen = lastSeen(staff);
  if (seen !== null && seen <= now && now - seen < WRITE_EVERY_MS) return false;
  try {
    window.localStorage.setItem(staff ? STAFF_KEY : KEY, String(now));
    return true;
  } catch {
    /* storage blocked: no time-away sign-out on this device; the session still ends in Supabase's own time */
    return false;
  }
}

export function clearSeen() {
  try {
    window.localStorage.removeItem(KEY);
    window.localStorage.removeItem(STAFF_KEY);
  } catch {
    /* nothing to clear */
  }
}

/** Whether a page is a staff page (12 hours) rather than an owner's (30 days). */
export const isStaffPath = (pathname: string) =>
  pathname === "/staff" || pathname.startsWith("/staff/");

/**
 * The rule itself. `seen` is the last visit before this one (null when none is recorded: the first visit on this
 * device, or storage blocked, signs nobody out). A staff session on a staff page has 12 hours from its last staff
 * page visit (`staffSeen`; the last visit of any kind when no staff page was visited yet on this device); every other
 * page, 30 days from the last visit.
 */
export function awayVerdict(
  seen: number | null,
  now: number,
  opts: { staff: boolean; pathname: string; staffSeen?: number | null },
): Extract<SignedOutReason, "away-owner" | "away-staff"> | null {
  if (opts.staff && isStaffPath(opts.pathname)) {
    const s = opts.staffSeen ?? seen;
    if (s !== null && s <= now && now - s > STAFF_IDLE_MS) return "away-staff";
  }
  if (seen === null || seen > now) return null;
  if (now - seen > OWNER_IDLE_MS) return "away-owner";
  return null;
}
