// The words of the lifecycle emails (G-25, G-30, K-101, K-118; P0.4-10), as pure functions over a business snapshot, so a
// test can read all of them. Numbers come from the snapshot (which takes them from the audit log) and never from a
// counter, a guess or a made-up figure. No end-of-trial discount, no ranking promise, no "automatically", no Google as
// a partner. The one yellow button is always the next step; everything else is a plain link.
import { esc, WHATSAPP_URL } from "../email-layout.ts";
import type { Snapshot, StepId } from "../lifecycle.ts";
import { p } from "./copy.ts";
import { isSetupHelpStep, setupHelpEmail } from "./setup-help-copy.ts";
import { firstWorkDone, setupIncomplete, trialEnding, welcomeEmail } from "./account-copy.ts";
import type { EmailContent } from "./template.ts";

// The prices of the website (lane R, 22 Oct 2026): Essentials, Pro and an extra location. Keep equal to PLAN_PRICES and
// PRICES_SENTENCE in src/lib/site.ts (tests/lifecycle.test.ts checks it). Card payments through Creem are not open, so
// every email that names a price also says so.
export const PLAN_PRICES = {
  essentialsMonthly: 19,
  essentialsYearly: 190,
  proMonthly: 39,
  proYearly: 390,
  extraLocationMonthly: 15,
  extraLocationYearly: 150,
} as const;
export const PRICES_SENTENCE = `Essentials is $${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year. Pro is $${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year. An extra location is $${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year. Prices are in US dollars, plus tax where it applies.`;
// Keep equal to CARD_PAYMENTS_COMING in src/lib/plans.ts.
export const CARD_PAYMENTS_COMING = "Card payments in US dollars are coming. Until they open there is nothing to pay.";
const PRICE_LINE = `${PRICES_SENTENCE} ${CARD_PAYMENTS_COMING}`;

export type LifecycleCtx = { appUrl: string; removalOn: boolean };

const day = (d: Date | null, tz: string) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: tz }) : "");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The WhatsApp link is left out while Kabsi has no WhatsApp number (whatsapp-setting.ts); the footer keeps hello@kabsi.co.
const helpLinks = (c: LifecycleCtx) => [{ label: "Book a free setup call", url: `${c.appUrl}/setup-call` }, ...(WHATSAPP_URL ? [{ label: "Message us on WhatsApp", url: WHATSAPP_URL }] : [])];

// Email 1: the three setup reminders are the setup-incomplete email with the setup link (account-copy.ts).
function noAccess(step: "no_access_1h" | "no_access_24h" | "no_access_72h", s: Snapshot, c: LifecycleCtx): EmailContent {
  const nudge = step === "no_access_1h" ? "first" : step === "no_access_24h" ? "main" : "last";
  return setupIncomplete({ business: s.name, resumeCode: s.resumeCode ?? null, nudge }, c.appUrl);
}

function week(s: Snapshot) {
  const r = s.recap;
  const lines: string[] = [];
  lines.push(`${plural(r.repliesPrepared, "reply prepared", "replies prepared")}`);
  lines.push(`${plural(r.repliesSent, "reply you approved and Kabsi sent to Google", "replies you approved and Kabsi sent to Google")}`);
  if (r.postsSent) lines.push(`${plural(r.postsSent, "post you approved", "posts you approved")}`);
  lines.push(`${plural(r.changesCaught, "change to your Google profile caught", "changes to your Google profile caught")}`);
  return lines;
}
const list = (lines: string[]) => `<ul style="margin:0 0 16px 0;padding-left:20px;">${lines.map((l) => `<li style="margin:0 0 6px 0;">${esc(l)}</li>`).join("")}</ul>`;

