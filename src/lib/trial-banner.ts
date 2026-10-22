// Onboarding step 6 (K-141, K-126): the banner that says the trial has started. Shown to the owner for the first 3 days of a
// trial that began at working access; the length is read from the trial's own dates (14 days, 30 through a partner link).
import type { Entitlements } from "@/lib/entitlements";

export const BANNER_DAYS = 3;

export function trialLength(t: { started_at: string; ends_at: string }): 14 | 30 {
  const days = (Date.parse(t.ends_at) - Date.parse(t.started_at)) / 86_400_000;
  return days >= 20 ? 30 : 14;
}

/** The banner line, or null when no trial has started, it is past its first days, or it is not a trial (a concierge business has Early access). */
export function trialBannerLine(e: Pick<Entitlements, "state" | "trial">): string | null {
  if (e.state !== "trial" || !e.trial) return null;
  if (e.trial.day > BANNER_DAYS) return null;
  return `Your ${trialLength(e.trial)}-day Pro trial has started. No card needed.`;
}
