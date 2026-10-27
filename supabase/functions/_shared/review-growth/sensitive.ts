// Sensitive reviews on WhatsApp (master plan 30.15 section 3.7, V3). A review about health, a threat, legal action or a
// named member of staff goes to the owner with no draft, no Approve button, no excerpt of what the customer wrote, and a way
// to reach a person. A clinic (health, legal or financial business) never gets patient or client details in WhatsApp at all.
// The risk levels and their reasons are risk.ts (K-13); this file only decides what WhatsApp may carry. Pure.
import { industryOf, type Industry, isReason, namesStaffInComplaint } from "../ai/risk.ts";

export { namesStaffInComplaint };

/** The reasons that make a review sensitive on WhatsApp, all risk.ts reasons. A named member of staff is also read from the
 *  text here, so a review stored before Eval 1 added the staff_named reason is still sensitive. */
export const SENSITIVE_REASONS = ["health_safety", "threat", "legal_threat", "staff_named"] as const;

export type SensitiveInput = {
  risk: string;
  reasons: readonly string[] | null | undefined;
  rating: number;
  comment: string | null;
  /** The business's Google categories, for the clinic rule. */
  categories?: (string | null | undefined)[];
};

export type Sensitivity = { sensitive: boolean; why: string[]; regulated: Industry | null };

export function sensitivity(r: SensitiveInput): Sensitivity {
  const reasons = (r.reasons ?? []).filter(isReason);
  const why: string[] = (SENSITIVE_REASONS as readonly string[]).filter((k) => reasons.includes(k as never));
  if (!why.includes("staff_named") && namesStaffInComplaint({ rating: r.rating, comment: r.comment })) why.push("staff_named");
  return { sensitive: why.length > 0, why, regulated: industryOf(r.categories ?? []) };
}

export const SENSITIVE_HELP = "Reply \"talk to a person\" and someone at Kabsi will help you here.";

/** The WhatsApp message for a sensitive review. It never quotes the review: not for a clinic, not for anyone, because a
 *  health, threat or legal review can carry a person's details. The star rating and the first name are not details. */
export function sensitiveAlertBody(o: { business: string; stars: number; reviewer: string | null; appUrl: string; regulated: Industry | null }): string {
  const first = (o.reviewer ?? "").trim().split(/\s+/)[0] ?? "";
  const who = first && first.length <= 40 && !o.regulated ? ` from ${first}` : "";
  const lines = [
    `${o.business}: a new ${o.stars}-star review${who} needs your care.`,
    o.regulated
      ? "Kabsi shows nothing of what the customer wrote here, and did not write a reply. Details about a patient or client stay out of WhatsApp. Read it in Kabsi."
      : "It is about something sensitive, so Kabsi shows none of it here and did not write a reply. Read it in Kabsi first.",
    `Open in Kabsi: ${o.appUrl}/app/reviews?f=needs`,
    SENSITIVE_HELP,
  ];
  return lines.join("\n\n").slice(0, 1024);
}

/** The buttons: no Approve, ever. A person is one tap away. */
export const SENSITIVE_BUTTONS = [{ id: "t:person", title: "Talk to a person" }] as const;
