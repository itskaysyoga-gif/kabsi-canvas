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
/** The eight first tier industries (lane R, R-151 item 5, master plan 30.51) and, for the US only, auto repair and
 *  cleaners (OUTBOUND-3). Harvey's codes as an owner would say them, plural, for "looking at <kind> in <city>". Every
 *  other industry is refused (register.ts rowRefusal "industry"). */
export const KIND_WORDS: Record<string, string> = {
  "hair salon": "hair salons", "barbershop": "barbers", "beauty salon": "beauty salons", "nail salon": "nail salons",
  "lash and brow studio": "lash and brow studios", "spa and massage": "spas and massage studios",
  "restaurant": "restaurants", "cafe": "cafes", "auto repair": "auto repair shops", "cleaners": "cleaners",
};
/** US wording where it differs (US spelling for US recipients). */
const KIND_WORDS_US: Record<string, string> = { "barbershop": "barbershops" };
export function kindWords(industry: string, country: string): string {
  return (country === "US" && Object.hasOwn(KIND_WORDS_US, industry) ? KIND_WORDS_US[industry] : KIND_WORDS[industry]) ?? "";
}
/** The six salon industries, in lane R's order (R-142 decision 4c): the beauty group. */
export const SALON_INDUSTRIES = ["hair salon", "barbershop", "beauty salon", "nail salon", "lash and brow studio", "spa and massage"] as const;
/** The food group (30.50 item 13: food joins the first tier), in the order the queue used before. */
export const FOOD_INDUSTRIES = ["cafe", "restaurant"] as const;
/** The service group, US only (OUTBOUND-3). */
export const SERVICE_INDUSTRIES = ["auto repair", "cleaners"] as const;
/** The order inside each group. The queue takes the groups in turn, one beauty, one food, one service (register.ts ordered). */
export const INDUSTRY_ORDER: string[] = [...SALON_INDUSTRIES, ...FOOD_INDUSTRIES, ...SERVICE_INDUSTRIES];
export type IndustryGroup = "beauty" | "food" | "service";
export function industryGroup(industry: string): IndustryGroup | null {
  if ((SALON_INDUSTRIES as readonly string[]).includes(industry)) return "beauty";
  if ((FOOD_INDUSTRIES as readonly string[]).includes(industry)) return "food";
  if ((SERVICE_INDUSTRIES as readonly string[]).includes(industry)) return "service";
  return null;
}

/** The only countries Outbound may ever write to (OUTBOUND-3, the pilot, the US first): the US (any open business with an
 *  email on its own website's domain, CAN-SPAM) and the UK (registered companies active on Companies House, PECR).
 *  Every other country stays off; the database's check on outbound_settings.open_countries says the same. */
export const OPEN_COUNTRIES = ["US", "GB"] as const;
/** The industries each open country takes. */
export const COUNTRY_INDUSTRIES: Record<string, readonly string[]> = {
  GB: [...SALON_INDUSTRIES, ...FOOD_INDUSTRIES],
  US: [...SALON_INDUSTRIES, ...FOOD_INDUSTRIES, ...SERVICE_INDUSTRIES],
};
export const industryOpen = (industry: string, country: string) =>
  knownIndustry(industry) && (COUNTRY_INDUSTRIES[country] ?? []).includes(industry);
export const TIME_ZONES: Record<string, string> = { GB: "Europe/London" };

/** The time zones a US business may be in (the register's own time_zone column, when Harvey writes one). */
export const US_TIME_ZONES = [
  "America/New_York", "America/Detroit", "America/Indiana/Indianapolis", "America/Kentucky/Louisville", "America/Chicago",
  "America/Denver", "America/Boise", "America/Phoenix", "America/Los_Angeles", "America/Anchorage", "Pacific/Honolulu",
] as const;
/** The time zone of each state that lies in one zone only, for a register row with a state and no time zone. A state
 *  split across zones (FL, IN, KY, MI, TN, TX, KS, NE, ND, SD, ID, OR, AK) is left out: its row needs the register's
 *  own time_zone, or it is refused, so the 9:00 to 17:00 window is always the recipient's own. */
