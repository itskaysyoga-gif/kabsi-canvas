// What the notification engine decides, as pure functions (K-46 as amended by K-57; P0.4-09). Given a category, the
// owner's choice, the time at the business and its opening hours: send now, hold until morning, put in the daily
// digest, or do not email. The engine (notify-engine.ts) calls these and does the storing and sending.
//
// Defaults (K-46): high-risk reviews and urgent profile changes instant; normal reviews instant during opening hours
// and digested outside them; everything else in the daily digest. Quiet hours 22:00 to 08:00 local, except urgent
// profile changes. A category the owner cannot switch off ignores "off".
import { type Category, CATEGORIES, categoryOf, type Frequency } from "./notify-categories.ts";
import { parseHours } from "./protection.ts";

export const QUIET_START = 22;
export const QUIET_END = 8;

export type Decision =
  | { mode: "send" }
  | { mode: "hold"; until: Date; reason: "quiet_hours" }
  | { mode: "digest"; until: Date }
  | { mode: "off" };

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(date)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return o as { year: number; month: number; day: number; hour: number; minute: number; second: number };
}
const two = (n: number) => String(n).padStart(2, "0");

/** The local date (YYYY-MM-DD), hour, minute and weekday (0 = Monday) at `date` in `tz`. */
export function localParts(date: Date, tz: string) {
  const p = parts(date, tz);
  const weekday = (new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() + 6) % 7;
  return { ymd: `${p.year}-${two(p.month)}-${two(p.day)}`, hour: p.hour, minute: p.minute, weekday };
}

const addDays = (ymd: string, days: number): string => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d! + days)).toISOString().slice(0, 10);
};

/** UTC instant of `hour`:00 local time on `ymd` in `tz`, DST safe. */
export function atLocalHour(ymd: string, hour: number, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y!, m! - 1, d!, hour);
  const offsetAt = (t: number) => {
    const p = parts(new Date(t), tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - t;
  };
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t); // the second pass settles the offset across a DST change
  return new Date(t);
}

/** The next time after `now` that it is `hour`:00 at the business. */
export function nextLocalHour(now: Date, tz: string, hour: number): Date {
  const today = localParts(now, tz).ymd;
  const first = atLocalHour(today, hour, tz);
  return first.getTime() > now.getTime() ? first : atLocalHour(addDays(today, 1), hour, tz);
}

export const inQuietHours = (hour: number) => hour >= QUIET_START || hour < QUIET_END;

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};

/**
 * Is the business open now, by the owner-approved opening hours text ("Mon to Sat 09:00 to 22:00, Sun closed")?
 * null when there is no text or it cannot be read; the engine then treats the business as open.
 */
export function isOpenNow(hoursText: string | null | undefined, now: Date, tz: string): boolean | null {
  if (!hoursText?.trim()) return null;
  const days = parseHours(hoursText);
  if (!days) return null;
  const { weekday, hour, minute } = localParts(now, tz);
  const t = hour * 60 + minute;
  const today = days[weekday] ?? "closed";
  if (today !== "closed") {
    const open = minutes(today.open), close = minutes(today.close);
    if (close > open ? t >= open && t < close : t >= open) return true; // a close at or before the open runs past midnight
  }
  const yesterday = days[(weekday + 6) % 7] ?? "closed";
  if (yesterday !== "closed" && minutes(yesterday.close) <= minutes(yesterday.open)) return t < minutes(yesterday.close);
  return false;
}

export type DecideInput = {
  category: string;
  /** The owner's email choice for this category; null or "default" uses the K-46 default. */
  pref?: Frequency | null;
  now: Date;
  tz: string;
  /** The business's daily digest hour (Settings). Never earlier than 08:00, the end of quiet hours. */
  digestHour: number;
  hours?: string | null;
};

export function decideEmail(i: DecideInput): Decision {
  const cat = categoryOf(i.category);
  if (!cat) return { mode: "send" }; // a system category: no preferences, no quiet hours
  const pref = i.pref ?? "default";
  if (pref === "off" && cat.switchable) return { mode: "off" };
  const frequency = resolveFrequency(cat, pref, i);
  if (frequency === "daily_digest") {
    return { mode: "digest", until: nextLocalHour(i.now, i.tz, Math.max(i.digestHour, QUIET_END)) };
  }
  if (!cat.quietExempt && inQuietHours(localParts(i.now, i.tz).hour)) {
    return { mode: "hold", until: nextLocalHour(i.now, i.tz, QUIET_END), reason: "quiet_hours" };
  }
  return { mode: "send" };
}

function resolveFrequency(cat: Category, pref: Frequency, i: DecideInput): "instant" | "daily_digest" {
  if (pref === "instant" || pref === "daily_digest") return pref;
  if (cat.emailDefault !== "by_hours") return cat.emailDefault;
  return isOpenNow(i.hours, i.now, i.tz) === false ? "daily_digest" : "instant";
}

// ─── the daily digest ─────────────────────────────────────────────────────────────────────────────────────────

export type DigestItem = { category: string; title: string; fragmentHtml?: string; fragmentText?: string; link?: string | null };
export type DigestSection = { category: string; label: string; items: DigestItem[]; count: number; noun: string };

/** Items grouped by category in the order of the category list, one section each. */
export function groupDigest(items: DigestItem[]): DigestSection[] {
  const order = new Map<string, number>();
  const byCat = new Map<string, DigestItem[]>();
  for (const item of items) {
    if (!byCat.has(item.category)) byCat.set(item.category, []);
    byCat.get(item.category)!.push(item);
  }
  const ids = [...byCat.keys()];
  ids.forEach((id, i) => order.set(id, categoryIndex(id) ?? 1000 + i));
  return ids.sort((a, b) => order.get(a)! - order.get(b)!).map((id) => {
    const cat = categoryOf(id);
    const list = byCat.get(id)!;
    return { category: id, label: cat?.label ?? id, items: list, count: list.length, noun: list.length === 1 ? (cat?.noun[0] ?? "update") : (cat?.noun[1] ?? "updates") };
  });
}

function categoryIndex(id: string) {
  const i = CATEGORIES.findIndex((c) => c.id === id);
  return i < 0 ? null : i;
}

/** "Yawmiyati: 2 new reviews and 1 profile change" (K-102: business name first, then the action). */
export function digestSubject(business: string, sections: DigestSection[]): string {
  const bits = sections.slice(0, 3).map((s) => `${s.count} ${s.noun}`);
  const more = sections.length > 3 ? " and more" : "";
  const list = bits.length > 1 ? `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}` : (bits[0] ?? "your daily update");
  return `${business}: ${list}${more}`;
}
