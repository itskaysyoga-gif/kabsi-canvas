// The words of the lifecycle emails (G-25, G-30, K-101, K-118; P0.4-10), as pure functions over a business snapshot, so a
// test can read all of them. Numbers come from the snapshot (which takes them from the audit log) and never from a
// counter, a guess or a made-up figure. No end-of-trial discount, no ranking promise, no "automatically", no Google as
// a partner. The one yellow button is always the next step; everything else is a plain link.
import { esc, WHATSAPP_URL } from "../email-layout.ts";
import type { Snapshot, StepId } from "../lifecycle.ts";
import { p } from "./copy.ts";
import type { EmailContent } from "./template.ts";

// Keep equal to PRICES.proMonthly and PRICES.proYearly in src/lib/site.ts (tests/lifecycle.test.ts checks it).
export const PRICE_MONTHLY = 19;
export const PRICE_YEARLY = 190;
const PRICE_LINE = `Kabsi Pro is $${PRICE_MONTHLY} a month, or $${PRICE_YEARLY} a year, which is two months free. Prices are plus tax where it applies.`;

export type LifecycleCtx = { appUrl: string; removalOn: boolean };

const day = (d: Date | null, tz: string) => (d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: tz }) : "");
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// The WhatsApp link is left out while Kabsi has no WhatsApp number (whatsapp-setting.ts); the footer keeps hello@kabsi.co.
const helpLinks = (c: LifecycleCtx) => [{ label: "Book a free setup call", url: `${c.appUrl}/setup-call` }, ...(WHATSAPP_URL ? [{ label: "Message us on WhatsApp", url: WHATSAPP_URL }] : [])];

