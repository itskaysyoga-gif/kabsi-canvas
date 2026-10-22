// What Nora knows while an owner is setting up (P0.4-11; K-111, K-104): the step of six, the Google access state and the
// situation the owner reported, read from the database for the signed-in owner and nothing else. Pure functions, so a test
// can read every line. Nora answers only from the facts file and this live state, never asks for a Google password or a
// verification code, and offers the free setup call when she cannot solve it (K-111).

/** The stored onboarding step as the owner's step of six (K-141). */
export const STEP_NUMBER: Record<string, number> = { business: 1, access: 3, knowledge: 4, confirm: 5, plan: 5, done: 6 };
export const STEP_NAME: Record<string, string> = {
  business: "find your business",
  access: "add Kabsi as a Manager",
  knowledge: "five quick questions",
  confirm: "confirm your details",
  plan: "confirm your details",
  done: "finished, the trial runs",
};

export type OnboardingState = {
  business: string;
  step: string;
  /** locations.consent_at is set: the owner agreed and started giving access. */
  agreed: boolean;
  /** locations.access_granted_at is set. */
  accessWorking: boolean;
  /** google_connections.access_state: none, pending, granted, error, lost. */
  accessState: string | null;
  scenario: { id: string; variant: string | null; since: string; doneAt: string | null } | null;
  /** The screen the owner has open when they asked (find, snapshot, access, scenario, questions, waiting, confirm), from the chip. */
  screen: string | null;
};

const SCREENS = new Set(["find", "snapshot", "access", "scenario", "questions", "waiting", "confirm"]);
/** The screen the browser says is open, held to the list: anything else is ignored. */
export const cleanScreen = (v: unknown): string | null => (typeof v === "string" && SCREENS.has(v) ? v : null);

const SCENARIO_WORDS: Record<string, string> = {
  manager_not_owner: "is a manager, not an owner, so an owner has to add Kabsi",
  needs_verifying: "needs verifying on Google",
  google_reviewing: "is being reviewed by Google",
  suspended: "is suspended or limited by Google",
  someone_else_owns: "is held by someone else, or the Google login is lost",
  no_profile_in_account: "is not in the Google account the owner signed in with",
  not_eligible: "is not a type of business Google allows (no trial is taken)",
  several_locations: "has several locations",
  workspace_blocks: "may be blocked by the organisation's Google Workspace administrator",
};

/** True while setup is not finished: the owner may need help with a step. */
export const inOnboarding = (s: Pick<OnboardingState, "step">) => s.step !== "done";

/** The lines for the <context> block. Facts only, no review text and no Google data. */
export function onboardingLines(s: OnboardingState): string[] {
  if (!inOnboarding(s)) return [];
  const n = STEP_NUMBER[s.step] ?? 1;
  const out = [
    `Onboarding: ${s.business} is on step ${n} of 6 (${STEP_NAME[s.step] ?? s.step}). Google access: ${s.accessWorking ? "working" : s.agreed ? "asked for, not working yet" : "not asked for yet"}${s.accessState && !s.accessWorking ? ` (state ${s.accessState})` : ""}.`,
  ];
  if (s.scenario) {
    const w = SCENARIO_WORDS[s.scenario.id] ?? s.scenario.id;
    out.push(`Onboarding situation the owner reported: the profile ${w}${s.scenario.variant ? ` (${s.scenario.variant.replace(/_/g, " ")})` : ""}, since ${s.scenario.since.slice(0, 10)}${s.scenario.doneAt ? ", and they tapped I've done it" : ""}.`);
  }
  if (s.screen) out.push(`The owner has the "${s.screen}" screen open and asked from its Need a hand chip.`);
  return out;
}

/** The result of the onboarding_state tool: the same state, as data. */
export function onboardingStateResult(s: OnboardingState | null): Record<string, unknown> {
  if (!s || !inOnboarding(s)) return { ok: true, in_onboarding: false };
  return {
    ok: true,
    in_onboarding: true,
    step: STEP_NUMBER[s.step] ?? 1,
    of: 6,
    step_name: STEP_NAME[s.step] ?? s.step,
    google_access: s.accessWorking ? "working" : s.agreed ? "asked_for_not_working" : "not_asked_for",
    access_state: s.accessState,
    situation: s.scenario ? { id: s.scenario.id, variant: s.scenario.variant, since: s.scenario.since, done: s.scenario.doneAt !== null } : null,
  };
}

/** For the team's hand-off email: where in setup the owner was. */
export const onboardingHandoffLine = (s: OnboardingState | null): string =>
  s && inOnboarding(s) ? `Setup: step ${STEP_NUMBER[s.step] ?? 1} of 6, ${STEP_NAME[s.step] ?? s.step}; Google access ${s.accessWorking ? "working" : "not working yet"}${s.scenario ? `; situation: ${s.scenario.id}` : ""}` : "";

/** Added to Nora's rules (index.ts). One place, tested. */
export const ONBOARDING_RULES = `## Owners setting up (only when <context> has an Onboarding line)
- The Onboarding line says which of the six steps the owner is on, whether Google access works and what situation they reported. Help with that step only, one step at a time, from section 3 of the knowledge base (the setup steps and the troubleshooting). Do not walk through steps they have not reached.
- "Where is People and access?" is answered from the knowledge base: in the Google Maps app, the profile picture, Your business profiles, the business, Profile settings, then People and access; on a computer, the menu next to the business name, Business Profile settings, then People and access. Only an owner of the profile sees it, so a manager has to ask the owner.
- Kabsi never needs a Google password and never needs a verification code. If asked, say so plainly. If an owner starts to type a password or a code, tell them not to share it, with you or anyone.
- When the answer is not in the knowledge base or the Onboarding line, or you have tried once and they are still stuck, say so and offer the free setup call ([book a setup call](/setup-call)) or to pass it to the team, before guessing. A person on the call guides and the owner clicks.
- Never say how long Google will take beyond what the knowledge base says. Never promise the trial or the plan will change.`;
