// The Kabsi page behind a review link set to "Show the page" (P0.8-05, K-132). Pure helpers, no Deno APIs, so the
// Edge Function and the tests share them.

/** The Google review button's destination must be Google's own review form (same check the Worker makes). */
export const GOOGLE_REVIEW_RE = /^https:\/\/(search\.google\.com|g\.page|www\.google\.com|maps\.google\.com|maps\.app\.goo\.gl)\//;

/**
 * The digits wa.me needs, from the number the owner saved (a plus sign, the country code and the number; the save
 * already refuses anything else). Null when it is not a usable international number, which hides the manager line.
 */
export function whatsappDigits(saved: unknown): string | null {
  if (typeof saved !== "string") return null;
  const text = saved.trim();
  if (!/^\+[0-9 ()-]+$/.test(text)) return null;
  const digits = text.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export type ReviewPageData = {
  name: string;
  /** Google's review form for this business. */
  review_url: string;
  /** Digits for wa.me, or null when the business saved no WhatsApp number. */
  whatsapp: string | null;
};

type CardRow = { status: string; destination: string | null; page_mode: string | null; kind: string | null; location_id: string | null };

/**
 * What the page shows, or null when the code is not an active link set to the page. Nothing here reads a rating,
 * an answer or a visitor: the same data goes to everyone.
 */
export function pageData(card: CardRow | null, name: string | null, whatsappFact: unknown): ReviewPageData | null {
  if (!card || card.kind !== "link" || card.status !== "active" || card.page_mode !== "page" || !card.location_id) return null;
  if (!card.destination || !GOOGLE_REVIEW_RE.test(card.destination) || !name) return null;
  return { name, review_url: card.destination, whatsapp: whatsappDigits(whatsappFact) };
}
