// Review Growth numbers (27.3 item 5): link opens are counted apart from new reviews. An open is a tap or a scan; it says
// nothing about whether the person wrote a review, so no line here divides one by the other or implies a conversion.
// Kabsi records places, never people (K-25): no per-person or per-staff count exists anywhere.

export type GrowthStats = {
  days: number;
  newReviews: number;
  /** Opens (taps and scans, bots excluded), by where the link was opened from. */
  opens: { message: number; qr: number; tag: number };
};

export const totalOpens = (s: GrowthStats) => s.opens.message + s.opens.qr + s.opens.tag;

/** One plain line for WhatsApp and the report. "An open is not a review." is part of it. */
export function growthLine(s: GrowthStats): string {
  const reviews = `${s.newReviews} new ${s.newReviews === 1 ? "review" : "reviews"}`;
  const n = totalOpens(s);
  const opens = n === 0 ? "Your review link was not opened" : `Your review link was opened ${n} ${n === 1 ? "time" : "times"}`;
  return `${reviews} on Google in the last ${s.days} days. ${opens}. An open is not a review.`;
}

/** Where the opens came from, for the Reviews screen. Empty when there were none. */
export function opensBreakdown(s: GrowthStats): string {
  const parts: string[] = [];
  if (s.opens.message) parts.push(`${s.opens.message} from messages`);
  if (s.opens.qr) parts.push(`${s.opens.qr} from QR codes`);
  if (s.opens.tag) parts.push(`${s.opens.tag} from tags`);
  return parts.join(", ");
}
