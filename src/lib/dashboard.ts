// Small helpers shared by the app screens: day counts and the "sent to Google" states. Home's own data is
// src/lib/home.ts; what the owner can act on is not here, it comes from the one task queue (src/lib/tasks.ts, K-08).
const DAY = 86_400_000;

export function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DAY));
}

// A publication Google has answered for: sent, being checked, or seen on the profile.
export const SENT_STATES = ["published", "verifying", "checking", "verified"];

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}
