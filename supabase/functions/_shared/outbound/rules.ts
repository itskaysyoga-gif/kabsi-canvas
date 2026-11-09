// Outbound's rules in one pure file (Harvey 4A, master plan 30.39, R-119): the suppression hash (the same rule as
// kabsi-harvey's harvey/kabsi_suppression.py), the templates of docs/COPY.md "Outbound emails" word for word, the detail
// sentences, the link and house style checks, the ramp and the sending window. No network, no database.
import { possessive } from "../possessive.ts";

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
/** Harvey's industry codes as an owner would say them, plural, for "looking at <kind> in <city>". The six salon
 *  industries come first, each with its own words (lane R, R-142 decision 4c, 30.45 item 5). */
export const KIND_WORDS: Record<string, string> = {
  "hair salon": "hair salons", "barbershop": "barbers", "beauty salon": "beauty salons", "nail salon": "nail salons",
  "lash and brow studio": "lash and brow studios", "spa and massage": "spas and massage studios",
  "restaurant": "restaurants", "cafe": "cafes", "clinic": "clinics", "car repair garage": "car repair garages",
  "dentist": "dentists", "gym": "gyms", "vet": "vets", "physiotherapist": "physiotherapists",
};
/** The six salon industries first, in lane R's order, then the other trades. */
export const SALON_INDUSTRIES = ["hair salon", "barbershop", "beauty salon", "nail salon", "lash and brow studio", "spa and massage"] as const;
export const INDUSTRY_ORDER = [
  ...SALON_INDUSTRIES, "clinic", "dentist", "physiotherapist", "cafe", "restaurant", "car repair garage", "gym", "vet",
];

/** The only country Outbound may ever write to: UK registered companies active on Companies House (30.45 item 5). The
 *  UAE and every other country stay off; the database's check on outbound_settings.open_countries says the same. */
export const OPEN_COUNTRIES = ["GB"] as const;
export const TIME_ZONES: Record<string, string> = { GB: "Europe/London" };

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

// The page is examined with plain string searches and short bounded patterns only: no pattern here can slow down on any
// page, however it is written (CodeQL, polynomial ReDoS). At most the first 300 KB are read.
const MAX_EXAMINED = 300_000;
const cap = (html: string) => String(html ?? "").slice(0, MAX_EXAMINED);

const BOOKING_SYSTEMS: [string[], string][] = [
  [["fresha.com", "shedul.com"], "Fresha"], [["booksy.com"], "Booksy"], [["treatwell."], "Treatwell"],
  [["squareup.com/appointments", "square.site/book", "book.squareup"], "Square Appointments"], [["vagaro.com"], "Vagaro"],
  [["gettimely.com"], "Timely"], [["phorest.com"], "Phorest"], [["simplybook.me", "simplybook.it"], "SimplyBook.me"],
  [["setmore.com"], "Setmore"], [["acuityscheduling.com"], "Acuity Scheduling"], [["calendly.com"], "Calendly"],
  [["glossgenius.com"], "GlossGenius"], [["mindbodyonline.com", "mindbody.io"], "Mindbody"], [["zenoti.com"], "Zenoti"],
  [["salonized.com"], "Salonized"], [["styleseat.com"], "StyleSeat"], [["boulevard.io", "joinblvd.com"], "Boulevard"],
  [["opentable.com", "opentable.co.uk"], "OpenTable"], [["resdiary.com"], "ResDiary"], [["sevenrooms.com"], "SevenRooms"],
  [["dentally.co", "dentally.com"], "Dentally"], [["cliniko.com"], "Cliniko"], [["jane.app"], "Jane"],
];

/** The values of href and src attributes, found by scanning, not by a pattern over the whole page. */
function linkValues(html: string): string[] {
  const low = cap(html).toLowerCase();
  const out: string[] = [];
  for (const attr of ["href", "src"]) {
    let at = 0;
    for (;;) {
      const i = low.indexOf(attr, at);
      if (i < 0) break;
      at = i + attr.length;
      let k = at;
      while (low[k] === " " || low[k] === "\t" || low[k] === "\n") k++;
      if (low[k] !== "=") continue;
      k++;
      while (low[k] === " " || low[k] === "\t" || low[k] === "\n") k++;
      const q = low[k] === '"' || low[k] === "'" ? low[k++] : "";
      let e = k;
      while (e < low.length && e - k < 500 && (q ? low[e] !== q : !" \t\n>".includes(low[e]))) e++;
      out.push(low.slice(k, e));
      at = e;
    }
  }
  return out;
}

