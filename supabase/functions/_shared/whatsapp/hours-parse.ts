// An hours change typed on WhatsApp (master plan 9.3 "Hours", 30.10 point 7): "closed tomorrow", "close early today at
// 5pm" with the opening time, "open 10 to 2 on Friday", "closed 24 to 26 December". It becomes one special-hours draft that
// the owner sees back, exactly as Google will show it, and approves with a Yes through the one publication pipeline.
// Anything unclear gets one short question back; impossible times are caught; midnight and the business's own time zone
// are handled. A lasting change of the weekly hours ("from now on we open at 9") is confirmed on the Kabsi website.
// Pure: the date of "today" in the business's time zone is passed in.

export type HoursChange = { from: string; to: string; closed: boolean; open: string | null; close: string | null };
export type HoursParse =
  | { ok: true; change: HoursChange }
  | { ok: false; why: "permanent" | "no_day" | "no_times" | "bad_time" | "past" | "too_far" };

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MON = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DAY = "(sun(?:day)?|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?)\\b";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
const monthOf = (m: string) => MONTHS.findIndex((x) => x.startsWith(m.slice(0, 3)));

/** Today's date in a time zone, as a UTC midnight Date (only its Y-M-D is used). */
export function localToday(now: Date, tz: string): Date {
  let zone = tz;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  } catch {
    zone = "UTC";
  }
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** A date written as "25 December", "December 25" or "25 dec": this year, or next year when it has passed. */
function dateOf(day: number, month: number, today: Date): Date | null {
  if (month < 0 || day < 1 || day > 31) return null;
  let d = new Date(Date.UTC(today.getUTCFullYear(), month, day));
  if (d.getUTCMonth() !== month) return null;
  if (d < addDays(today, -1)) d = new Date(Date.UTC(today.getUTCFullYear() + 1, month, day));
  return d;
}

function weekday(name: string, today: Date, next: boolean): Date {
  const want = DAYS.findIndex((x) => x.startsWith(name.slice(0, 3)));
  let diff = (want - today.getUTCDay() + 7) % 7;
  if (next && diff === 0) diff = 7;
  return addDays(today, diff);
}

/** The days the message is about: one day or a range. */
function days(t: string, today: Date): { from: Date; to: Date; used: string } | null {
  // "24 to 26 December", "from 24 to 26 dec"
  let m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|till|until|-)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\b`).exec(t);
  if (m) {
    const a = dateOf(+m[1], monthOf(m[3]), today), b = dateOf(+m[2], monthOf(m[3]), today);
    if (a && b) return { from: a, to: b < a ? dateOf(+m[2], monthOf(m[3]), addDays(a, 1)) ?? b : b, used: m[0] };
  }
  // "December 24 to 26"
  m = new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*(?:to|till|until|-)\\s*(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t);
  if (m) {
    const a = dateOf(+m[2], monthOf(m[1]), today), b = dateOf(+m[3], monthOf(m[1]), today);
    if (a && b) return { from: a, to: b, used: m[0] };
  }
  // "friday to sunday"
  m = new RegExp(`\\b${DAY}\\s*(?:to|till|until|-)\\s*${DAY}\\b`).exec(t);
  if (m) {
    const a = weekday(m[1], today, false);
    let b = weekday(m[2], a, false);
    if (b < a) b = addDays(b, 7);
    return { from: a, to: b, used: m[0] };
  }
  // one day
  m = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MON}\\b`).exec(t) ?? null;
  if (m) {
    const a = dateOf(+m[1], monthOf(m[2]), today);
    if (a) return { from: a, to: a, used: m[0] };
  }
  m = new RegExp(`\\b${MON}\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b`).exec(t);
  if (m) {
    const a = dateOf(+m[2], monthOf(m[1]), today);
    if (a) return { from: a, to: a, used: m[0] };
  }
  if (/\b(today|tonight|this evening)\b/.test(t)) return { from: today, to: today, used: "" };
  if (/\btomorrow\b/.test(t)) return { from: addDays(today, 1), to: addDays(today, 1), used: "" };
  m = new RegExp(`\\b(next\\s+)?${DAY}\\b`).exec(t);
  if (m) {
    const a = weekday(m[2], today, !!m[1]);
    return { from: a, to: a, used: m[0] };
  }
  return null;
}

