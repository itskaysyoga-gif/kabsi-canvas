// Onboarding in three steps (GATE-2, blueprint 3.1 section 9, engineering plan GATE-2): 1. find your business (the free
// check's result first when the owner came from one, then "Is this your business?"); 2. add Kabsi as a Manager on Google
// (invite pending, accepted, access checked); 3. choose WhatsApp or email for approvals and reports. Then the 14-day trial
// starts at the Creem checkout with a card (no trial starts without one, 30.53), and the first task. One list of step names,
// read by the progress strip and the screens, so the order is said once. Pure, so a test reads every rule.
// The server's own stages (supabase/functions/_shared/onboarding/stages.ts) only pick the WhatsApp setup messages; every
// setup page is /start, which finds its own screen here.
import type { Location } from "@/lib/onboarding";

export const STAGES = ["Find your business", "Add Kabsi on Google", "WhatsApp or email"] as const;

/** What public.onboarding_status answers for a member of the business (V4 migration 20261026194327). */
export type OnboardingStatus = {
  location_id: string;
  business: string;
  time_zone: string;
  is_demo: boolean;
  /** The free check this business came from (claimed with claim_free_check), if any. */
  check: { code: string; term: string } | null;
  /** Stage 2: the owner confirmed the business and that they can manage its Google profile. */
  confirmed: boolean;
  /** Stage 3: an owner's phone is connected on WhatsApp. */
  whatsapp: boolean;
  /** The owner said Yes to setup updates on WhatsApp. */
  setup_ok: boolean;
  keyword: string | null;
  /** The owner ticked the authorisation (locations.consent_at). */
  consent: boolean;
  /** Kabsi accepted the Manager invite (locations.access_granted_at). */
  accepted: boolean;
  /** Kabsi read the profile as the business: access works. The trial starts only here. */
  checked: boolean;
  trial_ends_at: string | null;
  first_task_done: boolean;
  /** Only for owners: the code of the resume link. */
  resume_code: string | null;
  /**
   * Onboarding 1 (R-145): the owner continued or skipped the two optional questions. A status without the field
   * (older code) counts as done: the questions screen shows only for `false`.
   */
  questions_done?: boolean;
};

/** The screens of /start, in order. */
export type Screen =
  | "find" // no business yet: find it on Google Maps (step 1)
  | "check" // the claimed free check, before anything is asked (step 1)
  | "confirm" // is this your business, who looks after its Google profile (step 1)
  | "questions" // Onboarding 1 (R-145): kept for the request book, which is off (30.53); screenOf never opens it now
  | "manager" // add Kabsi as a Manager: invite pending or accepted (step 2)
  | "checked" // access works (end of step 2)
  | "email" // "Where should receipts go?", only for an owner who signed up with WhatsApp (step 3)
  | "channel" // WhatsApp or email for approvals and reports (step 3)
  | "whatsapp" // send Kabsi one message, after choosing WhatsApp (step 3)
  | "trial" // start the 14-day trial at the Creem checkout, with a card
  | "first_task" // the first task, then what comes after it
  | "later"; // the rest of setup, open after the first task is done

/** The step each screen belongs to, 0 based; 3 means the three steps are done. */
export const STAGE_OF: Record<Screen, number> = {
  check: 0,
  find: 0,
  confirm: 0,
  questions: 0,
  manager: 1,
  checked: 1,
  email: 2,
  channel: 2,
  whatsapp: 2,
  trial: 3,
  first_task: 3,
  later: 3,
};

/** Where the trial stands for this business: started (a Creem plan or trial runs, or an older Kabsi trial), needed (the
 *  checkout is open and nothing runs yet), or closed (plans are not open yet for this account). */
export type TrialState = "started" | "needed" | "closed";

export type ScreenInput = {
  status: OnboardingStatus | null;
  /** WHATSAPP_ON: Kabsi has a WhatsApp number. */
  whatsappOn: boolean;
  /** Choices the server does not keep, remembered in this browser: past the free check, "Access works.", the contact email,
   *  WhatsApp chosen (the connect screen is open), and past the trial screen while plans are closed. */
  seen: {
    check?: boolean;
    whatsapp?: boolean;
    checked?: boolean;
    email?: boolean;
    trial?: boolean;
  };
  /** Signup 1: the owner signed up with WhatsApp and has given no contact email yet. */
  askEmail?: boolean;
  /** The stored choice for approvals and reports (routine_channels); null until the owner chose. */
  channel?: "email" | "whatsapp" | null;
  /** Where the trial stands; undefined while it is read (the trial screen then waits). */
  trial?: TrialState | undefined;
  now?: number;
};

