// Partners 2 (master plan 30.50 items 4 to 6, 30.51 item 6): the WhatsApp side of Kabsi Partners that is not the partner
// role (the partner role on WhatsApp is a later session).
//   - The payout confirm: "Yes, it's me" (pc:<id>) under the message the programs function sends to the partner's own
//     WhatsApp number when they change their payout method on kabsi.co/partners/home. A seam in agent.ts, like Signup 1's: it
//     reads the one button and nothing else. The database checks the id, the 10 minutes, one use and that the tap comes
//     from the number that was asked and is still the account's.
//   - The staff tap at the money: "payouts" from the staff phone lists the first payouts waiting for review, each with
//     "Approve P-XXXXXX" (pr:<id>). One tap reviews the partner and approves that payout.
//   - The owner's link: "my link" returns the owner's referral link (one free month per referred business that pays), or
//     the partner link when that owner is a Kabsi partner (25 percent instead, never both).
// The words are in docs/COPY.md (Partners 2), in the look 2 frame: one marker and a bold title, the facts, one line.
import type { Inbound } from "./channel.ts";
import { reply, type Out } from "./outbox.ts";
import type { SendState } from "./policy.ts";
import { PARTNER_KIND_LABEL, type PartnerKind, payoutName } from "../programs.ts";

export const PAYOUT_YES_RE = /^pc:([0-9a-f-]{36})$/;
export const PAYOUT_REVIEW_RE = /^pr:([0-9a-f-]{36})$/;

export type FirstPayout = { id: string; code: string; kind: string; country: string | null; amount_cents: number; lines: number };
export interface PartnersWaDb {
  /** "Yes, it's me" under a payout change, from this phone. */
  confirmPayout(id: string, phone: string): Promise<{ result: string; method?: string; last4?: string }>;
  /** The first payouts waiting for a staff tap; null when the phone is not Kabsi staff. */
  firstPayouts(phone: string): Promise<FirstPayout[] | null>;
  /** One staff tap: the partner is reviewed and this first payout approved. */
  reviewPayout(id: string, phone: string): Promise<{ result: string; code?: string; amount_cents?: number; founding_partner?: boolean; founding_count?: number }>;
  /** "my link" for an owner or manager of this business. */
  referralLink(locationId: string, phone: string): Promise<{ result: "owner" | "partner" | "none"; code?: string }>;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const kindWord = (k: string) => (PARTNER_KIND_LABEL[k as PartnerKind] ?? k).toLowerCase();
export const linkOf = (appUrl: string, code: string) => `${appUrl.replace(/\/+$/, "")}/?via=${code}`;

export const PARTNERS_SAY = {
  // Sent by the programs function to the partner's own number (inside the 24-hour window only).
  payoutAsk: (method: string, last4: string) =>
    `❓ *Change your payout method?*\n\n${payoutName(method, last4)}\n\nOnly tap if you asked for this on kabsi.co just now.`,
  payoutYes: "Yes, it's me",
  payoutSaved: (method: string, last4: string) =>
    `✅ *Payout method saved*\n\n${payoutName(method, last4)}\n\nKabsi pays you this way from your next payout.`,
  payoutEnded: "⏳ *This change has ended*\n\nStart again on kabsi.co/partners/home.",
  // The owner's link (look 2 is applied by the agent: the first line is the title).
  referral: (link: string) => `*Your referral link*\n\n${link}\nOne free month for each business that pays\n\nShare it with an owner you know.`,
  partnerLink: (link: string) => `*Your partner link*\n\n${link}\n25 percent of each payment, while the business pays\n\nShare it with an owner you know.`,
  noLink: "*No link for this business*\n\nOnly the owner's own WhatsApp can get it. Write \"talk to a person\" for help.",
  // Staff, at the money.
  firstPayouts: (rows: FirstPayout[]) =>
    `*First payouts to review*\n\n${rows.slice(0, 10).map((r) => `${r.code} · ${kindWord(r.kind)}${r.country ? ` · ${r.country}` : ""} · ${usd(r.amount_cents)}`).join("\n")}\n\nTap one to approve it. The partner is then reviewed.`,
  noFirstPayouts: "*No first payouts waiting*\n\nThe month's list is on the staff page.",
  approved: (code: string, cents: number, founding: boolean, count: number) =>
    `*Payout approved*\n\n${code} · ${usd(cents)}${founding ? `\nFounding Partner ${Math.min(count, 20)} of 20` : ""}\n\nMark it sent on the staff page once it is paid.`,
  approveButton: (code: string) => `Approve ${code}`.slice(0, 20),
} as const;

/** The seam: null when the message is not the payout confirm button; else what was done. */
export async function payoutSeam(d: { partners?: PartnersWaDb; out: Out }, s: SendState, phone: string, m: Inbound): Promise<string | null> {
  const yes = m.buttonId ? PAYOUT_YES_RE.exec(m.buttonId) : null;
  if (!yes || !d.partners) return null;
  // F-1: a forwarded tap is never the partner's own.
  if (m.forwarded) return "payout_forwarded";
  const r = await d.partners.confirmPayout(yes[1]!, phone);
  if (r.result !== "confirmed" || !r.method) {
    await reply(d.out, s, phone, PARTNERS_SAY.payoutEnded);
    return "payout_tap_refused";
  }
  await reply(d.out, s, phone, PARTNERS_SAY.payoutSaved(r.method, r.last4 ?? ""));
  return "payout_confirmed";
}
