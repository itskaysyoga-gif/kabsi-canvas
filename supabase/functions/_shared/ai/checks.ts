// Code checks for a drafted reply (K-14 step 4, K-39, K-113.4, K-116.4). Each check has a name (recorded in ai_runs)
// and, when it fails, a sentence the owner reads next to the draft. They run before the model check and whatever it
// says: a draft that fails any of them is never offered as ready.
import { contactIssues } from "../contact.ts";
import type { Memory } from "./memory.ts";
import type { Industry } from "./risk.ts";

export type Check = { name: string; ok: boolean; problem?: string };
export type ReplyOutput = { reply: string; facts_used: string[]; language: string; topics: string[] };

// Sec 1: "on us", a free item, a gift card and "make it up to you" are compensation too (the evaluation's broader list).
const MONEY = /(\d+\s?%\s?off|\bdiscount|\brefund|\bvoucher|\bcoupon|reimburs|compensat|on the house|\b(?:is|are|be|'s) on us\b|\bfree of charge|\bfree (?:meal|coffee|cake|dessert|drink|round|pastr\w*|loaf|bread|item|dish|night|stay|session|class|treatment|visit)s?\b|\bgift (?:card|certificate)|make it up to you|descuento|reembolso|cup[oó]n|\bgratis\b|remise|rembours|خصم|استرداد|تعويض|قسيمة|مجانا|ببلاش)/i;
const FAULT = /\b(our (fault|mistake|error)|it was our (fault|mistake|error)|we (made|make) (a|an) (mistake|error)|we messed up|we were wrong|we (are|were|'re) (responsible|liable|at fault)|we take full responsibility|we admit)\b/i;
const LEAK = /(system prompt|my instructions|these instructions|as an ai\b|language model|business_memory|style_examples|<\/?customer_review)/i;
const PERSONAL = /\b(order|booking|reservation|invoice|account|table|ticket)\s*(number|no\.?|#)\s*\S+|\b(as (our|a) (patient|client))\b|\byour (appointment|treatment|prescription|diagnosis|visit on|order on|booking on)\b/i;
// K-13: a health, legal or financial business never confirms the reviewer was a patient or client, never mentions a
// treatment, a visit, a case or an account. English, Spanish, French and Arabic.
const RELATIONSHIP = /\b(patients?|clients?|treatments?|treated|appointments?|procedures?|diagnos\w*|prescri\w*|therapy|surgery|consultations?|your (visit|stay|case|matter|account|file|policy|loan|session|results?)|you (visited|came in|came to see us|were seen|were treated)|(visiting|choosing|trusting) us|pacientes?|tratamientos?|citas?|consultas?|traitements?|rendez-vous|dossier)\b|مريض|مرضى|علاج|موعد|زيارتك|عميل|موكل/i;
const CLAIM = /\b(we (offer|serve|sell|deliver|provide|accept|stock|open|close)|we(?:'re| are) open|our (menu|prices?|policy|policies|hours|delivery|opening))\b/i;
const HOURS = /\b\d{1,2}(:\d{2})?\s?(am|pm)\b|\b\d{1,2}:\d{2}\b|\b(open|close[sd]?|opening|closing)\s+(at|until|till|from|on|every)\b/i;
const TIME = /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)?\b/gi;

/** K-14: stock AI wording Google's reply moderation and owners recognise as boilerplate. */
export const STOCK_PHRASES = [
  "thrilled to hear", "your kind words", "we look forward to welcoming you back", "means the world", "valued customer",
  "delighted to hear", "it was a pleasure serving you", "we strive to", "your feedback is invaluable",
  "we truly appreciate your feedback", "we are so glad you enjoyed", "thank you for taking the time to leave",
  "we appreciate you taking the time", "hope to see you again soon",
];

// Capitalised words that are not names (sentence starters, days, months, languages, brands).
const NOT_NAMES = new Set(`a an and as at all again also best but can come could dear do don't enjoy every feel for from glad
good great happy have he hello hi hope how i if in is it it's its just kind let looking many monday tuesday wednesday thursday
friday saturday sunday january february march april may june july august september october november december next no of
on our please regards she should so sorry take team thank thanks that the there they this thx to unfortunately we we're
welcome what when will wishing with would yes you you're your warm cheers english arabic french spanish google kabsi
ok okay oh wow yislamo ahla sahla merci gracias best wishes`.split(/\s+/));

const words = (s: string) => s.toLowerCase().normalize("NFKC").match(/[\p{L}\p{N}']+/gu) ?? [];

function bigrams(s: string) {
  const w = words(s);
  const out = new Set<string>();
  for (let i = 0; i < w.length - 1; i++) out.add(`${w[i]} ${w[i + 1]}`);
  return out;
}
/** Dice similarity of word pairs, 0 to 1. */
export function similarity(a: string, b: string) {
  const x = bigrams(a), y = bigrams(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const g of x) if (y.has(g)) both++;
  return (2 * both) / (x.size + y.size);
}

/** Capitalised (Latin) words that read as a person's name: mid-sentence, or capitalised in the review itself. */
export function nameCandidates(reply: string, review: string): string[] {
  const inReview = new Set([...review.matchAll(/\b\p{Lu}\p{Ll}{2,}\b/gu)].map((m) => m[0]));
  const out: string[] = [];
  for (const sentence of reply.split(/(?<=[.?!\n])\s*/)) {
    const tokens = [...sentence.matchAll(/\b\p{Lu}\p{Ll}{2,}\b/gu)];
    tokens.forEach((m, i) => {
      const w = m[0];
      if (NOT_NAMES.has(w.toLowerCase())) return;
      const first = i === 0 && sentence.trimStart().startsWith(w);
      if (!first || inReview.has(w)) out.push(w);
    });
  }
  return [...new Set(out)];
}

export type CheckInput = {
  out: ReplyOutput; memory: Memory; reviewer: string; reviewText: string; recentReplies: string[];
  industry?: Industry | null;
};

/** Every code check, in order. A failed check carries the sentence the owner sees. The sentences never quote the
 *  review or the draft: they are kept in reply_drafts.safety_notes, which outlives the review text (K-113.3). */
export function replyChecks(i: CheckInput): Check[] {
  const { out, memory } = i;
  const reply = out.reply;
  // Own keys only (Sec 1): `in` also finds "constructor" or "toString" on every object, which let a cited fake id count as a fact.
  const cited = out.facts_used.filter((r) => Object.hasOwn(memory.refs, r));
  const citedText = cited.map((r) => memory.factText[r]).join("\n");
  const allowedNames = new Set([
    ...words(i.reviewer), ...memory.knownNames.flatMap(words), ...cited.flatMap((r) => words(memory.factText[r])),
  ]);
  const checks: Check[] = [];
  const add = (name: string, ok: boolean, problem: string) => checks.push(ok ? { name, ok } : { name, ok, problem });

  const unknown = out.facts_used.filter((r) => !Object.hasOwn(memory.refs, r));
  add("facts_in_trusted_set", unknown.length === 0, "Kabsi couldn't safely verify this detail: the draft relies on something that is not in your facts.");
  const names = nameCandidates(reply, i.reviewText).filter((w) => !allowedNames.has(w.toLowerCase()));
  add("no_invented_names", names.length === 0, "Kabsi couldn't safely verify this detail: the draft names a person or place that is not in your facts.");
  add("claims_have_facts", !CLAIM.test(reply) || cited.length > 0, "Kabsi couldn't safely verify this detail: the draft says something about the business that is not in your facts.");
  const times = [...reply.matchAll(TIME)].map((m) => m[0].toLowerCase().replace(/\s/g, "")).filter((t) => /\d/.test(t) && /(am|pm|:)/.test(t));
  const hoursCited = cited.some((r) => memory.factField[r] === "hours_note");
  const hoursOk = !HOURS.test(reply) || (hoursCited && times.every((t) => citedText.toLowerCase().replace(/\s/g, "").includes(t)));
  add("hours_from_facts", hoursOk, "Kabsi couldn't safely verify this detail: the opening hours in the draft are not in your facts.");
  const contact = contactIssues(reply, { allowedText: citedText });
  const price = contact.filter((p) => p.includes("price"));
  add("prices_from_facts", price.length === 0, "Kabsi couldn't safely verify this detail: the draft states a price that is not in your facts.");
  const other = contact.filter((p) => !p.includes("price"));
  add("no_contact_details", other.length === 0, `The draft ${other.join(", ")}. Google can reject replies with contact details.`);
  add("no_compensation", !MONEY.test(reply), "The draft offers a discount, refund, voucher or compensation.");
  add("no_admission_of_fault", !FAULT.test(reply), "The draft admits fault.");
  add("no_personal_data", !PERSONAL.test(reply), "The draft mentions personal details about the customer.");
  if (i.industry) {
    add("no_patient_or_client", !RELATIONSHIP.test(reply), "The draft confirms they were a patient or client, or mentions a visit or treatment. A health, legal or financial business never does that in public.");
  }
  add("no_emoji", !/\p{Extended_Pictographic}|<3/u.test(reply), "The draft contains an emoji or heart.");
  const noTimes = reply.replace(/\b\d{1,2}(:\d{2})?\s?(am|pm)\b/gi, "");
  add("no_arabizi", !/[a-z][2379][a-z]|(^|[\s,.!?])[2379][a-z]{2,}/i.test(noTimes), "The draft writes Arabic with numbers for letters.");
  add("no_instruction_talk", !LEAK.test(reply), "The draft talks about its instructions instead of replying.");
  const stock = STOCK_PHRASES.filter((p) => reply.toLowerCase().includes(p));
  add("no_stock_phrases", stock.length === 0, `The draft uses stock wording ("${stock[0]}") that reads as automatic.`);
  const close = i.recentReplies.some((r) => similarity(reply, r) > 0.8);
  add("not_a_repeat", !close, "The draft is too close to a reply you already posted. Google can treat repeated replies as boilerplate.");
  add("not_empty", reply.trim().length > 0 && reply.length <= 1200, "The draft is empty or too long.");
  return checks;
}

export const problems = (checks: Check[]) => checks.filter((c) => !c.ok).map((c) => c.problem!).slice(0, 6);
