// Kabsi's memory of one business (K-120): a compact, versioned summary built only from what the owner gave or
// confirmed. It holds the verified facts (each with a short id the model cites in facts_used), the voice rules, the
// owner's own rules, what never to say, and the questions Kabsi is still waiting on. The owner's last approved replies
// are a separate part (style examples). Both parts are the same bytes from draft to draft until a fact changes or a new
// reply is approved, so prompt caching reuses them (K-120.4). Reviews are never a source of facts (K-120.2).
import { fieldOfSlot, type FactRow, isTrusted, type KnowledgeCard, cardFromFacts } from "../facts.ts";
import type { SystemPart } from "./client.ts";
import { clean } from "./fence.ts";

const LABEL: Record<string, string> = {
  about: "About the business",
  services: "Products and services",
  price_notes: "Prices (only as the owner wrote them)",
  booking: "How to book or order",
  payment_methods: "Payment methods",
  hours_note: "Opening hours details",
  service_area: "Delivery or service area",
  delivery: "Delivery",
  parking: "Parking",
  accessibility: "Accessibility",
  wifi: "Wi-Fi",
  languages: "Languages the team speaks",
  policies: "Policies (returns, bookings, cancellations, pets, children)",
  mention: "Things the owner wants mentioned when relevant",
  staff_names: "Staff member who may be named",
  faqs: "Question and answer",
};
// Voice and rules are memory, not facts to cite.
const VOICE = new Set(["tone", "tone_notes", "signature", "signature_ar", "avoid", "custom_rules", "contact_phone"]);
// What the owner is being asked about (K-11 open questions), by fact key.
const QUESTION_TOPIC: Record<string, string> = {
  hours_note: "opening hours", regular_hours: "opening hours", phone: "the phone number", contact: "contact details",
  service: "products and services", product: "products", price_note: "prices",
};

const one = (s: unknown) => (typeof s === "string" ? clean(s).replace(/\s+/g, " ").trim() : "");

export type Memory = {
  /** sha256 of the memory text, first 12 hex characters; recorded on every run. */
  version: string;
  text: string;
  styleText: string;
  /** F1, F2... to the knowledge_facts id. */
  refs: Record<string, string>;
  /** The text of each cited fact, for the checks. */
  factText: Record<string, string>;
  /** The fact's field (card field name), by ref. */
  factField: Record<string, string>;
  card: KnowledgeCard;
  signoff: string;
  /** Names the reply may use besides the reviewer's: staff in the facts, the business, the sign-off. */
  knownNames: string[];
  replies: string[];
};

async function sha12(text: string) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
  return [...d].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 12);
}

export async function buildMemory(o: {
  business: string; facts: FactRow[]; approvedReplies: string[]; openQuestions: string[]; language?: string; now?: number;
}): Promise<Memory> {
  const trusted = o.facts.filter((f) => isTrusted(f, o.now)).sort((a, b) => a.slot.localeCompare(b.slot));
  const card = cardFromFacts(trusted, o.now);
  const refs: Record<string, string> = {};
  const factText: Record<string, string> = {};
  const factField: Record<string, string> = {};
  const lines: string[] = [];
  let n = 0;
  for (const f of trusted) {
    const field = fieldOfSlot(f.slot);
    if (!field || VOICE.has(field) || !LABEL[field]) continue;
    const v = f.value!;
    const item = v.item as { q?: string; a?: string } | undefined;
    const text = field === "staff_names" ? one(v.name)
      : field === "faqs" ? `Q: ${one(item?.q)} A: ${one(item?.a)}`
      : field === "delivery" && typeof v.offered === "boolean" ? (v.offered ? "yes" : "no")
      : one(v.text);
    if (!text) continue;
    const ref = `F${++n}`;
    refs[ref] = f.id;
    factText[ref] = text;
    factField[ref] = field;
    lines.push(`[${ref}] ${LABEL[field]}: ${text}`);
  }
  const tone = card.tone === "formal" ? "formal and courteous" : card.tone === "short" ? "short and friendly" : "warm and personal";
  const signoff = (o.language?.startsWith("ar") && one(card.signature_ar)) || one(card.signature) || one(o.business);
  const rules = (card.custom_rules ?? []).map(one).filter(Boolean);
  const avoid = one(card.avoid);
  const waiting = [...new Set(o.openQuestions.map((k) => QUESTION_TOPIC[k]).filter(Boolean))];
  const staff = (card.staff_names ?? []).map(one).filter(Boolean);

  const text = [
    "<business_memory>",
    `Business: ${one(o.business)}`,
    "Facts (verified by the owner; cite each one you use by its id):",
    ...(lines.length ? lines : ["(no facts yet)"]),
    `Voice: ${tone}.${one(card.tone_notes) ? ` Owner's note on voice: ${one(card.tone_notes)}` : ""}`,
    `Sign-off: ${signoff}${card.signature_ar && card.signature ? ` (for replies in Arabic: ${one(card.signature_ar)})` : ""}`,
    ...(rules.length ? ["Owner's rules:", ...rules.map((r) => `- ${r}`)] : []),
    ...(avoid ? [`Never mention or promise: ${avoid}`] : []),
    ...(waiting.length ? [`Kabsi is still checking with the owner about: ${waiting.join(", ")}. Say nothing about these.`] : []),
    "</business_memory>",
  ].join("\n");

  const replies = o.approvedReplies.map((r) => clean(r).trim()).filter(Boolean).slice(0, 5);
  const styleText = replies.length
    ? ["<style_examples>", "Replies the owner approved before (voice and length only):", ...replies.map((r, i) => `${i + 1}. ${r.replace(/\s+/g, " ")}`), "</style_examples>"].join("\n")
    : "";

  return {
    version: await sha12(text), text, styleText, refs, factText, factField, card, signoff,
    knownNames: [...staff, one(o.business), signoff].filter(Boolean), replies,
  };
}

/** The memory as cacheable system parts, after the fixed rules. */
export const memoryParts = (m: Memory): SystemPart[] =>
  [{ text: m.text, cache: true }, ...(m.styleText ? [{ text: m.styleText, cache: true }] : [])];
