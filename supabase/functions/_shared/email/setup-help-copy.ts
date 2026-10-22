// The words of the setup-help emails (K-95, K-97, K-61; P0.4-04): the check-back every 2 days for an owner waiting on
// Google to verify the profile, and the day 3 and day 7 reminders after a request for ownership. Pure functions over a
// business snapshot. The one yellow button is the next step; every other link is plain. Never a request for a Google
// password or a verification code.
import { esc } from "../email-layout.ts";
import type { Snapshot, StepId } from "../lifecycle.ts";
import { p } from "./copy.ts";
import type { EmailContent } from "./template.ts";

export type SetupHelpStep = Extract<StepId, `verify_${number}` | "ownership_day3" | "ownership_day7">;
export const isSetupHelpStep = (id: StepId): id is SetupHelpStep => id.startsWith("verify_") || id.startsWith("ownership_");

const SAFE = "Kabsi never asks for your Google password or a verification code, and nothing is published until you approve it.";

export function setupHelpEmail(step: SetupHelpStep, s: Snapshot, c: { appUrl: string }): EmailContent {
  const url = `${c.appUrl}/start`;
  const links = [{ label: "Book a free setup call", url: `${c.appUrl}/setup-call` }];
  if (step.startsWith("verify_")) {
    const reviewing = s.scenario?.id === "google_reviewing";
    const lead = reviewing
      ? `Google is reviewing the Business Profile of ${s.name}. This can take up to 5 business days. If Google has finished, tap below to carry on. If not, there is nothing to do yet.`
      : `Your Business Profile for ${s.name} needed verifying on Google. If Google now says Verified, tap below to carry on. If you have not finished, Google's own help shows each way to verify, and a person on our team can walk you through it, free.`;
    return {
      subject: `${s.name}: verified yet?`, title: "Verified yet?", preheader: "If Google has finished, tap to carry on setting up Kabsi.",
      why: "You told Kabsi your Google profile is not ready yet.",
      bodyHtml: p(esc(lead)) + p("Never share your verification code with anyone, including us. Google never asks for it either.") + p(esc(SAFE)),
      button: { label: "Verified yet? Tap to continue", url }, links,
      text: `${lead}\n\nNever share your verification code with anyone, including us. Google never asks for it either.\n\n${SAFE}`,
    };
  }
  const day3 = step === "ownership_day3";
  const lead = day3
    ? `It has been 3 days since you asked for access to the Business Profile of ${s.name}. Google gives the current owner 3 days to reply, so it is worth looking at your Google account now.`
    : `It has been a week since you asked for access to the Business Profile of ${s.name}. If nobody replied, Google may now let you verify and claim the profile yourself. Look for its message, or open the request again.`;
  return {
    subject: day3 ? `${s.name}: has your request come through?` : `${s.name}: a week since you asked for access`,
    title: day3 ? "Has your request come through?" : "A week since you asked for access", preheader: "Carry on setting up Kabsi once you can see People and access.",
    why: "You told Kabsi you asked for ownership of your Google profile.",
    bodyHtml: p(esc(lead)) + p("Once you can see People and access on the profile, add Kabsi as a Manager and Kabsi starts straight away.") + p(esc(SAFE)),
    button: { label: "Continue setting up", url }, links,
    text: `${lead}\n\nOnce you can see People and access on the profile, add Kabsi as a Manager and Kabsi starts straight away.\n\n${SAFE}`,
  };
}
