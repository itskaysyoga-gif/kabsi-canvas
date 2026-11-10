// RB-F (R-139): the commands an owner types to change or read the request book, read by code with no model. Pure: no
// database, network or environment access. The words that name a status come from the pack (words.status) and from a
// short list of everyday words that are the same for every business (here, ready, collected, no show, cancel). Nothing
// here decides whether a change is allowed: the database does (private.rb_rule), and the agent asks first when it says so.
//
// What is read, and nothing else:
//   "3 ready", "ready 3", "here 3 4, ready 2"        status changes by number, several in one message
//   "Ali's car is ready", "Sarah came in"             a status change by name (only when a request has that name)
//   "Sarah confirmed Thursday 3", "confirmed 4"       a customer's confirmation, as staff recording what they were told
//   "Maya booked a trial Monday 6"                    an enquiry that became an appointment or a job
//   "not highlights, a trim", "3 not Corolla, Civic"  a correction of the request touched last, or of that number
//   "undo"                                            the latest change, inside 10 minutes
//   "reopen 4"                                        a closed request back to where it was (asked first)
//   "what's open", "what's unconfirmed", "what's ready", "who asked about a trial this week"
// Anything else is null, and the message goes the way it went before.
import type { Pack } from "./packs/schema.ts";
import { OPEN_STATUSES, OUTCOMES, type Kind } from "./types.ts";
import { normalizeWhen } from "./normalize/dates.ts";
import { normalizeVocabulary } from "./normalize/vocabulary.ts";
import { formatDay } from "./replies/words.ts";

export const COMMANDS_VERSION = 1;

export type Target = { number: number } | { name: string };
/** The key a status item carries for "reopen N": not a status of any kind; the database names the status to go back to. */
export const REOPEN = "reopen";
export type StatusItem = { target: Target; keys: string[] };
export type Since = "today" | "week" | "month";

export type BookCommand =
  | { k: "status"; items: StatusItem[] }
  | { k: "confirm"; target: Target; when: string | null }
  | { k: "convert"; name: string; rest: string }
  | { k: "correct"; number: number | null; from: string; to: string }
  | { k: "undo" }
  | { k: "open"; keys: string[] | null }
  | { k: "unconfirmed" }
  | { k: "asked"; about: string; since: Since | null };

/**
 * Everyday words for a status, the same for every business. Each names status keys in order of preference; the first key
 * the request's kind has is the one used ("here" is In for a job and Came in for an appointment).
 */
const EVERYDAY: [string, string[]][] = [
  ["not ready", ["active"]],
  ["here", ["active", "attended"]], ["is here", ["active", "attended"]], ["arrived", ["active", "attended"]],
  ["has arrived", ["active", "attended"]], ["dropped off", ["active"]], ["started", ["active"]],
  ["ready", ["ready"]], ["is ready", ["ready"]], ["done", ["ready", "attended"]], ["finished", ["ready", "attended"]],
  ["collected", ["completed"]], ["picked up", ["completed"]], ["gone", ["completed"]],
  ["came", ["attended"]], ["came in", ["attended"]], ["showed up", ["attended"]], ["attended", ["attended"]],
  ["no show", ["no_show"]], ["noshow", ["no_show"]], ["did not come", ["no_show"]], ["didnt come", ["no_show"]],
  ["did not show", ["no_show"]], ["didnt show", ["no_show"]], ["missed", ["no_show"]],
  // RB-T: an enquiry cannot be cancelled; "cancel" on an enquiry closes it as lost (asked first, like every ending).
  ["cancel", ["cancelled", "lost"]], ["cancelled", ["cancelled", "lost"]], ["canceled", ["cancelled", "lost"]],
  ["contacted", ["contacted"]], ["called back", ["contacted"]],
  ["lost", ["lost"]], ["not interested", ["lost"]],
];

/** Every phrase that names a status at this business: the pack's own words first, then the everyday ones. */
export function statusPhrases(pack: Pack): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (phrase: string, keys: string[]) => {
    const p = clean(phrase);
    if (!p) return;
    const have = out.get(p) ?? [];
    out.set(p, [...have, ...keys.filter((k) => !have.includes(k))]);
  };
  for (const kind of pack.kinds) {
    for (const [key, word] of Object.entries(pack.words.status[kind] ?? {})) {
      if (key === "voided" || key === "converted") continue;
      add(word, [key]);
    }
  }
  for (const [p, keys] of EVERYDAY) add(p, keys);
  return out;
}

