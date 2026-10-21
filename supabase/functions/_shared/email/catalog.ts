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
import { lifecycleEmail } from "./lifecycle-copy.ts";
import { STEPS, type Snapshot as LifeSnapshot, type StepId } from "../lifecycle.ts";
import type { EmailContent } from "./template.ts";

export type CatalogEntry = {
  kind: string;
  category: CategoryId | SystemCategory;
  /** The business name leads the subject (K-102). False for mail with no business, like a partner invoice. */
  business: boolean;
  content: EmailContent;
};

const APP = "https://kabsi.co";
const BIZ = "Yawmiyati";
const LINKS = { post: `${APP}/a/POSTTOKEN`, edit: `${APP}/a/EDITTOKEN`, skip: `${APP}/a/SKIPTOKEN`, open: `${APP}/a/OPENTOKEN` };
const REVIEW: ReviewInput = {
  business: BIZ, reviewer: "Sarah", stars: 5, comment: "Lovely staff and the best man'oushe in town.", risk: "low", riskReasons: [], state: "drafted",
  draft: { body: "Thank you, Sarah. We are glad you enjoyed your visit and we hope to see you again soon.", safe: true }, links: LINKS, appUrl: APP,
};
const SNAPSHOT: Snapshot = {
  place_id: "ChIJsample0000000", name: BIZ, address: "12 Hamra Street, Beirut", category: "Bakery", rating: 4.6, review_count: 128, business_status: "OPERATIONAL",
  open_now: true, hours: [], phone: null, website: "https://example.com", has_photos: true, photo_count: 12, cached: false,
  findings: [{ level: "urgent", title: "Your opening hours are missing", detail: "Customers cannot tell when you are open." }, { level: "recommended", title: "No phone number on your listing", detail: "Customers who want to call have nothing to tap." }],
};
const REPORT = {
  period: { from: "Oct 12", to: "Oct 19" }, rating: 4.6, rating_count: 128, rating_change: 0.1, rating_drop: false, new_reviews: 6, new_avg: 4.7, replied: 5, waiting: 1,
  taps: { total: 14, nfc: 9, qr: 5 },
};
const report = renderReport({ name: BIZ }, REPORT);
const stored = (category: string, title: string, link: string, content: EmailContent, n = 1) =>
  Array.from({ length: n }, (_, i) => ({
    id: `n${i}${category}`, location_id: "loc", user_id: "u", to_address: "owner@example.test", category, kind: category, dedupe_key: `k${i}${category}`, title, link,
    email_state: "digest" as const, email_due_at: "2026-10-21T16:00:00Z", email_content: content,
  }));

/** A business in the middle of a trial, for the lifecycle emails. */
export const LIFE_SAMPLE: LifeSnapshot = {
  locationId: "loc1", name: BIZ, timeZone: "Asia/Beirut", country: "US", status: "active", createdAt: new Date("2026-10-01T09:00:00Z"), consentAt: new Date("2026-10-01T09:10:00Z"),
  accessGrantedAt: new Date("2026-10-01T10:00:00Z"), entitlement: "trial", trialStartedAt: new Date("2026-10-01T10:00:00Z"), trialEndsAt: new Date("2026-10-15T10:00:00Z"),
  owners: [{ userId: "u1", email: "owner@example.test" }], marketingConsent: true, waitingReviews: 4, waitingChanges: 1, firstApprovalAt: new Date("2026-10-02T09:00:00Z"),
  recap: { repliesPrepared: 9, repliesSent: 6, postsSent: 1, changesCaught: 2 },
};

