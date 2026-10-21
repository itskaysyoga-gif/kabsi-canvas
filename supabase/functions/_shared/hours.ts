// Regular opening hours (P0.5-03, K-21): the weekly model the owner edits, Google's own shape for it and the one-line
// display Google Protection compares. Pure functions, no Deno or database calls, so the app and the Edge Function agree
// and tests/hours.test.ts holds src/lib/hours.ts equal to this file.
//
// A day is a list of periods "HH:MM" to "HH:MM"; an empty list is a closed day. Closing at "00:00" means the end of that
// day (Google's 24:00). Closing earlier than opening means the place stays open past midnight and closes the next
// morning. Periods of one day must not overlap each other or the spill from the evening before.
export const DAY_KEYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type HoursPeriod = { open: string; close: string };
export type Week = Record<DayKey, HoursPeriod[]>;

export type GTime = { hours?: number; minutes?: number };
export type GPeriod = { openDay: string; openTime?: GTime; closeDay?: string; closeTime?: GTime };
export type GRegularHours = { periods?: GPeriod[] };

const SHORT: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export const MAX_PERIODS_PER_DAY = 3;
const DAY_MIN = 24 * 60;

export const emptyWeek = (): Week => ({ MONDAY: [], TUESDAY: [], WEDNESDAY: [], THURSDAY: [], FRIDAY: [], SATURDAY: [], SUNDAY: [] });

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (t?: GTime) => `${String(t?.hours ?? 0).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;

/** The one line Google Protection compares: "Mon 09:00 to 22:00, Tue 09:00 to 22:00". Same format as before this file. */
export function regularHoursDisplay(raw: GRegularHours | null | undefined): string {
  return (raw?.periods ?? []).map((p) => `${SHORT[p.openDay] ?? p.openDay} ${clock(p.openTime)} to ${clock(p.closeTime)}`).join(", ");
}

/** Where a period ends, in minutes from the start of its own day: 1440 for midnight, more for the next morning. */
function endOf(p: HoursPeriod): number {
  const o = minutes(p.open), c = minutes(p.close);
  if (p.close === "00:00") return DAY_MIN;
  return c > o ? c : c + DAY_MIN;
}

/** null when the week can be sent, else a sentence for the owner. */
export function validateWeek(week: Week): string | null {
  const spans: [number, number][] = [];
  let any = false;
  for (const [i, day] of DAY_KEYS.entries()) {
    const periods = week[day];
    if (!Array.isArray(periods)) return "Check the hours.";
    if (periods.length > MAX_PERIODS_PER_DAY) return `At most ${MAX_PERIODS_PER_DAY} opening periods a day.`;
    for (const p of periods) {
      if (!TIME_RE.test(p.open) || !TIME_RE.test(p.close)) return "Add an opening and a closing time for each period.";
      if (p.open === p.close) return "A period needs different opening and closing times.";
      any = true;
      const start = i * DAY_MIN + minutes(p.open);
      spans.push([start, start + endOf(p) - minutes(p.open)]);
    }
  }
  if (!any) return "Choose at least one open day. To close for a while, use Closed for a while.";
  // Overlaps, with the week wrapping around: Sunday night can run into Monday morning.
  const week7 = 7 * DAY_MIN;
  const all = spans.flatMap(([a, b]) => (b > week7 ? [[a, week7], [0, b - week7]] : [[a, b]])) as [number, number][];
  all.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < all.length; i++) if (all[i]![0] < all[i - 1]![1]) return "Two periods overlap. Check the times.";
  return null;
}

const gTime = (t: string, end: boolean): GTime => {
  if (t === "00:00" && end) return { hours: 24 };
  const h = Number(t.slice(0, 2)), m = Number(t.slice(3, 5));
  return m ? { hours: h, minutes: m } : { hours: h };
};

/** Google's regularHours for a week the validator accepted. Days run Monday to Sunday, periods by opening time. */
export function weekToRaw(week: Week): GRegularHours {
  const periods: GPeriod[] = [];
  for (const [i, day] of DAY_KEYS.entries()) {
    for (const p of [...week[day]].sort((a, b) => a.open.localeCompare(b.open))) {
      const spills = p.close !== "00:00" && minutes(p.close) <= minutes(p.open);
      periods.push({
        openDay: day,
        openTime: gTime(p.open, false),
        closeDay: spills ? DAY_KEYS[(i + 1) % 7]! : day,
        closeTime: gTime(p.close, true),
      });
    }
  }
  return { periods };
}

const hhmm = (t?: GTime) => {
  const h = t?.hours ?? 0;
  return h === 24 ? "00:00" : clock(t);
};

/** The weekly model for Google's regularHours, to fill the editor. Unknown days and shapes are skipped. */
export function rawToWeek(raw: GRegularHours | null | undefined): Week {
  const week = emptyWeek();
  for (const p of raw?.periods ?? []) {
    const day = p.openDay as DayKey;
    if (!(day in week)) continue;
    week[day].push({ open: hhmm(p.openTime), close: hhmm(p.closeTime) });
  }
  for (const day of DAY_KEYS) week[day].sort((a, b) => a.open.localeCompare(b.open));
  return week;
}

/** A plain-words line per run of identical days, for the confirmation step: "Mon to Fri 09:00 to 17:00". */
export function weekSummary(week: Week): string[] {
  const names: Record<DayKey, string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun" };
  const text = (d: DayKey) => (week[d].length ? week[d].map((p) => `${p.open} to ${p.close === "00:00" ? "midnight" : p.close}`).join(" and ") : "Closed");
  const lines: string[] = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i === 7 || text(DAY_KEYS[i]!) !== text(DAY_KEYS[start]!)) {
      const a = names[DAY_KEYS[start]!], b = names[DAY_KEYS[i - 1]!];
      lines.push(`${i - 1 === start ? a : `${a} to ${b}`}: ${text(DAY_KEYS[start]!)}`);
      start = i;
    }
  }
  return lines;
}

/** Whether two weeks hold the same hours. */
export const sameWeek = (a: Week, b: Week) => regularHoursDisplay(weekToRaw(a)) === regularHoursDisplay(weekToRaw(b));

/** Reads a week sent by the app: an object of day to a list of { open, close }. Anything else is null. */
export function parseWeek(input: unknown): Week | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const week = emptyWeek();
  for (const day of DAY_KEYS) {
    const list = (input as Record<string, unknown>)[day];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return null;
    for (const p of list) {
      if (!p || typeof p !== "object") return null;
      const { open, close } = p as Record<string, unknown>;
      if (typeof open !== "string" || typeof close !== "string") return null;
      week[day].push({ open, close });
    }
  }
  return week;
}