function noAccess(step: "no_access_1h" | "no_access_24h" | "no_access_72h", s: Snapshot, c: LifecycleCtx): EmailContent {
  const url = `${c.appUrl}/manager-steps`;
  const v = {
    no_access_1h: {
      subject: `${s.name}: one step left to start`, title: "Kabsi is ready when you are", preheader: "Invite Kabsi as a Manager and it starts looking after your reviews.",
      lead: `You asked Kabsi to look after <strong>${esc(s.name)}</strong>. It starts as soon as you invite Kabsi as a Manager on your Google Business Profile. It takes about two minutes, and each tap is shown.`,
      plain: `You asked Kabsi to look after ${s.name}. It starts as soon as you invite Kabsi as a Manager on your Google Business Profile. It takes about two minutes, and each tap is shown.`,
    },
    no_access_24h: {
      subject: `${s.name}: need a hand adding Kabsi?`, title: "Need a hand adding Kabsi?", preheader: "Most owners finish in two minutes. We can walk you through it.",
      lead: `Adding Kabsi as a Manager is the only step between you and a reply ready for every new review of <strong>${esc(s.name)}</strong>. If a screen looks different from the guide, a person on our team can walk you through it, free.`,
      plain: `Adding Kabsi as a Manager is the only step between you and a reply ready for every new review of ${s.name}. If a screen looks different from the guide, a person on our team can walk you through it, free.`,
    },
    no_access_72h: {
      subject: `${s.name}: still want Kabsi to look after your reviews?`, title: "Still want Kabsi to look after your reviews?", preheader: "If something blocked you, tell us and we will help.",
      lead: `Your reviews are still waiting for you. If something stopped you, for example your profile is not verified yet or someone else manages it, tell us and we will find the way with you. If you changed your mind, you can ignore this email.`,
      plain: `Your reviews are still waiting for you. If something stopped you, for example your profile is not verified yet or someone else manages it, tell us and we will find the way with you. If you changed your mind, you can ignore this email.`,
    },
  }[step];
  return {
    subject: v.subject, title: v.title, preheader: v.preheader, why: "You started setting up Kabsi.",
    bodyHtml: p(v.lead) + p("Kabsi never asks for your Google password or a verification code, and nothing is published until you approve it."),
    button: { label: "Add Kabsi as a Manager", url }, links: helpLinks(c),
    text: `${v.plain}\n\nKabsi never asks for your Google password or a verification code, and nothing is published until you approve it.`,
  };
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
  switch (step) {
    case "welcome":
      return {
        subject: `${s.name}: welcome to Kabsi, one step to start`, title: "Welcome to Kabsi", preheader: "One step: invite Kabsi as a Manager on your Google profile.",
        bodyHtml: p(`Kabsi looks after your reviews and your listing for <strong>${esc(s.name)}</strong>: a reply ready for every new review, and your details watched and kept right. You approve everything before it is published.`)
          + p("The one step now: invite Kabsi as a Manager on your Google Business Profile. It takes about two minutes, and each tap is shown.")
          + p("Kabsi never asks for your Google password or a verification code."),
        button: { label: "Add Kabsi as a Manager", url: `${c.appUrl}/manager-steps` }, links: helpLinks(c),
        text: `Kabsi looks after your reviews and your listing for ${s.name}: a reply ready for every new review, and your details watched and kept right. You approve everything before it is published.\n\nThe one step now: invite Kabsi as a Manager on your Google Business Profile. It takes about two minutes, and each tap is shown.\n\nKabsi never asks for your Google password or a verification code.`,
      };
    case "no_access_1h": case "no_access_24h": case "no_access_72h":
      return noAccess(step, s, c);
    case "first_reply_approved":
      return {
        subject: `${s.name}: your first reply is on its way`, title: "Your first reply is on its way", preheader: "You approved it. Kabsi sends it to Google now.",
        bodyHtml: p("You approved your first reply. Kabsi sends it to Google within a few minutes, and Google may check it before it shows under the review.") + p("Nothing was published that you did not approve. That stays true for every reply, post and change."),
        button: { label: "Open Kabsi", url: open },
        text: "You approved your first reply. Kabsi sends it to Google within a few minutes, and Google may check it before it shows under the review.\n\nNothing was published that you did not approve. That stays true for every reply, post and change.",
      };
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
        button: { label: "Choose a plan", url: plan }, links: [{ label: "Open Kabsi", url: open }],
        text: `Here is your first week, counted from the record of what Kabsi did and what you approved:\n\n${lines.map((l) => `- ${l}`).join("\n")}\n\n${PRICE_LINE}${ends ? `\n\nYour free trial runs until ${ends}.` : ""}`,
      };
    }
    case "trial_day11":
      return {
        subject: `${s.name}: your free trial ends in 3 days`, title: "Your free trial ends in 3 days", preheader: "Choose a plan to keep Kabsi publishing for you.",
        bodyHtml: p(`Your free trial ends on <strong>${esc(ends)}</strong>. After that Kabsi keeps watching and drafting for 7 more days, but publishes nothing until you choose a plan. Your review link keeps working.`)
          + p(esc(PRICE_LINE)),
        button: { label: "Choose a plan", url: plan }, links: [{ label: "Open Kabsi", url: open }],
        text: `Your free trial ends on ${ends}. After that Kabsi keeps watching and drafting for 7 more days, but publishes nothing until you choose a plan. Your review link keeps working.\n\n${PRICE_LINE}`,
      };
    case "trial_day14": {
      const grace = s.trialEndsAt ? day(new Date(s.trialEndsAt.getTime() + 7 * 86_400_000), s.timeZone) : "";
      const removal = c.removalOn ? ` On ${grace} Kabsi removes its Manager access to your Google profile and tells you.` : "";
      return {
        subject: `${s.name}: your free trial has ended`, title: "Your free trial has ended", preheader: "Kabsi keeps watching and drafting for 7 days. Choose a plan to publish again.",
        bodyHtml: p(`Your free trial ended on ${esc(ends)}. For 7 more days Kabsi keeps watching your reviews and your profile and drafting replies, but publishes nothing. Home shows what is waiting.${esc(removal)}`)
          + p("Your review link keeps working. One tap continues Kabsi where it was."),
        button: { label: "Choose a plan", url: plan }, links: [{ label: "Open Kabsi", url: open }],
        text: `Your free trial ended on ${ends}. For 7 more days Kabsi keeps watching your reviews and your profile and drafting replies, but publishes nothing. Home shows what is waiting.${removal}\n\nYour review link keeps working. One tap continues Kabsi where it was.`,
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
        bodyHtml: p(`Your free trial ended and Kabsi stopped. ${esc(what)} ${verb} still waiting in Kabsi for <strong>${esc(s.name)}</strong>, with replies already prepared where Kabsi could write one. Nothing is published until you approve it.`) + p("Choose a plan to pick up where you left off."),
        button: { label: "Choose a plan", url: plan },
        text: `Your free trial ended and Kabsi stopped. ${what} ${verb} still waiting in Kabsi for ${s.name}, with replies already prepared where Kabsi could write one. Nothing is published until you approve it.\n\nChoose a plan to pick up where you left off.`,
      };
    }
  }
}
