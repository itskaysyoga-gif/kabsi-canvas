// The words on a review graphic (P0.8-07, K-134, K-113): what may appear, cleaned and cut. Pure, no imports, so the Edge
// Function and the tests share it. Only the reviewer's first name and initial and the review text (about 200
// characters) ever reach the image; nothing is stored.

export const MAX_CHARS = 200;
/** Shortest cut that still reads as a quote: the cut looks back for a space no further than this. */
const MIN_CUT = 120;

export type GraphicText =
  | { ok: true; text: string; name: string }
  | { ok: false; reason: "rating" | "no_text" | "unsupported_script" };

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const BARE_DOMAIN_RE = /\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|me|app|biz|info|shop|store|online|site|xyz|lb|ae|sa|uk|us|fr|de)\b\S*/gi;
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const HANDLE_RE = /(^|\s)[@#][\p{L}\p{N}_.]+/gu;
// A run of seven or more digits, with the separators people put in phone numbers.
const PHONE_RE = /(?:\+?\d[\s().-]?){7,}/g;
const EMOJI_RE = /[\p{Extended_Pictographic}‍︎️\u{1f3fb}-\u{1f3ff}⃣]/gu;
// Letters of any script other than Latin. The fonts and the layout here are Latin only.
const OTHER_SCRIPT_RE = /[^\P{L}\p{Script=Latin}]/u;

/** "Maria Khoury" gives "Maria K."; one name stays as it is; no name or an unsupported one is "A customer". */
export function reviewerLabel(name: string | null | undefined): string {
  const parts = (name ?? "").replace(EMOJI_RE, "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ?? "";
  if (!first || /^a$/i.test(first) || OTHER_SCRIPT_RE.test(parts.join(" ")) || !/\p{L}/u.test(first)) return "A customer";
  const cleanFirst = first.replace(/[^\p{L}'-]/gu, "").slice(0, 20);
  if (!cleanFirst) return "A customer";
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const initial = last ? (last.match(/\p{L}/u)?.[0] ?? "") : "";
  return initial ? `${cleanFirst} ${initial.toUpperCase()}.` : cleanFirst;
}

/** Links, contact details, hashtags and emoji removed, dashes and exclamation marks softened to Kabsi's style. */
export function cleanReviewText(raw: string): string {
  return raw
    .replace(URL_RE, " ")
    .replace(EMAIL_RE, " ")
    .replace(BARE_DOMAIN_RE, " ")
    .replace(PHONE_RE, " ")
    .replace(HANDLE_RE, "$1")
    .replace(EMOJI_RE, "")
    .replace(/[–—]/g, " - ")
    .replace(/!+/g, ".")
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:?])/g, "$1")
    .replace(/\.{2,}/g, ".")
    .trim();
}

/** Cut at a word boundary near `max` characters and add an ellipsis. Short text is left alone. */
export function cutText(text: string, max = MAX_CHARS): string {
  if ([...text].length <= max) return text;
  const chars = [...text];
  const head = chars.slice(0, max + 1).join("");
  const space = head.lastIndexOf(" ");
  const cut = space >= MIN_CUT ? head.slice(0, space) : chars.slice(0, max).join("");
  return `${cut.replace(/[\s.,;:\-]+$/u, "")}…`;
}

/**
 * What goes on the graphic for one review, or why there is none: only 4 and 5 star reviews (K-134), a review with
 * words, and Latin script text.
 */
export function graphicText(review: { star_rating: number; comment: string | null; reviewer_name: string | null }): GraphicText {
  if (review.star_rating < 4) return { ok: false, reason: "rating" };
  const cleaned = cleanReviewText(review.comment ?? "");
  if (OTHER_SCRIPT_RE.test(cleaned)) return { ok: false, reason: "unsupported_script" };
  if (cleaned.replace(/[^\p{L}\p{N}]/gu, "").length < 3) return { ok: false, reason: "no_text" };
  return { ok: true, text: cutText(cleaned), name: reviewerLabel(review.reviewer_name) };
}

/** The words the owner reads when a graphic cannot be made. */
export const REFUSAL: Record<Exclude<GraphicText, { ok: true }>["reason"], string> = {
  rating: "Graphics are made for 4 and 5 star reviews.",
  no_text: "This review has no words to show. Graphics need a written review.",
  unsupported_script: "Graphics for reviews in this language are not available yet.",
};