export const US_STATE_ZONES: Record<string, string> = Object.fromEntries([
  ["America/New_York", "CT DE DC GA ME MD MA NH NJ NY NC OH PA RI SC VT VA WV"],
  ["America/Chicago", "AL AR IL IA LA MN MS MO OK WI"],
  ["America/Denver", "CO MT NM UT WY"],
  ["America/Phoenix", "AZ"],
  ["America/Los_Angeles", "CA NV WA"],
  ["Pacific/Honolulu", "HI"],
].flatMap(([zone, states]) => states.split(" ").map((s) => [s, zone])));

/** The time zone of each metro in Harvey's US rows (the `metro` column, FIX-3). Lower-case city names; a row's metro may also
 *  carry the state after a comma ("Houston, TX"), which is ignored. A metro lies in one zone only, so it settles the 9:00 to
 *  17:00 window even where its state is split across zones (Texas, Tennessee, Florida). */
export const US_METRO_ZONES: Record<string, string> = {
  houston: "America/Chicago", dallas: "America/Chicago", nashville: "America/Chicago",
  atlanta: "America/New_York", miami: "America/New_York", tampa: "America/New_York", charlotte: "America/New_York",
  phoenix: "America/Phoenix", denver: "America/Denver", "san diego": "America/Los_Angeles",
};

/** The zone of a metro name, or null when the metro is not one of Harvey's. */
export function metroZone(metro: unknown): string | null {
  const key = String(metro ?? "").split(",")[0].trim().toLowerCase().replace(/\s+/g, " ");
  return Object.hasOwn(US_METRO_ZONES, key) ? US_METRO_ZONES[key] : null;
}

/** Harvey's `us_eligible` column: an explicit no ("false", "0", "no", "n") keeps a US row out; a yes or a blank cell does not
 *  (a register without the column still reads as before). */
export function usEligible(value: unknown): boolean {
  return !/^(false|0|no|n|f)$/i.test(String(value ?? "").trim());
}

/** The recipient's time zone, or null when it cannot be known (the row is then refused). The register's own time_zone comes
 *  first, then the metro (Harvey's US rows), then a state that lies in one zone only. */
export function timeZoneOf(r: { country?: string; time_zone?: string; metro?: string; state?: string; region?: string }): string | null {
  const country = String(r.country ?? "");
  if (country === "GB") return TIME_ZONES.GB;
  if (country !== "US") return null;
  const tz = String(r.time_zone ?? "").trim();
  if ((US_TIME_ZONES as readonly string[]).includes(tz)) return tz;
  const metro = metroZone(r.metro);
  if (metro) return metro;
  const st = String(r.state ?? r.region ?? "").trim().toUpperCase();
  return Object.hasOwn(US_STATE_ZONES, st) ? US_STATE_ZONES[st] : null;
}

// ─── CAN-SPAM (OUTBOUND-3): the sender's valid postal address in every US footer
/** A postal address Kabsi may print in a footer: one line, 10 to 200 characters, with a number, no house style break and
 *  nothing that reads as a link (write "PO Box", not "P.O. Box"). Read from the Supabase secret OUTBOUND_POSTAL_ADDRESS,
 *  which Rashid sets; with none set, no US email is drafted and nothing is sent. */
