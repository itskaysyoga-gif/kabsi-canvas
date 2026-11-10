// What a WhatsApp alert says (P0.8-03, K-129, K-113 as amended 21 Oct 2026): the business, the star rating, the reviewer's
// first name, the review text up to 300 characters and the draft, and the two buttons. Pure text, no database, network or
// environment access, and no Deno API: the `whatsapp` Edge Function sends it, and the public website draws the same message
// in its "Example" mockups (src/components/marketing/mockups.tsx).

import { MARK, quote, render } from "./look.ts";

export const REVIEW_EXCERPT_MAX = 300;

export type ReviewAlert = { business: string; stars: number; reviewer: string | null; text: string | null; draft: string | null };

/** The reviewer's first name only (K-113 as amended): never the full name. */
export function firstName(name: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first && first.length <= 40 ? first : null;
}

export function excerpt(text: string | null, max = REVIEW_EXCERPT_MAX): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 3).trimEnd()}...`;
}

/**
 * The body of a review alert in look 2 (30.50 item 2): a star and "New 5-star review" with the business, then who wrote
 * it, the review and Kabsi's draft as WhatsApp quote lines, then one question or status. `end` is that last line: the
 * sender's question when the owner can approve here, or where to open it.
 */
export function reviewAlertBody(a: ReviewAlert, end?: string | null): string {
  const who = firstName(a.reviewer);
  const facts = [...(who ? [`From ${who}`] : []), ...quote(excerpt(a.text)),
    ...(a.draft ? ["Kabsi's reply:", ...quote(a.draft)] : ["This review needs a careful look. Open Kabsi to reply."])];
  return render({ mark: MARK.review, title: `New ${a.stars}-star review`, business: a.business, facts, end: end ?? null }).slice(0, 1024);
}

/** A prepared post in look 2: a picture, "Post ready for Google" with the business, the post as a quote, then `end`. */
export function postAlertBody(business: string, summary: string, end?: string | null): string {
  return render({ mark: MARK.picture, title: "Post ready for Google", business, facts: quote(summary), end: end ?? null }).slice(0, 1024);
}

export type Button = { id: string; title: string };
/** Approve only where WhatsApp may approve; Edit on kabsi.co always. Titles are at most 20 characters (Meta's limit). */
export function alertButtons(token: string, mayApprove: boolean): Button[] {
  return [...(mayApprove ? [{ id: `a:${token}`, title: "Approve" }] : []), { id: `e:${token}`, title: "Edit on kabsi.co" }];
}
export const undoButton = (token: string): Button => ({ id: `u:${token}`, title: "Undo" });
