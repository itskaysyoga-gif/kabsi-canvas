// Opening hours on the Hours screen (P0.5-03, K-21): the weekly model the owner edits and the same checks the server
// makes. The server (supabase/functions/_shared/hours.ts) is the one that builds Google's shape and decides; this
// file reads what Business Knowledge holds to fill the editor, checks the week as the owner types and says it back in
// plain words. tests/hours.test.ts holds the two files equal.
export const DAY_KEYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export type HoursPeriod = { open: string; close: string };
export type Week = Record<DayKey, HoursPeriod[]>;

export const DAY_LABEL: Record<DayKey, string> = {
  MONDAY: "Monday",
  TUESDAY: "Tuesday",
  WEDNESDAY: "Wednesday",
  THURSDAY: "Thursday",
  FRIDAY: "Friday",
  SATURDAY: "Saturday",
  SUNDAY: "Sunday",
};
const SHORT: Record<DayKey, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};
export const MAX_PERIODS_PER_DAY = 3;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY_MIN = 24 * 60;

export const emptyWeek = (): Week => ({
  MONDAY: [],
  TUESDAY: [],
  WEDNESDAY: [],
  THURSDAY: [],
  FRIDAY: [],
  SATURDAY: [],
  SUNDAY: [],
});
export const cloneWeek = (w: Week): Week => JSON.parse(JSON.stringify(w)) as Week;

const minutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const endOf = (p: HoursPeriod): number => {
  if (p.close === "00:00") return DAY_MIN;
  return minutes(p.close) > minutes(p.open) ? minutes(p.close) : minutes(p.close) + DAY_MIN;
};

/** null when the week can be sent, else a sentence for the owner. Same rules as the server. */
export function validateWeek(week: Week): string | null {
  const spans: [number, number][] = [];
  let any = false;
  for (const [i, day] of DAY_KEYS.entries()) {
    const periods = week[day];
    if (periods.length > MAX_PERIODS_PER_DAY)
      return `At most ${MAX_PERIODS_PER_DAY} opening periods a day.`;
    for (const p of periods) {
      if (!TIME_RE.test(p.open) || !TIME_RE.test(p.close))
        return "Add an opening and a closing time for each period.";
      if (p.open === p.close) return "A period needs different opening and closing times.";
      any = true;
      const start = i * DAY_MIN + minutes(p.open);
      spans.push([start, start + endOf(p) - minutes(p.open)]);
    }
  }
  if (!any) return "Choose at least one open day. To close for a while, use Closed for a while.";
  const week7 = 7 * DAY_MIN;
  const all = spans.flatMap(([a, b]) =>
    b > week7
      ? [
          [a, week7],
          [0, b - week7],
        ]
      : [[a, b]],
  ) as [number, number][];
  all.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < all.length; i++)
    if (all[i]![0] < all[i - 1]![1]) return "Two periods overlap. Check the times.";
  return null;
}

/** A plain-words line per run of identical days, for the confirmation step: "Mon to Fri: 09:00 to 17:00". */
export function weekSummary(week: Week): string[] {
  const text = (d: DayKey) =>
    week[d].length
      ? week[d]
          .map((p) => `${p.open} to ${p.close === "00:00" ? "midnight" : p.close}`)
          .join(" and ")
      : "Closed";
  const lines: string[] = [];
  let start = 0;
  for (let i = 1; i <= 7; i++) {
    if (i === 7 || text(DAY_KEYS[i]!) !== text(DAY_KEYS[start]!)) {
      const a = SHORT[DAY_KEYS[start]!],
        b = SHORT[DAY_KEYS[i - 1]!];
      lines.push(`${i - 1 === start ? a : `${a} to ${b}`}: ${text(DAY_KEYS[start]!)}`);
      start = i;
    }
  }
  return lines;
}

type GTime = { hours?: number; minutes?: number };
export type GRegularHours = {
  periods?: { openDay: string; openTime?: GTime; closeDay?: string; closeTime?: GTime }[];
};
const hhmm = (t?: GTime) => {
  const h = t?.hours ?? 0;
  return h === 24
    ? "00:00"
    : `${String(h).padStart(2, "0")}:${String(t?.minutes ?? 0).padStart(2, "0")}`;
};

/** The week for Google's own shape (the owner's approved fact keeps it). */
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

/**
 * The week for a display line such as "Mon to Sun 09:00 to 22:00" or "Mon 09:00 to 22:00, Tue 09:00 to 22:00": what
 * Business Knowledge holds when the owner confirmed hours Google showed before they ever used this editor. null when
 * the line is not in one of those shapes (the editor then starts empty rather than guess).
 */
export function weekFromDisplay(display: string | null | undefined): Week | null {
  const text = (display ?? "").trim();
  if (!text) return null;
  const index = (s: string) => DAY_KEYS.findIndex((d) => SHORT[d] === s);
  const week = emptyWeek();
  for (const part of text.split(/\s*,\s*/)) {
    const m = part.match(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)(?: to (Mon|Tue|Wed|Thu|Fri|Sat|Sun))? (\d{2}:\d{2}) to (\d{2}:\d{2})$/,
    );
    if (!m) return null;
    const from = index(m[1]!),
      to = m[2] ? index(m[2]) : from;
    if (from < 0 || to < from) return null;
    const open = m[3]!,
      close = m[4] === "24:00" ? "00:00" : m[4]!;
    for (let i = from; i <= to; i++) week[DAY_KEYS[i]!].push({ open, close });
  }
  return week;
}

/** The week an owner starts from: Google's own shape when the approved fact has it, else its display line. */
export function weekFromFact(
  value: { display?: string; raw?: unknown } | null | undefined,
): Week | null {
  if (!value) return null;
  const raw = value.raw as GRegularHours | null | undefined;
  if (raw && typeof raw === "object" && Array.isArray(raw.periods) && raw.periods.length)
    return rawToWeek(raw);
  return weekFromDisplay(value.display);
}

export const sameWeek = (a: Week, b: Week) =>
  JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
const normalise = (w: Week) =>
  DAY_KEYS.map((d) => [...w[d]].sort((x, y) => x.open.localeCompare(y.open)));
