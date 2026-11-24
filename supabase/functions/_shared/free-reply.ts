// SITE-3 (free check step 4): the business's latest review and the reply Kabsi would write for it, on the free check's
// result page. The review comes from the check's own Place Details call (the reviews field, places/live.ts
// SNAPSHOT_CHECK_FIELD_MASK); it is shown once in the answer and never stored.
//
// The reply is a fixed template, not the AI drafting (ai/reply.ts): the check is an anonymous public endpoint, so it makes no
// paid model call. The template follows the reply rules (ai/prompts/reply.v4.ts) it can follow without a model: it thanks
// the reviewer (by first name when the name looks like one), promises nothing, offers nothing, states no fact about the
// business and never names anyone else; for 1 to 3 stars a calm apology and the contact line. No dashes, no exclamation
// marks (houseStyle). The page says the owner approves every reply.
import type { Place, PlaceReview } from "./google/types.ts";
import { scriptLanguage } from "./ai/checks.ts";
import { houseStyle } from "./ai/fence.ts";
import { CONTACT_LINE } from "./ai/prompts/reply.v4.ts";

export const REVIEW_SHOWN_MAX = 280;

export type LatestReview = {
  stars: number;
  text: string;
  reply: string;
  /** Google's attribution for a review shown off a Google map: the author's name as Google shows it. */
  author: string | null;
};

/** The text cut to about `max` characters at a word, with an ellipsis when it was cut. */
export function truncate(text: string, max = REVIEW_SHOWN_MAX): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

// Names that are not a person's first name, as Google shows them for some reviewers.
const NOT_A_NAME = new Set(["a", "an", "the", "google", "user", "customer", "guest", "client", "local", "anonymous", "someone", "mr", "mrs", "ms", "dr"]);

/** The reviewer's first name when it looks like a real one (a capital letter, then letters), else null. */
export function firstName(displayName: string | null | undefined): string | null {
  const first = String(displayName ?? "").trim().split(/\s+/)[0] ?? "";
  if (!/^\p{Lu}[\p{Ll}'’]{1,19}$/u.test(first)) return null;
  if (!/^[\p{Script=Latin}'’]+$/u.test(first)) return null;
  return NOT_A_NAME.has(first.toLowerCase()) ? null : first;
}

/** The reply Kabsi would write, from the stars and the reviewer's name only. */
export function templateReply(stars: number, displayName: string | null | undefined): string {
  const name = firstName(displayName);
  const contact = CONTACT_LINE.charAt(0).toUpperCase() + CONTACT_LINE.slice(1);
  const text = stars >= 4
    ? `${name ? `Thank you, ${name}.` : "Thank you."} We are glad you took the time to write this, and we hope to see you again.`
    : `${name ? `Thank you for writing this, ${name}.` : "Thank you for writing this."} We are sorry it was not better, and we would like to hear more. ${contact}.`;
  return houseStyle(text);
}

const stars = (r: PlaceReview) => (typeof r.rating === "number" && r.rating >= 1 && r.rating <= 5 ? Math.round(r.rating) : null);
const textOf = (r: PlaceReview) => (r.text?.text ?? r.originalText?.text ?? "").trim();

/**
 * The newest review that has words, with the reply Kabsi would write. Places returns up to 5 reviews ordered by relevance,
 * so they are sorted by publish time here. A review with no text is skipped for the next newest; a review in Arabic script
 * is skipped too, as Kabsi's public pages show no Arabic (R-61). Null when no review qualifies.
 */
export function latestReview(p: Pick<Place, "reviews">): LatestReview | null {
  const rows = (p.reviews ?? [])
    .map((r, i) => ({ r, i, t: Date.parse(r.publishTime ?? "") }))
    .filter((x) => stars(x.r) !== null && textOf(x.r).length > 0 && scriptLanguage(textOf(x.r)) !== "ar")
    .sort((a, b) => (Number.isNaN(b.t) ? -Infinity : b.t) - (Number.isNaN(a.t) ? -Infinity : a.t) || a.i - b.i);
  const hit = rows[0]?.r;
  if (!hit) return null;
  const n = stars(hit)!;
  const author = hit.authorAttribution?.displayName?.trim() || null;
  return { stars: n, text: truncate(textOf(hit)), reply: templateReply(n, author), author };
}
