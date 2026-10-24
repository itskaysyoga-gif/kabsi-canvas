// The suspension and verification watch (master plan 18.2, Guard agent). Google's VoiceOfMerchantState says whether
// Kabsi's edits can reach the profile. hasVoiceOfMerchant false, a complyWithGuidelines action (Google suspended the
// profile) or a verify action marks the business "Google needs action": the database pauses publishing for it, opens
// one task and writes one ops event (record_google_state). When Google clears the state, publishing resumes by itself.
// Read in the hourly Protection job once a day, and at once on every Pub/Sub notification for the location (P0.7-03).
import type { VoiceOfMerchantState } from "../types.ts";

export type GoogleAction = "suspended" | "verify" | "ownership" | "no_voice";

/** What Google is asking for, or null when Kabsi's edits reach the profile. One answer, the most serious first. */
export function googleAction(s: VoiceOfMerchantState): GoogleAction | null {
  if (s.complyWithGuidelines) return "suspended";
  if (s.verify) return "verify";
  if (s.resolveOwnershipConflict) return "ownership";
  if (s.hasVoiceOfMerchant === false) return "no_voice";
  return null;
}

/** Only what the rule reads is kept: no names, no text from Google. */
export function stateSummary(s: VoiceOfMerchantState) {
  return {
    hasVoiceOfMerchant: s.hasVoiceOfMerchant ?? null,
    hasBusinessAuthority: s.hasBusinessAuthority ?? null,
    actions: (["complyWithGuidelines", "verify", "resolveOwnershipConflict", "waitForVoiceOfMerchant"] as const).filter((k) => s[k]),
    reason: s.complyWithGuidelines?.recommendationReason ?? null,
    pendingVerification: s.verify?.hasPendingVerification ?? null,
  };
}

// Read once a day per business; a Pub/Sub notification reads at once.
export const DAILY_MS = 23 * 3600_000;
export const stateDue = (checkedAt: string | null, now = Date.now()) => !checkedAt || now - Date.parse(checkedAt) >= DAILY_MS;
