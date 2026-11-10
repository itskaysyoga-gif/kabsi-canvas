// Words and small formats for replies. Every word an owner reads for a kind, a status or a field comes from the pack;
// the few words here are the same for every business. A word that claims a fact (confirmed) is written by code, from
// the record, in confirmationText below, and nowhere else.
import type { Pack } from "../packs/schema.ts";
import type { Kind, RequestRow } from "../types.ts";

/** The most rows a list shows. The database already returns at most this many and counts the rest. */
export const MAX_ROWS = 15;
/** WhatsApp limits the text of a message with buttons. */
export const BUTTON_BODY_MAX = 1024;
/** WhatsApp limits a plain text message. */
export const TEXT_BODY_MAX = 4096;
/** WhatsApp limits the title of a reply button. */
export const BUTTON_TITLE_MAX = 20;
export const MAX_BUTTONS = 3;

/** Every list and every answer to a question about what is open says this. */
export const COVERS_NOTE = "This covers only what was entered in Kabsi.";

export type ReplyContext = { pack: Pack; timeZone: string; now: Date };

const humanise = (code: string) => {
  const t = code.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function kindWord(pack: Pack, kind: Kind, plural = false): string {
  const w = pack.words.kinds[kind];
  if (w) return plural ? w.plural : w.singular;
  return plural ? "Requests" : "Request";
}

/** The word for a status or outcome key of a kind. A key the pack has no word for is shown plainly, never invented. */
export function statusKeyWord(pack: Pack, kind: Kind, key: string): string {
  return pack.words.status[kind]?.[key] ?? humanise(key);
}

/** What the request is now: its open status, or how it closed. */
export function statusWord(pack: Pack, row: Pick<RequestRow, "kind" | "status" | "outcome">): string {
  return statusKeyWord(pack, row.kind, row.status === "closed" ? (row.outcome ?? "closed") : row.status);
}

export const clip = (text: string, max: number): string => (text.length <= max ? text : `${text.slice(0, Math.max(0, max - 3)).trimEnd()}...`);

const MONTH_DAY = (parts: Intl.DateTimeFormatPart[], t: string) => parts.find((p) => p.type === t)?.value ?? "";

/** "Thu 10 Nov 15:00", or "Today 15:00" and "Tomorrow 10:00", in the business's time zone. Empty when the zone or time is not valid. */
export function formatWhen(iso: string, timeZone: string, now: Date): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime()) || Number.isNaN(now.getTime())) return "";
  try {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(at);
    const time = `${MONTH_DAY(p, "hour")}:${MONTH_DAY(p, "minute")}`;
    const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
    // Calendar days in the business's zone: tomorrow is the next date on its calendar, not 24 hours on.
    const today = dayKey(now);
    const [y, m, d] = today.split("-").map(Number) as [number, number, number];
    const tomorrow = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
    const key = dayKey(at);
    if (key === today) return `Today ${time}`;
    if (key === tomorrow) return `Tomorrow ${time}`;
    return `${MONTH_DAY(p, "weekday")} ${MONTH_DAY(p, "day")} ${MONTH_DAY(p, "month")} ${time}`;
  } catch {
    return "";
  }
}

/** The time of a request: the set time, or the words the customer used with a plain note that no time is set. */
export function whenText(row: Pick<RequestRow, "starts_at" | "requested_window_text">, ctx: ReplyContext): string | null {
  if (row.starts_at) return formatWhen(row.starts_at, ctx.timeZone, ctx.now) || null;
  if (row.requested_window_text) return `${clip(row.requested_window_text, 60)}, no time set`;
  return null;
}

/**
 * The two confirmations of an appointment, written only from what the record holds. "Confirmed by" appears only for a
 * confirmation that is recorded; what is missing is named, so the owner knows which one to chase. Customer
 * confirmation is always staff recording what the customer told them, and the text says so.
 */
