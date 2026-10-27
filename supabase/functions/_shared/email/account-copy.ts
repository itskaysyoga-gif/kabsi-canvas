// The account and lifecycle emails of master plan 30.15 section 6 and COPY.md 22 and 25 (Email 1): welcome, setup incomplete
// (with the setup link kabsi.co/start/resume/CODE), access works, first work completed, the one reminder, connection or
// publication failed, trial ending with an explicit choice, receipt, failed payment and cancellation. The subjects are
// COPY.md 25's; the body lines are the design studio's /emails (d3-emails.tsx), written to the kabsi-copy rules. Pure
// functions over data the caller already read: no number, date or name is invented here.
import { card, esc, KABSI_GROUP_ID, label, para, ticks, WHATSAPP_URL } from "../email-layout.ts";
import { CARD_PAYMENTS_COMING, PLAN_PRICES } from "./lifecycle-copy.ts";
import type { EmailContent } from "./template.ts";
import { TOKENS } from "./tokens.ts";

/** "5 November" in the business's time zone (COPY.md writes dates without the year when it is this year's). */
export function dayMonth(d: Date | string, tz = "UTC"): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: tz }).format(new Date(d));
}
const money = (n: number) => `$${n.toFixed(2)}`;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The setup link (UX 1, LATER row): opens the next unfinished step on any device after sign-in. Without a code, /start finds it. */
export const setupLink = (appUrl: string, code: string | null | undefined) =>
  code && /^[0-9a-f]{20}$/.test(code) ? `${appUrl}/start/resume/${code}` : `${appUrl}/start`;

const FREE_FROM_GOOGLE = "Google Business Profile is free from Google. Kabsi is an independent paid service.";

// ─── welcome (COPY.md 22 as changed by 25) ──────────────────────────────────────────────────────────────────────────

export function welcomeEmail(o: { business: string; owner?: string | null }, appUrl: string): EmailContent {
  // Approvals on WhatsApp only while Kabsi has a WhatsApp number (whatsapp-setting.ts); until then by email or in Kabsi.
  const lead = `One step left: add Kabsi as a Manager on your Google profile. Kabsi then prepares your first task, and you approve it ${WHATSAPP_URL ? "on WhatsApp" : "by email or in Kabsi"}.`;
  return {
    subject: "Welcome to Kabsi, one step left", title: o.owner ? `Welcome to Kabsi, ${o.owner}.` : "Welcome to Kabsi.",
    preheader: `Add Kabsi as a Manager on Google, then approve your first task ${WHATSAPP_URL ? "on WhatsApp" : "by email or in Kabsi"}.`,
    bodyHtml: para(esc(lead)) + para("Kabsi never asks for your Google password or a verification code."),
    button: { label: "Add Kabsi as a Manager", url: `${appUrl}/manager-steps` },
    note: FREE_FROM_GOOGLE,
    text: `${lead}\n\nKabsi never asks for your Google password or a verification code.`,
    why: `You started setting up ${o.business} on Kabsi.`,
  };
}

// ─── setup incomplete ───────────────────────────────────────────────────────────────────────────────────────────

export type SetupNudge = "first" | "main" | "last";
/** The setup link email. "main" is COPY.md 25's; "first" (an hour in) and "last" (day 3) are its shorter siblings. */
export function setupIncomplete(o: { business: string; resumeCode?: string | null; nudge?: SetupNudge }, appUrl: string): EmailContent {
  const url = setupLink(appUrl, o.resumeCode);
  const nudge = o.nudge ?? "main";
  const subject = {
    first: `${o.business}: one step left to start`,
    main: `${o.business}: one step left in your setup`,
    last: `${o.business}: still want Kabsi to look after your Google profile?`,
  }[nudge];
  const lead = `Add Kabsi as a Manager on Google for ${o.business}. Your trial has not started and nothing has been published.`;
  const last = nudge === "last" ? "If something stopped you, for example your profile is not verified yet or someone else looks after it, reply and Kabsi finds the way with you. Changed your mind? Then you can ignore this email." : "";
  const help = "The button opens the step you have not finished, on any phone or computer. Want help? Reply to this email and a person helps.";
  return {
    subject, title: "Setup is waiting for one step.", preheader: "Your trial has not started and nothing has been published.",
    bodyHtml: para(esc(lead)) + (last ? para(esc(last)) : ""),
    button: { label: "Continue setup", url }, note: help,
    text: `${lead}${last ? `\n\n${last}` : ""}\n\nContinue setup: ${url}`,
    why: "You started setting up Kabsi and one step is left.",
  };
}

