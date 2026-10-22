// The six steps of onboarding (K-141, design review "Signup, login and onboarding"). One list, read by the progress bar
// and by the screens, so the order is said once. Steps 1 and 2 come before there is an account (the Profile Check and the
// sign-up sheet); /start shows 3 to 6. A business that is on the old 'plan' step is on step 5.
import type { Location, OnboardingStep } from "@/lib/onboarding";

export type FlowStep = "check" | "signup" | "connect" | "questions" | "confirm" | "trial";

export const FLOW: { key: FlowStep; label: string }[] = [
  { key: "check", label: "Check" },
  { key: "signup", label: "Sign up" },
  { key: "connect", label: "Connect" },
  { key: "questions", label: "About you" },
  { key: "confirm", label: "Confirm" },
  { key: "trial", label: "Trial" },
];

/** Which of the six steps the stored step is on. Before a business exists the owner is still on step 1 (finding it). */
export function flowStepOf(step: OnboardingStep): FlowStep | "done" {
  switch (step) {
    case "business":
      return "check";
    case "access":
      return "connect";
    case "knowledge":
      return "questions";
    case "confirm":
    case "plan":
      return "confirm";
    case "done":
      return "done";
  }
}

/**
 * Step 5 shows the waiting screen until Google access works, then "Confirm your details". Everything before that is
 * independent of access, so nobody waits on a spinner.
 */
export function confirmMode(loc: Pick<Location, "access_granted_at">): "waiting" | "confirm" {
  return loc.access_granted_at ? "confirm" : "waiting";
}
