// Master plan 18.2: when Google needs action on a business (session 19 marks it with a google_needs_action task and
// pauses publishing), the owner hears it on WhatsApp at once, quiet hours or not: what Google is asking, plain steps,
// and the link to Google's own help page for that case. Kabsi never files an appeal for the owner and never promises
// reinstatement. Publishing resumes by itself when Google clears the state, and the owner is told that too.
// The help pages were opened and read on 24 Oct 2026 (support.google.com, English):
//   - "Fix suspended or disabled profiles": https://support.google.com/business/answer/4569145
//   - "Verify your business on Google": https://support.google.com/business/answer/7107242
//   - "Guidelines for representing your business on Google": https://support.google.com/business/answer/3038177

export const HELP = {
  suspended: "https://support.google.com/business/answer/4569145",
  verify: "https://support.google.com/business/answer/7107242",
  guidelines: "https://support.google.com/business/answer/3038177",
} as const;

export type GoogleCase = "suspended" | "verify" | "other";

/** The case from the task's evidence (session 19 reads VoiceOfMerchantState: a complyWithGuidelines action, a verify
 *  action, or hasVoiceOfMerchant false). Unknown shapes fall back to the general case. */
export function caseOf(evidence: Record<string, unknown> | null | undefined, title?: string | null): GoogleCase {
  const t = JSON.stringify(evidence ?? {}).toLowerCase() + " " + String(title ?? "").toLowerCase();
  if (/comply|guideline|suspend|disabled/.test(t)) return "suspended";
  if (/verif/.test(t)) return "verify";
  return "other";
}

export function needsActionBody(business: string, c: GoogleCase): string {
  const lines = [`${business}: Google is asking for action on your Business Profile, so Kabsi has paused sending changes to Google.`];
  if (c === "suspended") {
    lines.push(
      "What Google says: the profile does not meet its guidelines, so it may be suspended or limited.",
      "What to do:\n1. Sign in to your Business Profile with the Google account that owns it.\n2. Read the reason Google gives and check the profile against Google's guidelines.\n3. If you believe it should be reinstated, submit Google's appeal yourself. Do not create a new profile for the same business.",
      `Google's help page: ${HELP.suspended}`,
      `Google's guidelines: ${HELP.guidelines}`,
    );
  } else if (c === "verify") {
    lines.push(
      "What Google says: the business needs to be verified.",
      "What to do:\n1. Sign in to your Business Profile with the Google account that owns it.\n2. Choose Verify and follow the steps Google shows, for example a video or a code.",
      `Google's help page: ${HELP.verify}`,
    );
  } else {
    lines.push(
      "What to do: sign in to your Business Profile with the Google account that owns it and follow the notice Google shows there.",
      `Google's help pages: ${HELP.verify} and ${HELP.suspended}`,
    );
  }
  lines.push("Kabsi cannot do this for you and cannot promise what Google decides. When Google clears it, Kabsi starts again by itself and tells you here.");
  return lines.join("\n\n").slice(0, 4000);
}