// ─── access works ───────────────────────────────────────────────────────────────────────────────────────────────

export function accessWorks(o: { business: string; when?: string; nextStep?: string | null; trialStart?: string | null; trialEnd?: string | null; tz?: string; removeSteps: string; freeLine: string; helpUrl: string }, appUrl: string): EmailContent {
  const tz = o.tz ?? "UTC";
  const trial = o.trialEnd
    ? `${o.trialStart ? `Started ${dayMonth(o.trialStart, tz)}, ends ${dayMonth(o.trialEnd, tz)}` : `Ends ${dayMonth(o.trialEnd, tz)}`}. No card, and no charge unless you choose a plan.`
    : null;
  // The caller's next step wins (no plan yet, early access): only a business on its way gets "your first task".
  const task = o.nextStep || "Kabsi is preparing your first task. It comes to you for a yes.";
  return {
    subject: `Kabsi can now look after ${o.business}`, title: "Access works.",
    preheader: o.trialEnd ? `Your free trial ends on ${dayMonth(o.trialEnd, tz)}. Your first task comes next.` : "Kabsi now has Manager access. Your first task comes next.",
    bodyHtml: para(`${o.when ? `What changed: on ${esc(o.when)} Kabsi accepted your invitation and became a Manager of` : "Kabsi now has Manager access to"} <strong>${esc(o.business)}</strong>${o.when ? "'s Google profile" : ""}, through the Kabsi Clients group. You stay the owner. Nothing has been published.`)
      + (trial ? card({ label: "Your free trial", html: esc(trial) }) : "")
      + card({ label: o.nextStep ? "What happens next" : "Your first task", html: esc(task) })
      + para(`What it lets Kabsi do: read your reviews and profile, and publish only what you approve. How to remove Kabsi at any time: in Kabsi open Settings, then Disconnect Kabsi from Google. Or ${esc(o.removeSteps)}`, { muted: true })
      + para(`${esc(o.freeLine)} <a href="${esc(o.helpUrl)}" class="kb-t2" style="color:inherit;text-decoration:underline;">Google's guide to working with a third party</a>.`, { muted: true }),
    button: { label: o.nextStep ? "Open Kabsi" : "See your first task", url: `${appUrl}/app` },
    note: "This is Kabsi's own notice of a change to your Google access. Google may send its own email too.",
    text: `${o.when ? `What changed: on ${o.when} Kabsi accepted your invitation and became a Manager of ${o.business}'s Google profile` : `Kabsi now has Manager access to ${o.business}`}, through the Kabsi Clients group. You stay the owner. Nothing has been published.\n\n${trial ? `Your free trial: ${trial}\n\n` : ""}${o.nextStep ? "What happens next" : "Your first task"}: ${task}\n\nWhat it lets Kabsi do: read your reviews and profile, and publish only what you approve. How to remove Kabsi at any time: in Kabsi open Settings, then Disconnect Kabsi from Google. Or ${o.removeSteps}\n\n${o.freeLine} Google's guide to working with a third party: ${o.helpUrl}`,
  };
}

// ─── first work completed ───────────────────────────────────────────────────────────────────────────────────────

export function firstWorkDone(o: { business: string }, appUrl: string): EmailContent {
  const lead = `Kabsi saw your first reply for ${o.business} on Google. Done.`;
  const next = "From now on, Kabsi drafts a reply for each new review and asks for your yes. When you have a minute, pick your competitors and the searches Kabsi checks.";
  return {
    subject: "Your first reply is on Google", title: "Your first reply is on Google.", preheader: "Kabsi saw your reply on Google.",
    bodyHtml: para(esc(lead)) + para(esc(next), { muted: true }),
    button: { label: "See your reply", url: `${appUrl}/app/reviews` },
    text: `${lead}\n\n${next}`,
  };
}

// ─── the one reminder ───────────────────────────────────────────────────────────────────────────────────────────

export function oneReminder(o: { business: string; what: "reply" | "post" | "change"; draft?: string | null; url: string }): EmailContent {
  const noun = { reply: "reply", post: "post", change: "change" }[o.what];
  const label = { reply: "Reply ready", post: "Post ready", change: "Hours ready" }[o.what];
  const lead = `Your ${noun} for ${o.business} is ready. Nothing has been published. Review it now, or later.`;
  const only = `This is the only reminder Kabsi sends for this ${noun}.`;
  return {
    subject: `${o.business}: a ${noun} is ready for your yes`, title: `A ${noun} is waiting.`, preheader: "Nothing has been published. Review it now, or later.",
    bodyHtml: para(esc(lead)) + (o.draft ? card({ label, html: esc(o.draft).replace(/\n/g, "<br>") }) : ""),
    button: { label: "Review it", url: o.url }, note: only,
    text: `${lead}${o.draft ? `\n\n${label}:\n${o.draft}` : ""}\n\nReview it: ${o.url}\n\n${only}`,
  };
}

// ─── connection or publication failed ─────────────────────────────────────────────────────────────────────────────

export function accessStopped(o: { business: string; waiting?: number }, appUrl: string): EmailContent {
  const what = o.waiting ? `${plural(o.waiting, "approved item waits", "approved items wait")}` : "Anything you approve waits";
  const lead = `Kabsi can no longer reach the Google profile of ${o.business}. This usually means Kabsi was removed as a Manager. Nothing was published.`;
  const steps = `On your Business Profile open Menu, then Business Profile settings, then People and access, and add the Kabsi group ID ${KABSI_GROUP_ID} as a Manager.`;
  const next = `${what} until access works. Add Kabsi as a Manager again and Kabsi sends it within a few minutes.`;
  const onPurpose = "Did you remove Kabsi on purpose? Then there is nothing to do.";
  return {
    subject: `${o.business}: Kabsi's Google access stopped working`, title: "Kabsi could not reach your Google profile.",
    preheader: "Nothing was published. Your approved work waits until access works.",
    bodyHtml: para(esc(lead)) + card({ label: "What happens next", tone: "bad", html: esc(next) }) + para(esc(steps)),
    button: { label: "Check Kabsi's access", url: `${appUrl}/app/settings` }, note: onPurpose,
    text: `${lead}\n\nWhat happens next: ${next}\n\n${steps}\n\n${onPurpose}`,
  };
}

