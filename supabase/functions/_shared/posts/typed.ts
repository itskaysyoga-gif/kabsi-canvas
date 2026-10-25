// A post the owner typed, on WhatsApp or in the app (master plan 30.10 point 7). The words are the owner's: Kabsi only
// puts them in the house style (no dashes, no exclamation marks) and refuses contact details, links, handles and
// hashtags, which Google's post rules and K-116.3 keep out. The database then makes the draft (owner_post_prepare)
// and the owner approves exactly that text, with the 10 second undo, through the one publication pipeline.
import { contactIssues } from "../contact.ts";
import { noDashes } from "../ai/fence.ts";

export type TypedPost = { ok: true; text: string } | { ok: false; problems: string[] };

export function checkTypedPost(raw: string): TypedPost {
  const text = noDashes(raw.replace(/\s+/g, " ").trim()).replace(/!+/g, ".").replace(/\.{2,}/g, ".").replace(/\s+\./g, ".");
  const problems = contactIssues(text, { allowedText: "" });
  if (text.length < 10) problems.push("is too short for a post (at least 10 characters)");
  if (text.length > 1500) problems.push("is too long for a post (at most 1,500 characters)");
  return problems.length ? { ok: false, problems } : { ok: true, text };
}
