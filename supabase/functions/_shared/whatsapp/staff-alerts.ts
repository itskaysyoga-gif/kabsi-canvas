// Staff alerts on WhatsApp (session 13b part 2; master plan 9.9, 26.9, 30.9 item 5, R-64). Slack is retired: every staff
// alert is a row in public.ops_events (ops_emit), and the WhatsApp tick takes each one once.
//   - Urgent ones go to the staff phone at once: jobs failing, Google errors or access lost, the publication pipeline
//     stuck, the Creem webhook failing, a new paying customer, a cancellation, an owner asking for a person, the Places,
//     DataForSEO and AI budgets (26.9), the nightly smoke test and the backup.
//   - Anything about the WhatsApp number itself goes by email to hello@kabsi.co only, never here (the number may be failing).
//   - Everything else is counted in the one morning digest at 08:00 Beirut, with one-tap buttons.
// Pure: the tick in the whatsapp function reads the rows and sends through the one sender.
import type { Button } from "./channel.ts";
import { houseStyle } from "../ai/fence.ts";

export type OpsEvent = { id: number; kind: string; channel: string; title: string; body: string | null; created_at: string };

const URGENT = new Set([
  // jobs failing above the normal rate, the queue or a cron stalled
  "jobs_silent", "job_failed", "cron_failed", "tick_stalled", "http_errors",
  // Google errors or access lost on any business
  "circuit_open", "access_lost", "google_needs_action", "access_removal_followup",
  // Access 2: Kabsi removed itself from a Google listing nobody consented for (or must be removed by hand)
  "access_stray_listing",
  // the publication pipeline stuck or failing
  "publication_failed", "publication_stuck",
  // money: the Creem webhook failing, a new paying customer, a cancellation
  "billing_alert", "payment", "plan_started", "invoice_paid", "plan_ended",
  // an owner asking for a person
  "whatsapp_handoff", "chat_handoff", "concierge_overdue",
  // budgets (26.9): Places at 80 percent and at the cap, the AI budget
  "places_80", "places_cap", "ai_global_cap",
  // AI Visibility (V2, 27.10): the monthly provider cap at 80 percent and at the cap
  "ai_visibility_80", "ai_visibility_cap",
  // Outbound (Harvey 4A, 30.39): a person replied (no business detail in the alert), or sending stopped
  "outbound_reply", "outbound_stop",
  // the backup. Ready 2 part B: not "smoke_failed". POST /whatsapp/qa/alert already tells the staff phones at once, with
  // the run's address; sending its ops event here as well made two messages for one failure (drill of 7 Nov 2026, 30.25
  // item 5). The event is still counted in the morning digest.
  "backup_failed",
  // Kapso 1: the daily WhatsApp number and template check found something wrong (items and states only)
  "whatsapp_check",
  // Signup 1 (30.50 item 3d): the daily check found Google sign-in switched off in Supabase Auth
  "signin_provider_off",
  // Voice 2 (R-158 item 3): voice notes failing 3 times in a row, and a day passing 60 minutes of transcription
  "voice_failed", "voice_minutes_high",
]);
/** About the number itself: email only (9.9). */
const NUMBER_ONLY = /^whatsapp_number/;

export type Route = "urgent" | "digest" | "email_only";
export function routeOf(e: Pick<OpsEvent, "kind">): Route {
  if (NUMBER_ONLY.test(e.kind)) return "email_only";
  return URGENT.has(e.kind) ? "urgent" : "digest";
}

