// Onboarding in four stages (master plan 30.16 section 3, V4): 1. the free check, public, before any sign-up; 2. sign in
// and confirm the business and who looks after its Google profile; 3. connect WhatsApp (the owner sends the first message);
// 4. add Kabsi as a Manager on Google (invite pending, accepted, access checked). Then the first task, and only after it
// the rest of setup. One list of stage names, read by the progress strip and the screens, so the order is said once.
// Pure, so a test reads every rule. The server's own copy of the stages is supabase/functions/_shared/onboarding/stages.ts.
import type { Location } from "@/lib/onboarding";

export const STAGES = [
  "Your free check",
  "Sign in",
  "Connect WhatsApp",
  "Add Kabsi on Google",
] as const;

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
};

/** The screens of /start, in order. */
export type Screen =
  | "find" // no business yet: find it on Google Maps (stage 2)
  | "check" // the claimed free check, before anything is asked (stage 1)
  | "confirm" // is this your business, who looks after its Google profile (stage 2)
  | "whatsapp" // send Kabsi one message (stage 3)
  | "manager" // add Kabsi as a Manager: invite pending or accepted (stage 4)
  | "checked" // access works, the trial dates (end of stage 4)
  | "first_task" // the first task, then what comes after it
  | "later"; // the rest of setup, open after the first task is done

/** The stage each screen belongs to, 0 based; 4 means the four stages are done. */
export const STAGE_OF: Record<Screen, number> = {
  check: 0,
  find: 1,
  confirm: 1,
  whatsapp: 2,
  manager: 3,
  checked: 4,
  first_task: 4,
  later: 4,
};

export type ScreenInput = {
  status: OnboardingStatus | null;
  /** WHATSAPP_ON: Kabsi has a WhatsApp number. */
  whatsappOn: boolean;
  /** Choices the server does not keep: past the free check, past WhatsApp, past "Access works." (kept in this browser). */
  seen: { check?: boolean; whatsapp?: boolean; checked?: boolean };
  now?: number;
};

const DAY = 86_400_000;
/** The trial is 14 days from the day access is checked: it started today while more than 13 days are left. */
export function trialStartedToday(endsAt: string | null, now = Date.now()): boolean {
  if (!endsAt) return true;
  return new Date(endsAt).getTime() - now > 13 * DAY;
}

/** The next unfinished screen. Mirrors stageOf in the server's stages.ts, plus the screens only the website shows. */
export function screenOf({ status, whatsappOn, seen, now = Date.now() }: ScreenInput): Screen {
  if (!status) return "find";
  if (!status.confirmed) return status.check && !seen.check ? "check" : "confirm";
  if (!status.whatsapp && !seen.whatsapp && whatsappOn) return "whatsapp";
  // While Kabsi has no WhatsApp number, stage 3 shows what Settings shows ("coming soon") until the owner moves on;
  // after the authorisation on stage 4 it is behind them.
  if (!status.whatsapp && !seen.whatsapp && !whatsappOn && !status.consent && !status.accepted)
    return "whatsapp";
  if (!status.checked) return "manager";
  if (status.first_task_done) return "later";
  // "Access works." is the moment the trial starts; a day later, or once seen, the first task comes first.
  if (seen.checked || !trialStartedToday(status.trial_ends_at, now)) return "first_task";
  return "checked";
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
