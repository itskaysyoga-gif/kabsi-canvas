// The staff phone's line for a new paying customer or a cancellation (master plan 9.9). Pure, so a test can read it.
import { possessive } from "./possessive.ts";

export function staffPlanLine(p: { paid: boolean; message: string | null; business: string; plan: string; endDate: string | null }): string {
  if (p.paid) return `New paying customer: ${p.business} on ${p.plan === "essentials" ? "Essentials" : "Pro"}`;
  if (p.message === "ended") return `${possessive(p.business)} plan has ended`;
  return `${p.business} cancelled; the plan ends on ${p.endDate ?? "its renewal date"}`;
}
