// The four Kabsi Partners emails (Partners 3, master plan 30.50 items 5 to 7; docs/COPY.md section 83): you joined (with the
// link and the kit), your first trial started, your first payment is earned (after the 30 day hold), a payout was sent. Pure
// functions over data the caller already read; no number, name or date is invented here. One yellow button each, the
// Kabsi email layout (template.ts). A referred business shows as its trade and area only, never its name (29.2). Never a
// ranking, a review count, a Google partnership or a promise of earnings (K-53, K-144). They go out as account mail
// ("direct": no preferences, no unsubscribe), because a partner asked for them by joining.
import { esc, para, ticks } from "../email-layout.ts";
import type { EmailContent } from "./template.ts";

/** Kept equal to the partner terms and the partners page: the commission, the hold, the payout day. */
export const PARTNER_RATE_LINE = "You earn 25 percent of every payment, for as long as the business stays. Each commission waits 30 days, then clears.";
/** Until card payments open (30.50 item 7). The Launch gate takes this line out with the one on /partners. */
export const PARTNER_PAYING_LINE = "Partner links start paying on launch day, when card payments open.";

export const usd = (cents: number) => `$${(Math.abs(cents) / 100).toFixed(2)}`;
const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
const long = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(iso));
const monthName = (ym: string) => new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));
export const partnerLink = (appUrl: string, code: string) => `${appUrl}/?via=${code}`;

const WHY = "You are a Kabsi partner.";

/** 1. You joined: the link, what it gives, and the kit (the button). */
export function partnerJoinedEmail(o: { name: string; code: string }, appUrl: string): EmailContent {
  const link = partnerLink(appUrl, o.code);
  const lines = [
    "Your partner link and QR code are ready. A business that starts with your link gets a 30 day Kabsi trial instead of 14 days, with no card.",
    PARTNER_RATE_LINE,
    "Your kit is in your partner home: ready posts for your kind of partner, a printable A6 insert with your QR code for card packaging, and what to say and not say. Every post starts with the paid partnership label.",
    PARTNER_PAYING_LINE,
  ];
  return {
    subject: "You joined Kabsi Partners: your link and kit",
    title: "Welcome to Kabsi Partners",
    preheader: "Your link, your QR code and your kit are ready.",
    bodyHtml: para(`Hello ${esc(firstName(o.name))}, you joined Kabsi Partners. Your link:`) +
      para(`<strong>${esc(link)}</strong>`) + lines.map((t) => para(esc(t))).join(""),
    text: `Hello ${firstName(o.name)}, you joined Kabsi Partners. Your link:\n\n${link}\n\n${lines.join("\n\n")}`,
    button: { label: "Open your kit", url: `${appUrl}/partner#kit` },
    links: [{ label: "Read the partner terms", url: `${appUrl}/partners/terms` }],
    why: "You joined Kabsi Partners.",
  };
}

/** 2. The first business started its trial from the partner's link. The business shows as its trade and area only. */
export function partnerTrialEmail(o: { trade: string | null; area: string | null }, appUrl: string): EmailContent {
  const who = [o.trade, o.area].filter(Boolean).join(", ");
  const first = who ? `A business (${who}) started its 30 day Kabsi trial from your link.` : "A business started its 30 day Kabsi trial from your link.";
  const lines = [
    "You see the trade and area only, never the business's name.",
    "A trial earns nothing. You earn 25 percent of every payment once the business pays, after the 30 day hold.",
    PARTNER_PAYING_LINE,
  ];
  return {
    subject: "Your first trial started from your Kabsi link",
    title: "Your first trial started",
    preheader: "A business started its Kabsi trial from your link.",
    bodyHtml: para(esc(first)) + lines.map((t) => para(esc(t))).join(""),
    text: `${first}\n\n${lines.join("\n\n")}`,
    button: { label: "Open your partner home", url: `${appUrl}/partner` },
    why: WHY,
  };
}

/** 3. The first commission cleared its 30 day hold: "earned after the hold". */
export function partnerFirstPaymentEmail(o: { cents: number }, appUrl: string): EmailContent {
  const first = `A payment from a business you referred has passed its 30 day hold. You earned ${usd(o.cents)}.`;
  const lines = [
    "Payouts are on the 5th of each month, for every partner with 25 US dollars or more cleared. Below that, it rolls over to the next month.",
    "Each payout comes with a statement.",
  ];
  return {
    subject: `You earned ${usd(o.cents)}: your first Kabsi commission`,
    title: "Your first commission is earned",
    preheader: `${usd(o.cents)} has cleared its 30 day hold.`,
    bodyHtml: para(esc(first)) + lines.map((t) => para(esc(t))).join(""),
    text: `${first}\n\n${lines.join("\n\n")}`,
    button: { label: "See your numbers", url: `${appUrl}/partner` },
    why: WHY,
  };
}

export type PayoutLine = { earned_at?: string; kind?: string; trade?: string | null; area?: string | null; commission_cents: number };
export type PayoutMail = { cents: number; method: string | null; last4: string | null; month: string; sentAt: string; lines: PayoutLine[] };

const METHOD: Record<string, string> = { paypal: "PayPal", usdt: "USDT", usdc: "USDC" };
const MAX_LINES = 20;

/** 4. A payout was sent, with its statement. */
export function partnerPayoutEmail(o: PayoutMail, appUrl: string): EmailContent {
  const how = o.method ? `${METHOD[o.method] ?? o.method}${o.last4 ? ` ending in ${o.last4}` : ""}` : "your payout method";
  const first = `Kabsi sent your payout of ${usd(o.cents)} for ${monthName(o.month)} by ${how}, on ${long(o.sentAt)}.`;
  const shown = o.lines.slice(0, MAX_LINES).map((l) => {
    const who = [l.trade, l.area].filter(Boolean).join(", ") || "A business";
    const sign = l.commission_cents < 0 ? "refund, minus " : "";
    return `${l.earned_at ? `${long(l.earned_at)}: ` : ""}${who}: ${sign}${usd(l.commission_cents)}`;
  });
  const more = o.lines.length > MAX_LINES ? `And ${o.lines.length - MAX_LINES} more lines.` : "";
  const closing = "A refund or chargeback after a payout comes off the next payout. Questions: hello@kabsi.co.";
  return {
    subject: `Your Kabsi payout of ${usd(o.cents)} was sent`,
    title: "Your payout was sent",
    preheader: `${usd(o.cents)} for ${monthName(o.month)}, with your statement.`,
    bodyHtml: para(esc(first)) + (shown.length ? para("Your statement:") + ticks(shown) : "") + (more ? para(esc(more)) : "") + para(esc(closing)),
    text: `${first}\n\n${shown.length ? `Your statement:\n${shown.map((l) => `- ${l}`).join("\n")}\n\n` : ""}${more ? `${more}\n\n` : ""}${closing}`,
    button: { label: "Open your partner home", url: `${appUrl}/partner` },
    why: WHY,
  };
}