export function catalog(): CatalogEntry[] {
  const e = (kind: string, category: CatalogEntry["category"], business: boolean, content: EmailContent): CatalogEntry => ({ kind, category, business, content });
  const grant = accessChangeEmail({ change: "granted", name: BIZ, at: "2026-10-20T10:00:00Z", nextStep: "Kabsi is now watching your reviews. When the next one arrives you'll get an email with a reply ready." }, APP);
  const removing = accessChangeEmail({ change: "removing", name: BIZ, at: "2026-10-20T10:00:00Z", dueAt: "2026-10-29T10:00:00Z" }, APP);
  const removed = accessChangeEmail({ change: "removed", name: BIZ, at: "2026-10-20T10:00:00Z" }, APP);
  const claimBody = "<p>Sample</p>";
  return [
    e("review_new", "review_new", true, reviewEmail(REVIEW, "send")),
    e("review_new_medium", "review_high_risk", true, reviewEmail({ ...REVIEW, stars: 2, risk: "medium", riskReasons: ["refund"], comment: "Waited too long and wanted a refund." }, "send")),
    e("review_no_safe_draft", "review_new", true, reviewEmail({ ...REVIEW, state: "blocked", draft: null }, "send")),
    e("review_high_risk", "review_high_risk", true, reviewEmail({ ...REVIEW, stars: 1, risk: "high", riskReasons: ["legal"], draft: null, comment: "I will see you in court." }, "send")),
    e("backlog_ready", "review_new", true, copy.backlogReady(BIZ, 23, APP)),
    e("digest", "review_new", true, digestEmail({ name: BIZ, tz: "Asia/Beirut", digestHour: 19, pausedUntil: null }, [
      ...stored("review_new", "New 4-star review", "/app/reviews?f=needs", reviewEmail(REVIEW, "digest"), 2),
      ...stored("approval_needed", "This week's post is ready to review", "/app/posts", copy.weeklyPost(BIZ, "Fresh manakish every morning from 7.", APP)),
      ...stored("profile_issue", "Your website changed on Google", "/app/shield", copy.profileChange(BIZ, "website", { lines: ["Google shows a different website."], approvedBefore: true, before: "https://yawmiyati.example", after: "https://other.example" }, APP)),
    ], APP)),
    e("access_granted", "access", true, grant),
    e("access_removing", "access", true, removing),
    e("access_removed", "access", true, removed),
    e("access_lost", "access", true, copy.accessLost(BIZ, APP)),
    e("deletion_scheduled", "account", true, copy.deletionScheduled(BIZ, "28 October 2026", APP)),
    e("deletion_done", "account", true, copy.deletionDone(BIZ, APP)),
    e("trial_d7", "billing", true, copy.trialReminder("d7", BIZ, "28 October 2026", APP)),
    e("trial_d1", "billing", true, copy.trialReminder("d1", BIZ, "28 October 2026", APP)),
    e("trial_d0", "billing", true, copy.trialReminder("d0", BIZ, "28 October 2026", APP)),
    e("renew_r5", "billing", true, copy.renewalReminder("r5", BIZ, "Kabsi Pro, monthly", "28 October 2026", "pro_monthly", APP)),
    e("renew_r1", "billing", true, copy.renewalReminder("r1", BIZ, "Kabsi Pro, monthly", "28 October 2026", "pro_monthly", APP)),
    e("payment_received", "billing", true, copy.paymentReceived(BIZ, "We received your payment of $19.00 for Kabsi Pro, monthly. Your plan runs until 28 November 2026. Thank you.", APP)),
    e("weekly_report", "weekly_report", true, copy.weeklyReport(BIZ, { newReviews: REPORT.new_reviews, replied: REPORT.replied }, report.html, report.text, APP)),
    e("weekly_post", "approval_needed", true, copy.weeklyPost(BIZ, "Fresh manakish every morning from 7. Come early for the zaatar.", APP)),
    e("shield_alert_urgent", "profile_urgent", true, copy.profileChange(BIZ, "opening hours", { lines: ["Google shows Sunday closing at 18:00. You approved 22:00.", "Google changed this itself, or accepted a suggestion from the public."], approvedBefore: true, before: "Mon to Sun 09:00 to 22:00", after: "Mon to Sat 09:00 to 22:00, Sun 09:00 to 18:00" }, APP)),
    e("team_invite", "direct", true, teamInviteEmail({ email: "manager@example.test", role: "manager", business: BIZ, invited_by: "Rana", open: true, expires_at: "2026-11-04T00:00:00Z" }, APP)),
    e("profile_check", "direct", true, checkEmail({ esc, appUrl: APP }, SNAPSHOT, true)),
    e("partner_invite", "direct", false, copy.partnerInvite("Beirut Growth Studio", BIZ, `${APP}/start?p=beirut-growth&i=INVITE`)),
    e("partner_invoice", "partner", false, copy.partnerInvoice({ label: "September 2026", amount: 30, active: 3, free: 0, rate: 10, unpaid: true, trc20: "TSAMPLEADDRESS", binanceId: "User-sample" }, APP)),
    e("partner_paid", "partner", false, copy.partnerPaid("September 2026", 30, APP)),
    e("usdt_claim_alert", "internal", false, copy.usdtClaim({ who: BIZ, whoLine: "for Kabsi Pro, monthly", reference: "c1", net: "USDT TRC20", tx: "abc123sample", tronscan: true, startsPlan: true, amount: 19 }, APP)),
    e("assistant_report", "internal", false, copy.noraReport({ subject: "Chat: Sarah · Sales · Warm", summary: "A visitor asked about pricing.", bodyHtml: claimBody, text: "A visitor asked about pricing.", replyTo: null }, APP)),
    e("assistant_handoff", "internal", false, copy.noraHandoff({ reason: "billing", email: "visitor@example.test", summary: "Needs a person.", bodyHtml: claimBody, text: "Needs a person." }, APP)),
    e("assistant_handoff_ack", "direct", false, copy.noraAck()),
    ...(Object.keys(STEPS) as StepId[]).map((id) => e(`life_${id}`, STEPS[id].category, true, lifecycleEmail(id, LIFE_SAMPLE, { appUrl: APP, removalOn: true }))),
    e("lead_alert", "internal", false, copy.leadAlert("partner", "Rana", "rana@example.test", "<p><strong>name:</strong> Rana</p><p><strong>message:</strong> I run three salons.</p>", "name: Rana\nmessage: I run three salons.")),
  ];
}