/** One time of day as HH:MM, with the am or pm it says; null when it is not a time. */
function clock(raw: string): { h: number; m: number; mer: "am" | "pm" | null } | null {
  const t = raw.trim();
  if (/^noon$|^midday$/.test(t)) return { h: 12, m: 0, mer: "pm" };
  if (/^midnight$/.test(t)) return { h: 24, m: 0, mer: null };
  const m = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?$/.exec(t);
  if (!m) return null;
  return { h: +m[1], m: +(m[2] ?? 0), mer: m[3] ? (m[3].startsWith("a") ? "am" : "pm") : null };
}
const TIME = "(\\d{1,2}(?:[:.]\\d{2})?\\s*(?:am|pm|a\\.m\\.|p\\.m\\.)?|noon|midday|midnight)";

function to24(c: { h: number; m: number; mer: "am" | "pm" | null }, guess: "open" | "close"): number | null {
  if (c.m > 59) return null;
  let h = c.h;
  if (c.mer) {
    if (h < 1 || h > 12) return null;
    h = c.mer === "pm" ? (h % 12) + 12 : h % 12;
  } else if (h > 24) {
    return null;
  } else if (h <= 12 && guess === "close" && h < 12 && h > 0) {
    // "close at 5" is 5 in the afternoon; "close at 1" is 1 pm.
    h += 12;
  } else if (h <= 12 && guess === "open" && h < 6) {
    // "open 2 to 6": the afternoon.
    h += 12;
  }
  return h * 60 + c.m;
}
const hhmm = (min: number) => (min >= 24 * 60 ? "23:59" : `${pad(Math.floor(min / 60))}:${pad(min % 60)}`);

export function parseHours(text: string, now: Date, tz: string): HoursParse {
  const t = text.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();
  if (/\b(from now on|every (day|week|mon|tue|wed|thu|fri|sat|sun)|always|usually|normally|new (opening )?hours|regular hours|permanent(ly)?|weekly hours)\b/.test(t)) {
    return { ok: false, why: "permanent" };
  }
  const today = localToday(now, tz);
  const span = days(t, today);
  if (!span) return { ok: false, why: "no_day" };
  if (span.from < today) return { ok: false, why: "past" };
  if (span.to > addDays(today, 400) || span.to < span.from) return { ok: false, why: "too_far" };
  const out = (closed: boolean, open: number | null, close: number | null): HoursParse => ({
    ok: true, change: { from: iso(span.from), to: iso(span.to), closed, open: open === null ? null : hhmm(open), close: close === null ? null : hhmm(close) },
  });
  // "open 10 to 2", "10am-4pm", "from 9 till 13:30"
  const rest = span.used ? t.replace(span.used, " ") : t;
  const range = new RegExp(`\\b(?:open\\s+)?(?:from\\s+)?${TIME}\\s*(?:to|till|until|-)\\s*${TIME}`).exec(rest);
  if (range) {
    const a = clock(range[1]), b = clock(range[2]);
    if (!a || !b) return { ok: false, why: "bad_time" };
    let open = to24(a, "open"), close = to24(b, "close");
    if (open === null || close === null) return { ok: false, why: "bad_time" };
    // "9 to 5" without am or pm: 9 in the morning to 5 in the afternoon (to24 did it); "5pm to 1" is caught below.
    if (close <= open && !b.mer && close + 720 > open && close + 720 <= 24 * 60) close += 720;
    if (close <= open || open >= 24 * 60) return { ok: false, why: "bad_time" };
    return out(false, open, close);
  }
  if (/\b(closed|close all day|shut|not open|day off|off all day|closing all day)\b/.test(t) && !/\bclos(e|es|ing)\s+(early\s+)?at\b/.test(t)) return out(true, null, null);
  // "close early at 5" needs the opening time too: one question back.
  if (/\bclos(e|es|ing)\b|\bopen\b|\bat\s+\d/.test(t)) return { ok: false, why: "no_times" };
  return { ok: false, why: "no_day" };
}

const LONG = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
const SHORT = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
/** "9am", "5:30pm", "midnight". */
export function ampm(hm: string): string {
  if (hm === "23:59") return "midnight";
  const [h, m] = hm.split(":").map(Number);
  const mer = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${pad(m)}` : ""}${mer}`;
}

/** The change as the owner reads it before the Yes: the days and exactly what Google will show. */
export function describeHours(c: HoursChange): string {
  const when = c.from === c.to ? LONG(c.from) : `${SHORT(c.from)} to ${SHORT(c.to)}`;
  return c.closed ? `${when}: closed all day.` : `${when}: open ${ampm(c.open!)} to ${ampm(c.close!)}.`;
}
