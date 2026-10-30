// Behaviour-triggered lifecycle emails (G-25, G-24, G-30, K-101, K-118; P0.4-10). Which email is due for a business, at
// what moment, and who may get it: pure functions over a snapshot of the business (supabase/migrations/
// 20261021150000_lifecycle_emails.sql builds it, counts from the audit log only), so a test can move a clock through a
// whole trial. The job (lifecycle-run.ts) loads the snapshots and sends each due email once through the notification
// engine (notify.ts), whose dedupe key `life:<step>:<business>` makes a second run send nothing.
//
// What is sent, and when (G-25):
//   welcome              the business was created                       the one next step: invite Kabsi as Manager
//   no_access_1h/24h/72h access asked for, still no access               the setup link to finish (stops at access; Email 1)
//   verify_1 to verify_5 the owner said the profile needs verifying or   "Verified yet? Tap to continue" every 2 days
//                        is under review, still no access (K-95, P0.4-04) (stops at access or when the situation is cleared)
//   ownership_day3/7     the owner asked for ownership of the profile   "Has your request come through?" on day 3 and 7
//                        (K-97, P0.4-04)                                 after "I've done it"
//   first_reply_approved Kabsi first saw a reply on Google (Email 1)     "Your first reply is live on Google"
//   trial_day2/7/11      the trial clock (K-101), only while on trial    first win, your week with the yearly offer
//                                                                        (G-30), three days left with both prices
//   trial_day14          trial ended, grace begins (K-48)                what continues, what waits, one tap to continue
//   winback_17/30        17 and 30 days after the trial ended            only with real waiting items, only with consent
// Already sent by earlier tasks, so not repeated here: "access granted" (the K-113 access notice already says Kabsi is in
// and what happens next), "backlog drafted" (the day-one email of P0.3-10) and "access removal on day 21" (the
// disconnect notice of P0.2-02).
// Trial rules (P0.4-06): trial mail only while the entitlements state is trial (or grace for day 14, ended for the
// win-back); a concierge or demo business never gets trial mail; a business that pays gets none.
import type { CategoryId } from "./notify-categories.ts";

export type Entitlement = "demo" | "concierge" | "paid" | "trial" | "grace" | "ended" | "none";

export type Snapshot = {
  locationId: string;
  name: string;
  timeZone: string;
  country: string | null;
  status: string;
  createdAt: Date;
  consentAt: Date | null;
  accessGrantedAt: Date | null;
  entitlement: Entitlement;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  owners: { userId: string; email: string }[];
  /** An owner address is on the marketing list with a yes (contacts.marketing_consent). */
  marketingConsent: boolean;
  waitingReviews: number;
  waitingChanges: number;
  firstApprovalAt: Date | null;
  /** The situation the owner reported while setting up (P0.4-04), still open; null when none or once it is cleared. */
  scenario: { id: string; variant: string | null; startedAt: Date; doneAt: Date | null } | null;
  /** From audit_events only, counted from the trial start (or from the business's creation when there was no trial). */
  recap: { repliesPrepared: number; repliesSent: number; postsSent: number; changesCaught: number };
  /** A Founding 25 business (30.17): 90 free days with its own day-60, day-85 and day-90 messages (founding.ts). */
  founding?: boolean;
  /** The setup link's code (locations.resume_code, V4), for the setup-incomplete email; null until onboarding made one. */
  resumeCode?: string | null;
  /** When Kabsi first saw one of the business's replies on Google (a verified publication): the "first work completed" email. */
  firstOnGoogleAt?: Date | null;
};

const d = (v: unknown) => (typeof v === "string" ? new Date(v) : null);
export function snapshotFromRow(r: Record<string, any>): Snapshot {
  return {
    locationId: String(r.location_id), name: String(r.name), timeZone: String(r.time_zone ?? "UTC"), country: r.country ? String(r.country).toUpperCase() : null,
    status: String(r.status), createdAt: new Date(r.created_at), consentAt: d(r.consent_at), accessGrantedAt: d(r.access_granted_at),
    entitlement: (r.entitlement ?? "none") as Entitlement, trialStartedAt: d(r.trial_started_at), trialEndsAt: d(r.trial_ends_at),
    owners: ((r.owners ?? []) as { user_id: string; email: string }[]).map((o) => ({ userId: o.user_id, email: o.email })),
    marketingConsent: r.marketing_consent === true, waitingReviews: Number(r.waiting_reviews ?? 0), waitingChanges: Number(r.waiting_changes ?? 0),
    firstApprovalAt: d(r.first_approval_at),
    scenario: r.scenario?.id ? { id: String(r.scenario.id), variant: r.scenario.variant ? String(r.scenario.variant) : null, startedAt: new Date(r.scenario.started_at), doneAt: d(r.scenario.done_at) } : null,
    recap: {
      repliesPrepared: Number(r.recap?.replies_prepared ?? 0), repliesSent: Number(r.recap?.replies_sent ?? 0),
      postsSent: Number(r.recap?.posts_sent ?? 0), changesCaught: Number(r.recap?.changes_caught ?? 0),
    },
  };
}

