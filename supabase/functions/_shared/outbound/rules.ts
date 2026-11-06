// Outbound's rules in one pure file (Harvey 4A, master plan 30.39, R-119): the suppression hash (the same rule as
// kabsi-harvey's harvey/kabsi_suppression.py), the templates of docs/COPY.md "Outbound emails" word for word, the detail
// sentences, the link and house style checks, the ramp and the sending window. No network, no database.

/** sha256 hex of the trimmed, lower-cased text (kabsi_suppression.sha). */
export async function sha(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value ?? "").trim().toLowerCase()));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** What is looked up for one recipient: the address, its domain and every parent domain that still has a dot. */
export function keysOf(address: string): string[] {
  const a = String(address ?? "").trim().toLowerCase();
  if (!a) return [];
  const keys = [a];
  let d = a.includes("@") ? a.slice(a.lastIndexOf("@") + 1) : "";
  while (d.includes(".")) {
    keys.push(d);
    d = d.slice(d.indexOf(".") + 1);
  }
  return keys;
}

export async function isSuppressed(address: string, hashes: ReadonlySet<string>): Promise<boolean> {
  for (const k of keysOf(address)) if (hashes.has(await sha(k))) return true;
  return false;
}

const FREE_MAIL = /^(gmail|googlemail|outlook|hotmail|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|pm|gmx|mail|yandex|zoho|btinternet|sky|virginmedia|talktalk)\./;
export const isFreeMail = (domain: string) => FREE_MAIL.test(String(domain ?? "").toLowerCase());

export function domainOf(address: string): string {
  const a = String(address ?? "").trim().toLowerCase();
  return a.includes("@") ? a.slice(a.lastIndexOf("@") + 1) : "";
}

/** The host of a website, lower-cased, without www., port or path. */
export function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** An email on the business's own domain: the address's domain is the website's host, or the host is under it. */
export function ownDomain(email: string, website: string): boolean {
  const d = domainOf(email);
  const h = hostOf(website);
  if (!d || !h || isFreeMail(d)) return false;
  return h === d || h.endsWith(`.${d}`) || d.endsWith(`.${h}`);
}

// ─── industries, countries, time zones
/** Harvey's industry codes as an owner would say them, plural, for "looking at <kind> in <city>". */
export const KIND_WORDS: Record<string, string> = {
  "hair salon": "hair salons", "barbershop": "barbers", "beauty salon and spa": "beauty salons and spas",
  "nail salon": "nail salons", "restaurant": "restaurants", "cafe": "cafes", "clinic": "clinics",
  "car repair garage": "car repair garages", "dentist": "dentists", "gym": "gyms", "vet": "vets",
  "physiotherapist": "physiotherapists",
};
/** Salons and barbers first, then the Founding 25 mix (beauty, then the other trades). */
export const INDUSTRY_ORDER = [
  "hair salon", "barbershop", "beauty salon and spa", "nail salon", "clinic", "dentist", "physiotherapist", "cafe",
  "restaurant", "car repair garage", "gym", "vet",
];

export const TIME_ZONES: Record<string, string> = {
  GB: "Europe/London", IE: "Europe/Dublin", AE: "Asia/Dubai", SA: "Asia/Riyadh", QA: "Asia/Qatar", KW: "Asia/Kuwait",
  BH: "Asia/Bahrain", OM: "Asia/Muscat", AU: "Australia/Sydney", NZ: "Pacific/Auckland", SG: "Asia/Singapore",
  CA: "America/Toronto", US: "America/New_York",
};

// ─── house style
/** No em or en dashes and no exclamation marks (CLAUDE.md). */
export const houseStyleOk = (text: string) => !/[–—!]/.test(text);

