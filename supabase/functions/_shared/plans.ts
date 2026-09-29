// Plan and trial date rules (Q05, D281), as pure functions. The SQL in migration 20260930090000_plans_v2_trial.sql
// (trial_days_for, trial_end_at, plan_months) mirrors them; _shared/plans.test.ts holds the shared test table.
// No imports on purpose, so it can be tested and reused anywhere.

export type PaidKind = "pro_monthly" | "pro_yearly" | "lebanon_yearly" | "pro_6m";
export const PLAN_LABEL: Record<string, string> = {
  trial: "Free trial",
  pro_monthly: "Kabsi Pro, monthly",
  pro_yearly: "Kabsi Pro, yearly",
  lebanon_yearly: "Lebanon bundle, 12 months",
  pro_6m: "Kabsi Pro, 6 months",
  partner: "Partner plan",
};

export const planMonths = (kind: string): number =>
  ({ pro_monthly: 1, pro_yearly: 12, lebanon_yearly: 12, pro_6m: 6 } as Record<string, number>)[kind] ?? 0;

// 30 days for partner signups (D281), 14 for everyone else.
export const trialDays = (signupSource: string | null | undefined): number =>
  signupSource === "partner_link" || signupSource === "partner_invite" ? 30 : 14;

// ─── time zone helpers (no libraries: Intl only)
function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(date)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}
const two = (n: number) => String(n).padStart(2, "0");
/** The local calendar date (YYYY-MM-DD) and hour at `date` in `tz`. */
export function localDateHour(date: Date, tz: string): { date: string; hour: number } {
  const p = parts(date, tz);
  return { date: `${p.year}-${two(p.month)}-${two(p.day)}`, hour: p.hour };
}
const addDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
/** UTC instant of 00:00 local time on `ymd` in `tz`, DST safe. */
export function localMidnightUtc(ymd: string, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d);
  const offsetAt = (t: number) => {
    const p = parts(new Date(t), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t); // second pass settles the offset across a DST change
  return new Date(t);
}

/** Last day of the trial is the local start date plus `days`; it ends at local midnight after that day. */
export function trialEnd(start: Date, tz: string, days: number): { lastDay: string; endsAt: Date } {
  const lastDay = addDays(localDateHour(start, tz).date, days);
  return { lastDay, endsAt: localMidnightUtc(addDays(lastDay, 1), tz) };
}

export type TrialStage = "d7" | "d1" | "d0";
/**
 * Which reminder is due now, in the business's local time. Sent from 09:00 local on lastDay-7, lastDay-1 and
 * lastDay; only the latest due stage is sent (a late run never sends three at once) and never after lastDay.
 * Nothing is sent when a paid plan, or a partner, already continues the business past the trial.
 */
export function dueTrialEmail(lastDay: string, localDate: string, localHour: number, sent: TrialStage[], continues: boolean): TrialStage | null {
  if (continues || localDate > lastDay) return null;
  const at = (ymd: string) => localDate > ymd || (localDate === ymd && localHour >= 9);
  const stage: TrialStage | null = at(lastDay) ? "d0" : at(addDays(lastDay, -1)) ? "d1" : at(addDays(lastDay, -7)) ? "d7" : null;
  return stage && !sent.includes(stage) ? stage : null;
}

const addMonthsUtc = (d: Date, months: number): Date => {
  const day = d.getUTCDate();
  const r = new Date(d.getTime());
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + months);
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r;
};
/** A paid plan starts now, or when the latest active plan (trial included) ends, and runs for its months. */
export function paidWindow(kind: string, now: Date, activeEnds: Date[]): { start: Date; end: Date } {
  const future = activeEnds.filter((e) => e.getTime() > now.getTime()).map((e) => e.getTime());
  const start = new Date(Math.max(now.getTime(), ...future));
  return { start, end: addMonthsUtc(start, planMonths(kind)) };
}

/** Whether a business may get a trial (the SQL grant_trial_if_eligible applies the same rules). */
export function trialEligible(o: {
  clockReady: boolean; partnerCovered: boolean; trialUsed: boolean; paidOrWaiting: boolean; flagOn: boolean; testOwner: boolean;
}): boolean {
  return o.clockReady && !o.partnerCovered && !o.trialUsed && !o.paidOrWaiting && (o.flagOn || o.testOwner);
}

export type RenewalStage = "r5" | "r1";
/**
 * Renewal reminder for a paid monthly or yearly plan: 5 days and 1 day before the last day, from 09:00 local.
 * Only the latest due stage is sent, never after the last day, and nothing when a payment already continues it.
 * The email links to the Plan page; invoices are never created from cron (they expire).
 */
export function dueRenewalEmail(lastDay: string, localDate: string, localHour: number, sent: RenewalStage[], continues: boolean): RenewalStage | null {
  if (continues || localDate > lastDay) return null;
  const at = (ymd: string) => localDate > ymd || (localDate === ymd && localHour >= 9);
  const stage: RenewalStage | null = at(addDays(lastDay, -1)) ? "r1" : at(addDays(lastDay, -5)) ? "r5" : null;
  return stage && !sent.includes(stage) ? stage : null;
}
