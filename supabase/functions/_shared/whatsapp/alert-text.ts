// What a WhatsApp alert says (P0.8-03, K-129, K-113 as amended 21 Oct 2026): the business, the star rating, the reviewer's
// first name, the review text up to 300 characters and the draft, and the two buttons. Pure text, no database, network or
// environment access, and no Deno API: the `whatsapp` Edge Function sends it, and the public website draws the same message
// in its "Example" mockups (src/components/marketing/mockups.tsx).

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

/** The body of a review alert: business, stars, first name, up to 300 characters of the review, and the draft. */
export function reviewAlertBody(a: ReviewAlert): string {
  const who = firstName(a.reviewer);
  const lines = [`${a.business}: new ${a.stars}-star review${who ? ` from ${who}` : ""}.`];
  const ex = excerpt(a.text);
  if (ex) lines.push(`"${ex}"`);
  if (a.draft) lines.push(`Kabsi's reply: ${a.draft}`);
  else lines.push("This review needs a careful look. Open Kabsi to reply.");
  return lines.join("\n\n").slice(0, 1024);
}

export function postAlertBody(business: string, summary: string): string {
  return `${business}: a post is ready for Google.\n\n${summary}`.slice(0, 1024);
}

export type Button = { id: string; title: string };
/** Approve only where WhatsApp may approve; Edit in app always. Titles are at most 20 characters (Meta's limit). */
export function alertButtons(token: string, mayApprove: boolean): Button[] {
  return [...(mayApprove ? [{ id: `a:${token}`, title: "Approve" }] : []), { id: `e:${token}`, title: "Edit in app" }];
}
export const undoButton = (token: string): Button => ({ id: `u:${token}`, title: "Undo" });
