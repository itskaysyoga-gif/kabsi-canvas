// OFFER-2 (blueprint 3.1 section 11): the owner's Google-care tools on WhatsApp, the pure parts. What is waiting, what Kabsi
// did, the hours on Google now, a weekly hours change for one day of the week, a phone or website change, and the fields
// Kabsi does not change from a chat. Pure: no database, network or environment access, so every rule is tested.
//
// Every change to Google is shown back exactly and waits for a tap on Approve (router.ts wy:<nonce>). The week shown is
// built from the same Week the change sends: weekToRaw(week) goes to Google, weekSummary(week) is what the owner reads.
import { DAY_KEYS, type DayKey, type GRegularHours, type HoursPeriod, rawToWeek, regularHoursDisplay, validateWeek, type Week, weekSummary, weekToRaw } from "../hours.ts";
import { readRange } from "./hours-parse.ts";

// ─── the weekly hours of one day ──────────────────────────────────────────────────────────────────────────────────────

const DAY_WORDS: [RegExp, DayKey][] = [
  [/\bmon(?:day)?s?\b/, "MONDAY"], [/\btue(?:s|sday)?s?\b/, "TUESDAY"], [/\bwed(?:nesday)?s?\b/, "WEDNESDAY"],
  [/\bthu(?:r|rs|rsday)?s?\b/, "THURSDAY"], [/\bfri(?:day)?s?\b/, "FRIDAY"], [/\bsat(?:urday)?s?\b/, "SATURDAY"], [/\bsun(?:day)?s?\b/, "SUNDAY"],
];
export const DAY_NAME: Record<DayKey, string> = {
  MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
};
const norm = (text: string) => text.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();

/** The days of the week a message names, in week order, each once. */
export function daysIn(text: string): DayKey[] {
  const t = norm(text);
  return DAY_WORDS.filter(([re]) => re.test(t)).map(([, d]) => d);
}

/** A date or a one-off day: "today", "tomorrow", "next Friday", "this Saturday", "24 December". Those are special hours. */
const ONE_OFF = /\b(today|tonight|tomorrow|next|this|on the \d|\d{1,2}(st|nd|rd|th)?\s+(of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}|holiday|christmas|eid|new year|close early)\b/;
const LASTING = /\b(from now on|every|always|usually|normally|regular hours|weekly hours|usual hours|permanent(ly)?|new (opening )?hours|change (my |our )?(opening )?hours|update (my |our )?(opening )?hours|(opening )?hours on)\b/;
/** A plural day ("Saturdays") is every Saturday. */
const PLURAL_DAY = /\b(mondays|tuesdays|wednesdays|thursdays|fridays|saturdays|sundays)\b/;

/** Is this a lasting change of the weekly hours (and not a one-off date)? */
export function isWeekly(text: string): boolean {
  const t = norm(text);
  if (ONE_OFF.test(t)) return false;
  return LASTING.test(t) || PLURAL_DAY.test(t);
}

export type WeekDayParse =
  | { ok: true; day: DayKey; periods: HoursPeriod[] }
  | { ok: false; why: "no_day" | "two_days" | "no_times" | "bad_time"; day?: DayKey };

/** One day of the week and its new hours: "Saturdays 10am to 4pm", "closed on Sundays", "change my opening hours on Saturday". */
export function parseWeekDay(text: string): WeekDayParse {
  const t = norm(text);
  const days = daysIn(t);
  if (!days.length) return { ok: false, why: "no_day" };
  if (days.length > 1) return { ok: false, why: "two_days" };
  const day = days[0]!;
  const range = readRange(t);
  if (range === "bad") return { ok: false, why: "bad_time", day };
  if (range) return { ok: true, day, periods: [{ open: range.open, close: range.close }] };
  if (/\b(closed|close all day|shut|not open|day off)\b/.test(t)) return { ok: true, day, periods: [] };
  return { ok: false, why: "no_times", day };
}

export type WeekChange =
  | { ok: true; day: DayKey; week: Week; raw: GRegularHours & { periods: unknown[] }; display: string; shown: string[]; dayLine: string }
  | { ok: false; why: "no_hours" | "same" | "bad_time" };

/** The new week: the stored week with only the named day replaced. What is shown and what is sent come from the same week. */
export function weekChange(current: GRegularHours | null | undefined, day: DayKey, periods: HoursPeriod[]): WeekChange {
  if (!current?.periods?.length) return { ok: false, why: "no_hours" };
  const before = rawToWeek(current);
  const week: Week = { ...before, [day]: periods.map((p) => ({ ...p })) };
  if (validateWeek(week)) return { ok: false, why: "bad_time" };
  const raw = weekToRaw(week) as GRegularHours & { periods: unknown[] };
  const display = regularHoursDisplay(raw);
  if (display === regularHoursDisplay(weekToRaw(before))) return { ok: false, why: "same" };
  return { ok: true, day, week, raw, display, shown: weekSummary(week), dayLine: `${DAY_NAME[day]}: ${dayText(periods)}` };
}

export const dayText = (periods: HoursPeriod[]) =>
  periods.length ? periods.map((p) => `${p.open} to ${p.close === "00:00" ? "midnight" : p.close}`).join(" and ") : "Closed";

/** The hours on Google now, from the stored listing, one line per run of days. */
export const hoursLines = (raw: GRegularHours | null | undefined): string[] => (raw?.periods?.length ? weekSummary(rawToWeek(raw)) : []);

