// The words of every Kabsi email that is not built from live review or Google data (K-102, K-118, P0.4-08), as pure
// functions that return structured content for the one template (template.ts). Call sites pass data in and the
// notification engine renders and sends. Moving the copy here, in one place, is what lets a test check every email:
// one yellow button, the business name first in the subject, a plain-text version, house style (catalog.test.ts).
// Subjects follow K-102: the business name first, then the action.
import { esc, KABSI_GROUP_ID, label as smallLabel, quoteBox, WHATSAPP_URL } from "../email-layout.ts";
import { accessStopped } from "./account-copy.ts";
import type { EmailContent } from "./template.ts";
import { TOKENS } from "./tokens.ts";

export const p = (html: string) => `<p style="margin:0 0 16px 0;">${html}</p>`;
export const box = quoteBox;
const link = (appUrl: string, path: string) => `${appUrl}${path}`;

// ─── reviews ──────────────────────────────────────────────────────────────────────────────────────────────────

/** R-30: exactly "<Business>: new <n>-star review, reply ready". A review whose draft could not be made safely says so. */
export function reviewSubject(business: string, stars: number, o: { replyReady: boolean }) {
  return o.replyReady ? `${business}: new ${stars}-star review, reply ready` : `${business}: new ${stars}-star review, your reply is needed`;
}
export const highRiskSubject = (business: string) => `${business}: a review needs a little more care`;

export function backlogReady(business: string, n: number, appUrl: string): EmailContent {
  const url = link(appUrl, "/app/reviews?f=needs");
  const text = `${n} reviews without a reply for ${business}. Drafts are ready.`;
  return {
    subject: `${business}: ${n} replies are ready`, title: `${n} reviews are waiting`, preheader: "Drafts are ready in your Kabsi inbox. Nothing is posted until you approve it.",
    bodyHtml: p(`<strong>${esc(business)}</strong> has ${n} Google reviews without a reply. Kabsi drafted a reply for each one. Nothing is posted until you approve it.`),
    text: `${text} Nothing is posted until you approve it.`, button: { label: "Open Kabsi", url },
    digest: { html: p(`<strong>${esc(business)}</strong> has ${n} Google reviews without a reply. Kabsi drafted a reply for each one.`), text },
  };
}

/** "Send these steps to my other device" (K-93, P0.4-03): to the signed-in person's own address, with a one-tap link back to the step. */
export function managerSteps(business: string, appUrl: string, step: number): EmailContent {
  const n = Math.min(Math.max(Math.round(step) || 1, 1), 5);
  const url = `${appUrl}/manager-steps?b=${encodeURIComponent(business)}&s=${n}`;
  return {
    subject: `${business}: add Kabsi as a Manager`, title: "Add Kabsi as a Manager", preheader: "Open these steps on the device where you sign in to Google.",
    bodyHtml: p(`You asked for the steps to add Kabsi as a Manager on the Google Business Profile of <strong>${esc(business)}</strong>. Open them on the device where you are signed in to Google.`)
      + p("It takes about two minutes, and each tap is shown. You can remove Kabsi at any time. Kabsi never asks for your Google password or a verification code."),
    text: `You asked for the steps to add Kabsi as a Manager on the Google Business Profile of ${business}. Open them on the device where you are signed in to Google.\n\nIt takes about two minutes, and each tap is shown. You can remove Kabsi at any time. Kabsi never asks for your Google password or a verification code.`,
    button: { label: "Open the steps", url },
  };
}

// ─── Google access ────────────────────────────────────────────────────────────────────────────────────────────

/** Connection or publication failed (30.15 section 6): Kabsi's Google access stopped working. */
export function accessLost(business: string, appUrl: string, waiting?: number): EmailContent {
  return accessStopped({ business, waiting }, appUrl);
}

// ─── deleting a business ──────────────────────────────────────────────────────────────────────────────────────

export function deletionScheduled(business: string, dueText: string, appUrl: string): EmailContent {
  return {
    subject: `${business}: leaves Kabsi on ${dueText} unless you cancel`, preheader: "You asked to remove this business. You can cancel until then.", title: "Your business leaves Kabsi soon",
    bodyHtml: p(`You asked Kabsi to delete <strong>${esc(business)}</strong>. On <strong>${esc(dueText)}</strong> we delete its reviews, drafts, posts, photos, reports and settings. Payment records are kept where the law requires.`)
      + p(`Changed your mind? Cancel it in Settings before then. To stop Kabsi reaching your Google profile, also remove the Kabsi Clients group (ID ${KABSI_GROUP_ID}) under People and access.`),
    button: { label: "Open Settings", url: `${appUrl}/app/settings` },
    text: `You asked Kabsi to delete ${business}. On ${dueText} we delete its reviews, drafts, posts, photos, reports and settings. Cancel in Settings before then: ${appUrl}/app/settings`,
  };
}

