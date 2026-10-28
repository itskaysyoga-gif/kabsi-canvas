// One sample of every email Kabsi sends (K-118 "Every email Kabsi sends", P0.4-08), built by the real builders from
// invented data. Two users: the test that checks every email against the house rules (catalog.test.ts), and the
// internal /email/test route, which sends each one once to hello@kabsi.co so a person can read them in a real inbox
// (catalog-send.ts). Pure: no database, no network, no environment.
import { accessChangeEmail } from "../disconnect.ts";
import { digestEmail } from "../notify-engine.ts";
import type { CategoryId, SystemCategory } from "../notify-categories.ts";
import { checkEmail, type Snapshot } from "../profile-snapshot.ts";
import { teamInviteEmail } from "../team.ts";
import { esc } from "../email-layout.ts";
import * as copy from "./copy.ts";
import { reviewEmail, type ReviewInput } from "./review.ts";
import { renderReport } from "./report-body.ts";
import { receipt } from "../results-report/receipt.ts";
import * as account from "./account-copy.ts";
import { lifecycleEmail } from "./lifecycle-copy.ts";
import { STEPS, type Snapshot as LifeSnapshot, type StepId } from "../lifecycle.ts";
import type { EmailContent } from "./template.ts";

export type CatalogEntry = {
  kind: string;
  category: CategoryId | SystemCategory;
  /** The business name leads the subject (K-102). False for mail with no business, like a Nora report. */
  business: boolean;
  content: EmailContent;
};

const APP = "https://kabsi.co";
// Email 1: every sample is the design studio's Example business, Rose Lane Salon in Dubai, never a real one (30.18).
export const BIZ = "Rose Lane Salon";
const LINKS = { post: `${APP}/a/POSTTOKEN`, edit: `${APP}/a/EDITTOKEN`, skip: `${APP}/a/SKIPTOKEN`, open: `${APP}/a/OPENTOKEN` };
const REVIEW: ReviewInput = {
  business: BIZ, reviewer: "Maya K.", stars: 5, comment: "Lovely blow dry with Sara, and they fitted me in on a busy Saturday.", risk: "low", riskReasons: [], state: "drafted",
  draft: { body: "Thank you, Maya. We are glad Sara looked after you, and that we could fit you in on Saturday. See you next time.", safe: true }, links: LINKS, appUrl: APP,
};
const REVIEW_B: ReviewInput = {
  ...REVIEW, reviewer: "Omar H.", stars: 4, comment: "Great cut and friendly team. It was busy, so I waited a little past my time.",
  draft: { body: "Thank you, Omar. We are glad you liked the cut and the team, and we are sorry about the wait past your time. See you next time.", safe: true },
};
const REVIEW_REFUND: ReviewInput = {
  ...REVIEW, stars: 2, risk: "medium", riskReasons: ["refund"], comment: "Waited too long and wanted a refund.",
  draft: { body: "Thank you for telling us, Maya. We are sorry you waited longer than you should have. We would like to understand what happened and look at your refund request properly, so please contact us through the details on our Google profile.", safe: true },
};
const SNAPSHOT: Snapshot = {
  place_id: "ChIJsample0000000", name: BIZ, address: "Jumeirah Beach Road, Dubai (Example)", category: "Hair salon", rating: 4.6, review_count: 128, business_status: "OPERATIONAL",
  open_now: true, hours: [], phone: null, website: "https://roselanesalon.example", has_photos: true, photo_count: 12, cached: false, checklist: [],
  flags: [{ tone: "danger", fact: "No opening hours are shown on Google.", action: "Kabsi asks you for your hours and prepares them for you to approve." }, { tone: "warning", fact: "No phone number is shown on Google.", action: "Kabsi asks you to confirm it and prepares the change for you to approve." }],
};
const COUNTS = { replies_prepared: 5, replies_published: 4, posts_published: 1, photos_published: 2, photo_batches: 1, hours_updates: 1, profile_updates: 0, profile_checks: 2016, changes_found: 1, changes_kept: 0, changes_put_back: 1 };
const REPORT = {
  period: { from: "2026-10-19", to: "2026-10-25" }, rating: 4.7, rating_count: 212, rating_change: 0.1, rating_drop: false, new_reviews: 3, new_avg: 4.7, replied: 3, waiting: 1,
  taps: { total: 9, nfc: 0, qr: 4, message: 5 },
  care: { headline: "Kabsi took care of 10 things this week.", things: 10, profile_line: "Checked 2,016 times. 1 change found: 1 put back.", counts: COUNTS },
  needs: [{ title: "A reply to Maya K.'s review", path: "/app/reviews?f=needs" }], needs_total: 1,
  plan: [{ title: "Send your review link to customers after their visit this week.", path: "/app/get-reviews" }],
  receipt: receipt({ dates: "19 to 25 October",
    business: BIZ, counts: COUNTS, needs: [{ title: "A reply to Maya K.'s review", path: "/app/reviews?f=needs" }], needsTotal: 1,
    plan: [{ title: "Send your review link to customers after their visit this week", path: "/app/get-reviews" }],
    activity: {
      source: "live", example: false, from: "2026-10-19", to: "2026-10-25", fetched_at: "2026-10-26T06:00:00Z",
      views: { this: 640, last: 610, change: "5% more" }, calls: { this: 18, last: 14, change: "29% more" },
      website_clicks: { this: 12, last: 12, change: "no change" }, directions: { this: 31, last: 33, change: "6% fewer" },
    },
    demo: false, growth: { days: 7, new_reviews: 3, opens_message: 5, opens_qr: 4, opens_tag: 0 }, ai: null, aiThisWeek: false,
    rivals: [{ name: "Juniper Hair Studio", theirs: 14, mine: 6 }], tz: "Asia/Dubai",
  }),
};
/** The same week with no Google figures read live (a real owner before Google's numbers are in): the cards hide. */
export const REPORT_NO_GOOGLE = { ...REPORT, receipt: { ...REPORT.receipt, google: null } };
const report = renderReport({ name: BIZ }, REPORT);
const stored = (category: string, title: string, link: string, content: EmailContent, tag = "") => [{
  id: `n${category}${tag}`, location_id: "loc", user_id: "u", to_address: "owner@example.test", category, kind: category, dedupe_key: `k${category}${tag}`, title, link,
  email_state: "digest" as const, email_due_at: "2026-10-21T16:00:00Z", email_content: content,
}];

