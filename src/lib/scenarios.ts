// What Kabsi says when the owner's Google profile is not ready (K-94 to K-98, K-61, design review "Scenario screens").
// Every situation uses one layout: what is happening in one sentence, at most four numbered steps, a button to Google's
// exact page, "I've done it", and the setup-call link. No Google jargon. Pure data, so a test reads every word.
//
// Owners tell Kabsi which situation they are in with three tappable questions (the manual route cannot read the profile):
//   "Can you sign in to your Business Profile?"  "Do you see a 'Get verified' button?"  "Do you see a warning that
//   your profile is suspended or limited?" Other situations are one tap in the list under them.
// The trial clock starts only when Kabsi has working access to a verified profile (K-94), so none of these costs the
// owner a trial day; each screen says so in its own words.
import { GUIDELINES_URL, NOT_ELIGIBLE } from "@/lib/eligibility";
import { PLAN_PRICES } from "@/lib/site";

export type ScenarioId =
  | "manager_not_owner"
  | "needs_verifying"
  | "google_reviewing"
  | "suspended"
  | "someone_else_owns"
  | "no_profile_in_account"
  | "not_eligible"
  | "several_locations"
  | "workspace_blocks";

export const SCENARIO_IDS: readonly ScenarioId[] = [
  "manager_not_owner",
  "needs_verifying",
  "google_reviewing",
  "suspended",
  "someone_else_owns",
  "no_profile_in_account",
  "not_eligible",
  "several_locations",
  "workspace_blocks",
];

/** The three cases of "someone else owns it or I lost the login" (K-97). */
export type OwnerVariant = "lost_login" | "agency_has_it" | "dont_know";
export const OWNER_VARIANTS: readonly OwnerVariant[] = ["lost_login", "agency_has_it", "dont_know"];

export type ReadyMessageKind = "owner" | "agency" | "it_admin";

export type Screen = {
  /** What is happening, in one sentence. */
  happening: string;
  /** At most four numbered steps. */
  steps: string[];
  /** The button to Google's exact page. */
  google?: { label: string; url: string };
  /** A line under the steps, for the one thing never to forget. */
  note?: string;
  /** What happens to the trial, in the owner's words (K-94). */
  trial: string;
  /** A ready message the owner can send on, and who it is for. */
  ready?: ReadyMessageKind;
  /** "I've done it" is not offered where there is nothing to do (not eligible). */
  noDone?: boolean;
  /** The label of the one yellow button where "I've done it" does not fit. */
  doneLabel?: string;
  /** The short line Home shows while the owner waits. */
  home: string;
};

const TRIAL_WAIT = "Your free trial starts when Google is ready, so you don't lose any days.";

export const GOOGLE = {
  manager: { label: "Open my Google profile", url: "https://business.google.com/" },
  verify: {
    label: "Open Google's help to verify",
    url: "https://support.google.com/business/answer/7107242",
  },
  suspended: {
    label: "Open Google's help for suspended profiles",
    url: "https://support.google.com/business/answer/4569145",
  },
  recovery: {
    label: "Open Google account recovery",
    url: "https://accounts.google.com/signin/recovery",
  },
  ownership: {
    label: "Open Google's page to request ownership",
    url: "https://support.google.com/business/answer/4566671",
  },
  claim: {
    label: "Open Google's page to add or claim a profile",
    url: "https://support.google.com/business/answer/2911778",
  },
  eligibility: { label: "Read Google's rules", url: GUIDELINES_URL },
} as const;

