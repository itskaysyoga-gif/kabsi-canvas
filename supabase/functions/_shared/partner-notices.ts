// Kabsi Partners emails that follow an event (Partners 3, master plan 30.50 items 5 to 7): the first trial from a partner's
// link, the first commission past its 30 day hold, and a payout sent. The dispatcher runs partnerNotices() with the
// trial reminders step (every 5 minutes). It only reads the ledger and tells the partner: it changes no money, no access
// and no link. Each email goes once: the dedupe key names the event, so a second run records nothing and sends nothing.
// "You joined" is sent by the programs function at the join itself (programs/index.ts).
import { admin, APP_URL, captureError } from "./kabsi.ts";
import { notify } from "./notify.ts";
import { type Events, type Partner, planNotices } from "./partner-plan.ts";
import type { PayoutLine } from "./email/partner-copy.ts";

// ─── the database side ───────────────────────────────────────────────────────────────────────────────────────────────

type Rel<T> = T | T[] | null;
const first = <T>(r: Rel<T>): T | null => (Array.isArray(r) ? (r[0] ?? null) : r);
const DAY = 86_400_000;

async function readEvents(now: Date): Promise<Events> {
  const db = admin();
  const since3 = new Date(now.getTime() - 3 * DAY).toISOString();
  const since14 = new Date(now.getTime() - 14 * DAY).toISOString();
  const events: Events = { trials: [], payments: [], payouts: [] };

  // Trials: businesses whose trial started in the last 3 days and that came through a partner (not their own business).
  const subs = await db.from("subscriptions").select("organization_id, trial_started_at").gte("trial_started_at", since3).limit(500);
  if (subs.error) throw subs.error;
  const started = new Map<string, string>();
  for (const s of (subs.data ?? []) as { organization_id: string; trial_started_at: string }[]) {
    const prior = started.get(s.organization_id);
    if (!prior || s.trial_started_at < prior) started.set(s.organization_id, s.trial_started_at);
  }
  if (started.size) {
    const refs = await db.from("partner_referrals")
      .select("partner_id, organization_id, locations(category_label, area, is_demo), partner_accounts(email, user_id, status)")
      .in("organization_id", [...started.keys()]).eq("self_referral", false).eq("status", "active");
    if (refs.error) throw refs.error;
    for (const r of (refs.data ?? []) as unknown as { partner_id: string; organization_id: string; locations: Rel<{ category_label: string | null; area: string | null; is_demo: boolean }>; partner_accounts: Rel<Partner> }[]) {
      const loc = first(r.locations);
      const partner = first(r.partner_accounts);
      if (!partner || loc?.is_demo) continue;
      events.trials.push({ partner_id: r.partner_id, partner, trade: loc?.category_label ?? null, area: loc?.area ?? null, started_at: started.get(r.organization_id)! });
    }
  }

  // Payments: live commissions whose 30 day hold has passed, in the last 14 days. "Earned after the hold."
  const pay = await db.from("partner_commissions")
    .select("partner_id, commission_cents, earned_at, hold_until, partner_accounts(email, user_id, status)")
    .eq("kind", "commission").eq("mode", "live").neq("state", "void").lte("hold_until", now.toISOString()).gte("hold_until", since14)
    .order("hold_until").limit(200);
  if (pay.error) throw pay.error;
  for (const r of (pay.data ?? []) as unknown as { partner_id: string; commission_cents: number; earned_at: string; hold_until: string; partner_accounts: Rel<Partner> }[]) {
    const partner = first(r.partner_accounts);
    if (!partner) continue;
    const earlier = await db.from("partner_commissions").select("id", { count: "exact", head: true })
      .eq("partner_id", r.partner_id).eq("kind", "commission").eq("mode", "live").neq("state", "void").lt("earned_at", r.earned_at);
    if (earlier.error) throw earlier.error;
    events.payments.push({ partner_id: r.partner_id, partner, cents: r.commission_cents, earned_at: r.earned_at, hold_until: r.hold_until, hadEarlier: (earlier.count ?? 0) > 0 });
  }

  // Payouts sent in the last 3 days, with their statement.
  const outs = await db.from("partner_payouts")
    .select("id, amount_cents, method, sent_at, statement, partner_accounts(email, user_id, status, payout_last4)")
    .eq("state", "sent").gte("sent_at", since3).limit(200);
  if (outs.error) throw outs.error;
  for (const o of (outs.data ?? []) as unknown as { id: string; amount_cents: number; method: string | null; sent_at: string; statement: { month?: string; lines?: PayoutLine[] } | null; partner_accounts: Rel<Partner> }[]) {
    const partner = first(o.partner_accounts);
    if (!partner) continue;
    events.payouts.push({ id: o.id, partner, cents: o.amount_cents, method: o.method, month: o.statement?.month ?? o.sent_at.slice(0, 7), sent_at: o.sent_at, lines: o.statement?.lines ?? [] });
  }
  return events;
}

/** The dispatcher step: read the events, send what has not been sent. Returns counts for the job log. */
export async function partnerNotices(now = new Date()): Promise<Record<string, number>> {
  const notices = planNotices(await readEvents(now), APP_URL);
  let sent = 0;
  let failed = 0;
  for (const n of notices) {
    try {
      const r = await notify({ category: "direct", kind: n.kind, key: n.key, to: [n.to], content: n.content });
      sent += r.sent;
      failed += r.failed;
    } catch (e) {
      failed++;
      await captureError("partner_notices", e, { kind: n.kind });
    }
  }
  return { partner_emails_sent: sent, partner_emails_failed: failed };
}