export function confirmationText(row: Pick<RequestRow, "kind" | "status" | "staff_confirmed" | "customer_confirmed">, pack: Pack): string | null {
  if (row.kind !== "appointment" || row.status === "closed") return null;
  const staff = pack.words.staffSide;
  const customer = `the ${pack.words.customer.singular}`;
  const held: string[] = [];
  if (row.staff_confirmed) held.push(`Confirmed by ${staff}`);
  if (row.customer_confirmed) held.push(`Confirmed by ${customer}, as told to staff`);
  const missing: string[] = [];
  if (!row.staff_confirmed) missing.push(staff);
  if (!row.customer_confirmed) missing.push(customer);
  if (missing.length === 0) return held.join(". ");
  const need = `Still needs confirmation from ${missing.join(" and from ")}`;
  return held.length ? `${held.join(". ")}. ${need}` : `Needs confirmation from ${missing.join(" and from ")}`;
}

/** The short form for a list line: what is held, then what is missing, each named. Customer confirmation is staff recording what the customer said. */
export function confirmationShort(row: Pick<RequestRow, "kind" | "status" | "staff_confirmed" | "customer_confirmed">, pack: Pack): string | null {
  if (row.kind !== "appointment" || row.status === "closed") return null;
  const staff = pack.words.staffSide;
  const customer = `the ${pack.words.customer.singular}`;
  const parts: string[] = [];
  if (row.staff_confirmed) parts.push(`Confirmed by ${staff}`);
  if (row.customer_confirmed) parts.push(`Confirmed by ${customer}, as told to staff`);
  const missing: string[] = [];
  if (!row.staff_confirmed) missing.push(staff);
  if (!row.customer_confirmed) missing.push(customer);
  if (missing.length) parts.push(`Needs confirmation from ${missing.join(" and from ")}`);
  return parts.join(" \u00b7 ");
}

/** "Thu 12 Nov" for a plain calendar date (YYYY-MM-DD), which has no time zone. */
export function formatDay(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" }).formatToParts(d);
  return `${MONTH_DAY(p, "weekday")} ${MONTH_DAY(p, "day")} ${MONTH_DAY(p, "month")}`;
}

/**
 * RB-F2: a day and a part of the day that the date reader understood, with no exact hour, in its clean form: "Thursday
 * afternoon", "Tomorrow morning", "Today". A day more than 6 days away keeps its date ("Thu 26 Nov afternoon").
 */
export function windowLabel(date: string | null, dayPart: string | null, ctx: Pick<ReplyContext, "timeZone" | "now">): string {
  const part = dayPart ?? "";
  if (!date) return part ? part[0]!.toUpperCase() + part.slice(1) : "";
  let day = formatDay(date);
  try {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: ctx.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(ctx.now);
    const gap = Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
    if (gap === 0) day = "Today";
    else if (gap === 1) day = "Tomorrow";
    else if (gap > 1 && gap <= 6) day = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" }).format(new Date(`${date}T12:00:00Z`));
  } catch {
    // An unknown zone keeps the plain date.
  }
  return part ? `${day} ${part}` : day;
}

/** RB-F2: what the owner wrote about when, kept because the date reader could not read it, shown as written and never as read. */
export const asWritten = (words: string): string => `"${words}" (as written)`;

/** The label of a request field as the pack names it, or a plain label for the fields every business has. */
export function fieldLabel(pack: Pack, field: string): string {
  const byTarget: Record<string, string> = { summary: "summary", customer_name: "customer_name", requested_window_text: "when", starts_at: "when", ends_at: "when" };
  const target = byTarget[field];
  if (target) {
    const f = pack.fields.find((x) => x.target === target);
    if (f) return f.label.toLowerCase();
  }
  const d = pack.fields.find((x) => x.target === "details" && x.key === field);
  if (d) return d.label.toLowerCase();
  const plain: Record<string, string> = {
    summary: "summary", customer_name: "name", requested_window_text: "when", starts_at: "time", ends_at: "end time",
    next_action: "next step", next_action_due_at: "next step due", follow_up_user_id: "follow up by", origin_channel: "came in through",
    external_system: "reference system", external_id: "reference", details: "details",
  };
  return plain[field] ?? field.replace(/_/g, " ");
}
