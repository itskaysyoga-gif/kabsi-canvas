// Tidy 2 part 3 (master plan 30.49 item 5, R-147): the daily check of Kapso's webhook delivery log for Kabsi's number.
// Read only. Kapso sends every WhatsApp event to Kabsi's `whatsapp` function through a webhook and keeps a log of each
// delivery (the event, its state, the answer Kabsi gave). A delivery that failed means a message or a receipt did not
// reach Kabsi. This reads that log through Kapso's API with the existing Kapso secret (never the Kapso connector, R-49),
// and, when any delivery failed in the last 24 hours, raises one staff alert on WhatsApp (R-64) and one email to
// hello@kabsi.co (9.9), with COUNTS ONLY: no phone number, no message text, no payload, no secret.
// Pure apart from its deps: the tests drive it with recorded rows.

export type Delivery = {
  /** When Kapso made the delivery, as a time (ms since 1970); null when the row carries none Kabsi can read. */
  at: number | null;
  event: string;
  /** Kapso's own word for the state, lower case ("failed", "delivered", ...); "" when it says none. */
  status: string;
  /** The HTTP answer Kabsi's function gave, when Kapso records it. */
  code: number | null;
  hasError: boolean;
  webhookId: string | null;
};

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const text = (v: unknown): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

/** One row of Kapso's delivery list, reduced to the fields this check needs. Names for the same thing differ between
 *  Kapso lists, so each is read from the places it is known to appear. Message text and payloads are never kept. */
export function normalizeDelivery(raw: unknown): Delivery {
  const r = obj(raw);
  const when = [r.created_at, r.last_attempt_at, r.attempted_at, r.delivered_at, r.timestamp, r.inserted_at].map(text).find((t) => t) ?? "";
  const ms = when ? Date.parse(when) : NaN;
  const codeRaw = [r.response_status, r.response_code, r.status_code, r.http_status, obj(r.response).status].find((c) => typeof c === "number");
  const hook = r.webhook_id ?? obj(r.webhook).id;
  return {
    at: Number.isFinite(ms) ? ms : null,
    event: text(r.event ?? r.event_type) || "unknown",
    status: text(r.status ?? r.state).toLowerCase(),
    code: typeof codeRaw === "number" ? codeRaw : null,
    hasError: [r.error, r.error_message, r.last_error].some((e) => (typeof e === "string" ? e.trim() !== "" : !!e)),
    webhookId: text(hook) || null,
  };
}

const FAILED = new Set(["failed", "failure", "error", "errored", "exhausted", "dead", "undelivered", "rejected", "timeout", "timed_out"]);
const GOOD = new Set(["delivered", "success", "succeeded", "ok", "sent", "completed", "complete"]);
const WAITING = new Set(["pending", "retrying", "queued", "scheduled", "in_progress", "processing"]);

export type DeliveryState = "ok" | "failed" | "waiting" | "unknown";

/** Failed: Kapso says so, or Kabsi's function answered with an error code, or an error is recorded and the state is not a good one. */
export function stateOf(d: Delivery): DeliveryState {
  if (FAILED.has(d.status)) return "failed";
  if (d.code !== null && d.code >= 400) return "failed";
  if (GOOD.has(d.status)) return "ok";
  if (WAITING.has(d.status)) return d.hasError ? "failed" : "waiting";
  if (d.hasError) return "failed";
  if (d.code !== null && d.code >= 200 && d.code < 300) return "ok";
  return "unknown";
}

export type DeliverySummary = {
  from: string;
  to: string;
  total: number;
  ok: number;
  failed: number;
  waiting: number;
  unknown: number;
  /** Failed deliveries by event name, and by the HTTP answer Kabsi gave (or "none"). Counts only. */
  failed_by_event: Record<string, number>;
  failed_by_code: Record<string, number>;
  /** Every state word Kapso used, with its count, so a word this code does not know shows up. */
  statuses: Record<string, number>;
  first_failed_at: string | null;
  last_failed_at: string | null;
  /** Rows with no readable time are not counted in the window. */
  undated: number;
};

const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };

/** The rows inside [from, to) as counts. `webhookIds`, when given and not empty, keeps only the deliveries of those webhooks
 *  (the webhooks on Kabsi's number); a row that names no webhook is kept, because the Kapso project holds only Kabsi's. */
export function summarize(rows: Delivery[], from: Date, to: Date, webhookIds?: string[]): DeliverySummary {
  const ids = new Set(webhookIds ?? []);
  const s: DeliverySummary = {
    from: from.toISOString(), to: to.toISOString(), total: 0, ok: 0, failed: 0, waiting: 0, unknown: 0,
    failed_by_event: {}, failed_by_code: {}, statuses: {}, first_failed_at: null, last_failed_at: null, undated: 0,
  };
  let firstFailed: number | null = null;
  let lastFailed: number | null = null;
  for (const d of rows) {
    if (ids.size && d.webhookId && !ids.has(d.webhookId)) continue;
    if (d.at === null) { s.undated += 1; continue; }
    if (d.at < from.getTime() || d.at >= to.getTime()) continue;
    s.total += 1;
    bump(s.statuses, d.status || "none");
    const state = stateOf(d);
    s[state === "ok" ? "ok" : state === "failed" ? "failed" : state === "waiting" ? "waiting" : "unknown"] += 1;
    if (state === "failed") {
      bump(s.failed_by_event, d.event);
      bump(s.failed_by_code, d.code === null ? "none" : String(d.code));
      firstFailed = firstFailed === null ? d.at : Math.min(firstFailed, d.at);
      lastFailed = lastFailed === null ? d.at : Math.max(lastFailed, d.at);
    }
  }
  s.first_failed_at = firstFailed === null ? null : new Date(firstFailed).toISOString();
  s.last_failed_at = lastFailed === null ? null : new Date(lastFailed).toISOString();
  return s;
}