const DAY = 86_400_000;
/** The trial is 14 days from its start: it started today while more than 13 days are left. */
export function trialStartedToday(endsAt: string | null, now = Date.now()): boolean {
  if (!endsAt) return true;
  return new Date(endsAt).getTime() - now > 13 * DAY;
}

/** The next unfinished screen. */
export function screenOf({
  status,
  whatsappOn,
  seen,
  askEmail = false,
  channel = null,
  trial,
}: ScreenInput): Screen {
  // Step 1: find the business (the free check first when there is one), then confirm it.
  if (!status) return "find";
  if (!status.confirmed) return status.check && !seen.check ? "check" : "confirm";
  // Step 2: add Kabsi as a Manager; the screen follows the invite until access is checked.
  if (!status.checked) return "manager";
  // An owner who finished setup before this order existed goes straight on.
  if (status.first_task_done) return "later";
  if (!seen.checked && !status.is_demo) return "checked";
  // Step 3: WhatsApp or email. WhatsApp already connected counts as chosen; choosing WhatsApp opens the connect screen
  // until the phone is connected (or the owner picks email instead).
  if (!status.is_demo) {
    if (askEmail && !seen.email) return "email";
    if (!status.whatsapp && channel !== "email") {
      if (seen.whatsapp && whatsappOn) return "whatsapp";
      return "channel";
    }
  }
  // The trial with a card (no trial starts without one). Plans closed: the screen says so once, then the owner moves on with
  // nothing started. While the trial is read (undefined) the trial screen shows that it is loading.
  if (!status.is_demo && trial !== "started" && !(trial === "closed" && seen.trial)) return "trial";
  return "first_task";
}
/** The three states of Google access on stage 4 (the server's accessOf). */
export type Access = "not_started" | "invite_pending" | "accepted" | "checked";
export function accessOf(s: Pick<OnboardingStatus, "consent" | "accepted" | "checked">): Access {
  if (s.checked) return "checked";
  if (s.accepted) return "accepted";
  return s.consent ? "invite_pending" : "not_started";
}

/** The resume code (locations.resume_code): 20 hex characters. */
export const RESUME_CODE = /^[0-9a-f]{20}$/;
/** The resume link, on any device: /start/resume/CODE (kabsi.co/r/ is taken by the review short links). */
export const resumePath = (code: string) => `/start/resume/${code}`;

/**
 * Where the resume link sends a signed-in member. GET /api/resume answers the server's page for the stage
 * ("/start/business", "/start/whatsapp", "/start/manager" or "/app"); /start finds the stage itself, so every setup
 * page is /start, and anything else is Home.
 */
export function resumeTarget(path: string | null | undefined): "/start" | "/app" {
  return typeof path === "string" && path.startsWith("/start") ? "/start" : "/app";
}

/** "14 November", in the business's time zone. */
export function longDate(iso: string, timeZone = "UTC"): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone }).format(
      new Date(iso),
    );
  } catch {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long" }).format(
      new Date(iso),
    );
  }
}

/** After the first task, not before (30.16 section 3): competitors, extra searches, tone, AI questions, team, photos. */
export const LATER = [
  {
    key: "competitors",
    title: "Your competitors",
    line: "Pick the 3 businesses Kabsi watches for you (5 on Pro).",
    to: "/app/insights",
  },
  {
    key: "searches",
    title: "More search terms",
    line: "Add the searches your customers use.",
    to: "/app/insights",
  },
  {
    key: "tone",
    title: "How your replies sound",
    line: "Warm, short or formal. Kabsi learns from your edits too.",
    to: "/app/knowledge",
  },
  {
    key: "ai",
    title: "Questions for AI answers",
    line: "The questions Kabsi asks ChatGPT and Perplexity each month.",
    to: "/app/insights",
  },
  {
    key: "team",
    title: "Your team",
    line: "Managers approve, staff send photos.",
    to: "/app/team",
  },
  {
    key: "photos",
    title: "Photos",
    line: "Send a few photos of your work on WhatsApp.",
    to: "/app/photos",
  },
] as const;

/**
 * The old step 5 (before V4): the waiting screen until Google access works, then "Confirm your details". Kept for the
 * confirm screen, which Profile watch can still open.
 */
export function confirmMode(loc: Pick<Location, "access_granted_at">): "waiting" | "confirm" {
  return loc.access_granted_at ? "confirm" : "waiting";
}