export function postalAddressOk(address: unknown): address is string {
  if (typeof address !== "string") return false;
  const a = address.trim();
  return a.length >= 10 && a.length <= 200 && !/[\r\n]/.test(a) && /\d/.test(a) && houseStyleOk(a) && linksIn(a).length === 0 &&
    /^[\p{Script=Latin}\p{N}\s#&'.,()\/-]+$/u.test(a);
}
/** The secret's value, trimmed, or null when it is not a valid address. */
export function postalAddress(raw: unknown): string | null {
  if (typeof raw !== "string" || /[\r\n]/.test(raw.trim())) return null;
  const a = raw.trim().replace(/[ \t]+/g, " ");
  return postalAddressOk(a) ? a : null;
}

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

/** The Founding 25 invite link as linksIn sees it (lower-cased): kabsi.co/founding/ and 24 letters and digits. */
const FOUNDING_LINK = /^kabsi\.co\/founding\/[a-z0-9]{24}$/;

/** Email 1 carries only kabsi.co and kabsi.co/privacy; the follow-up may also carry the private Founding 25 invite link
 *  (Outbound 2, R-151); a reply may also carry a kabsi.co page and the Facebook and Instagram addresses from
 *  SOCIAL_LINKS. The same rule as private.outbound_links_ok. */
export function linksOk(body: string, kind: "first" | "follow_up" | "reply"): boolean {
  return linksIn(body).every((l) =>
    kind === "reply"
      ? l === "kabsi.co" || l.startsWith("kabsi.co/") || l.startsWith("www.facebook.com/profile.php?id=") || l.startsWith("www.instagram.com/kabsi.co")
      : l === "kabsi.co" || l === "kabsi.co/privacy" || (kind === "follow_up" && FOUNDING_LINK.test(l))
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
  [["designmynight.com"], "DesignMyNight"], [["tablein.com"], "Tablein"], [["quandoo."], "Quandoo"], [["thefork."], "TheFork"],
  [["dentally.co", "dentally.com"], "Dentally"], [["cliniko.com"], "Cliniko"], [["jane.app"], "Jane"],
  [["getjobber.com", "clienthub.getjobber"], "Jobber"], [["housecallpro.com"], "Housecall Pro"], [["bookingkoala.com"], "BookingKoala"],
  [["launch27.com"], "Launch27"], [["tekmetric.com"], "Tekmetric"], [["shopmonkey.io"], "Shopmonkey"],
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

/** The detail sentences of docs/COPY.md 65. A restaurant or cafe takes table bookings and its Instagram shows its food
 *  (Outbound 2); a US recipient reads "your hours" (OUTBOUND-3, US wording); the other sentences read right for every group. */
export function pickDetail(html: string, today: Date, group: IndustryGroup = "beauty", country = "GB"): Detail | null {
  const system = bookingSystem(html);
  if (system && houseStyleOk(system)) {
    const what = group === "food" ? "table bookings" : "bookings";
    return { kind: "booking", sentence: `I saw you take ${what} through ${system}, so customers find you online already.` };
  }
  if (hasHours(html)) {
    const hours = country === "US" ? "your hours" : "your opening hours";
    return { kind: "hours", sentence: `Your site lists ${hours}, and keeping Google's hours the same saves wasted trips.` };
  }
  if (instagramLinked(html)) {
    const shows = group === "food" ? "your food" : "the work";
    return { kind: "instagram", sentence: `Your Instagram shows ${shows}, and the same photos could do well on your Google profile.` };
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

// ─── the templates (docs/COPY.md section 65, changed by OUTBOUND-3), word for word
export const SIGNATURE = "Rashid Abou Hamzy, founder of Kabsi\nkabsi.co";
export const FOOTER =
  "Why you got this: your business email is on your website. Reply 'no thanks' and I will not write again. How Kabsi handles data: kabsi.co/privacy";
/** The footer for a recipient: a US one adds the sender's postal address (CAN-SPAM). Throws for a US recipient with no
 *  valid address, so no US email is ever built without one. */
export function footerFor(country: string, postal: string | null | undefined): string {
  if (country !== "US") return FOOTER;
  if (!postalAddressOk(postal)) throw new Error("outbound: no postal address for a US footer");
  return `${FOOTER}\nKabsi, ${postal.trim()}`;
}
/** Does this body carry the postal address line a US email needs? */
export const hasPostalLine = (body: string, postal: string | null | undefined) =>
  postalAddressOk(postal) && String(body ?? "").includes(`\nKabsi, ${postal.trim()}`);

/** What Kabsi does for the business's Google profile, in two lines (blueprint 3.1). No price, no claim of results. */
export const WHAT_KABSI_DOES = [
  "I run Kabsi. It looks after your Google profile: a reply ready for every new review, your hours and details kept right, and photos and posts prepared.",
  "Nothing goes live until you approve it on WhatsApp or by email.",
].join("\n");

export type Draft = { subject: string; body: string };

export function emailOne(p: { business: string; kind: string; city: string; detail: string; country?: string; postal?: string | null }): Draft {
  const b = p.business;
  return {
    subject: `${possessive(b)} Google profile`,
    body: [
      `Hi ${b} team,`,
      `I came across ${b} looking at ${p.kind} in ${p.city}. ${p.detail}`,
      WHAT_KABSI_DOES,
      `Want me to run a free check of ${possessive(b)} Google profile and send you what I find?`,
      SIGNATURE,
      footerFor(p.country ?? "GB", p.postal),
    ].join("\n\n"),
  };
}

/** The private founding invite link (R-151), built server side from app_settings founding_invite_slug, only while places
 *  remain (founding_places().left, the count the private page uses). A missing or malformed slug, or no places left,
 *  gives null and the follow-up leaves the line out. Never log the result. */
export function foundingInviteUrl(slug: unknown, left: unknown): string | null {
  if (typeof slug !== "string" || !/^[A-Za-z0-9]{24}$/.test(slug)) return null;
  if (typeof left !== "number" || !Number.isFinite(left) || left <= 0) return null;
  return `kabsi.co/founding/${slug}`;
}

/** The founding line of the follow-up (OUTBOUND-3, blueprint 3.1 founding offer): 19 US dollars a month for the first
 *  12 months, then 29, with the private link. US recipients read dollars the US way. Email 1 never carries a price. */
export const inviteLine = (url: string, country = "GB") =>
  country === "US"
    ? `I also have a few founding places: Kabsi for $19 a month for your first 12 months, then $29. Details: ${url}`
    : `I also have a few founding places: Kabsi for 19 US dollars a month for your first 12 months, then 29. Details: ${url}`;

export function followUp(p: { business: string; invite?: string | null; country?: string; postal?: string | null }): Draft {
  return {
    subject: `Re: ${possessive(p.business)} Google profile`,
    body: [
      `Hi again. Happy to run that free check of ${possessive(p.business)} Google profile if useful. A yes is enough, and if not, no worries.`,
      ...(p.invite ? [inviteLine(p.invite, p.country)] : []),
      SIGNATURE,
      footerFor(p.country ?? "GB", p.postal),
    ].join("\n\n"),
  };
}

/** At send time: a follow-up whose invite link is no longer the current one (places gone, slug rotated or removed)
 *  loses only the line that carries it; every other line of the approved text goes unchanged, and the blank lines left
 *  behind close up to one. */
export function withoutStaleInvite(body: string, current: string | null): string {
  const text = String(body ?? "");
  const lines = text.split("\n");
  const kept = lines.filter((line) => {
    const links = linksIn(line).filter((l) => FOUNDING_LINK.test(l));
    if (!links.length) return true;
    return !!current && links.every((l) => l === current.toLowerCase()) && line.includes(current);
  });
  if (kept.length === lines.length) return text;
  return kept.join("\n").replace(/(?:\r?\n[ \t]*){3,}/g, "\n\n").trim();
}

/** Is this one of the eight first tier industries? Own keys only, so "constructor" or "toString" never pass. */
export const knownIndustry = (industry: string) => Object.hasOwn(KIND_WORDS, String(industry ?? ""));

/** A business name Outbound may write: letters it can print, no house style break, no link. */
export function nameOk(name: string): boolean {
  const n = String(name ?? "").trim();
  return n.length >= 2 && n.length <= 80 && houseStyleOk(n) && /^[\p{Script=Latin}\p{N}\s&'.,()+-]+$/u.test(n) && linksIn(n).length === 0;
}

// ─── the ramp and the window
/** The ramp of R-151 item 5 (master plan 30.51): 5 a day in week 1 (days 1 to 7), then 10 a day from day 8, staying 10
 *  through December; at most 300 a month. 20 a day waits for 400 strong matches and clean delivery (lane R decides).
 *  outbound_settings holds the live values; these are its defaults. */
export const RAMP = { ramp_week1: 5, ramp_week2: 10, ramp_after: 10, monthly_cap: 300 } as const;

/** The day's cap: week 1 from started_on (day 1), week 2, then after. Before started_on (test mode): week 1. */
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

/** The weekdays of the coming week (OUTBOUND-3, approval once a week): on a Monday, this week from today; on any
 *  other day, next Monday to Friday. `from` is a YYYY-MM-DD date. */
export function comingWeek(from: string): string[] {
  const d = new Date(`${from}T12:00:00Z`);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return [0, 1, 2, 3, 4].map((i) => new Date(d.getTime() + i * 86_400_000).toISOString().slice(0, 10));
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