// ─── trial ending, with an explicit choice ────────────────────────────────────────────────────────────────────────

export function trialEnding(o: { business: string; ends: Date | string; tz?: string; work: { repliesSent: number; postsSent: number; changesCaught: number } }, appUrl: string): EmailContent {
  const end = dayMonth(o.ends, o.tz ?? "UTC");
  const w = o.work;
  const done = [
    w.repliesSent ? `${plural(w.repliesSent, "reply", "replies")} sent to Google` : "",
    w.postsSent ? `${plural(w.postsSent, "post", "posts")} sent to Google` : "",
    w.changesCaught ? `${plural(w.changesCaught, "change to your Google profile", "changes to your Google profile")} caught` : "",
  ].filter(Boolean);
  const choice = `Pro is $${PLAN_PRICES.proMonthly} a month: a post every week, team roles and 5 searches checked weekly. Essentials is $${PLAN_PRICES.essentialsMonthly} a month: every reply, 2 posts a month and 1 search checked monthly. Prices are in US dollars, plus tax where it applies.`;
  const letEnd = `Or let it end. Nothing is charged, and from ${end} Kabsi publishes nothing. For 7 more days it keeps watching your reviews and drafting replies, in case you choose a plan. You keep your review link and QR code.`;
  const doneText = done.length ? done : ["Kabsi watched your reviews and your Google profile every day"];
  return {
    subject: `Your Kabsi trial ends on ${end}`, title: `Your trial ends on ${end}.`, preheader: "What Kabsi did in your trial, the price, and your choice.",
    bodyHtml: label(`Done for ${o.business} in your trial`) + ticks(doneText)
      + card({ label: "Your choice", html: esc(choice) }) + para(esc(letEnd), { muted: true }) + para(esc(CARD_PAYMENTS_COMING), { muted: true }),
    button: { label: "Choose my plan", url: `${appUrl}/app/plan` },
    text: `Done for ${o.business} in your trial:\n${doneText.map((l) => `- ${l}`).join("\n")}\n\nYour choice: ${choice}\n\n${letEnd}\n\n${CARD_PAYMENTS_COMING}`,
    why: "Your Kabsi trial is ending and you have a choice to make.",
  };
}