/** Every link-like word in a text, lower-cased, without the scheme or trailing punctuation. */
export function linksIn(text: string): string[] {
  const out: string[] = [];
  for (const m of String(text ?? "").matchAll(/((?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s]*)?)/gi)) {
    out.push(m[1].replace(/^https?:\/\//i, "").replace(/[.,;:)]+$/, "").toLowerCase());
  }
  return out;
}

/** Email 1 and the follow-up carry only kabsi.co and kabsi.co/privacy; a reply may also carry a kabsi.co page and the
 *  Facebook and Instagram addresses from SOCIAL_LINKS. The same rule as private.outbound_links_ok. */
export function linksOk(body: string, kind: "first" | "follow_up" | "reply"): boolean {
  return linksIn(body).every((l) =>
    kind === "reply"
      ? l === "kabsi.co" || l.startsWith("kabsi.co/") || l.startsWith("www.facebook.com/profile.php?id=") || l.startsWith("www.instagram.com/kabsi.co")
      : l === "kabsi.co" || l === "kabsi.co/privacy"
  );
}

// ─── the detail sentence (docs/COPY.md "Outbound emails"): the first that is true on the page read at draft time
export type Detail = { kind: "booking" | "hours" | "instagram" | "updated"; sentence: string };

const BOOKING_SYSTEMS: [RegExp, string][] = [
  [/fresha\.com|shedul\.com/i, "Fresha"], [/booksy\.com/i, "Booksy"], [/treatwell\./i, "Treatwell"],
  [/squareup\.com\/appointments|square\.site\/book|book\.squareup/i, "Square Appointments"], [/vagaro\.com/i, "Vagaro"],
  [/gettimely\.com|bookings\.gettimely/i, "Timely"], [/phorest\.com/i, "Phorest"], [/simplybook\.(me|it)/i, "SimplyBook.me"],
  [/setmore\.com/i, "Setmore"], [/acuityscheduling\.com|as\.me\//i, "Acuity Scheduling"], [/calendly\.com/i, "Calendly"],
  [/glossgenius\.com/i, "GlossGenius"], [/mindbodyonline\.com|mindbody\.io/i, "Mindbody"], [/zenoti\.com/i, "Zenoti"],
  [/salonized\.com/i, "Salonized"], [/styleseat\.com/i, "StyleSeat"], [/boulevard\.io|joinblvd\.com/i, "Boulevard"],
  [/opentable\.(com|co\.uk)/i, "OpenTable"], [/resdiary\.com/i, "ResDiary"], [/sevenrooms\.com/i, "SevenRooms"],
  [/dentally\.(co|com)/i, "Dentally"], [/cliniko\.com/i, "Cliniko"], [/jane\.app/i, "Jane"],
];
const BOOKING_LINK = /href\s*=\s*["']?([^"'\s>]+)/gi;

export function bookingSystem(html: string): string | null {
  const hrefs = [...String(html ?? "").matchAll(BOOKING_LINK)].map((m) => m[1]).join(" ");
  const scripts = [...String(html ?? "").matchAll(/<(?:script|iframe)[^>]+src\s*=\s*["']?([^"'\s>]+)/gi)].map((m) => m[1]).join(" ");
  for (const [re, name] of BOOKING_SYSTEMS) if (re.test(hrefs) || re.test(scripts)) return name;
  return null;
}

const DAY = "(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday)?";
const TIME = "(?:[01]?\\d|2[0-3])(?:[:.][0-5]\\d)?\\s*(?:am|pm)?";
const HOURS_RE = new RegExp(`\\b${DAY}\\b[^\\n<]{0,40}?\\b${TIME}\\s*(?:-|to|until|till|–)\\s*${TIME}`, "i");

export function textOf(html: string): string {
  return String(html ?? "")
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&#64;|&commat;/gi, "@").replace(/&#46;/g, ".")
    .replace(/[ \t\r\f\v]+/g, " ");
}

export function hasHours(html: string): boolean {
  if (/"openingHours(Specification)?"\s*:/i.test(html)) return true;
  return HOURS_RE.test(textOf(html));
}

export function instagramLinked(html: string): boolean {
  return /href\s*=\s*["']?https?:\/\/(?:www\.)?instagram\.com\/(?!p\/|explore|accounts|kabsi\.co)[a-z0-9_.]{2,30}\/?["'\s>?]/i.test(html);
}

/** The site says it changed this year or last: a copyright year, or a dateModified in its structured data. */
export function updatedRecently(html: string, today: Date): boolean {
  const y = today.getUTCFullYear();
  const years: number[] = [];
  for (const m of String(html ?? "").matchAll(/(?:©|&copy;|copyright)\s*(?:[^<\n]{0,20}?)(20\d\d)(?:\s*[-–]\s*(20\d\d))?/gi)) {
    years.push(Number(m[2] ?? m[1]));
  }
  for (const m of String(html ?? "").matchAll(/"dateModified"\s*:\s*"(20\d\d)-/g)) years.push(Number(m[1]));
  return years.some((x) => x === y || x === y - 1);
}

export function pickDetail(html: string, today: Date): Detail | null {
  const system = bookingSystem(html);
  if (system && houseStyleOk(system)) {
    return { kind: "booking", sentence: `I saw you take bookings through ${system}, so customers find you online already.` };
  }
  if (hasHours(html)) {
    return { kind: "hours", sentence: "Your site lists your opening hours, and keeping Google's hours the same saves wasted trips." };
  }
  if (instagramLinked(html)) {
    return { kind: "instagram", sentence: "Your Instagram shows the work, and the same photos could do well on your Google profile." };
  }
  if (updatedRecently(html, today)) {
    return { kind: "updated", sentence: "Your site looks recently updated, so your Google profile is the next place customers check." };
  }
  return null;
}

/** The address is still published on the page: as text (entities decoded) or in a mailto link. */
export function emailOnPage(html: string, email: string): boolean {
  const e = String(email ?? "").trim().toLowerCase();
  if (!e) return false;
  const raw = String(html ?? "").toLowerCase();
  if (raw.includes(`mailto:${e}`)) return true;
  return textOf(raw).toLowerCase().includes(e);
}

// ─── the templates (docs/COPY.md, "Outbound emails"), word for word
export const SIGNATURE = "Rashid Abou Hamzy, founder of Kabsi\nkabsi.co";
export const FOOTER =
  "Why you got this: your business email is on your website. Reply 'no thanks' and I will not write again. How Kabsi handles data: kabsi.co/privacy";

export type Draft = { subject: string; body: string };

export function emailOne(p: { business: string; kind: string; city: string; detail: string }): Draft {
  const b = p.business;
  return {
    subject: `${b}'s Google profile`,
    body: [
      `Hi ${b} team,`,
      `I came across ${b} looking at ${p.kind} in ${p.city}. ${p.detail}`,
      "I run Kabsi. It prepares your Google review replies, posts and opening hours, and you approve each one on WhatsApp before anything goes live. We're taking 25 founding businesses, with three months of Pro free.",
      `Want me to run a free check of ${b}'s Google profile and send you what I find?`,
      SIGNATURE,
      FOOTER,
    ].join("\n\n"),
  };
}

export function followUp(p: { business: string }): Draft {
  return {
    subject: `Re: ${p.business}'s Google profile`,
    body: [
      `Hi again. Happy to run that free check of ${p.business}'s Google profile if useful. A yes is enough, and if not, no worries.`,
      SIGNATURE,
      FOOTER,
    ].join("\n\n"),
  };
}

/** A business name Outbound may write: letters it can print, no house style break, no link. */
export function nameOk(name: string): boolean {
  const n = String(name ?? "").trim();
  return n.length >= 2 && n.length <= 80 && houseStyleOk(n) && /^[\p{Script=Latin}\p{N}\s&'.,()+-]+$/u.test(n) && linksIn(n).length === 0;
}

// ─── the ramp and the window
/** 3 a day in week 1, 5 in week 2, then 10 (30.39 item 7). Before started_on (test mode): week 1. */
export function dailyCap(s: { ramp_week1: number; ramp_week2: number; ramp_after: number; started_on: string | null }, day: string): number {
  if (!s.started_on) return s.ramp_week1;
  const d = Math.floor((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${s.started_on}T00:00:00Z`)) / 86_400_000);
  return d < 7 ? s.ramp_week1 : d < 14 ? s.ramp_week2 : s.ramp_after;
}

/** The local date, weekday (1 Monday to 7 Sunday) and minutes past midnight in a time zone. */
export function localParts(at: Date, timeZone: string): { date: string; weekday: number; minutes: number } {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(at).map((x) => [x.type, x.value]));
  const weekday = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday) + 1;
  return { date: `${p.year}-${p.month}-${p.day}`, weekday, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** Weekdays 9:00 to 17:00 in the recipient's time zone. */
export function inWindow(at: Date, timeZone: string): boolean {
  const l = localParts(at, timeZone);
  return l.weekday >= 1 && l.weekday <= 5 && l.minutes >= 9 * 60 && l.minutes < 17 * 60;
}

/** The next weekday after `from` (a YYYY-MM-DD date). */
export function nextWeekday(from: string): string {
  const d = new Date(`${from}T12:00:00Z`);
  do d.setUTCDate(d.getUTCDate() + 1); while ([0, 6].includes(d.getUTCDay()));
  return d.toISOString().slice(0, 10);
}

/** 09:00 on a local date in a time zone, as an instant (good to the minute, across summer time). */
export function localNine(date: string, timeZone: string): Date {
  let guess = new Date(`${date}T09:00:00Z`);
  for (let i = 0; i < 3; i++) {
    const l = localParts(guess, timeZone);
    const off = (Date.parse(`${l.date}T00:00:00Z`) + l.minutes * 60_000) - guess.getTime();
    guess = new Date(Date.parse(`${date}T09:00:00Z`) - off);
  }
  return guess;
}

/** The follow-up: 4 or 5 days after Email 1, moved to the next weekday. */
export function followUpDate(sentAt: Date, timeZone: string, random = Math.random): Date {
  const days = random() < 0.5 ? 4 : 5;
  const l = localParts(new Date(sentAt.getTime() + days * 86_400_000), timeZone);
  const date = l.weekday >= 6 ? nextWeekday(l.date) : l.date;
  return localNine(date, timeZone);
}

/** At least 20 minutes apart, with up to 10 minutes of jitter. */
export function nextGap(random = Math.random): number {
  return (20 + Math.floor(random() * 10)) * 60_000;
}
