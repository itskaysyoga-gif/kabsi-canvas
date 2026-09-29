// Concierge mode helpers (Q07, D267). Pure, no imports, so they can be tested on their own.
// A concierge business has a made-up Google location id, "locations/concierge-<uuid>". Nothing may call Google
// with it: a person does the Google steps by hand.

export const CONCIERGE_PREFIX = "locations/concierge-";
export const isConciergeLocationId = (id: string | null | undefined): boolean => !!id && id.startsWith(CONCIERGE_PREFIX);

export const CONCIERGE_COPY = {
  banner: "Early access: a person on our team posts what you approve, within one working day.",
  posted: "Approved. A person on our team posts it on Google within one working day.",
  waiting: "Want to change it? Email hello@kabsi.co before it's posted.",
  profile: "During early access our team handles replies by hand. Posts, photos and hours start once Kabsi connects to Google.",
} as const;

const norm = (s: string) => s.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export type ConciergeCandidate = { id: string; reviewer: string | null; rating: number; createdAt: string };

/**
 * When a business moves from concierge to real Google access, the reviews staff typed in must not be duplicated by
 * the first real sync. A Google review matches a staff-entered one only when the stars and the reviewer name agree,
 * the dates are within two days, and exactly one candidate fits. Two candidates means no match (never guess).
 */
export function matchConciergeReview(
  google: { reviewer: string; rating: number; createTime: string },
  candidates: ConciergeCandidate[],
): ConciergeCandidate | null {
  const window = 2 * 86_400_000;
  const g = Date.parse(google.createTime);
  const hits = candidates.filter(
    (c) => c.rating === google.rating && norm(c.reviewer ?? "") === norm(google.reviewer) && Math.abs(Date.parse(c.createdAt) - g) <= window,
  );
  return hits.length === 1 ? hits[0]! : null;
}
