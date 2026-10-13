// One list of the owner's business facts ("About your business") for every prompt, so replies, posts and their
// checks can't drift apart (D260). Since P0.3-01 they come only from Business Knowledge (knowledge_facts, K-10):
// public.draft_facts returns the verified, current facts for one use, and cardFromFacts filters again, so an AI
// suggestion, an unconfirmed website fact or a fact past its ask-again date never reaches a prompt (K-11, K-120).
// They are still passed to models inside <business_facts> as data, and only ever used when relevant.
export type KnowledgeCard = Record<string, unknown> & {
  signature?: string; signature_ar?: string; tone?: string; tone_notes?: string; contact_phone?: string;
  about?: string; services?: string; price_notes?: string; booking?: string; payment_methods?: string;
  hours_note?: string; service_area?: string; delivery?: string | boolean; parking?: string; accessibility?: string;
  wifi?: string; languages?: string; policies?: string; mention?: string; staff_names?: string[]; avoid?: string;
  faqs?: { q?: string; a?: string }[]; custom_rules?: string[];
};

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Facts as "Label: value" lines. `use` decides what is allowed where: replies may use staff names; neither replies
 *  nor posts ever carry the phone number (K-113.4, K-14, K-116.3): the profile and the post button do. */
export function businessFacts(card: KnowledgeCard, use: "reply" | "post"): string[] {
  const out: string[] = [];
  const add = (label: string, v: unknown) => { const s = str(v); if (s) out.push(`${label}: ${s}`); };
  add("About the business", card.about);
  add("Products and services", card.services);
  add("Prices (only as the owner wrote them)", card.price_notes);
  add("How to book or order", card.booking);
  add("Payment methods", card.payment_methods);
  add("Opening hours details", card.hours_note);
  add("Delivery or service area", card.service_area);
  if (card.delivery === true) out.push("Delivery: yes");
  else add("Delivery", card.delivery);
  add("Parking", card.parking);
  add("Accessibility", card.accessibility);
  add("Wi-Fi", card.wifi);
  add("Languages the team speaks", card.languages);
  add("Policies (returns, bookings, cancellations, pets, children)", card.policies);
  add("Things the owner wants mentioned when relevant", card.mention);
  if (use === "reply") {
    const staff = (card.staff_names ?? []).map(str).filter(Boolean);
    if (staff.length) out.push(`Staff names that may be used: ${staff.join(", ")}`);
  }
  for (const f of card.faqs ?? []) if (str(f?.q) && str(f?.a)) out.push(`Q: ${str(f.q)} A: ${str(f.a)}`);
  return out;
}

export function factsBlock(card: KnowledgeCard, use: "reply" | "post") {
  const lines = businessFacts(card, use);
  return `<business_facts>\n${lines.length ? lines.join("\n") : "(no extra facts)"}\n</business_facts>`;
}

/** Weekly post drafts need at least one real fact beyond the sign-off. */
export const hasPostFacts = (card: KnowledgeCard) => businessFacts(card, "post").length > 0;

// ─── Business Knowledge (P0.3-01) ────────────────────────────────────────────────────────────────────────────────

/** One row of public.draft_facts (a current knowledge_facts version). */
export type FactRow = {
  id: string; slot: string; key: string; value: Record<string, unknown> | null; status: string;
  review_after: string | null; superseded_by?: string | null;
};
export type FactUse = "replies" | "posts";

/** The facts a draft may use, in the shape the prompts read. Only verified, current facts that are not past their
 *  ask-again date count; anything else is dropped here too, whatever the caller passed. The slot names the field of
 *  About your business (card.<field>[:<item>]); profile details (profile.*) are Google Protection's, not drafts'. */
/** Whether a draft may use this fact: verified, current, within its ask-again date. */
export const isTrusted = (f: FactRow, now = Date.now()) =>
  f.status === "verified" && !f.superseded_by && !!f.value && !(f.review_after && Date.parse(f.review_after) <= now);
/** The field of About your business a fact belongs to (card.<field>[:<item>]), or null for a profile detail. */
export const fieldOfSlot = (slot: string) => /^card\.([a-z_]+)(?::.+)?$/.exec(slot)?.[1] ?? null;

export function cardFromFacts(rows: FactRow[], now = Date.now()): KnowledgeCard {
  const card: KnowledgeCard = {};
  for (const f of rows) {
    if (!isTrusted(f, now)) continue;
    const m = /^card\.([a-z_]+)(?::.+)?$/.exec(f.slot);
    if (!m) continue;
    const field = m[1];
    const v = f.value!;
    if (field === "staff_names") {
      const name = str(v.name);
      if (name) (card.staff_names ??= []).push(name);
    } else if (field === "faqs") {
      const item = (v.item ?? {}) as { q?: string; a?: string };
      if (str(item.q) && str(item.a)) (card.faqs ??= []).push({ q: str(item.q), a: str(item.a) });
    } else if (field === "custom_rules") {
      const text = str(v.text);
      if (text) (card.custom_rules ??= []).push(text);
    } else if (field === "delivery") {
      card.delivery = typeof v.offered === "boolean" ? v.offered : str(v.text);
    } else if (str(v.text)) {
      card[field] = str(v.text);
    }
  }
  return card;
}

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

/** The trusted facts of one business for one use (null: every use, Google Protection's mock seed). */
export async function loadCard(db: Rpc, locationId: string, use: FactUse | null): Promise<KnowledgeCard> {
  const { data, error } = await db.rpc("draft_facts", { p_location: locationId, p_use: use });
  if (error) throw error;
  return cardFromFacts((data ?? []) as FactRow[]);
}