/** Slack-era titles carry emoji codes and mrkdwn: plain words for WhatsApp, the house style, no links in the template. */
export function plain(text: string | null | undefined, max = 300): string {
  const t = String(text ?? "")
    .replace(/:[a-z0-9_+-]+:/g, "")
    .replace(/<(https?:[^|>]+)\|([^>]+)>/g, "$2")
    .replace(/<(https?:[^>]+)>/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const cut = t.length > max ? `${t.slice(0, max - 3).trimEnd()}...` : t;
  return houseStyle(cut);
}

/** The urgent alert: the title, then the detail, short. The template carries the title only (no links in templates). */
export function alertText(e: OpsEvent): { body: string; summary: string } {
  const title = plain(e.title, 120).replace(/[.:]$/, "");
  const body = plain(e.body, 400);
  return { body: body ? `Kabsi staff alert: ${title}.\n\n${body}` : `Kabsi staff alert: ${title}.`, summary: title };
}

export type Summary = {
  signups: number; trials_started: number; paid_new: number; paid_total: number; cancellations: number; reviews_answered: number;
  replies_waiting: number; handoffs_waiting: number; publications_stuck: number;
  /** Ops 1: the stuck ones by what to do: a publish job is retrying them, Google is checking or needs action, or nothing is working on them. */
  publications_retrying?: number; publications_waiting_google?: number; publications_need_look?: number; jobs_failed: number; errors_by_job: { job: string; n: number }[];
  ai_cost_micros: number; places_today: number; places_cap: number; dataforseo_micros: number; dataforseo_cap_usd: number;
  number_quality: string | null; number_messaging: string | null; alerts_24h: number;
  /** Growth 1: of the businesses whose Manager access began 1 to 30 days ago, how many had a first approved Google action within 24 hours of it. */
  first_action_cohort?: number; first_action_24h?: number;
  /** Voice 2: yesterday's voice notes (the Beirut day before the digest): seconds transcribed, notes, failed requests. */
  voice_seconds_yesterday?: number; voice_notes_yesterday?: number; voice_failures_yesterday?: number;
};

const usd = (micros: number) => `$${(Number(micros) / 1e6).toFixed(2)}`;
const n = (x: unknown) => Number(x ?? 0);
const plural = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
/** Ops 1: "5 publications stuck (3 retrying, 2 waiting for Google, 1 needs a look)": the count and what to do about each part. */
export function stuckText(s: { publications_stuck: number; publications_retrying?: number; publications_waiting_google?: number; publications_need_look?: number }): string {
  const total = n(s.publications_stuck);
  if (!total) return "No publications stuck";
  const parts = [
    n(s.publications_retrying) ? `${n(s.publications_retrying)} retrying` : null,
    n(s.publications_waiting_google) ? `${n(s.publications_waiting_google)} waiting for Google` : null,
    n(s.publications_need_look) ? `${n(s.publications_need_look)} ${n(s.publications_need_look) === 1 ? "needs" : "need"} a look` : null,
  ].filter(Boolean);
  return `${plural(total, "publication", "publications")} stuck${parts.length ? ` (${parts.join(", ")})` : ""}`;
}
const health = (q: string | null, m: string | null) => {
  if (!q) return "number health not read yet";
  const good = ["GREEN", "HIGH"].includes(q.toUpperCase()) && !/BLOCKED/i.test(m ?? "");
  return good ? "number health good" : `number health ${q.toLowerCase()}${m ? `, messaging ${m.toLowerCase()}` : ""}`;
};

/** docs/COPY.md section 20, staff_admin: "Morning. 3 things today: ..." then the numbers, with one-tap buttons. */
export function morningDigest(s: Summary): { body: string; buttons: Button[] } {
  const things = [
    n(s.handoffs_waiting) ? plural(n(s.handoffs_waiting), "person wants to talk to someone", "people want to talk to someone") : null,
    n(s.publications_stuck) ? stuckText(s) : null,
    n(s.replies_waiting) ? plural(n(s.replies_waiting), "reply is waiting for an owner", "replies are waiting for owners") : null,
  ].filter(Boolean) as string[];
  const head = things.length
    ? `Morning. ${plural(things.length, "thing", "things")} today: ${things.join(", ")}, ${health(s.number_quality, s.number_messaging)}.`
    : `Morning. Nothing is waiting for you today, ${health(s.number_quality, s.number_messaging)}.`;
  return { body: `${head}\n\n${numbersText(s)}`, buttons: [{ id: "s:waiting", title: "Waiting" }, { id: "s:status", title: "Status" }, { id: "s:today", title: "Today" }] };
}

/** Growth 1: one honest sentence for the share of new businesses acting within a day of giving access. No percent of nothing. */
export function firstActionText(s: Pick<Summary, "first_action_cohort" | "first_action_24h">): string {
  const cohort = n(s.first_action_cohort);
  if (!cohort) return "First approved action within 24 hours of Manager access: no business to measure yet (access began 1 to 30 days ago).";
  const done = Math.min(n(s.first_action_24h), cohort);
  return `First approved action within 24 hours of Manager access: ${done} of ${cohort} (${Math.round((done / cohort) * 100)} percent), access began 1 to 30 days ago.`;
}

/** Voice 2: "Voice notes yesterday: 12 minutes in 31 notes." The staff alert at 60 minutes a day is in voice_record (migration). */
export function voiceText(s: Pick<Summary, "voice_seconds_yesterday" | "voice_notes_yesterday" | "voice_failures_yesterday">): string {
  const secs = n(s.voice_seconds_yesterday), notes = n(s.voice_notes_yesterday), failed = n(s.voice_failures_yesterday);
  const mins = secs > 0 && secs < 60 ? "under 1 minute" : plural(Math.round(secs / 60), "minute", "minutes");
  return `Voice notes yesterday: ${mins} in ${plural(notes, "note", "notes")}${failed ? `, ${plural(failed, "request", "requests")} failed` : ""}.`;
}

/** The last 24 hours (9.9) and the budgets (26.9): also the answer to "today". */
export function numbersText(s: Summary): string {
  const errors = (s.errors_by_job ?? []).map((e) => `${e.job} ${e.n} (${(n(e.n) / 24).toFixed(1)} an hour)`).join(", ");
  const dfs = n(s.dataforseo_cap_usd) ? `${usd(n(s.dataforseo_micros))} of $${n(s.dataforseo_cap_usd)} this month` : usd(n(s.dataforseo_micros));
  return [
    `Last 24 hours: ${plural(n(s.signups), "new business", "new businesses")}, ${plural(n(s.trials_started), "trial", "trials")} started, ${n(s.paid_new)} newly paid (${n(s.paid_total)} paying), ${plural(n(s.cancellations), "cancellation", "cancellations")}.`,
    `Reviews answered on Google: ${n(s.reviews_answered)}. Replies waiting: ${n(s.replies_waiting)}.`,
    `Jobs failed: ${n(s.jobs_failed)}${errors ? `, most from ${errors}` : ""}.`,
    `AI cost since yesterday: ${usd(n(s.ai_cost_micros))}. Places today: ${n(s.places_today)} of ${n(s.places_cap)}. DataForSEO: ${dfs}.`,
    voiceText(s),
    `Staff alerts in 24 hours: ${n(s.alerts_24h)}.`,
    firstActionText(s),
  ].join("\n");
}

/** The morning digest goes in the 08:00 hour in Beirut, once a day. */
export function digestDue(now: Date): { due: boolean; day: string } {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Beirut", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" })
    .formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { due: Number(get("hour")) === 8, day: `${get("year")}-${get("month")}-${get("day")}` };
}