/** Counts per bucket of minutes across the window, for finding the minute deliveries stopped or began to fail. Counts only. */
export function buckets(rows: Delivery[], from: Date, to: Date, minutes: number, webhookIds?: string[]): { start: string; total: number; failed: number }[] {
  const size = minutes * 60_000;
  const out: { start: string; total: number; failed: number }[] = [];
  for (let t = from.getTime(); t < to.getTime(); t += size) {
    const part = summarize(rows, new Date(t), new Date(Math.min(t + size, to.getTime())), webhookIds);
    out.push({ start: new Date(t).toISOString(), total: part.total, failed: part.failed });
  }
  return out;
}

export const DELIVERY_KIND = "whatsapp_check";
export const DELIVERY_EMAIL_KIND = "whatsapp_delivery_check";

export type DeliveryFinding = { item: string; problem: string };

/** The finding for a day's window: only failed deliveries count as a problem (waiting and unknown are reported, not alerted). */
export function deliveryFinding(s: DeliverySummary): DeliveryFinding | null {
  if (s.failed === 0) return null;
  return { item: "webhook deliveries", problem: `${s.failed} of ${s.total} failed in the last 24 hours` };
}

export function deliveryAlertFor(s: DeliverySummary, day: string) {
  const f = deliveryFinding(s);
  if (!f) return null;
  const events = Object.entries(s.failed_by_event).map(([e, n]) => `${e} ${n}`).join(", ");
  return {
    kind: DELIVERY_KIND, channel: "alerts" as const,
    title: `WhatsApp check found 1 item: ${f.item}`,
    body: `${f.item} ${f.problem}${events ? `. Failed: ${events}` : ""}. Check the webhook in Kapso.`,
    dedupe: `whatsapp_deliveries:${day}`,
  };
}

export function deliveryEmailFor(s: DeliverySummary, day: string) {
  const f = deliveryFinding(s);
  if (!f) return null;
  const events = Object.entries(s.failed_by_event).map(([e, n]) => `${e} ${n}`).join(", ");
  const body = `The daily WhatsApp check found that ${f.problem} for Kabsi's number${events ? ` (${events})` : ""}. ` +
    "A failed delivery means a message or a receipt did not reach Kabsi. Check the webhook in Kapso. " +
    "This email is sent as well as the staff alert, because a WhatsApp alert cannot arrive when the number is down.";
  return {
    key: `${DELIVERY_EMAIL_KIND}:${day}`,
    subject: "Kabsi WhatsApp webhook deliveries failed",
    preheader: "Check the webhook in Kapso.",
    title: "WhatsApp webhook deliveries",
    text: body,
    html: `<p>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`,
  };
}

export type DeliveryCheckDeps = {
  /** The deliveries Kapso lists for the period, already reduced by `normalizeDelivery`, and the ids of the webhooks on the number. */
  read(period: "24h" | "7d"): Promise<{ rows: Delivery[]; webhookIds: string[]; truncated: boolean }>;
  emit(a: NonNullable<ReturnType<typeof deliveryAlertFor>>): Promise<void>;
  email(m: NonNullable<ReturnType<typeof deliveryEmailFor>>): Promise<void>;
  now(): Date;
};

export type DeliveryCheckResult = { ok: boolean; day: string; unread: boolean; truncated: boolean; summary: DeliverySummary | null; alert_raised: boolean; email_raised: boolean };

/** The daily check: the last 24 hours. A log that cannot be read is itself a problem (a check that cannot read must not pass),
 *  alerted by the same two routes, with no error text. */
export async function runDeliveryCheck(d: DeliveryCheckDeps): Promise<DeliveryCheckResult> {
  const now = d.now();
  const day = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - 24 * 3_600_000);
  let read: Awaited<ReturnType<DeliveryCheckDeps["read"]>> | null = null;
  try {
    read = await d.read("24h");
  } catch {
    read = null;
  }
  const summary = read ? summarize(read.rows, from, now, read.webhookIds) : null;
  const alert = summary ? deliveryAlertFor(summary, day) : {
    kind: DELIVERY_KIND, channel: "alerts" as const, title: "WhatsApp check found 1 item: webhook delivery log",
    body: "webhook delivery log could not be read from Kapso", dedupe: `whatsapp_deliveries:${day}`,
  };
  const unreadText = "The daily WhatsApp check could not read Kapso's webhook delivery log. Check the webhook in Kapso.";
  const mail = summary ? deliveryEmailFor(summary, day) : {
    key: `${DELIVERY_EMAIL_KIND}:${day}`, subject: "Kabsi WhatsApp webhook deliveries could not be read", preheader: "Check the webhook in Kapso.",
    title: "WhatsApp webhook deliveries", text: unreadText, html: `<p>${unreadText}</p>`,
  };
  // Each route is tried whatever the other does; a failure of either is loud (the call fails) and never hides the other.
  const sent = await Promise.allSettled([alert ? d.emit(alert) : Promise.resolve(), mail ? d.email(mail) : Promise.resolve()]);
  const failed = sent.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) throw failed.reason;
  return { ok: !!summary && summary.failed === 0, day, unread: !read, truncated: !!read?.truncated, summary, alert_raised: !!alert, email_raised: !!mail };
}
