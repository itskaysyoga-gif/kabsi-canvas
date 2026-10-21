// Business Knowledge in the browser (P0.3-01, K-10, K-11, K-120): the facts of "About your business", read through
// RLS and changed only through the membership-checked RPCs (save_fact, confirm_fact, reject_fact, remove_fact,
// answer_knowledge_confirm). Drafts use only the facts shown here as Verified.
import { supabase } from "@/lib/supabase";

/** The fields of About your business. Their names are the slot names of the facts (card.<field>[:<item>]). */
export type TextField =
  | "signature"
  | "signature_ar"
  | "tone"
  | "tone_notes"
  | "about"
  | "services"
  | "price_notes"
  | "booking"
  | "payment_methods"
  | "hours_note"
  | "service_area"
  | "delivery"
  | "parking"
  | "accessibility"
  | "wifi"
  | "languages"
  | "policies"
  | "contact_phone"
  | "manager_whatsapp"
  | "mention"
  | "avoid";
export type ListField = "staff_names" | "faqs" | "custom_rules";
export type Field = TextField | ListField;

/** A fact's value, as the database stores it per key (K-10). */
export type FactValue = {
  text?: string;
  name?: string;
  offered?: boolean;
  item?: { q?: string; a?: string };
  display?: string;
  part?: string;
  kind?: string;
  language?: string;
};
export type Fact = {
  id: string;
  slot: string;
  key: string;
  value: FactValue | null;
  status: "verified" | "needs_confirmation" | "outdated" | "rejected";
  source: string;
  review_after: string | null;
  confirmed_at: string | null;
};
export type ConfirmQuestion = {
  id: string;
  slot: string;
  key: string;
  proposed_value: FactValue;
  proposed_source: string;
};

/** What the owner sees on each fact. */
export type FactState = "verified" | "needs_ok" | "out_of_date";

export function factState(f: Fact, now = Date.now()): FactState | null {
  if (f.status === "rejected") return null;
  if (f.status === "needs_confirmation") return "needs_ok";
  if (f.status === "outdated") return "out_of_date";
  if (f.review_after && Date.parse(f.review_after) <= now) return "out_of_date";
  return "verified";
}

export const fieldOf = (slot: string) => slot.replace(/^card\./, "").split(":")[0] as Field;

/** The fact as one line of text the owner reads. */
export function factText(value: FactValue | null | undefined): string {
  if (!value) return "";
  if (typeof value.offered === "boolean") return value.offered ? "Yes, we deliver" : "No delivery";
  if (typeof value.name === "string") return value.name;
  const item = value.item;
  if (item && typeof item === "object") return `${item.q ?? ""}\n${item.a ?? ""}`.trim();
  if (typeof value.text === "string") return value.text;
  if (typeof value.display === "string") return value.display;
  return "";
}

const FROM: Record<string, string> = {
  owner: "From you",
  staff: "From the Kabsi team",
  google: "From your Google profile",
  website: "From your website",
  ai_suggestion: "Suggested by Kabsi",
};
/** Where a fact came from, as a short line: "From your website", "Suggested by Kabsi". */
export const fromLine = (source: string) => FROM[source] ?? "From another source";

export async function loadKnowledge(
  locationId: string,
): Promise<{ facts: Fact[]; questions: ConfirmQuestion[] }> {
  const [facts, questions] = await Promise.all([
    supabase
      .from("knowledge_facts")
      .select("id, slot, key, value, status, source, review_after, confirmed_at")
      .eq("location_id", locationId)
      .is("superseded_by", null)
      .like("slot", "card.%")
      .neq("status", "rejected")
      .order("created_at"),
    supabase
      .from("knowledge_confirms")
      .select("id, slot, key, proposed_value, proposed_source")
      .eq("location_id", locationId)
      .eq("state", "open")
      .order("created_at"),
  ]);
  if (facts.error) throw new Error(facts.error.message);
  if (questions.error) throw new Error(questions.error.message);
  return {
    facts: (facts.data ?? []) as Fact[],
    questions: (questions.data ?? []) as ConfirmQuestion[],
  };
}

/** The verified facts as field values (lists as arrays), the same filter the drafts use. */
export function verifiedValues(facts: Fact[], now = Date.now()) {
  const out: Partial<Record<Field, unknown>> = {};
  for (const f of facts) {
    if (factState(f, now) !== "verified") continue;
    const field = fieldOf(f.slot);
    if (field === "staff_names" || field === "faqs" || field === "custom_rules") {
      out[field] = [...((out[field] as unknown[] | undefined) ?? []), f.value];
    } else {
      out[field] = f.value?.offered ?? f.value?.text;
    }
  }
  return out;
}

const POST_FIELDS: Field[] = [
  "about",
  "services",
  "price_notes",
  "booking",
  "payment_methods",
  "hours_note",
  "service_area",
  "delivery",
  "parking",
  "accessibility",
  "wifi",
  "languages",
  "policies",
  "mention",
  "faqs",
];
/** Weekly post drafts need at least one verified fact beyond the sign-off. */
export const hasPostFacts = (facts: Fact[]) => {
  const v = verifiedValues(facts);
  return POST_FIELDS.some((k) => v[k] !== undefined && v[k] !== "" && v[k] !== false);
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const saveFact = (
  locationId: string,
  field: Field,
  value: string | boolean | { q: string; a: string },
  factId?: string,
) =>
  rpc<string>("save_fact", {
    p_location: locationId,
    p_field: field,
    p_value: value,
    p_fact: factId ?? null,
  });
export const confirmFact = (factId: string) => rpc<string>("confirm_fact", { p_fact: factId });
export const rejectFact = (factId: string) => rpc<string>("reject_fact", { p_fact: factId });
export const removeFact = (factId: string) => rpc<number>("remove_fact", { p_fact: factId });
export const answerQuestion = (id: string, answer: "current" | "proposed") =>
  rpc<string>("answer_knowledge_confirm", { p_item: id, p_answer: answer });
