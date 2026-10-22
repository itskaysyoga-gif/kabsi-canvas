// "Need a hand?" on every onboarding step (K-111, K-89; design review "Help on every onboarding step"): one chip under the
// step's main button opens a sheet with Ask Nora (three suggested questions for that exact step), Watch it (the step's
// 20 second clip, only if it exists) and the free setup call (from the Google access step on). Nora steps in once per step
// when an owner is stuck: 3 minutes on the manual invite without the invitation, a failed access check, or a situation
// screen. Pure data and rules here, so a test reads every word.
import type { ClipKey } from "@/lib/onboarding-clips";

export type HelpStep =
  "find" | "snapshot" | "access" | "scenario" | "questions" | "waiting" | "confirm";

export type HelpConfig = {
  /** Three suggested questions for this exact step. */
  questions: [string, string, string];
  /** The free setup call is offered from the Google access step on (K-111). */
  call: boolean;
  clip: ClipKey | null;
};

export const HELP: Record<HelpStep, HelpConfig> = {
  find: {
    questions: [
      "What does Kabsi do?",
      "Do I need to give my password?",
      "Does it cost anything to look?",
    ],
    call: false,
    clip: null,
  },
  snapshot: {
    questions: [
      "Where does this check come from?",
      "Do I need to give my password?",
      "What does Kabsi do next?",
    ],
    call: false,
    clip: null,
  },
  access: {
    questions: ["Where is People and access?", "I don't see Manager", "Is it safe to add Kabsi?"],
    call: true,
    clip: "access",
  },
  scenario: {
    questions: [
      "What does this mean for me?",
      "How long will this take?",
      "Can someone do this with me?",
    ],
    call: true,
    clip: "verify",
  },
  questions: {
    questions: [
      "Do I have to answer these?",
      "Why do you ask for a phone number?",
      "What if I skip them?",
    ],
    call: true,
    clip: "questions",
  },
  waiting: {
    questions: [
      "How long does access take?",
      "Do I lose trial days while I wait?",
      "What can I do while I wait?",
    ],
    call: true,
    clip: "confirm",
  },
  confirm: {
    questions: [
      "What does Correct mean?",
      "What happens if I change a detail?",
      "Does this change my Google profile?",
    ],
    call: true,
    clip: "confirm",
  },
};

export const CHIP_LABEL = "Need a hand?";
export const STUCK_LINE = "Stuck? I can walk you through it, or book a free setup call.";
/** 3 minutes on the manual invite step without the invitation (K-111). */
export const STUCK_AFTER_MS = 180_000;

export type StuckReason = "no_invitation" | "access_failed" | "situation";

/** Why an owner counts as stuck now, or null. A situation screen and a failed access check count at once. */
export function stuckReason(i: {
  step: HelpStep;
  agreed: boolean;
  accessWorking: boolean;
  accessState: string | null;
  elapsedMs: number;
}): StuckReason | null {
  if (i.accessWorking) return null;
  if (i.step === "scenario") return "situation";
  if (i.step !== "access") return null;
  if (i.accessState === "lost" || i.accessState === "error") return "access_failed";
  if (i.agreed && i.elapsedMs >= STUCK_AFTER_MS) return "no_invitation";
  return null;
}

// The prompt shows once per step per business and never repeats on that step. Remembered in this browser; in a private
// window it is remembered for the page view only.
const memory = new Set<string>();
const keyOf = (locationId: string, step: HelpStep) => `kabsi.help-stuck.${locationId}.${step}`;
export function stuckSeen(locationId: string, step: HelpStep): boolean {
  const k = keyOf(locationId, step);
  if (memory.has(k)) return true;
  try {
    return window.localStorage.getItem(k) === "1";
  } catch {
    return false;
  }
}
export function markStuckSeen(locationId: string, step: HelpStep) {
  const k = keyOf(locationId, step);
  memory.add(k);
  try {
    window.localStorage.setItem(k, "1");
  } catch {
    /* private mode: remembered for this page view */
  }
}

/** The page string a Nora chat from this step carries, so the team can count help per step from the conversation itself. */
export const helpPage = (step: HelpStep) => `/start#${step}`;

/** Opens Nora with a first message from this step. The widget (mounted by the onboarding shell) listens for the event. */
export function askNora(step: HelpStep, prompt: string) {
  window.dispatchEvent(
    new CustomEvent("kabsi:open-nora", {
      detail: { prompt, onboarding: { screen: step, page: helpPage(step) } },
    }),
  );
}

/**
 * True exactly once per step per business: when the owner is stuck now and Nora has not stepped in on this step before.
 * It marks the step as seen, so the line never repeats there.
 */
export function claimStuck(
  locationId: string,
  step: HelpStep,
  state: { agreed: boolean; accessWorking: boolean; accessState: string | null; elapsedMs: number },
): boolean {
  if (stuckSeen(locationId, step)) return false;
  if (!stuckReason({ step, ...state })) return false;
  markStuckSeen(locationId, step);
  return true;
}
