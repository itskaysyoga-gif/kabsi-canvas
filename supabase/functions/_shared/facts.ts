// One list of the owner's business facts ("About your business", the knowledge card) for every prompt,
// so replies, posts and their checks can't drift apart (D260). The owner wrote these; they are still passed
// to models inside <business_facts> as data, and only ever used when relevant.
export type KnowledgeCard = Record<string, unknown> & {
  signature?: string; signature_ar?: string; tone?: string; tone_notes?: string; contact_phone?: string;
  about?: string; services?: string; price_notes?: string; booking?: string; payment_methods?: string;
  hours_note?: string; service_area?: string; delivery?: string | boolean; parking?: string; accessibility?: string;
  wifi?: string; languages?: string; policies?: string; mention?: string; staff_names?: string[]; avoid?: string;
  faqs?: { q?: string; a?: string }[];
};

const str = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Facts as "Label: value" lines. `use` decides what is allowed where: replies may use the phone number and staff
 *  names; posts never carry phone numbers (the button does) or staff names. */
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
    add("Phone for customers who need to talk", card.contact_phone);
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
