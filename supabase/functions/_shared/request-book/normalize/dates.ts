// Relative dates and times (normalizer "dates", version 1). Reads what an owner types ("tomorrow 10", "Thursday 3pm",
// "bukra l 10", "10 Nov") against the message time and the location's time zone. It states what was written and no
// more: a day part with no hour ("afternoon") stays a window and gets no time; an hour that could be morning or evening
// is ambiguous with both readings; a date that does not exist, a time that does not exist in that zone, or a zone that
// is not a zone gives unknown. Never a guess.
//
// Bare hours (no am or pm): 8 to 12 are read as written (8:00 to 12:00), 13 to 23 are 24 hour times, 0 is midnight, and
// 1 to 7 are ambiguous between the morning and the afternoon. Changing that rule changes DATES_VERSION.
import { readable } from "./digits.ts";
import type { Evidence } from "./result.ts";

export const DATES_VERSION = 1;

export type DayPart = "morning" | "afternoon" | "evening";

export type WhenCandidate = { date: string | null; time: string | null; startsAt: string | null };

export type WhenResult =
  | ({
      status: "ok";
      /** Local calendar date, YYYY-MM-DD, when a day was stated. */
      date: string | null;
      /** Local time, HH:MM, when an hour was stated. */
      time: string | null;
      /** The instant, only when both a day and an hour were stated. */
      startsAt: string | null;
      /** A day part that was stated without an hour. */
      dayPart: DayPart | null;
      version: number;
    } & Evidence)
  | { status: "ambiguous"; candidates: WhenCandidate[]; raw: string; start: number; end: number; version: number }
  | { status: "unknown"; reason: string; version: number };

const WEEKDAYS: Record<string, number> = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, thur: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
};
const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5, june: 6, jun: 6, july: 7, jul: 7,
  august: 8, aug: 8, september: 9, sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
};
// Written-out Arabic in Latin letters, as owners type it in a chat.
const TODAY = ["today", "tonight", "lyom", "el yom", "elyom", "alyom", "al yom"];
const TOMORROW = ["tomorrow", "tmrw", "tmr", "bukra", "bokra", "bukrah", "bokrah", "bkra"];
const AFTER_TOMORROW = ["day after tomorrow", "ba3d bukra", "ba3d bokra", "baad bukra", "baad bokra"];
const DAY_PARTS: Record<string, DayPart> = {
  morning: "morning", "in the morning": "morning", sabah: "morning", "el sob7": "morning", sob7: "morning", subh: "morning",
  afternoon: "afternoon", "ba3d el dohr": "afternoon", "ba3d eldohr": "afternoon", "baad el dohr": "afternoon", dohr: "afternoon",
  evening: "evening", "in the evening": "evening", masa: "evening", "el masa": "evening", "bel masa": "evening",
};

type Ymd = { y: number; m: number; d: number };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (x: Ymd) => `${x.y}-${pad(x.m)}-${pad(x.d)}`;

function validZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return typeof tz === "string" && tz.length > 0;
  } catch {
    return false;
  }
}

function localParts(instant: Date, tz: string) {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(instant);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return { y: g("year"), m: g("month"), d: g("day"), hh: g("hour"), mm: g("minute"), ss: g("second") };
}