export { DAY_KEYS };

// ─── a phone or website change ────────────────────────────────────────────────────────────────────────────────────────

export type ContactParse =
  | { ok: true; field: "phone" | "website"; value: string }
  | { ok: false; why: "no_value" };

/** "Our new number is +1 205 555 0100", "change the website to www.example.com". The value is the owner's own, as typed. */
export function parseContact(text: string): ContactParse {
  const t = text.trim();
  const phone = /(\+?\d[\d ().-]{5,22}\d)/.exec(t);
  const wantsPhone = /\b(phone|number|call|mobile|landline|tel)\b/i.test(t);
  const site = /\b((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s]*)?)/i.exec(t);
  const wantsSite = /\b(website|web site|site|web|link|url|www)\b/i.test(t) || /^https?:\/\//i.test(site?.[1] ?? "");
  if (site && wantsSite && !/@/.test(site[1]!)) {
    const v = site[1]!.replace(/[.,;)]+$/, "");
    return { ok: true, field: "website", value: /^https?:\/\//i.test(v) ? v : `https://${v}` };
  }
  if (phone && wantsPhone) {
    const digits = phone[1]!.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) return { ok: true, field: "phone", value: phone[1]!.replace(/\s+/g, " ").trim() };
  }
  return { ok: false, why: "no_value" };
}

/** Is this a phone or website change at all (so the router is not asked)? */
export const isContactChange = (text: string) =>
  /\b(change|update|new|fix|correct|replace|set)\b/i.test(text) && /\b(phone|number|website|web site|site|url)\b/i.test(text) && !isGuideField(text);

// ─── the fields Kabsi does not change from a chat ──────────────────────────────────────────────────────────────────────

/** Name, address, category, description and services (blueprint 11.1 item 4): a wrong change can make Google check the
 *  business again, so these are guided, never changed from a chat. */
export const isGuideField = (text: string) =>
  /\b(change|update|edit|fix|correct|rename|new|move|add|remove)\b/i.test(text) &&
  /\b(business name|our name|my name on google|the name|name of (the|my|our) business|address|moved|category|categories|description|services?)\b/i.test(text);

// ─── what is waiting and what Kabsi did ───────────────────────────────────────────────────────────────────────────────

export type WaitingReview = { id: string; stars: number | null; first_name: string | null; drafted: boolean };
export type WaitingApproval = { token: string; label: string };
export type WaitingProblem = { id: string; label: string };
export type WaitingItem = ({ kind: "review" } & WaitingReview) | ({ kind: "approval" } & WaitingApproval) | ({ kind: "problem" } & WaitingProblem);

/** One numbered list, at most 9 items: reviews to answer, things to approve, problems found on Google. */
export function waitingList(reviews: WaitingReview[], approvals: WaitingApproval[], problems: WaitingProblem[]): WaitingItem[] {
  return [
    ...reviews.map((r) => ({ kind: "review" as const, ...r })),
    ...approvals.map((a) => ({ kind: "approval" as const, ...a })),
    ...problems.map((p) => ({ kind: "problem" as const, ...p })),
  ].slice(0, 9);
}

const who = (r: WaitingReview) => `${r.first_name?.trim() || "A customer"}${r.stars ? `, ${r.stars} ${r.stars === 1 ? "star" : "stars"}` : ""}`;
export function waitingLine(i: WaitingItem): string {
  if (i.kind === "review") return i.drafted ? `Reply ready: ${who(i)}` : `New review: ${who(i)}, reply being written`;
  if (i.kind === "approval") return `${i.label} waiting for your yes`;
  return `Found on Google: your ${i.label} changed`;
}

/** The label of an Approve button's item, for the list ("Post", "Hours", "Photo", "Change", "Reply"). */
export function approvalLabel(kind: string, targetType?: string | null): string {
  const k = targetType ?? kind;
  return k.includes("photo") ? "Photo" : k.includes("post") ? "Post" : k.includes("hours") ? "Hours" : k.includes("protection") || k.includes("revert") ? "Change" : "Reply";
}

/** "2", "number 2", "#2", "review 2", "2." at the start, or one digit on its own ("make 2 shorter"): the place of an item in the
 *  waiting list. Read only while that list is open. */
export function numberIn(text: string): number | null {
  const t = norm(text);
  const m = /(?:^|\s)(?:number|no\.?|#|review|item)\s*(\d{1,2})\b/.exec(t) ?? /^#?(\d{1,2})(?:[.:)\s]|$)/.exec(t)
    ?? /(?:^|\s)(\d)(?:\s|$)/.exec(t);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= 9 ? n : null;
}

/** What one weekly report says, for "done": the work in plain lines, from the stored report (weekly_reports.data). */
export type ReportData = {
  period?: { from?: string; to?: string }; new_reviews?: number; replied?: number; waiting?: number; taps?: { total?: number };
};
export function doneLines(d: ReportData): string[] {
  const n = (x: unknown) => Math.max(0, Math.round(Number(x ?? 0)) || 0);
  const nr = n(d.new_reviews), rep = n(d.replied), wait = n(d.waiting), taps = n(d.taps?.total);
  return [
    `${nr} new ${nr === 1 ? "review" : "reviews"}, ${rep} answered through Kabsi`,
    `${wait} waiting for your yes`,
    `${taps} ${taps === 1 ? "tap" : "taps"} on your review link and cards`,
  ];
}