export function deletionDone(business: string, appUrl: string): EmailContent {
  return {
    subject: `${business}: deleted from Kabsi`, preheader: "Your business data is deleted.", title: "Deleted",
    bodyHtml: p(`We deleted <strong>${esc(business)}</strong> and its data from Kabsi. Your Kabsi review link and QR code no longer open your review page, and neither does any NFC card that carries them. If Kabsi is still a Manager on your Google profile, remove the Kabsi Clients group (ID ${KABSI_GROUP_ID}) under People and access.`),
    button: { label: "Open Kabsi", url: `${appUrl}/app` },
    text: `We deleted ${business} and its data from Kabsi. If Kabsi is still a Manager on your Google profile, remove the Kabsi Clients group (ID ${KABSI_GROUP_ID}) under People and access.\n\nOpen Kabsi: ${appUrl}/app`,
  };
}

// ─── trial and plan ──────────────────────────────────────────────────────────────────────────────────

export type RenewalStage = "r5" | "r1";
export function renewalReminder(stage: RenewalStage, business: string, planLabel: string, day: string, planKind: string, appUrl: string): EmailContent {
  const when = stage === "r1" ? "tomorrow" : "in a few days";
  const plain = `Your ${planLabel} plan for ${business} ends ${when}, on ${day}. To keep reply drafts, Google Protection and the Results Report going, pay before then. Paying early adds the new period after this one, so you lose no days. Your review link and QR code keep working either way.`;
  const url = `${appUrl}/app/plan?pay=${encodeURIComponent(planKind)}`;
  return {
    subject: stage === "r1" ? `${business}: your plan ends tomorrow` : `${business}: your plan ends on ${day}`,
    preheader: "Pay before it ends and you lose no days.", title: "Your plan is ending",
    bodyHtml: p(esc(plain)), button: { label: "Renew your plan", url }, text: `${plain}\n\nRenew your plan: ${url}`,
  };
}

// ─── the week ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The Monday Results Report (30.18 section 3): the body is the visual work receipt of report-body.ts. */
export function weeklyReport(business: string, o: { dates: string; preheader: string; button?: { label: string; path: string } }, html: string, text: string, appUrl: string): EmailContent {
  const report = `${appUrl}/app/report`;
  const main = o.button && o.button.path !== "/app/report" ? { label: o.button.label, url: `${appUrl}${o.button.path}` } : { label: "Open your report", url: report };
  return {
    subject: `${business}: your Results Report for ${o.dates}`, preheader: o.preheader, title: `Your Results Report, ${o.dates}`,
    bodyHtml: html, button: main, ...(main.url !== report ? { links: [{ label: "Open your report", url: report }] } : {}), text,
  };
}

export function weeklyPost(business: string, postText: string, appUrl: string): EmailContent {
  const url = `${appUrl}/app/posts`;
  return {
    subject: `${business}: this week's post is ready to review`, preheader: "Read it, change anything, then post it or skip it.", title: "This week's post is ready",
    bodyHtml: p(`Kabsi drafted a Google post for ${esc(business)} from the facts you gave us. Nothing is posted until you approve it.`)
      + smallLabel("Post ready") + quoteBox(postText),
    button: { label: "Review the post", url }, note: "Don't want weekly drafts? Switch them off on the Posts page.",
    text: `This week's post for ${business} is ready. Nothing is posted until you approve it.\n\n${postText}\n\nReview it: ${url}`,
  };
}

// ─── Google Protection ────────────────────────────────────────────────────────────────────────────────────────

export function profileChange(business: string, label: string, o: { lines: string[]; approvedBefore: boolean; before: string; after: string }, appUrl: string): EmailContent {
  const url = `${appUrl}/app/shield`;
  return {
    subject: `${business}: your ${label} changed on Google`, preheader: o.lines[0] ?? "", title: `Your ${label} changed on Google`,
    bodyHtml: o.lines.map((l) => p(esc(l))).join("")
      + smallLabel(o.approvedBefore ? "You approved" : "Kabsi saw before") + box(o.before || "(empty)")
      + smallLabel("Google shows now") + box(o.after || "(empty)"),
    button: { label: "Open Google Protection", url }, note: "Nothing changes on Google until you choose in Kabsi.",
    text: `${o.lines.join("\n")}\n\nOpen Google Protection: ${url}`,
  };
}

