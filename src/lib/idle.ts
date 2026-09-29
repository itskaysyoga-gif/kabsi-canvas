// Idle sign-out (D301): owners after 30 days without use, staff after 12 hours. "Use" is any click, key press or
// the tab becoming visible. The stamp lives in this browser only.
const KEY = "kabsi:last-seen";
export const OWNER_IDLE_MS = 30 * 86_400_000;
export const STAFF_IDLE_MS = 12 * 3_600_000;

export function lastSeen(): number | null {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
export function touch() {
  try {
    window.localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode: no idle sign-out, the session still expires normally */
  }
}
export function isIdle(limitMs: number) {
  const seen = lastSeen();
  return seen !== null && Date.now() - seen > limitMs;
}
export function clearSeen() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}