/** A business in the middle of a trial, for the lifecycle emails. */
export const LIFE_SAMPLE: LifeSnapshot = {
  locationId: "loc1", name: BIZ, timeZone: "Asia/Dubai", country: "AE", status: "active", createdAt: new Date("2026-10-01T09:00:00Z"), consentAt: new Date("2026-10-01T09:10:00Z"),
  accessGrantedAt: new Date("2026-10-01T10:00:00Z"), entitlement: "trial", trialStartedAt: new Date("2026-10-01T10:00:00Z"), trialEndsAt: new Date("2026-10-15T10:00:00Z"),
  owners: [{ userId: "u1", email: "owner@example.test" }], marketingConsent: true, waitingReviews: 4, waitingChanges: 1, firstApprovalAt: new Date("2026-10-02T09:00:00Z"),
  recap: { repliesPrepared: 9, repliesSent: 6, postsSent: 1, changesCaught: 2 },
  scenario: null, resumeCode: "3f9a1c7e5b2d4086a1ce", firstOnGoogleAt: new Date("2026-10-02T07:52:00Z"),
};
/** A business waiting on Google, for the setup-help emails (verification and ownership). */
const SETUP_SAMPLE: LifeSnapshot = { ...LIFE_SAMPLE, accessGrantedAt: null, status: "access_pending", entitlement: "none", trialStartedAt: null, trialEndsAt: null };