export const SCREENS: Record<Exclude<ScenarioId, "someone_else_owns">, Screen> = {
  manager_not_owner: {
    happening:
      "Only an owner of the profile can add Kabsi, and you are a manager, so the invitation has to come from an owner.",
    steps: [
      "Send the owner the ready message below. It has the steps.",
      "The owner opens People and access and adds Kabsi as a Manager.",
      "Come back here once they have. Kabsi picks it up by itself.",
    ],
    google: GOOGLE.manager,
    ready: "owner",
    trial: "Your free trial has not started. It starts when Kabsi has access.",
    home: "Waiting for the owner to add Kabsi.",
  },
  needs_verifying: {
    happening:
      "Google has to verify your profile before anyone can add Kabsi, and only you can do that.",
    steps: [
      "Open your profile on Google and choose Get verified.",
      "Pick a way Google offers: a phone or text code, an email, a postcard or a video.",
      "For a video, film one continuous take: the street and the sign outside, the inside of the business, your tools or equipment, and you opening the door or the till.",
      "Come back when Google says Verified. We email you every 2 days to check.",
    ],
    google: GOOGLE.verify,
    note: "Never share your verification code with anyone, including us. Google never asks for it either.",
    trial: TRIAL_WAIT,
    home: "Waiting for Google to verify your profile.",
  },
  google_reviewing: {
    happening:
      "Google is reviewing your profile. This can take up to 5 business days, and we'll email you the moment it's done.",
    steps: [
      "Look out for Google's message to the email on your Google account.",
      "Come back when your profile says Verified.",
      "If more than 5 business days pass, open Google's help or book a setup call.",
    ],
    google: GOOGLE.verify,
    trial: TRIAL_WAIT,
    home: "Google is reviewing your profile.",
  },
  suspended: {
    happening:
      "Google has suspended or limited your profile, so Kabsi cannot be added until it is back. Kabsi makes no promise about the outcome.",
    steps: [
      "Check the common causes: a name with extra keywords, an address that is a virtual office or a PO box, or a business type Google does not allow.",
      "Gather your evidence: a business licence, a utility bill, and photos of your sign and storefront.",
      "Send Google's reinstatement request from its help page.",
      "Come back once Google has reinstated the profile.",
    ],
    google: GOOGLE.suspended,
    trial: "No charge while your profile is suspended. Your free trial starts when access works.",
    home: "Your profile is suspended on Google. No charge while it is.",
  },
  no_profile_in_account: {
    happening:
      "This Google account has no Business Profile. The most common reason is signing in with a different Google account.",
    steps: [
      "Sign in to Google with the account you use for the business.",
      "Open the Business Profile page and look for your business.",
      "If it is not there, search for your business on Google Maps to see whether someone else has claimed it.",
    ],
    google: GOOGLE.manager,
    trial: "Your free trial has not started. It starts when Kabsi has access.",
    home: "Looking for your business in the right Google account.",
  },
  not_eligible: {
    happening:
      "Google only allows businesses that meet customers in person or travel to them, so Kabsi cannot look after this one.",
    steps: NOT_ELIGIBLE,
    google: GOOGLE.eligibility,
    note: "No trial is taken and you pay nothing. If you think this is wrong, write to hello@kabsi.co.",
    trial: "No trial is taken and nothing is charged.",
    noDone: true,
    home: "Kabsi can't look after this business.",
  },
  several_locations: {
    happening:
      "You manage more than one location. Kabsi starts with one, and you can add the others once it works.",
    steps: [
      "Choose the location you want first and set it up here.",
      "Once it works, add each other location from your account with Add another business.",
      `Each extra location is $${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year, plus tax where it applies.`,
    ],
    trial: "Your free trial starts when Kabsi has access to your first location.",
    doneLabel: "Continue with this location",
    home: "Starting with your first location.",
  },
  workspace_blocks: {
    happening:
      "Your organisation's Google Workspace administrator may block adding outside people to a business profile.",
    steps: [
      "Send the ready message below to your IT administrator.",
      "Ask them to allow adding the Kabsi group as a Manager, or to add it for you.",
      "Come back here once they have. The same steps still work.",
    ],
    ready: "it_admin",
    trial: "Your free trial has not started. It starts when Kabsi has access.",
    home: "Waiting for your administrator to allow Kabsi.",
  },
};

export const OWNER_SCREENS: Record<OwnerVariant, Screen & { title: string }> = {
  lost_login: {
    title: "I lost my Google login",
    happening:
      "Get your Google login back first. Recovering the account brings the profile back with all its reviews.",
    steps: [
      "Open Google's account recovery.",
      "Follow the steps for the account that manages the business.",
      "Come back and add Kabsi once you can sign in.",
    ],
    google: GOOGLE.recovery,
    trial: TRIAL_WAIT,
    home: "Getting back into your Google account.",
  },
  agency_has_it: {
    title: "An old employee or agency has it",
    happening:
      "A former employee, agency or previous owner holds the profile, and they have to make you an owner.",
    steps: [
      "Send them the ready message below.",
      "Ask them to add you as an owner, or to transfer primary ownership to you.",
      "Come back once you can see People and access.",
    ],
    ready: "agency",
    trial: TRIAL_WAIT,
    home: "Waiting for the current owner to make you an owner.",
  },
  dont_know: {
    title: "I don't know who has it",
    happening: "If you cannot reach whoever holds the profile, you can ask Google for access.",
    steps: [
      "Open Google's page to request ownership.",
      "Google gives the current owner 3 days to reply, and in practice it can take up to 7.",
      "If nobody replies, Google may let you verify and claim the profile yourself.",
      "We remind you on day 3 and again on day 7.",
    ],
    google: GOOGLE.ownership,
    trial: TRIAL_WAIT,
    home: "Waiting on your request for ownership.",
  },
};