export function bookingSystem(html: string): string | null {
  const links = linkValues(html);
  for (const [hosts, name] of BOOKING_SYSTEMS) if (links.some((l) => hosts.some((h) => l.includes(h)))) return name;
  return null;
}

const DAY = "(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)(?:day|nesday|sday|urday)?";
// No two optional spaces side by side, so the pattern stays linear on any page.
const TIME = "(?:[01]?\\d|2[0-3])(?:[:.][0-5]\\d)?(?: ?(?:am|pm))?";
const HOURS_RE = new RegExp(`\\b${DAY}\\b[^\\n<]{0,40}?\\b${TIME} ?(?:-|to|until|till|\u2013) ?${TIME}`, "i");

/** The page without its script, style and noscript blocks: a plain scan, not a pattern. The text is only searched for
 *  the address and the detail, never shown or stored. */
export function withoutBlocks(html: string): string {
  const src = String(html ?? "");
  const low = src.toLowerCase();
  let out = "";
  let at = 0;
  for (;;) {
    let next = -1;
    let tag = "";
    for (const t of ["script", "style", "noscript"]) {
      const i = low.indexOf(`<${t}`, at);
      if (i >= 0 && (next < 0 || i < next)) { next = i; tag = t; }
    }
    if (next < 0) return out + src.slice(at);
    out += src.slice(at, next) + " ";
    const end = low.indexOf(`</${tag}`, next);
    if (end < 0) return out;
    const close = low.indexOf(">", end);
    if (close < 0) return out;
    at = close + 1;
  }
}

/** The page as text: tags dropped by a scan, a few entities decoded. Linear in the page's length. */
export function textOf(html: string): string {
  const src = withoutBlocks(cap(html));
  let out = "";
  let inTag = false;
  let tag = "";
  for (const c of src) {
    if (inTag) {
      if (c === ">") {
        inTag = false;
        out += /^\/?(br|p|div|li|tr|h\d)\b/i.test(tag.slice(0, 6)) ? "\n" : " ";
        tag = "";
      } else if (tag.length < 6) tag += c;
    } else if (c === "<") inTag = true;
    else out += c;
  }
  return out
    // &amp; last, so "&amp;#64;" stays the text "&#64;" and is never decoded twice.
    .replace(/&nbsp;/gi, " ").replace(/&#64;|&commat;/gi, "@").replace(/&#46;/g, ".").replace(/&amp;/gi, "&")
    .replace(/[ \t\r\f\v]+/g, " ");
}

export function hasHours(html: string): boolean {
  if (/"openinghours(specification)?"/.test(cap(html).toLowerCase())) return true;
  return HOURS_RE.test(textOf(html));
}

export function instagramLinked(html: string): boolean {
  return linkValues(html).some((l) => {
    const m = /^https?:\/\/(?:www\.)?instagram\.com\/([a-z0-9_.]{2,30})\/?(?:[?#].*)?$/.exec(l.slice(0, 200));
    return !!m && !["p", "explore", "accounts", "kabsi.co", "reel", "stories"].includes(m[1]);
  });
}

/** The site says it changed this year or last: a copyright year, or a dateModified in its structured data. */
export function updatedRecently(html: string, today: Date): boolean {
  const y = today.getUTCFullYear();
  const years: number[] = [];
  for (const m of cap(html).matchAll(/(?:©|&copy;|copyright)[^<\n0-9]{0,20}(20\d\d)(?: ?[-\u2013] ?(20\d\d))?/gi)) {
    years.push(Number(m[2] ?? m[1]));
  }
  for (const m of cap(html).matchAll(/"dateModified": ?"(20\d\d)-/g)) years.push(Number(m[1]));
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
  const raw = cap(html).toLowerCase();
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
    subject: `${possessive(b)} Google profile`,
    body: [
      `Hi ${b} team,`,
      `I came across ${b} looking at ${p.kind} in ${p.city}. ${p.detail}`,
      "I run Kabsi. It prepares your Google review replies, posts and opening hours, and you approve each one on WhatsApp before anything goes live.",
      `Want me to run a free check of ${possessive(b)} Google profile and send you what I find?`,
      SIGNATURE,
      FOOTER,
    ].join("\n\n"),
  };
}

export function followUp(p: { business: string }): Draft {
  return {
    subject: `Re: ${possessive(p.business)} Google profile`,
    body: [
      `Hi again. Happy to run that free check of ${possessive(p.business)} Google profile if useful. A yes is enough, and if not, no worries.`,
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
