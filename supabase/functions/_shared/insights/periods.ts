// Insights periods (P0.5-05, K-26): "this month against last month" without an unfair comparison. Google's daily
// figures lag a day or two, so the latest day used is yesterday. From the 2nd of the month the current period is the
// month so far and the previous period is the same number of days of last month. On the 1st there is no day of this
// month to show, so the last full month is compared with the month before it.
export type Day = { year: number; month: number; day: number };
export type Period = { start: Day; end: Day; label: string };
export type Periods = { kind: "month_so_far" | "last_month"; current: Period; previous: Period };

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");
export const isoDay = (d: Day) => `${d.year}-${pad(d.month)}-${pad(d.day)}`;
export const monthName = (month: number) => MONTHS[month - 1] ?? "";
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const shiftMonth = (year: number, month: number, by: number) => {
  const t = new Date(Date.UTC(year, month - 1 + by, 1));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1 };
};

export function insightPeriods(now: Date): Periods {
  const yesterday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const y = { year: yesterday.getUTCFullYear(), month: yesterday.getUTCMonth() + 1, day: yesterday.getUTCDate() };
  const thisMonthHasDays = y.month === now.getUTCMonth() + 1;
  if (thisMonthHasDays) {
    const prev = shiftMonth(y.year, y.month, -1);
    return {
      kind: "month_so_far",
      current: { start: { year: y.year, month: y.month, day: 1 }, end: y, label: monthName(y.month) },
      previous: {
        start: { ...prev, day: 1 },
        end: { ...prev, day: Math.min(y.day, daysIn(prev.year, prev.month)) },
        label: monthName(prev.month),
      },
    };
  }
  const prev = shiftMonth(y.year, y.month, -1);
  return {
    kind: "last_month",
    current: { start: { year: y.year, month: y.month, day: 1 }, end: y, label: monthName(y.month) },
    previous: { start: { ...prev, day: 1 }, end: { ...prev, day: daysIn(prev.year, prev.month) }, label: monthName(prev.month) },
  };
}

/** The month the search terms report covers: the last complete month (Google publishes search terms monthly). */
export function termsMonth(now: Date): { year: number; month: number; label: string } {
  const m = shiftMonth(now.getUTCFullYear(), now.getUTCMonth() + 1, -1);
  return { ...m, label: monthName(m.month) };
}

/** Every day from start to end, inclusive, as ISO dates. */
export function daysBetween(start: Day, end: Day): string[] {
  const out: string[] = [];
  for (let t = Date.UTC(start.year, start.month - 1, start.day); t <= Date.UTC(end.year, end.month - 1, end.day); t += 86400_000) {
    const d = new Date(t);
    out.push(isoDay({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }));
  }
  return out;
}