/** The screen for a stored situation. Someone else owns it has three variants; without one the first is shown. */
export function screenFor(
  id: ScenarioId,
  variant?: OwnerVariant | null,
): Screen & { title?: string } {
  if (id === "someone_else_owns")
    return OWNER_SCREENS[variant && OWNER_VARIANTS.includes(variant) ? variant : "dont_know"];
  return SCREENS[id];
}

export const SCENARIO_TITLES: Record<ScenarioId, string> = {
  manager_not_owner: "You're a manager, not an owner",
  needs_verifying: "Your profile needs verifying",
  google_reviewing: "Google is reviewing your profile",
  suspended: "Your profile is suspended",
  someone_else_owns: "Someone else holds the profile",
  no_profile_in_account: "No profile in this Google account",
  not_eligible: "Kabsi can't look after this business",
  several_locations: "You have several locations",
  workspace_blocks: "Your organisation blocks it",
};

/** The three tappable questions of the manual route (K-94), and where a yes leads. */
export const QUESTIONS: {
  id: "sign_in" | "get_verified" | "suspended";
  text: string;
  yes: ScenarioId | null;
  no: ScenarioId | null;
}[] = [
  {
    id: "sign_in",
    text: "Can you sign in to your Business Profile?",
    yes: null,
    no: "someone_else_owns",
  },
  {
    id: "get_verified",
    text: 'Do you see a "Get verified" button?',
    yes: "needs_verifying",
    no: null,
  },
  {
    id: "suspended",
    text: "Do you see a warning that your profile is suspended or limited?",
    yes: "suspended",
    no: null,
  },
];

/** What the owner taps in the list under the three questions: how they would say it, not the title of the screen. */
export const SITUATION_LABELS: Record<ScenarioId, string> = {
  manager_not_owner: "I am a manager, not an owner",
  needs_verifying: "My profile is not verified",
  google_reviewing: "Google says it is reviewing my profile",
  suspended: "My profile is suspended",
  someone_else_owns: "Someone else holds my profile",
  no_profile_in_account: "My business is not in this Google account",
  not_eligible: "Google says my type of business is not allowed",
  several_locations: "I have several locations",
  workspace_blocks: "My organisation blocks adding people",
};

/** The other situations, one tap each, under the three questions. */
export const MORE_SITUATIONS: ScenarioId[] = [
  "google_reviewing",
  "manager_not_owner",
  "no_profile_in_account",
  "several_locations",
  "workspace_blocks",
  "not_eligible",
];

/** The ready messages for people who can act when the owner cannot. Plain text; never a password or a code. */
export function scenarioMessage(kind: ReadyMessageKind, business: string, url: string): string {
  const tail =
    " Kabsi never asks for a Google password or a verification code, and nothing is published without my approval.";
  if (kind === "agency")
    return (
      `Hello, I would like to look after the Google Business Profile for ${business} myself. ` +
      `Could you add me as an owner, or transfer primary ownership to me? I will then add Kabsi (kabsi.co) as a Manager, and the steps are here: ${url}` +
      tail
    );
  if (kind === "it_admin")
    return (
      `Hello, I would like to add Kabsi (kabsi.co) as a Manager on our Google Business Profile for ${business}, and it may be blocked by our Google Workspace settings. ` +
      `Could you allow adding the Kabsi group as a Manager on that profile, or add it for me? The steps are here: ${url}` +
      tail
    );
  return (
    `Hello, I would like Kabsi (kabsi.co) to look after the reviews for ${business} on Google. ` +
    `Only an owner can add Kabsi as a Manager. Could you add it? The steps take about two minutes: ${url}` +
    tail
  );
}

/** The reminder rules (K-61, K-95, K-97), in milliseconds from the moment the owner said they had done it. */
export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
/** Verification check-backs every 2 days, up to this many, asking "Verified yet?". */
export const CHECKBACK_EVERY_DAYS = 2;
export const CHECKBACK_MAX = 5;
/** Ownership reminders on day 3 and day 7 after the request. */
export const OWNERSHIP_DAYS = [3, 7] as const;