// ─── receipt, failed payment, cancellation ────────────────────────────────────────────────────────────────────────

export function receiptEmail(o: { business: string; plan: string; amount: number; tax: number; paidOn: Date | string; nextOn?: Date | string | null; founding?: boolean; tz?: string }, appUrl: string): EmailContent {
  const tz = o.tz ?? "UTC";
  const paid = dayMonth(o.paidOn, tz);
  const rows: [string, string][] = [[o.plan, money(o.amount - o.tax)], ["Tax", money(o.tax)], [`Paid on ${paid}`, money(o.amount)]];
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px 0;">${rows.map(([k, v], i) =>
    `<tr><td class="kb-line" style="padding:10px 0;border-bottom:1px solid ${TOKENS.hairline};font-size:15px;${i === 2 ? "font-weight:700;" : ""}">${esc(k)}</td><td class="kb-line" align="right" style="padding:10px 0;border-bottom:1px solid ${TOKENS.hairline};font-size:15px;${i === 2 ? "font-weight:700;" : ""}">${esc(v)}</td></tr>`).join("")}</table>`;
  const after = `Business: ${o.business}.${o.nextOn ? ` Next payment on ${dayMonth(o.nextOn, tz)}.` : ""}${o.founding ? " Founding price, kept while your subscription stays paid." : ""}`;
  const mor = "Payments are processed by Creem, our merchant of record.";
  return {
    subject: `Receipt: ${o.plan}`, title: "Thank you. Your payment went through.", preheader: `${money(o.amount)} paid on ${paid}.`,
    bodyHtml: table + para(esc(after), { muted: true }),
    button: { label: "See your plan", url: `${appUrl}/app/plan` }, note: mor,
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${after}\n\n${mor}`,
  };
}

export function paymentFailed(o: { business: string; plan?: string | null; amount?: number | null; on?: Date | string | null; graceEnds?: Date | string | null; portal: string; reminder?: boolean; tz?: string }): EmailContent {
  const tz = o.tz ?? "UTC";
  const what = o.amount != null && o.plan ? `the ${money(o.amount)} payment for ${o.plan}` : "your payment for Kabsi";
  const lead = `Your bank turned down ${what}${o.on ? ` on ${dayMonth(o.on, tz)}` : ""}. Kabsi keeps working ${o.graceEnds ? `until ${dayMonth(o.graceEnds, tz)}` : "for 7 days"} while you fix it. Nothing has been deleted.`;
  const help = "Charged and still seeing this? Write to hello@kabsi.co and a person helps.";
  return {
    subject: o.reminder ? "Reminder: your payment for Kabsi did not go through" : "Your payment for Kabsi did not go through",
    title: "Your payment did not go through.", preheader: o.graceEnds ? `Kabsi keeps working until ${dayMonth(o.graceEnds, tz)} while you fix it.` : "Kabsi keeps working for 7 days while you fix it.",
    bodyHtml: para(esc(lead)) + para(`Business: ${esc(o.business)}.`, { muted: true }),
    button: { label: "Update my card", url: o.portal }, note: help,
    text: `${lead}\n\nBusiness: ${o.business}.\n\n${help}`,
  };
}

export function planCancelled(o: { business: string; plan?: string | null; ends?: Date | string | null; tz?: string; dataDays: number }, appUrl: string): EmailContent {
  const end = o.ends ? dayMonth(o.ends, o.tz ?? "UTC") : null;
  const lead = `${o.plan ?? "Your Kabsi plan"} for ${o.business} ends on ${end ?? "the last day you paid for"}. Until then everything works as now, and nothing more is charged.`;
  const after = `Kabsi stops publishing, and your data is kept for ${o.dataDays} days, then deleted. You keep your review link and QR code. To remove Kabsi as a Manager, open People and access on Google.`;
  const ask = "Thank you for trying Kabsi. What could Kabsi have done better? Just reply.";
  return {
    subject: "Your Kabsi plan is cancelled", title: "Your plan is cancelled.", preheader: end ? `Everything works until ${end}.` : "Everything works until your plan ends.",
    bodyHtml: para(esc(lead)) + card({ label: end ? `After ${end}` : "After your plan ends", html: esc(after) }),
    button: { label: "Keep my plan", url: `${appUrl}/app/plan` }, note: ask,
    text: `${lead}\n\n${end ? `After ${end}` : "After your plan ends"}: ${after}\n\n${ask}`,
  };
}

