// The words of every Kabsi email that is not built from live review or Google data (K-102, K-118, P0.4-08), as pure
// functions that return structured content for the one template (template.ts). Call sites pass data in and the
// notification engine renders and sends. Moving the copy here, in one place, is what lets a test check every email:
// one yellow button, the business name first in the subject, a plain-text version, house style (catalog.test.ts).
// Subjects follow K-102: the business name first, then the action.
import { esc, KABSI_GROUP_ID, WHATSAPP_URL } from "../email-layout.ts";
import type { EmailContent } from "./template.ts";
import { TOKENS } from "./tokens.ts";

export const p = (html: string) => `<p style="margin:0 0 16px 0;">${html}</p>`;
export const box = (s: string) => `<div style="margin:0 0 16px 0;padding:14px 16px;background:${TOKENS.sand};border-radius:14px;white-space:pre-wrap;">${esc(s)}</div>`;
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

// ─── Google access ────────────────────────────────────────────────────────────────────────────────────────────

export function accessLost(business: string, appUrl: string): EmailContent {
  return {
    subject: `${business}: Kabsi can't reach your Google profile`,
    preheader: "Invite the Kabsi group again to continue.", title: "Kabsi lost access to your Google profile",
    bodyHtml: p(`Google stopped letting Kabsi read <strong>${esc(business)}</strong>'s reviews. This usually means the Kabsi group was removed from the profile's managers.`)
      + p(`To continue: on your Business Profile open <strong>Menu</strong>, then <strong>Business Profile settings</strong>, then <strong>People and access</strong>, and invite the <strong>Kabsi group ID ${KABSI_GROUP_ID}</strong> as a <strong>Manager</strong>. Kabsi reconnects on its own within a few minutes.`)
      + p("Until then no replies are drafted and nothing is posted. If you removed Kabsi on purpose, you don't need to do anything."),
    button: { label: "Open Kabsi", url: `${appUrl}/app` },
    text: `Google stopped letting Kabsi read ${business}'s reviews, usually because the Kabsi group was removed as a Manager.\n\nTo continue, invite the Kabsi group ID ${KABSI_GROUP_ID} as a Manager again under People and access on your Business Profile. Kabsi reconnects within a few minutes.\n\nOpen Kabsi: ${appUrl}/app`,
  };
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

export type TrialStage = "d7" | "d1" | "d0";
const TRIAL: Record<TrialStage, { subject: (d: string) => string; lead: (name: string, d: string) => string }> = {
  d7: { subject: (d) => `your free trial ends on ${d}`, lead: (n, d) => `Your free trial for <strong>${n}</strong> runs until ${d}.` },
  d1: { subject: () => "your free trial ends tomorrow", lead: (n, d) => `Your free trial for <strong>${n}</strong> ends tomorrow, ${d}.` },
  d0: { subject: () => "your free trial ends today", lead: (n) => `Today is the last day of your free trial for <strong>${n}</strong>.` },
};
export function trialReminder(stage: TrialStage, business: string, day: string, appUrl: string): EmailContent {
  const c = TRIAL[stage];
  const tail = "After that reply drafts, Google Protection and the Weekly Care Report stop. Your review link and QR code keep working.";
  const plain = `${c.lead(business, day).replace(/<\/?strong>/g, "")} ${tail}`;
  return {
    subject: `${business}: ${c.subject(day)}`, preheader: "Choose a plan to keep everything going.", title: "Your free trial",
    bodyHtml: p(`${c.lead(esc(business), day)} ${tail}`) + p("To keep everything going, choose a plan before the trial ends."),
    button: { label: "Choose a plan", url: `${appUrl}/app/plan` },
    text: `${plain}\n\nTo keep everything going, choose a plan before the trial ends.\n\nChoose a plan: ${appUrl}/app/plan`,
  };
}

export type RenewalStage = "r5" | "r1";
export function renewalReminder(stage: RenewalStage, business: string, planLabel: string, day: string, planKind: string, appUrl: string): EmailContent {
  const when = stage === "r1" ? "tomorrow" : "in a few days";
  const plain = `Your ${planLabel} plan for ${business} ends ${when}, on ${day}. To keep reply drafts, Google Protection and the Weekly Care Report going, pay before then. Paying early adds the new period after this one, so you lose no days. Your review link and QR code keep working either way.`;
  const url = `${appUrl}/app/plan?pay=${encodeURIComponent(planKind)}`;
  return {
    subject: stage === "r1" ? `${business}: your plan ends tomorrow` : `${business}: your plan ends on ${day}`,
    preheader: "Pay before it ends and you lose no days.", title: "Your plan is ending",
    bodyHtml: p(esc(plain)), button: { label: "Renew your plan", url }, text: `${plain}\n\nRenew your plan: ${url}`,
  };
}

// ─── the week ─────────────────────────────────────────────────────────────────────────────────────────────────

export function weeklyReport(business: string, o: { newReviews: number; replied: number }, html: string, text: string, appUrl: string): EmailContent {
  return {
    subject: `${business}: your Weekly Care Report`, preheader: `${o.newReviews} new reviews, ${o.replied} replied.`, title: "Your Weekly Care Report",
    bodyHtml: html, button: { label: "Open your week", url: `${appUrl}/app/report` }, text: `${text}\n\nOpen your week: ${appUrl}/app/report`,
  };
}

export function weeklyPost(business: string, postText: string, appUrl: string): EmailContent {
  const url = `${appUrl}/app/posts`;
  return {
    subject: `${business}: this week's post is ready to review`, preheader: "Read it, change anything, then post it or skip it.", title: "This week's post is ready",
    bodyHtml: p(`Kabsi drafted a Google post for ${esc(business)} from the facts you gave us. Nothing is posted until you approve it.`)
      + `<p style="margin:0 0 20px 0;padding:14px 16px;background:${TOKENS.sand};border-radius:10px;white-space:pre-wrap;">${esc(postText)}</p>`,
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
      + `<p style="margin:0 0 6px 0;font-size:14px;color:${TOKENS.stone};">${o.approvedBefore ? "You approved" : "Kabsi saw before"}</p>${box(o.before || "(empty)")}`
      + `<p style="margin:0 0 6px 0;font-size:14px;color:${TOKENS.stone};">Google shows now</p>${box(o.after || "(empty)")}`,
    button: { label: "Open Google Protection", url }, note: "Nothing changes on Google until you choose in Kabsi.",
    text: `${o.lines.join("\n")}\n\nOpen Google Protection: ${url}`,
  };
}

// ─── Nora, leads and the team ─────────────────────────────────────────────────────────────────────────────────

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
    button: { label: "Message us on WhatsApp", url: WHATSAPP_URL },
    text: "Thanks for writing to Kabsi. A person on the team will reply to this address, usually within one working day. If you want to add anything, just reply to this email.",
  };
}

export function leadAlert(kind: string, name: string, email: string, bodyHtml: string, text: string): EmailContent {
  return {
    subject: `New ${kind} lead: ${name}`, preheader: `New ${kind} lead`, title: `New ${kind} lead`, bodyHtml,
    button: { label: "Reply to the lead", url: `mailto:${email}` }, text,
  };
}
