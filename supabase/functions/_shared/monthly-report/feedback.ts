// Recurring feedback (blueprint section 7): a topic that 3 or more reviews of the last 90 days mention. Computed from a fresh
// read of the reviews when the report is built; only the topic, the count and a lean are kept, never a review's words, never a
// reviewer's name (K-40, K-113.3). A topic is a plain subject, not a verdict. Never a ranking of staff, never advice.
// Pure, so a test can run it on fixtures.

export type ReviewForThemes = { rating: number; comment: string | null; createTime: string };
export type Theme = {
  id: string;
  label: string;
  count: number;
  /** Where the mentions sit: mostly in 4 and 5 star reviews, mostly in 1 to 3 star reviews, or both (nothing said). */
  lean: "high" | "low" | "mixed";
};

export const MIN_MENTIONS = 3;
export const WINDOW_DAYS = 90;
export const MAX_THEMES = 3;

// The subjects, as plain words. Each pattern is a set of whole words; "service" alone is too loose to count as staff.
const TOPICS: { id: string; label: string; re: RegExp }[] = [
  { id: "waiting", label: "waiting time", re: /\b(wait|waited|waiting|queue|queued|slow|slowly|long time)\b/i },
  { id: "staff", label: "the staff", re: /\b(staff|team|waiter|waitress|receptionist|stylist|therapist|technician|owner|manager)\b/i },
  { id: "price", label: "price", re: /\b(price|prices|priced|expensive|cheap|cost|costs|value|overpriced|affordable|fair price)\b/i },
  { id: "clean", label: "cleanliness", re: /\b(clean|cleanliness|dirty|spotless|tidy|hygiene|hygienic|messy)\b/i },
  { id: "parking", label: "parking", re: /\b(parking|park|parked)\b/i },
  { id: "food", label: "the food and drink", re: /\b(food|meal|dish|dishes|coffee|menu|taste|tasty|drinks?|breakfast|lunch|dinner)\b/i },
  { id: "booking", label: "booking", re: /\b(appointment|appointments|booking|booked|reservation|reserve|reserved)\b/i },
  { id: "delivery", label: "delivery and timing", re: /\b(delivery|delivered|arrived|on time|late|delay|delayed)\b/i },
  { id: "quality", label: "the quality of the work", re: /\b(quality|workmanship|fixed|repair|repaired|result|results|finish)\b/i },
  { id: "contact", label: "getting a reply", re: /\b(called|phone|rang|answered|reply|replied|email|emailed|message|messaged|callback)\b/i },
  { id: "atmosphere", label: "the atmosphere", re: /\b(atmosphere|ambience|ambiance|vibe|cosy|cozy|music|noisy|noise|quiet)\b/i },
];

/** Topics 3 or more reviews of the last 90 days mention, most mentioned first, at most 3. Empty means the band is left out. */
export function recurringFeedback(reviews: ReviewForThemes[], now: Date): Theme[] {
  const since = now.getTime() - WINDOW_DAYS * 86400_000;
  const recent = reviews.filter((r) => r.comment && r.comment.trim() && Date.parse(r.createTime) >= since);
  const out: Theme[] = [];
  for (const t of TOPICS) {
    const hits = recent.filter((r) => t.re.test(r.comment!));
    if (hits.length < MIN_MENTIONS) continue;
    const high = hits.filter((r) => r.rating >= 4).length;
    const low = hits.filter((r) => r.rating <= 3).length;
    const lean = high / hits.length >= 2 / 3 ? "high" : low / hits.length >= 2 / 3 ? "low" : "mixed";
    out.push({ id: t.id, label: t.label, count: hits.length, lean });
  }
  return out.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)).slice(0, MAX_THEMES);
}

/** One plain sentence per topic. It says what was mentioned and how often, never why and never what to do. */
export function themeLine(t: Theme): string {
  const where = t.lean === "high" ? ", mostly in 4 and 5 star reviews" : t.lean === "low" ? ", mostly in 1 to 3 star reviews" : "";
  return `${t.count} reviews in the last 90 days mention ${t.label}${where}.`;
}
