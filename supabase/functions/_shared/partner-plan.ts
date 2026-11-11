// The plan of the Kabsi Partners emails that follow an event (Partners 3): pure, with no database or network, so a test can
// read it. partner-notices.ts reads the events and sends what this plans.
import type { EmailContent } from "./email/template.ts";
import { type PayoutLine, partnerFirstPaymentEmail, partnerPayoutEmail, partnerTrialEmail } from "./email/partner-copy.ts";

export type Partner = { email: string; user_id: string | null; status?: string | null; payout_last4?: string | null };
export type Notice = { key: string; kind: string; to: { email: string; userId: string | null }; content: EmailContent };

/** The three event sets, already read from the database (all within the look-back window). */
export type Events = {
  /** One row per referred business whose trial started: the earliest per partner is "the first trial". */
  trials: { partner_id: string; partner: Partner; trade: string | null; area: string | null; started_at: string }[];
  /** Live commissions past their hold, with whether the partner had an earlier one. */
  payments: { partner_id: string; partner: Partner; cents: number; earned_at: string; hold_until: string; hadEarlier: boolean }[];
  payouts: { id: string; partner: Partner; cents: number; method: string | null; month: string; sent_at: string; lines: PayoutLine[] }[];
};

const to = (p: Partner) => ({ email: p.email, userId: p.user_id });
const approved = (p: Partner) => !p.status || p.status === "approved";

/** Pure: which emails the events call for. The keys make each one single. */
export function planNotices(e: Events, appUrl: string): Notice[] {
  const out: Notice[] = [];
  const seenTrial = new Set<string>();
  for (const t of [...e.trials].sort((a, b) => a.started_at.localeCompare(b.started_at))) {
    if (seenTrial.has(t.partner_id) || !approved(t.partner)) continue;
    seenTrial.add(t.partner_id);
    out.push({ key: `partner_referral_started:${t.partner_id}`, kind: "partner_referral_started", to: to(t.partner), content: partnerTrialEmail({ trade: t.trade, area: t.area }, appUrl) });
  }
  const seenPay = new Set<string>();
  for (const p of [...e.payments].sort((a, b) => a.hold_until.localeCompare(b.hold_until))) {
    if (seenPay.has(p.partner_id) || p.hadEarlier || !approved(p.partner)) continue;
    seenPay.add(p.partner_id);
    out.push({ key: `partner_first_payment:${p.partner_id}`, kind: "partner_first_payment", to: to(p.partner), content: partnerFirstPaymentEmail({ cents: p.cents }, appUrl) });
  }
  for (const o of e.payouts) {
    out.push({
      key: `partner_payout_sent:${o.id}`, kind: "partner_payout_sent", to: to(o.partner),
      content: partnerPayoutEmail({ cents: o.cents, method: o.method, last4: o.partner.payout_last4 ?? null, month: o.month, sentAt: o.sent_at, lines: o.lines }, appUrl),
    });
  }
  return out;
}
