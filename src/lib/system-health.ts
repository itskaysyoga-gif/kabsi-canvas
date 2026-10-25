// The staff System health page (P0.6-11; K-44 staff part, K-36). Types for the staff-only reads (staff_system_health,
// staff_business_diagnostics) and the few pure rules the page uses: what needs attention, plain names for error types.
// Technical detail for the team, never shown to owners, and never a credential.

export type Health = {
  checked_at: string;
  google: {
    mode: string;
    breaker: {
      state: string;
      opened_at: string | null;
      open_until: string | null;
      failures_in_window: number;
    } | null;
    errors_24h: { type: string; n: number }[];
    rate: { bucket: string; calls_last_minute: number }[];
    places: { daily_cap: number; calls_today: number };
  };
  sync: {
    connected: number;
    late: number;
    worst: {
      location_id: string;
      business: string;
      sync_status: string | null;
      last_ok: string | null;
      lag_minutes: number | null;
      error: string | null;
    }[];
  };
  access_problems: {
    location_id: string;
    business: string;
    access_state: string;
    since: string;
    error: string | null;
  }[];
  queue: {
    pending: number;
    running: number;
    retrying: number;
    due_late: number;
    oldest_due_seconds: number;
    dead: number;
  };
  dead_jobs: {
    id: number;
    kind: string;
    business: string | null;
    location_id: string | null;
    attempts: number;
    max_attempts: number;
    last_error: string | null;
    at: string | null;
  }[];
  publications: {
    failed_7d: number;
    stuck: {
      id: string;
      business: string;
      location_id: string;
      kind: string;
      route: string | null;
      state: string;
      since: string;
      attempts: number | null;
      checks: number | null;
      error: string | null;
    }[];
    failed: {
      id: string;
      business: string;
      location_id: string;
      kind: string;
      state: string;
      at: string;
      error: string | null;
    }[];
  };
  photos: {
    failed_7d: number;
    stuck_checking: number;
    recent: {
      id: string;
      business: string;
      location_id: string;
      state: string;
      reason: string | null;
      at: string;
    }[];
  };
  delivery: {
    emails_failed_24h: number;
    emails_sent_24h: number;
    emails_queued_late: number;
    notices_failed_24h: number;
    notices_sending_late: number;
    alerts_unsent: number;
    alerts_oldest_unsent_minutes: number;
    recent_failures: {
      kind: string;
      status: string;
      at: string;
      to_domain: string | null;
      error: string | null;
    }[];
  };
};

export type Diagnostics = {
  checked_at: string;
  business: {
    id: string;
    name: string;
    status: string;
    onboarding_step: string;
    concierge: boolean;
    country: string | null;
    created_at: string;
  } | null;
  google: {
    access_state: string;
    sync_status: string | null;
    last_successful_sync_at: string | null;
    last_attempted_sync_at: string | null;
    next_sync_at: string | null;
    next_protection_at: string | null;
    voice_of_merchant: boolean | null;
    last_error: string | null;
    has_google_location: boolean;
  } | null;
  jobs: {
    id: number;
    kind: string;
    state: string;
    attempts: number;
    next_run_at: string;
    finished_at: string | null;
    last_error: string | null;
  }[];
  publications: {
    id: string;
    kind: string;
    route: string | null;
    state: string;
    attempts: number | null;
    checks: number | null;
    at: string;
    error: string | null;
  }[];
  reviews: Record<string, number>;
  photos: Record<string, number>;
  emails: { kind: string; status: string; at: string; error: string | null }[];
  audit: { action: string; result: string | null; channel: string | null; at: string }[];
};

/** Plain names for the error types the database sorts Google's messages into (private.google_error_type). */
export const ERROR_TYPE_LABELS: Record<string, string> = {
  rate_limited: "Rate limited (429)",
  google_server_error: "Google server error (5xx)",
  access_denied: "Access denied (401, 403)",
  not_found: "Not found (404)",
  rejected_request: "Request rejected (400)",
  no_answer: "No answer (timeout, network)",
  other: "Other",
};
export const errorTypeLabel = (t: string) => ERROR_TYPE_LABELS[t] ?? t;

export type Attention = { id: string; level: "red" | "amber"; text: string };

/** What needs a person first, most urgent first. Empty means nothing is red or amber. */
export function attentionOf(h: Health): Attention[] {
  const out: Attention[] = [];
  const b = h.google.breaker;
  if (b && b.state !== "closed") {
    out.push({
      id: "breaker",
      level: "red",
      text: `Google calls are paused (circuit breaker ${b.state}${b.open_until ? ", closes at the time shown below" : ""}).`,
    });
  }
  if (h.queue.dead > 0) {
    out.push({
      id: "dead",
      level: "red",
      text: `${h.queue.dead} dead ${h.queue.dead === 1 ? "job" : "jobs"} to retry or cancel.`,
    });
  }
  if (h.publications.stuck.length > 0) {
    out.push({
      id: "stuck",
      level: "red",
      text: `${h.publications.stuck.length} ${h.publications.stuck.length === 1 ? "publication is" : "publications are"} stuck.`,
    });
  }
  if (h.queue.oldest_due_seconds > 600) {
    out.push({
      id: "queue",
      level: "red",
      text: `A job has waited ${Math.round(h.queue.oldest_due_seconds / 60)} minutes (the monitor turns red after 10).`,
    });
  }
  if (h.access_problems.length > 0) {
    out.push({
      id: "access",
      level: "amber",
      text: `${h.access_problems.length} ${h.access_problems.length === 1 ? "business has" : "businesses have"} a Google access problem.`,
    });
  }
  if (h.sync.late > 0) {
    out.push({
      id: "sync",
      level: "amber",
      text: `${h.sync.late} ${h.sync.late === 1 ? "business is" : "businesses are"} late or failing to sync.`,
    });
  }
  if (h.photos.failed_7d > 0 || h.photos.stuck_checking > 0) {
    out.push({
      id: "photos",
      level: "amber",
      text: `${h.photos.failed_7d} photo ${h.photos.failed_7d === 1 ? "failure" : "failures"} in 7 days, ${h.photos.stuck_checking} still being checked after 15 minutes.`,
    });
  }
  const d = h.delivery;
  if (
    d.emails_failed_24h > 0 ||
    d.emails_queued_late > 0 ||
    d.notices_failed_24h > 0 ||
    d.notices_sending_late > 0
  ) {
    out.push({
      id: "delivery",
      level: "amber",
      text: `Email or notice delivery: ${d.emails_failed_24h} emails and ${d.notices_failed_24h} notices failed in 24 hours, ${d.emails_queued_late + d.notices_sending_late} waiting more than 15 minutes.`,
    });
  }
  if (d.alerts_unsent > 0 && d.alerts_oldest_unsent_minutes > 15) {
    out.push({
      id: "alerts",
      level: "amber",
      text: `${d.alerts_unsent} staff ${d.alerts_unsent === 1 ? "alert is" : "alerts are"} not sent to WhatsApp yet, the oldest ${d.alerts_oldest_unsent_minutes} minutes.`,
    });
  }
  return out;
}

/** Minutes as "45 min", "3 h 5 min" or "2 days", for the lag columns. */
export function minutesLabel(m: number | null): string {
  if (m == null) return "never";
  if (m < 60) return `${m} min`;
  if (m < 1440) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return `${Math.floor(m / 1440)} ${Math.floor(m / 1440) === 1 ? "day" : "days"}`;
}