// ─── consent by country (G-24) ──────────────────────────────────────────────────────────────────────────────────
// Service mail (welcome, access help, the trial's own emails) is part of what the owner signed up for. Marketing (the
// win-back after the trial) needs an opt-in where the law or G-24 asks for one: the UK, the EU and EEA, Switzerland, the
// UAE and Saudi Arabia, and wherever the country is not known. Elsewhere it needs a clear notice at signup, which is not
// built yet (app_settings.signup_marketing_notice stays off), so today it needs the owner's yes everywhere.
export const OPT_IN_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO", "GB", "CH", "AE", "SA",
]);

export function marketingAllowed(country: string | null, consent: boolean, noticeOn: boolean): boolean {
  if (consent) return true;
  if (!country || OPT_IN_COUNTRIES.has(country.toUpperCase())) return false;
  return noticeOn;
}

// ─── the steps ──────────────────────────────────────────────────────────────────────────────────────────────────

export type StepId =
  | "welcome" | "no_access_1h" | "no_access_24h" | "no_access_72h" | "first_reply_approved"
  | "verify_1" | "verify_2" | "verify_3" | "verify_4" | "verify_5" | "ownership_day3" | "ownership_day7"
  | "trial_day2" | "trial_day7" | "trial_day11" | "trial_day14" | "winback_17" | "winback_30";

export type StepMeta = { id: StepId; category: CategoryId; consent: "service" | "marketing" };
export const STEPS: Record<StepId, StepMeta> = {
  welcome: { id: "welcome", category: "account", consent: "service" },
  // Email 1 (30.15 section 6): the setup reminders are lifecycle mail a person can switch off (Trial tips), not access notices.
  no_access_1h: { id: "no_access_1h", category: "trial", consent: "service" },
  no_access_24h: { id: "no_access_24h", category: "trial", consent: "service" },
  no_access_72h: { id: "no_access_72h", category: "trial", consent: "service" },
  first_reply_approved: { id: "first_reply_approved", category: "trial", consent: "service" },
  // Setup help for an owner stuck at Google's side (P0.4-04). They stop at access and are service mail, never marketing. Since
  // 22 Oct 2026 they sit in the Trial tips category like the other tips, so the owner can turn them off (the footer has
  // "Unsubscribe from these emails" and Settings, What Kabsi tells you, has the switch). The no-access reminders stay
  // in Google access, which cannot be switched off.
  verify_1: { id: "verify_1", category: "trial", consent: "service" },
  verify_2: { id: "verify_2", category: "trial", consent: "service" },
  verify_3: { id: "verify_3", category: "trial", consent: "service" },
  verify_4: { id: "verify_4", category: "trial", consent: "service" },
  verify_5: { id: "verify_5", category: "trial", consent: "service" },
  ownership_day3: { id: "ownership_day3", category: "trial", consent: "service" },
  ownership_day7: { id: "ownership_day7", category: "trial", consent: "service" },
  trial_day2: { id: "trial_day2", category: "trial", consent: "service" },
  trial_day7: { id: "trial_day7", category: "trial", consent: "service" },
  // Email 1: the trial-ending email asks for a choice (30.15 section 6), so it is plan mail a person cannot switch off.
  trial_day11: { id: "trial_day11", category: "billing", consent: "service" },
  trial_day14: { id: "trial_day14", category: "billing", consent: "service" },
  winback_17: { id: "winback_17", category: "trial", consent: "marketing" },
  winback_30: { id: "winback_30", category: "trial", consent: "marketing" },
};

const H = 3_600_000, D = 86_400_000;
// The reminder rules of src/lib/scenarios.ts (tests/scenarios.test.ts keeps the two equal): a check-back every 2 days,
// ownership reminders on day 3 and day 7.
export const CHECKBACK_EVERY_DAYS = 2;
export const OWNERSHIP_DAYS = [3, 7] as const;
type Window = { at: Date; until: Date };
const win = (at: Date | null, length: number): Window | null => (at ? { at, until: new Date(at.getTime() + length) } : null);
const plus = (t: Date | null, ms: number) => (t ? new Date(t.getTime() + ms) : null);

