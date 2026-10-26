// The monthly business-update question (master plan 30.15 section 3.3, V3). Once a month Kabsi asks the owner on WhatsApp:
// "Any new services, prices, products or opening times?" The answer becomes drafts to approve, never anything published on its
// own: a post made of the owner's own words (house style only, no invented facts) and, when the answer is clearly a change of
// days or hours, an hours draft the owner approves with a Yes. No model call is needed, so it costs nothing to run.
import { checkTypedPost } from "../posts/typed.ts";
import { parseHours } from "../whatsapp/hours-parse.ts";

export const MONTHLY_QUESTION = (business: string) =>
  `${business}: anything new this month? Any new services, prices, products or opening times? Reply here in your own words, or reply No if nothing changed. Kabsi turns your answer into drafts, and nothing goes live without your yes.`;

/** How long the owner has to answer before a later message is no longer read as the answer. */
export const ANSWER_WINDOW_MS = 3 * 86_400_000;

const NOTHING = /^(no|nope|nothing|nothing new|nothing changed|no changes?|same|all the same|not this month|nada|nada nuevo|لا|ولا شي|ما في جديد)$/i;

export type UpdateAnswer =
  | { kind: "nothing" }
  | { kind: "hours"; text: string }
  | { kind: "post"; text: string }
  | { kind: "refused"; problems: string[] };

/** What the owner's answer becomes. `now` and `tz` read days like "tomorrow" or "Friday" the way the owner means them. */
export function readUpdate(raw: string, now: Date, tz: string): UpdateAnswer {
  const text = raw.replace(/\s+/g, " ").trim();
  if (NOTHING.test(text.replace(/[.!?]+$/g, ""))) return { kind: "nothing" };
  // A short answer that is only a day or an hour change is an hours draft; a longer one is also about services or prices, so it
  // goes whole into the post and the owner changes hours on their own ("closed Friday" inside a longer answer stays in the post).
  const hours = text.length <= 90 ? parseHours(text, now, tz) : null;
  if (hours?.ok) return { kind: "hours", text };
  // A price the owner just told Kabsi is their own fact, so it may stand in the post; phone numbers, links and handles still may not.
  const post = checkTypedPost(text, { statedByOwner: true });
  return post.ok ? { kind: "post", text: post.text } : { kind: "refused", problems: post.problems };
}
