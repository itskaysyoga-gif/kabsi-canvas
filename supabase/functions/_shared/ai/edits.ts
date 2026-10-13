// Edit learning (K-10, K-120.2): when the owner changes a draft before approving it, Kabsi notes the kind of change in
// code (no model call). Three edits of the same kind make one offer, "Save this as a rule?"; a sentence the owner adds
// that carries a fact (a time, a price, a day, something the business does) makes one offer, "Save this as a fact?".
// Nothing is learned silently: an offer only becomes a rule or a fact when the owner says yes (answer_style_offer).
// Reviews are never a source: only the owner's own words are looked at.

export type EditKind = "shorter" | "longer" | "adds_name" | "without_name" | "adds_apology" | "without_apology";

/** What each kind becomes as a rule, in the owner's About your business. */
export const RULE_TEXT: Record<EditKind, string> = {
  shorter: "Keep replies short: two or three sentences.",
  longer: "Replies can be a little longer and more personal.",
  adds_name: "Thank the reviewer by their first name.",
  without_name: "Do not use the reviewer's name.",
  adds_apology: "Say sorry when a customer had a bad experience.",
  without_apology: "Do not apologise unless something actually went wrong.",
};

const wordsOf = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const APOLOGY = /\b(sorry|apologi[sz]e|apologies)\b|آسف|نعتذر|désolé|lo sentimos/i;

export function editKinds(draft: string, final: string, reviewer: string): EditKind[] {
  const a = draft.trim(), b = final.trim();
  if (!a || !b || a === b) return [];
  const kinds: EditKind[] = [];
  const wa = wordsOf(a).length, wb = wordsOf(b).length;
  if (wb <= wa * 0.8 && wa - wb >= 5) kinds.push("shorter");
  if (wb >= wa * 1.25 && wb - wa >= 5) kinds.push("longer");
  const first = reviewer.trim().split(/\s+/)[0] ?? "";
  if (first.length >= 2 && /^\p{L}/u.test(first) && !/^(a|an|the)$/i.test(first)) {
    const has = (s: string) => new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "iu").test(s);
    if (!has(a) && has(b)) kinds.push("adds_name");
    if (has(a) && !has(b)) kinds.push("without_name");
  }
  if (!APOLOGY.test(a) && APOLOGY.test(b)) kinds.push("adds_apology");
  if (APOLOGY.test(a) && !APOLOGY.test(b)) kinds.push("without_apology");
  return kinds;
}

const FACTISH = /\p{Nd}|\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|daily|every day)\b|\b(we|our)\b[^.?\n]*\b(open|close|deliver|offer|serve|sell|have|now|accept|parking|menu|price)\b/iu;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Sentences the owner added that state a fact Kabsi does not have yet (at most two, each up to 200 characters). */
export function factAdditions(draft: string, final: string, known: string): string[] {
  const before = norm(draft), facts = norm(known);
  const out: string[] = [];
  for (const s of final.split(/(?<=[.?])\s+|\n+/).map((x) => x.trim()).filter(Boolean)) {
    const n = norm(s);
    if (!n || before.includes(n) || facts.includes(n)) continue;
    if (!FACTISH.test(s) || s.length > 200) continue;
    out.push(s);
    if (out.length === 2) break;
  }
  return out;
}