/** When each step becomes due and when it goes stale (a step never sends late: a missed one is not sent days after). */
function windowOf(step: StepId, s: Snapshot): Window | null {
  switch (step) {
    case "welcome": return win(s.createdAt, 3 * D);
    case "no_access_1h": return win(plus(s.consentAt, H), 23 * H);
    case "no_access_24h": return win(plus(s.consentAt, 24 * H), 48 * H);
    case "no_access_72h": return win(plus(s.consentAt, 72 * H), 4 * D);
    case "verify_1": case "verify_2": case "verify_3": case "verify_4": case "verify_5": {
      const n = Number(step.slice(-1));
      return win(plus(s.scenario?.startedAt ?? null, n * CHECKBACK_EVERY_DAYS * D), CHECKBACK_EVERY_DAYS * D);
    }
    case "ownership_day3": return win(plus(s.scenario?.doneAt ?? null, OWNERSHIP_DAYS[0] * D), (OWNERSHIP_DAYS[1] - OWNERSHIP_DAYS[0]) * D);
    case "ownership_day7": return win(plus(s.scenario?.doneAt ?? null, OWNERSHIP_DAYS[1] * D), 3 * D);
    case "first_reply_approved": return win(s.firstOnGoogleAt ?? null, 3 * D);
    case "trial_day2": return win(plus(s.trialStartedAt, 2 * D), 3 * D);
    case "trial_day7": return win(plus(s.trialStartedAt, 7 * D), 3 * D);
    case "trial_day11": return s.trialEndsAt ? { at: new Date(s.trialEndsAt.getTime() - 3 * D), until: s.trialEndsAt } : null;
    case "trial_day14": return win(s.trialEndsAt, 3 * D);
    case "winback_17": return win(plus(s.trialEndsAt, 17 * D), 5 * D);
    case "winback_30": return win(plus(s.trialEndsAt, 30 * D), 5 * D);
  }
}

function applies(step: StepId, s: Snapshot): boolean {
  if (s.owners.length === 0) return false;
  if (s.entitlement === "demo" || s.entitlement === "concierge") return false;
  switch (step) {
    case "welcome": return true;
    case "no_access_1h": case "no_access_24h": case "no_access_72h":
      return !!s.consentAt && !s.accessGrantedAt && s.status === "access_pending";
    case "verify_1": case "verify_2": case "verify_3": case "verify_4": case "verify_5":
      return !s.accessGrantedAt && (s.scenario?.id === "needs_verifying" || s.scenario?.id === "google_reviewing");
    case "ownership_day3": case "ownership_day7":
      return !s.accessGrantedAt && s.scenario?.id === "someone_else_owns" && s.scenario.doneAt !== null;
    case "first_reply_approved": case "trial_day2": return s.entitlement === "trial";
    // Founding 25 gets its own messages instead of the 14-day trial's week-one offer and three-days-left email.
    case "trial_day7": case "trial_day11": return s.entitlement === "trial" && !s.founding;
    case "trial_day14": return s.entitlement === "grace" || s.entitlement === "ended";
    case "winback_17": case "winback_30": return s.entitlement === "ended" && s.waitingReviews + s.waitingChanges > 0;
  }
}

export type DueOptions = { since: Date; marketingNoticeOn?: boolean };

/** The steps due for this business at `now`. An event before `since` (when the emails were switched on) never sends. */
export function dueSteps(s: Snapshot, now: Date, o: DueOptions): StepId[] {
  const out: StepId[] = [];
  for (const id of Object.keys(STEPS) as StepId[]) {
    const w = windowOf(id, s);
    if (!w || w.at < o.since) continue;
    if (now < w.at || now >= w.until) continue;
    if (!applies(id, s)) continue;
    if (STEPS[id].consent === "marketing" && !marketingAllowed(s.country, s.marketingConsent, !!o.marketingNoticeOn)) continue;
    out.push(id);
  }
  return out;
}

/** The scenario steps carry the day the situation began, so a later, different situation is a new email, not a repeat. */
export const lifecycleKey = (step: StepId, locationId: string, scenarioStart?: Date | null) =>
  `life:${step}:${locationId}${scenarioStart && /^(verify_|ownership_)/.test(step) ? `:${Math.floor(scenarioStart.getTime() / 86_400_000)}` : ""}`;