export function lifecycleEmail(step: StepId, s: Snapshot, c: LifecycleCtx): EmailContent {
  const open = `${c.appUrl}/app`;
  const plan = `${c.appUrl}/app/plan`;
  const ends = day(s.trialEndsAt, s.timeZone);
  if (isSetupHelpStep(step)) return setupHelpEmail(step, s, c);
  switch (step) {
    case "welcome":
      return welcomeEmail({ business: s.name }, c.appUrl);
    case "no_access_1h": case "no_access_24h": case "no_access_72h":
      return noAccess(step, s, c);
    case "first_reply_approved":
      // Email 1: "first work completed" goes once Kabsi saw the first reply on Google (30.15 3.1), not at the approval.
      return firstWorkDone({ business: s.name, at: s.firstOnGoogleAt ?? s.firstApprovalAt ?? new Date(), tz: s.timeZone }, c.appUrl);
    case "trial_day2": {
      const r = s.recap;
      const first = r.repliesPrepared > 0 || r.changesCaught > 0
        ? `So far Kabsi has ${[r.repliesPrepared ? `prepared ${plural(r.repliesPrepared, "reply", "replies")}` : "", r.changesCaught ? `caught ${plural(r.changesCaught, "change", "changes")} to your Google profile` : ""].filter(Boolean).join(" and ")}. They wait for you in Kabsi, and nothing is published until you approve it.`
        : "Kabsi is watching your reviews and your Google profile. When a review arrives, a reply is ready for you to approve.";
      return {
        subject: `${s.name}: here is what Kabsi has done so far`, title: "Your first days with Kabsi", preheader: "What Kabsi has done for you so far.",
        bodyHtml: p(esc(first)) + (ends ? p(`Your free trial runs until ${esc(ends)}. No card is needed.`) : ""),
        button: { label: "Open Kabsi", url: open }, text: `${first}${ends ? `\n\nYour free trial runs until ${ends}. No card is needed.` : ""}`,
      };
    }
    case "trial_day7": {
      const lines = week(s);
      return {
        subject: `${s.name}: your first week with Kabsi`, title: "Your first week with Kabsi", preheader: "What Kabsi did for you this week, from your own record.",
        bodyHtml: p("Here is your first week, counted from the record of what Kabsi did and what you approved:") + list(lines) + p(esc(PRICE_LINE)) + (ends ? p(`Your free trial runs until ${esc(ends)}.`) : ""),
        button: { label: "See your plan", url: plan }, links: [{ label: "Open Kabsi", url: open }],
        text: `Here is your first week, counted from the record of what Kabsi did and what you approved:\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\n${PRICE_LINE}${ends ? `\n\nYour free trial runs until ${ends}.` : ""}`,
      };
    }
    case "trial_day11":
      return trialEnding({ business: s.name, ends: s.trialEndsAt ?? new Date(), tz: s.timeZone, work: s.recap }, c.appUrl);
    case "trial_day14": {
      const grace = s.trialEndsAt ? day(new Date(s.trialEndsAt.getTime() + 7 * 86_400_000), s.timeZone) : "";
      const removal = c.removalOn ? ` On ${grace} Kabsi removes its Manager access to your Google profile and tells you.` : "";
      return {
        subject: `${s.name}: your free trial has ended`, title: "Your free trial has ended", preheader: "Kabsi keeps watching and drafting for 7 days. Choose a plan to publish again.",
        bodyHtml: p(`Your free trial ended on ${esc(ends)}. For 7 more days Kabsi keeps watching your reviews and your profile and drafting replies, but publishes nothing. Home shows what is waiting.${esc(removal)}`)
          + p("Your review link keeps working.") + p(esc(PRICE_LINE)),
        button: { label: "See your plan", url: plan }, links: [{ label: "Open Kabsi", url: open }],
        text: `Your free trial ended on ${ends}. For 7 more days Kabsi keeps watching your reviews and your profile and drafting replies, but publishes nothing. Home shows what is waiting.${removal}\n\nYour review link keeps working.\n\n${PRICE_LINE}`,
      };
    }
    case "winback_17": case "winback_30": {
      const parts = [s.waitingReviews ? plural(s.waitingReviews, "review", "reviews") : "", s.waitingChanges ? plural(s.waitingChanges, "change to your Google profile", "changes to your Google profile") : ""].filter(Boolean);
      const what = parts.join(" and ");
      const verb = s.waitingReviews + s.waitingChanges === 1 ? "is" : "are";
      return {
        subject: step === "winback_17" ? `${s.name}: ${what} ${verb} waiting for you` : `${s.name}: what Kabsi prepared is still here`,
        title: step === "winback_17" ? "Kabsi kept what it prepared" : "Still here when you want to continue",
        preheader: "Choose a plan to pick up where you left off.",
        why: "You tried Kabsi and agreed to get emails about it. You can stop them with the link below.",
        bodyHtml: p(`Your free trial ended and Kabsi stopped. ${esc(what)} ${verb} still waiting in Kabsi for <strong>${esc(s.name)}</strong>, with replies already prepared where Kabsi could write one. Nothing is published until you approve it.`) + p("Choose a plan to pick up where you left off.") + p(esc(PRICE_LINE)),
        button: { label: "See your plan", url: plan },
        text: `Your free trial ended and Kabsi stopped. ${what} ${verb} still waiting in Kabsi for ${s.name}, with replies already prepared where Kabsi could write one. Nothing is published until you approve it.\n\nChoose a plan to pick up where you left off.\n\n${PRICE_LINE}`,
      };
    }
  }
}