/** Calendar arithmetic on a plain date, with no time zone in it. */
function addDays(x: Ymd, n: number): Ymd {
  const t = new Date(Date.UTC(x.y, x.m - 1, x.d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}
const weekdayOf = (x: Ymd) => new Date(Date.UTC(x.y, x.m - 1, x.d)).getUTCDay();
const isRealDate = (x: Ymd) => {
  const t = new Date(Date.UTC(x.y, x.m - 1, x.d));
  return t.getUTCFullYear() === x.y && t.getUTCMonth() === x.m - 1 && t.getUTCDate() === x.d;
};

/**
 * Every instant at which a local date and time shows on the clock in a zone: none when a clock change skips it, two
 * when a clock change repeats it, otherwise one.
 */
function instantsOf(x: Ymd, hh: number, mm: number, tz: string): string[] {
  const guess = Date.UTC(x.y, x.m - 1, x.d, hh, mm);
  const offsetAt = (ms: number) => {
    const l = localParts(new Date(ms), tz);
    return Date.UTC(l.y, l.m - 1, l.d, l.hh, l.mm) - Math.floor(ms / 60_000) * 60_000;
  };
  const offsets = new Set([offsetAt(guess - 24 * 3600_000), offsetAt(guess), offsetAt(guess + 24 * 3600_000)]);
  const found = new Set<number>();
  for (const o of offsets) {
    const at = guess - o;
    const l = localParts(new Date(at), tz);
    if (l.y === x.y && l.m === x.m && l.d === x.d && l.hh === hh && l.mm === mm) found.add(at);
  }
  return [...found].sort((p, q) => p - q).map((ms) => new Date(ms).toISOString());
}

type Found<T> = { value: T; start: number; end: number };

function phrase(t: string, list: string[]): Found<string> | null {
  // Longest phrase first, whole words only.
  for (const w of [...list].sort((a, b) => b.length - a.length)) {
    const m = new RegExp(`(^|[^a-z0-9])(${w.replace(/ /g, "\\s+")})(?![a-z0-9])`).exec(t);
    if (m) return { value: w, start: m.index + (m[1]?.length ?? 0), end: m.index + m[0].length };
  }
  return null;
}

function findDay(t: string, today: Ymd): { days: Ymd[]; start: number; end: number; ambiguousNote?: string } | null {
  const after = phrase(t, AFTER_TOMORROW);
  if (after) return { days: [addDays(today, 2)], start: after.start, end: after.end };
  const tom = phrase(t, TOMORROW);
  if (tom) return { days: [addDays(today, 1)], start: tom.start, end: tom.end };
  const tod = phrase(t, TODAY);
  if (tod) return { days: [today], start: tod.start, end: tod.end };

  // "next thursday" or "thursday": the first one from tomorrow on; today's own name is ambiguous (today or a week on).
  const wd = new RegExp(`(^|[^a-z0-9])(next\\s+|this\\s+|coming\\s+)?(${Object.keys(WEEKDAYS).sort((a, b) => b.length - a.length).join("|")})(?![a-z0-9])`).exec(t);
  if (wd) {
    const target = WEEKDAYS[wd[3]!]!;
    const prefix = (wd[2] ?? "").trim();
    const start = wd.index + (wd[1]?.length ?? 0);
    const end = wd.index + wd[0].length;
    let delta = (target - weekdayOf(today) + 7) % 7;
    if (prefix === "next") {
      // "next thursday" is the coming one or the one after: two readings.
      const first = delta === 0 ? 7 : delta;
      return { days: [addDays(today, first), addDays(today, first + 7)], start, end };
    }
    if (delta === 0) return { days: [today, addDays(today, 7)], start, end };
    return { days: [addDays(today, delta)], start, end };
  }

  const monthNames = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
  // 10 nov, 10th november, nov 10
  const dm = new RegExp(`(^|[^a-z0-9])(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:of\\s+)?(${monthNames})(?![a-z])(?:\\s+(\\d{4}))?`).exec(t);
  const md = new RegExp(`(^|[^a-z0-9])(${monthNames})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![0-9])(?:\\s*,?\\s*(\\d{4}))?`).exec(t);
  const m = dm ?? md;
  if (m) {
    const day = Number(dm ? m[2] : m[3]);
    const mon = MONTHS[(dm ? m[3] : m[2])!]!;
    const yearText = m[4];
    const start = m.index + (m[1]?.length ?? 0);
    const end = m.index + m[0].length;
    if (yearText) {
      const x = { y: Number(yearText), m: mon, d: day };
      return isRealDate(x) ? { days: [x], start, end } : { days: [], start, end };
    }
    // No year: the next time that date comes round, today included.
    let x = { y: today.y, m: mon, d: day };
    if (!isRealDate(x)) return { days: [], start, end };
    if (iso(x) < iso(today)) x = { y: today.y + 1, m: mon, d: day };
    return isRealDate(x) ? { days: [x], start, end } : { days: [], start, end };
  }

  // 10/11 or 10/11/2026: day first or month first cannot be told apart unless one number is above 12.
  const sl = /(^|[^a-z0-9])(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(?![0-9])/.exec(t);
  if (sl) {
    const a = Number(sl[2]);
    const b = Number(sl[3]);
    const start = sl.index + (sl[1]?.length ?? 0);
    const end = sl.index + sl[0].length;
    const yr = sl[4] ? (sl[4].length === 2 ? 2000 + Number(sl[4]) : Number(sl[4])) : null;
    const reads: Ymd[] = [];
    const push = (d: number, mo: number) => {
      let x = { y: yr ?? today.y, m: mo, d };
      if (!isRealDate(x)) return;
      if (yr === null && iso(x) < iso(today)) x = { y: today.y + 1, m: mo, d };
      if (isRealDate(x) && !reads.some((r) => iso(r) === iso(x))) reads.push(x);
    };
    push(a, b);
    if (a !== b) push(b, a);
    return { days: reads, start, end };
  }
  return null;
}

type Hour = { hh: number; mm: number }[]; // one reading, or two when the hour is ambiguous

function findTime(t: string): { reads: Hour; start: number; end: number; marked: boolean } | null {
  // 15:30, 3.30pm, 3pm, 10am, 15h
  const m = /(^|[^a-z0-9])(\d{1,2})(?:[:.h](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)(?![a-z])/.exec(t);
  if (m) {
    const h = Number(m[2]);
    const mi = m[3] ? Number(m[3]) : 0;
    const start = m.index + (m[1]?.length ?? 0);
    const end = m.index + m[0].length;
    if (h < 1 || h > 12 || mi > 59) return { reads: [], start, end, marked: true };
    const pm = m[4]!.startsWith("p");
    return { reads: [{ hh: (h % 12) + (pm ? 12 : 0), mm: mi }], start, end, marked: true };
  }
  const c = /(^|[^a-z0-9])([01]?\d|2[0-3])[:h]([0-5]\d)(?![0-9])/.exec(t);
  if (c) {
    const h = Number(c[2]);
    const mi = Number(c[3]);
    const start = c.index + (c[1]?.length ?? 0);
    const end = c.index + c[0].length;
    return { reads: bare(h, mi), start, end, marked: false };
  }
  // A bare hour needs a word that says it is a time: "at 3", "l 10", "el 10", "3 o'clock", or a day word before it (handled by the caller).
  const w = /(^|[^a-z0-9])(?:at|l|el|la|around|about|@)\s*(\d{1,2})(?![0-9:.\/])(?:\s*o'?clock)?(?![a-z0-9])/.exec(t);
  if (w) {
    const h = Number(w[2]);
    const start = w.index + (w[1]?.length ?? 0);
    const end = w.index + w[0].length;
    if (h > 23) return { reads: [], start, end, marked: false };
    return { reads: bare(h, 0), start, end, marked: false };
  }
  return null;
}

function bare(h: number, mi: number): Hour {
  if (h >= 13 || h === 0 || (h >= 8 && h <= 12)) return [{ hh: h, mm: mi }];
  // 1 to 7: the morning or the afternoon.
  return [{ hh: h, mm: mi }, { hh: h + 12, mm: mi }];
}

/**
 * A bare number right after the day word ("tomorrow 10", "thursday 3", "tomorrow 10.30") is an hour; anywhere else it is
 * not read. An hour or minute that cannot exist ("24:00", "10:75") is returned with no readings, so it is unknown and
 * never silently dropped.
 */
function hourAfterDay(t: string, dayEnd: number): { reads: Hour; start: number; end: number } | null {
  const m = /^[\s,]*(?:at\s+|l\s+|el\s+)?(\d{1,2})(?:[:.h](\d{2}))?(?![0-9:.\/])(?!\s*(?:st|nd|rd|th|am|pm)\b)(?![a-z])(?![\s.\-]*\d)/.exec(t.slice(dayEnd));
  if (!m) return null;
  const h = Number(m[1]);
  const mi = m[2] ? Number(m[2]) : 0;
  const start = dayEnd + m[0].indexOf(m[1]!);
  const end = dayEnd + m[0].length;
  return { reads: h > 23 || mi > 59 ? [] : bare(h, mi), start, end };
}

/**
 * The day and hour written in a message, resolved against `now` (the message time) in `timeZone` (the location's zone).
 * Returns unknown when nothing about a day or hour was written, or when what was written is not a real date or time.
 */
export function normalizeWhen(text: string, ctx: { now: Date; timeZone: string }): WhenResult {
  const v = DATES_VERSION;
  if (!validZone(ctx.timeZone)) return { status: "unknown", reason: "bad_time_zone", version: v };
  if (!(ctx.now instanceof Date) || Number.isNaN(ctx.now.getTime())) return { status: "unknown", reason: "bad_time", version: v };
  const t = readable(text);
  const l = localParts(ctx.now, ctx.timeZone);
  const today: Ymd = { y: l.y, m: l.m, d: l.d };

  const day = findDay(t, today);
  let time = findTime(t);
  if (day && !time) {
    const h = hourAfterDay(t, day.end);
    if (h) time = { ...h, marked: false };
  }
  const part = phrase(t, Object.keys(DAY_PARTS));
  const dayPart = part ? DAY_PARTS[part.value]! : null;

  if (!day && !time && !dayPart) return { status: "unknown", reason: "no_date_or_time", version: v };
  if (day && day.days.length === 0) return { status: "unknown", reason: "not_a_real_date", version: v };
  if (time && time.reads.length === 0) return { status: "unknown", reason: "not_a_real_time", version: v };

  // The span the words cover, for evidence.
  const spans: { start: number; end: number }[] = [];
  if (day) spans.push(day);
  if (time) spans.push(time);
  else if (part) spans.push(part);
  const start = Math.min(...spans.map((s) => s.start));
  const end = Math.max(...spans.map((s) => s.end));
  const raw = text.slice(start, end);

  const days: (Ymd | null)[] = day ? day.days : [null];
  const times: ({ hh: number; mm: number } | null)[] = time ? time.reads : [null];
  const candidates: WhenCandidate[] = [];
  let skipped = false;
  for (const d of days) {
    for (const hm of times) {
      if (!d || !hm) {
        candidates.push({ date: d ? iso(d) : null, time: hm ? `${pad(hm.hh)}:${pad(hm.mm)}` : null, startsAt: null });
        continue;
      }
      const at = instantsOf(d, hm.hh, hm.mm, ctx.timeZone);
      // A wall time a clock change skips does not exist; one it repeats is two instants. Either way the owner did not say which.
      if (at.length === 0) skipped = true;
      for (const startsAt of at) candidates.push({ date: iso(d), time: `${pad(hm.hh)}:${pad(hm.mm)}`, startsAt });
    }
  }
  // A reading that was dropped as impossible must not leave the other reading looking like what was written.
  if (skipped) return { status: "unknown", reason: "time_does_not_exist", version: v };
  if (candidates.length === 0) return { status: "unknown", reason: "time_does_not_exist", version: v };
  if (candidates.length > 1) return { status: "ambiguous", candidates, raw, start, end, version: v };
  const c = candidates[0]!;
  // A day part together with an exact hour is the hour; without one it stays a window.
  return { status: "ok", date: c.date, time: c.time, startsAt: c.startsAt, dayPart: time ? null : dayPart, raw, start, end, version: v };
}
