// The profile description (P0.8-09, K-136.1): a draft of up to 750 characters from facts the owner confirmed, most useful
// facts first, with no links, promotions or contact details (Google's rules for the description). The writer is an AI
// call that waits for AI credit and Hussein's yes (K-146): production passes no `complete`, so it answers "ai_off" and
// nothing is sent anywhere. The check below runs on every draft whoever wrote it. No prompt lives here yet; it arrives
// with the credit.
export const DESCRIPTION_MAX = 750;

export type DescriptionProblem = "too_long" | "empty" | "link" | "email" | "phone" | "promotion" | "shouting" | "repeated";

const PROMOTION = /(\d+\s*%\s*off|\bdiscounts?\b|\bsales?\b|\bcoupons?\b|\bpromo(?:tion|tional)?s?\b|\bfree\b|\bspecial offers?\b|\blimited time\b|\bbook now\b|\bbuy now\b|\bcall now\b|\bdeals?\b|\bcheapest\b|\bbest price\b)/i;

/** What is wrong with this description, in the order a person would fix it. An empty list means it can be shown. */
export function checkDescription(text: string): DescriptionProblem[] {
  const t = text.trim();
  const out: DescriptionProblem[] = [];
  if (!t) return ["empty"];
  if ([...t].length > DESCRIPTION_MAX) out.push("too_long");
  const EMAIL = /[^\s@]+@[^\s@]+\.[a-z]{2,}/gi;
  // An address is an email, not also a link.
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|co|io|app|shop|store|online|site|info|me|lb|uk|us|ae)\b)/i.test(t.replace(EMAIL, " "))) out.push("link");
  if (EMAIL.test(t)) out.push("email");
  if (/(\+?\d[\d\s().-]{6,}\d)/.test(t)) out.push("phone");
  if (PROMOTION.test(t)) out.push("promotion");
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (letters.length > 20 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.4) out.push("shouting");
  const words = t.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  const seen = new Map<string, number>();
  for (const w of words) seen.set(w, (seen.get(w) ?? 0) + 1);
  if ([...seen.values()].some((n) => n >= 6)) out.push("repeated");
  return out;
}

export const PROBLEM_WORDS: Record<DescriptionProblem, string> = {
  too_long: "It is longer than 750 characters.",
  empty: "It is empty.",
  link: "It has a link. Google does not allow links in the description.",
  email: "It has an email address. Google does not allow contact details in the description.",
  phone: "It has a phone number. Google does not allow contact details in the description.",
  promotion: "It reads like an offer. Google does not allow promotions in the description.",
  shouting: "It has too many capital letters.",
  repeated: "It repeats the same word too often.",
};

export type Fact = { key: string; text: string };
// Most useful first. Contact details, prices and special rules are left out on purpose: they are not description material.
const ORDER = ["description", "service", "product", "service_area", "language", "payment_method", "delivery", "accessibility", "parking"];

/** The confirmed facts the writer may use, most useful first, a few of each kind. */
export function usableFacts(facts: Fact[]): Fact[] {
  const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : -1);
  return facts.filter((f) => rank(f.key) >= 0 && f.text.trim()).sort((a, b) => rank(a.key) - rank(b.key)).slice(0, 12);
}

export type DraftDeps = {
  /** The writer. Absent until AI credit is on, so nothing runs. */
  complete?: (input: { name: string; facts: Fact[]; max: number }) => Promise<string>;
};
export type Draft =
  | { state: "ai_off" }
  | { state: "no_facts" }
  | { state: "draft"; text: string }
  | { state: "rejected"; problems: DescriptionProblem[] };

export async function draftDescription(name: string, facts: Fact[], deps: DraftDeps): Promise<Draft> {
  if (!deps.complete) return { state: "ai_off" };
  const use = usableFacts(facts);
  if (!use.length) return { state: "no_facts" };
  const text = (await deps.complete({ name, facts: use, max: DESCRIPTION_MAX })).trim();
  const problems = checkDescription(text);
  return problems.length ? { state: "rejected", problems } : { state: "draft", text };
}