/** The move a status key means for a request of this kind, or null when that kind has no such status. */
export function statusFor(kind: Kind, keys: string[]): { to: string; outcome: string | null } | null {
  for (const key of keys) {
    if (OPEN_STATUSES[kind].includes(key)) return { to: key, outcome: null };
    if (OUTCOMES[kind].includes(key) && key !== "voided" && key !== "converted") return { to: "closed", outcome: key };
  }
  return null;
}

/** Lower case, the usual apostrophes, single spaces, no full stop or question mark at the end. Never shown to anyone. */
export function clean(text: string): string {
  return text.replace(/[\u2018\u2019\u02bc`]/g, "'").toLowerCase().replace(/\s+/g, " ").trim().replace(/[.?!]+$/, "").trim();
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NUM = String.raw`#?\d{1,9}`;
const NUMS = String.raw`${NUM}(?:\s*(?:,|&|and)?\s*${NUM})*`;
const numbersOf = (s: string) => [...s.matchAll(/\d{1,9}/g)].map((m) => Number(m[0])).filter((n) => n > 0);
// Words that are never a customer's name in these forms.
const NOT_A_NAME = new Set(["it", "he", "she", "they", "we", "i", "you", "this", "that", "the", "all", "everyone", "everything", "what",
  "who", "which", "whats", "what's", "nothing", "someone", "somebody", "anyone", "kabsi", "request", "requests", "number", "im", "i'm",
  "ok", "okay", "my", "our", "your", "his", "her", "their", "thats", "that's", "its", "it's", "car", "mum", "mom", "dad", "we're", "were",
  "all", "so", "and", "then", "now", "today", "here", "there", "yes", "no", "not", "just", "well"]);
// After a name and 's: words that are another person, so "sarah's mum is here" is not about Sarah.
const NOT_THEIRS = new Set(["mum", "mom", "dad", "mother", "father", "sister", "brother", "husband", "wife", "friend", "son", "daughter",
  "kid", "kids", "child", "children", "baby", "boyfriend", "girlfriend", "partner", "cousin", "aunt", "uncle"]);

/**
 * Does a customer's name fit the name typed? Every word typed must be a whole word of the name ("Sam" is not Samira, and
 * "Sarah K" fits "Sarah Khan" by the start of a word only for a single letter). The database's search is wider; this narrows it.
 */
export function nameFits(customer: string | null, typed: string): boolean {
  if (!customer) return false;
  const have = clean(customer).split(/[^a-z0-9']+/).filter(Boolean).map((x) => x.replace(/'s$/, ""));
  return clean(typed).split(" ").filter(Boolean).every((t) => have.some((h) => h === t || (t.length === 1 && h.startsWith(t))));
}
const NAME = String.raw`([a-z][a-z' ]{0,40}?)`;

function nameOf(raw: string): string | null {
  const n = raw.replace(/'s$/, "").trim();
  if (!n || n.length < 2 || n.split(" ").length > 3 || NOT_A_NAME.has(n) || NOT_A_NAME.has(n.split(" ")[0]!)) return null;
  return n;
}

function statusClause(c: string, phraseRe: string, phrases: Map<string, string[]>): StatusItem[] | null {
  const keys = (p: string) => phrases.get(clean(p)) ?? null;
  const a = new RegExp(`^(${phraseRe})\\s+(${NUMS})$`).exec(c);
  if (a && keys(a[1]!)) return numbersOf(a[2]!).map((n) => ({ target: { number: n }, keys: keys(a[1]!)! }));
  const b = new RegExp(`^(${NUMS})\\s+(?:is\\s+)?(${phraseRe})$`).exec(c);
  if (b && keys(b[2]!)) return numbersOf(b[1]!).map((n) => ({ target: { number: n }, keys: keys(b[2]!)! }));
  // A name, then the status: "ali's car is ready", "sarah came in", "maya not interested".
  const n = new RegExp(`^${NAME}(?:'s(?:\\s+([a-z]+))?)?\\s+(?:(?:is|was|has|just|now)\\s+)*(${phraseRe})$`).exec(c);
  if (n && keys(n[3]!) && !(n[2] && NOT_THEIRS.has(n[2]))) {
    const name = nameOf(n[1]!);
    if (name) return [{ target: { name }, keys: keys(n[3]!)! }];
  }
  return null;
}

/** Strips "a", "an" and "the" from the front, as owners write them ("a trim"). */
export const bare = (s: string) => s.replace(/^(?:a|an|the|some)\s+/, "").trim();

/** The kinds of this business in plural, lower case ("appointments", "visits"), for the list questions. */
const plurals = (pack: Pack) => pack.kinds.map((k) => pack.words.kinds[k]?.plural.toLowerCase()).filter((x): x is string => !!x).map(esc);

/** One message read into one command, or null when it is not one the request book reads. */
export function parseBookCommand(text: string, pack: Pack): BookCommand | null {
  const c = clean(text);
  if (!c || c.length > 300) return null;
  if (/^undo(?: (?:that|it|last|the last one))?$/.test(c)) return { k: "undo" };
  // RB-T: "reopen 4" puts a closed request back where it was. The database decides where, and the owner is asked first.
  const ro = /^reopen\s+(?:request\s+)?(#?\d{1,9})$/.exec(c);
  if (ro) return { k: "status", items: [{ target: { number: numbersOf(ro[1]!)[0]! }, keys: [REOPEN] }] };

  // Lists and questions about what is open. No model for the usual phrases.
  const kp = plurals(pack).join("|");
  if (new RegExp(`^(?:what'?s|what is|whats|show(?: me)?|anything)\\s+(?:still\\s+)?open(?:\\s+(?:${kp}|requests))?$`).test(c) ||
    new RegExp(`^(?:what|which)\\s+(?:${kp}|requests)\\s+are\\s+(?:still\\s+)?open$`).test(c)) return { k: "open", keys: null };
  if (new RegExp(`^(?:(?:what'?s|what is|whats|who'?s|who is|which|what|any)\\s+)?(?:(?:${kp}|requests)\\s+(?:are|is)\\s+)?(?:still\\s+)?(?:unconfirmed|not confirmed)$`).test(c)) {
    return { k: "unconfirmed" };
  }
  const asked = /^who\s+(?:has\s+)?(?:asked|enquired|inquired|called|messaged)\s+(?:about|for)\s+(.+?)(?:\s+(this week|today|this month|recently|lately))?$/.exec(c);
  if (asked) {
    const about = bare(asked[1]!);
    if (!about || about.length > 60) return null;
    const s = asked[2];
    return { k: "asked", about, since: s === "today" ? "today" : s === "this month" ? "month" : s ? "week" : null };
  }

  const phrases = statusPhrases(pack);
  const phraseRe = [...phrases.keys()].sort((x, y) => y.length - x.length).map(esc).join("|");
  // "what's ready", "who's here": the everyday words only, never a pack word such as New ("what's new" is a greeting).
  const everyday = EVERYDAY.map(([p]) => p).sort((x, y) => y.length - x.length).map(esc).join("|");
  const what = new RegExp(`^(?:what'?s|what is|whats|who'?s|who is|what are|which are)\\s+(?:still\\s+)?(${everyday})$`).exec(c);
  if (what) {
    const keys = (phrases.get(what[1]!) ?? []).filter((k) => Object.values(OPEN_STATUSES).some((l) => l.includes(k)));
    if (keys.length) return { k: "open", keys };
  }

  // A correction: "not X, Y", "not X but Y", "3 not X, Y".
  const cor = /^(?:#?(\d{1,9})\s*[:,]?\s+)?not\s+(.+?)\s*(?:,|;|\s+but\s+|\s+it'?s\s+|\s+its\s+|\s+should be\s+)\s*(.+)$/.exec(c);
  if (cor) {
    const from = bare(cor[2]!), to = bare(cor[3]!.replace(/^(?:it'?s|its)\s+/, ""));
    if (from && to && from !== to && from.length <= 80 && to.length <= 80) return { k: "correct", number: cor[1] ? Number(cor[1]) : null, from, to };
  }

  // A customer's confirmation, recorded by staff: "sarah confirmed thursday 3", "4 confirmed", "confirmed 4".
  const cf = new RegExp(`^(?:(${NUM})|${NAME})(?:'s)?\\s+(?:has\\s+|just\\s+)?confirmed(?:\\s+(?:for\\s+|at\\s+|on\\s+)?(.+))?$`).exec(c)
    ?? /^confirmed\s+(#?\d{1,9})(?:\s+(?:for\s+|at\s+|on\s+)?(.+))?$/.exec(c);
  if (cf) {
    const isFirstForm = cf.length === 4;
    const num = cf[1] ? numbersOf(cf[1])[0] : undefined;
    const name = isFirstForm && cf[2] ? nameOf(cf[2]) : null;
    const when = (isFirstForm ? cf[3] : cf[2]) ?? null;
    if (num) return { k: "confirm", target: { number: num }, when };
    if (name) return { k: "confirm", target: { name }, when };
  }

  // An enquiry that became an appointment or a job: "maya booked a trial monday 6".
  const cv = new RegExp(`^${NAME}\\s+(?:has\\s+|just\\s+)?(?:booked|signed up for|wants to book|is booking)\\s+(.+)$`).exec(c);
  if (cv) {
    const name = nameOf(cv[1]!);
    if (name) return { k: "convert", name, rest: cv[2]! };
  }

  // Status changes, one or several in one message ("here 3 4, ready 2"). Every part must read, or none does.
  const parts = c.split(/\s*[;\n]\s*|\s*,\s*(?=[a-z#])|\s+and\s+(?=[a-z])/).filter(Boolean);
  const items: StatusItem[] = [];
  for (const p of parts) {
    // "here 3, 4": a part that is only numbers carries on the part before it.
    if (new RegExp(`^${NUMS}$`).test(p) && items.length && "number" in items[items.length - 1]!.target) {
      const keys = items[items.length - 1]!.keys;
      for (const n of numbersOf(p)) items.push({ target: { number: n }, keys });
      continue;
    }
    const got = statusClause(p, phraseRe, phrases);
    if (!got) return null;
    items.push(...got);
  }
  if (!items.length || items.length > 6) return null;
  // A name stands alone: "sarah came in, ali ready" is two names and is read one by one, so only one name per message.
  if (items.filter((i) => "name" in i.target).length > 1) return null;
  return { k: "status", items };
}

// --- Times in a command. Code reads them; a bare hour the pack usually means as the afternoon is a guess with one tap.

export type Readings =
  | { k: "none" }
  | { k: "window"; text: string }
  | { k: "one"; startsAt: string }
  | { k: "guess"; startsAt: string; label: string }
  | { k: "choose"; readings: { startsAt: string; label: string }[] };

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayName = (ymd: string) => WD[new Date(`${ymd}T12:00:00Z`).getUTCDay()] ?? "";
export const hour12 = (time: string) => {
  const h = Number(time.slice(0, 2)), m = time.slice(3, 5);
  return `${h % 12 || 12}${m !== "00" ? `:${m}` : ""} ${h < 12 ? "am" : "pm"}`;
};

/** The day and hour written in a command, as code reads them against the message time and the business's zone. */
export function readWhen(text: string, pack: Pack, ctx: { now: Date; timeZone: string }): Readings {
  const w = normalizeWhen(text, ctx);
  if (w.status === "unknown") return { k: "none" };
  if (w.status === "ok") return w.startsAt ? { k: "one", startsAt: w.startsAt } : { k: "window", text: w.raw };
  const every = w.candidates.filter((x) => x.startsAt && x.date && x.time) as { date: string; time: string; startsAt: string }[];
  if (every.length !== w.candidates.length || every.length < 2) return { k: "window", text: w.raw };
  // A reading already in the past is set aside when a later one remains ("Monday 6" said on a Monday evening is next Monday).
  const later = every.filter((x) => Date.parse(x.startsAt) > ctx.now.getTime());
  let all = later.length ? later : every;
  // More readings than buttons (the weekday is today and next week): the nearest day is the one meant.
  if (all.length > 3) {
    const first = [...all].sort((x, y) => x.date.localeCompare(y.date))[0]!.date;
    all = all.filter((x) => x.date === first);
  }
  // The date goes on the button only when the readings fall on different days.
  const days = new Set(all.map((x) => x.date)).size > 1;
  const label = (x: { date: string; time: string }) => `${days ? formatDay(x.date) : dayName(x.date)} ${hour12(x.time)}`;
  // likely_pm_hours (RB-D): the morning reading of an hour the business usually means as the afternoon is set aside.
  const pm = pack.likely_pm_hours ?? [];
  // The words still had two readings: one left after the past is set aside is a guess, and the owner taps it.
  if (all.length === 1) {
    // Only the hour was in doubt (no am or pm): a tap. Only the day was (a weekday said on that day, with pm): applied.
    const a = all[0]!;
    const hourTwin = every.some((x) => x !== a && x.time.slice(3) === a.time.slice(3) && Math.abs(Number(x.time.slice(0, 2)) - Number(a.time.slice(0, 2))) === 12);
    return hourTwin ? { k: "guess", startsAt: a.startsAt, label: `${dayName(a.date)} ${hour12(a.time)}` } : { k: "one", startsAt: a.startsAt };
  }
  if (all.length === 2 && all[0]!.date === all[1]!.date) {
    const [am, later] = [...all].sort((x, y) => x.time.localeCompare(y.time));
    const h = Number(am!.time.slice(0, 2));
    if (pm.includes(h) && Number(later!.time.slice(0, 2)) === h + 12) return { k: "guess", startsAt: later!.startsAt, label: label(later!) };
  }
  if (all.length > 3) return { k: "window", text: w.raw };
  return { k: "choose", readings: all.map((x) => ({ startsAt: x.startsAt, label: label(x) })) };
}

/** The service labels the pack knows in some words, joined, or null. */
export function servicesIn(text: string, pack: Pack): { keys: string[]; labels: string[] } {
  const v = normalizeVocabulary(text, pack);
  if (v.status !== "ok") return { keys: [], labels: [] };
  return { keys: v.matches.map((m) => m.key), labels: [...new Set(v.matches.map((m) => m.label))] };
}

// --- Corrections. Code finds the words in the request and changes only them.

export type Editable = { customer_name: string | null; summary: string; details: Record<string, unknown> | null };
export type Correction = { changes: Record<string, unknown>; shown: { field: string; before: string; after: string } };

const capital = (like: string, s: string) => (like[0] && like[0] !== like[0].toLowerCase() ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function swap(value: string, from: string, to: string): string | null {
  const i = value.toLowerCase().indexOf(from.toLowerCase());
  if (i < 0) return null;
  const before = value.slice(0, i), after = value.slice(i + from.length);
  // Whole words only: "trim" inside "trimming" is not the word that was meant.
  if (/[a-z0-9]$/i.test(before) || /^[a-z0-9]/i.test(after)) return null;
  return `${before}${capital(value.slice(i, i + from.length), to)}${after}`;
}

/**
 * "not X, Y" on one request: the first place X is written (a detail the pack names, then what it is for, then the name)
 * becomes Y. What it is for keeps the pack's service labels: "not highlights, a trim" is Highlights to the label of trim.
 * Null when X is not written on the request.
 */
export function correction(pack: Pack, r: Editable, from: string, to: string): Correction | null {
  const details = r.details ?? {};
  for (const f of pack.fields.filter((x) => x.target === "details")) {
    const v = details[f.key];
    if (typeof v !== "string") continue;
    const next = swap(v, from, to);
    if (next !== null && next !== v) return { changes: { details: { ...details, [f.key]: next } }, shown: { field: f.key, before: v, after: next } };
  }
  const fromS = servicesIn(from, pack), toS = servicesIn(to, pack);
  if (fromS.labels.length && toS.labels.length) {
    let next = r.summary;
    for (const l of fromS.labels) next = swap(next, l, toS.labels.join(" and ")) ?? next;
    if (next !== r.summary) return { changes: { summary: next }, shown: { field: "summary", before: r.summary, after: next } };
  }
  const s = swap(r.summary, from, to);
  if (s !== null && s !== r.summary) return { changes: { summary: s }, shown: { field: "summary", before: r.summary, after: s } };
  if (r.customer_name) {
    const n = swap(r.customer_name, from, to);
    if (n !== null && n !== r.customer_name) return { changes: { customer_name: n }, shown: { field: "customer_name", before: r.customer_name, after: n } };
  }
  return null;
}

// --- A job that is already here when it is written down ("Ali Corolla brakes, car's here").

/** True when the owner's own words say the customer or their item is already in. Read by code, never guessed. */
export function saysArrived(text: string): boolean {
  return /(?:^|[\s,.;])(?:(?:[a-z]+'s|it'?s|is|are|now)\s+here|arrived|dropped (?:it )?off|already in)(?=$|[\s,.;])/.test(clean(text));
}