// ─── Nora and the team ───────────────────────────────────────────────────────────────────────────────────────

export function noraReport(o: { subject: string; summary: string; bodyHtml: string; text: string; replyTo: string | null }, appUrl: string): EmailContent {
  return {
    subject: o.subject, preheader: o.summary.slice(0, 140), title: "New chat with Nora", bodyHtml: o.bodyHtml,
    button: { label: "Open Staff", url: `${appUrl}/staff` }, text: `${o.text}\n\nOpen Staff: ${appUrl}/staff`,
  };
}

export function noraHandoff(o: { reason: string; email: string; summary: string; bodyHtml: string; text: string }, appUrl: string): EmailContent {
  return {
    subject: `Assistant hand-off (${o.reason}): ${o.email}`, preheader: o.summary.slice(0, 120), title: "A visitor needs a person", bodyHtml: o.bodyHtml,
    button: { label: "Reply to the visitor", url: `mailto:${o.email}` }, text: `${o.text}\n\nOpen Staff: ${appUrl}/staff`,
  };
}

export function noraAck(): EmailContent {
  return {
    subject: "We got your question", preheader: "A person from Kabsi will reply by email.", title: "We got your question",
    bodyHtml: p("Thanks for writing to Kabsi. A person on the team will reply to this address, usually within one working day.") + p("If you want to add anything, just reply to this email."),
    button: WHATSAPP_URL ? { label: "Message us on WhatsApp", url: WHATSAPP_URL } : { label: "Write to hello@kabsi.co", url: "mailto:hello@kabsi.co" },
    text: "Thanks for writing to Kabsi. A person on the team will reply to this address, usually within one working day. If you want to add anything, just reply to this email.",
  };
}

// ─── holidays ──────────────────────────────────────────────────────────────────────────────────────────────────

export type HolidayAskInput = {
  business: string;
  holiday: string;
  /** "Thursday 25 December" or "8 February to 8 March", already in words. */
  when: string;
  estimated: boolean;
  /** Ramadan has no "closed" answer: the choice is normal hours or different hours for the month. */
  ramadan: boolean;
  links: { choose: string; normal: string; closed: string; custom: string };
};

/** P0.5-03 (K-131): five days before a holiday. One yellow button; the three answers are plain links to the confirm page. */
export function holidayHoursAsk(o: HolidayAskInput, appUrl: string): EmailContent {
  const is = o.estimated ? "is expected" : "is";
  const answers = [
    { label: "Normal hours", url: o.links.normal },
    ...(o.ramadan ? [] : [{ label: "Closed", url: o.links.closed }]),
    { label: o.ramadan ? "Different hours" : "Custom hours", url: o.links.custom },
  ];
  const moon = o.estimated ? " The exact day follows the moon, so you can move the days on the next page." : "";
  const lead = `${o.holiday} ${is} on ${o.when}. Customers check Google for your hours first.`;
  return {
    subject: `${o.business}: your hours for ${o.holiday}`, preheader: "Tell Kabsi your hours. Nothing changes on Google until you confirm.", title: `Your hours for ${o.holiday}`,
    bodyHtml: p(`${esc(lead)}${esc(moon)}`) + p("Kabsi never assumes holiday hours. Choose one, check the hours on the next page and confirm. Nothing changes on Google until you do."),
    button: { label: "Choose your hours", url: o.links.choose }, links: answers,
    note: "You can also answer in Kabsi, under Hours.",
    text: `${lead}${moon}\n\nKabsi never assumes holiday hours. Choose one, check the hours and confirm. Nothing changes on Google until you do.\n\nChoose your hours: ${o.links.choose}\n${answers.map((a) => `${a.label}: ${a.url}`).join("\n")}\n\nYou can also answer in Kabsi, under Hours: ${link(appUrl, "/app/hours")}`,
    digest: {
      html: p(`<strong>${esc(o.business)}</strong>: ${esc(lead)} `) + `<div style="margin:0 0 12px 0;">${[{ label: "Choose your hours", url: o.links.choose }, ...answers].map((a) => `<a href="${esc(a.url)}" class="kb-t1" style="font-weight:700;color:${TOKENS.ink};margin-right:14px;">${esc(a.label)}</a>`).join("")}</div>`,
      text: `${o.business}: ${lead} Choose your hours: ${o.links.choose}`,
    },
  };
}