export function catalog(): CatalogEntry[] {
  const e = (kind: string, category: CatalogEntry["category"], business: boolean, content: EmailContent): CatalogEntry => ({ kind, category, business, content });
  const grant = accessChangeEmail({ change: "granted", name: BIZ, at: "2026-10-22T10:00:00Z", trialStart: "2026-10-22T10:00:00Z", trialEnd: "2026-11-05T10:00:00Z", tz: "Asia/Dubai" }, APP);
  const removing = accessChangeEmail({ change: "removing", name: BIZ, at: "2026-10-20T10:00:00Z", dueAt: "2026-10-29T10:00:00Z" }, APP);
  const removed = accessChangeEmail({ change: "removed", name: BIZ, at: "2026-10-20T10:00:00Z" }, APP);
  const claimBody = "<p>Sample</p>";
  return [
    e("review_new", "review_new", true, reviewEmail(REVIEW, "send")),
    e("review_new_medium", "review_high_risk", true, reviewEmail(REVIEW_REFUND, "send")),
    e("review_no_safe_draft", "review_new", true, reviewEmail({ ...REVIEW, state: "blocked", draft: null }, "send")),
    e("review_high_risk", "review_high_risk", true, reviewEmail({ ...REVIEW, stars: 1, risk: "high", riskReasons: ["legal"], draft: null, comment: "I will see you in court." }, "send")),
    e("backlog_ready", "review_new", true, copy.backlogReady(BIZ, 23, APP)),
    e("digest", "review_new", true, digestEmail({ name: BIZ, tz: "Asia/Dubai", digestHour: 19, pausedUntil: null }, [
      ...stored("review_new", "New 5-star review", "/app/reviews?f=needs", reviewEmail(REVIEW, "digest"), "a"),
      ...stored("review_new", "New 4-star review", "/app/reviews?f=needs", reviewEmail(REVIEW_B, "digest"), "b"),
      ...stored("approval_needed", "This week's post is ready to review", "/app/posts", copy.weeklyPost(BIZ, "Saturday blow dry offer: book before noon.", APP)),
      ...stored("profile_issue", "Your website changed on Google", "/app/shield", copy.profileChange(BIZ, "website", { lines: ["Google shows a different website."], approvedBefore: true, before: "https://roselanesalon.example", after: "https://other.example" }, APP)),
    ], APP)),
    e("access_granted", "access", true, grant),
    e("access_removing", "access", true, removing),
    e("access_removed", "access", true, removed),
    e("access_lost", "access", true, copy.accessLost(BIZ, APP, 1)),
    e("one_reminder", "approval_needed", true, account.oneReminder({ business: BIZ, what: "reply", draft: REVIEW.draft!.body, url: LINKS.post })),
    e("receipt", "billing", false, account.receiptEmail({ business: BIZ, plan: "Kabsi Pro, monthly", amount: 39, tax: 0, paidOn: "2026-11-05T09:00:00Z", nextOn: "2026-12-05T09:00:00Z", founding: true, tz: "Asia/Dubai" }, APP)),
    e("payment_failed", "billing", false, account.paymentFailed({ business: BIZ, plan: "Kabsi Pro", amount: 39, on: "2026-12-05T09:00:00Z", graceEnds: "2026-12-12T09:00:00Z", portal: `${APP}/app/plan`, tz: "Asia/Dubai" })),
    e("plan_cancelled", "billing", false, account.planCancelled({ business: BIZ, plan: "Kabsi Pro", ends: "2026-12-05T09:00:00Z", tz: "Asia/Dubai", dataDays: 30 }, APP)),
    e("manager_steps", "direct", true, copy.managerSteps(BIZ, APP, 3)),
    e("deletion_scheduled", "account", true, copy.deletionScheduled(BIZ, "28 October 2026", APP)),
    e("deletion_done", "account", true, copy.deletionDone(BIZ, APP)),
    e("renew_r5", "billing", true, copy.renewalReminder("r5", BIZ, "Kabsi Pro, monthly", "28 October 2026", "pro_monthly", APP)),
    e("renew_r1", "billing", true, copy.renewalReminder("r1", BIZ, "Kabsi Pro, monthly", "28 October 2026", "pro_monthly", APP)),
    e("weekly_report", "weekly_report", true, copy.weeklyReport(BIZ, report, report.html, report.text, APP)),
    e("holiday_hours", "approval_needed", true, copy.holidayHoursAsk({
      business: BIZ, holiday: "Christmas Day", when: "Friday 25 December", estimated: false, ramadan: false,
      links: { choose: `${APP}/h/HOLIDAYTOKEN`, normal: `${APP}/h/HOLIDAYTOKEN?a=normal`, closed: `${APP}/h/HOLIDAYTOKEN?a=closed`, custom: `${APP}/h/HOLIDAYTOKEN?a=custom` },
    }, APP)),
    e("weekly_post", "approval_needed", true, copy.weeklyPost(BIZ, "Saturday blow dry offer: book before noon and we fit you in the same day.", APP)),
    e("shield_alert_urgent", "profile_urgent", true, copy.profileChange(BIZ, "opening hours", { lines: ["Google shows Sunday closing at 18:00. You approved 22:00.", "Google changed this itself, or accepted a suggestion from the public."], approvedBefore: true, before: "Mon to Sun 09:00 to 22:00", after: "Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00" }, APP)),
    e("team_invite", "direct", true, teamInviteEmail({ email: "manager@example.test", role: "manager", business: BIZ, invited_by: "Nadia", open: true, expires_at: "2026-11-04T00:00:00Z" }, APP)),
    e("profile_check", "direct", true, checkEmail({ esc, appUrl: APP }, SNAPSHOT, true)),
    e("assistant_report", "internal", false, copy.noraReport({ subject: "Chat: Nadia · Sales · Warm", summary: "A visitor asked about pricing.", bodyHtml: claimBody, text: "A visitor asked about pricing.", replyTo: null }, APP)),
    e("assistant_handoff", "internal", false, copy.noraHandoff({ reason: "billing", email: "visitor@example.test", summary: "Needs a person.", bodyHtml: claimBody, text: "Needs a person." }, APP)),
    e("assistant_handoff_ack", "direct", false, copy.noraAck()),
    ...(Object.keys(STEPS) as StepId[]).map((id) => e(`life_${id}`, STEPS[id].category, true, lifecycleEmail(id, id.startsWith("ownership_")
      ? { ...SETUP_SAMPLE, scenario: { id: "someone_else_owns", variant: "dont_know", startedAt: new Date("2026-10-01T09:00:00Z"), doneAt: new Date("2026-10-01T09:30:00Z") } }
      : id.startsWith("verify_")
        ? { ...SETUP_SAMPLE, scenario: { id: id === "verify_2" ? "google_reviewing" : "needs_verifying", variant: null, startedAt: new Date("2026-10-01T09:00:00Z"), doneAt: null } }
        : LIFE_SAMPLE, { appUrl: APP, removalOn: true }))),
  ];
}
