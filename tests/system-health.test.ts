// P0.6-11 (K-44 staff part): the rules the System health page uses to say what needs a person first.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { attentionOf, errorTypeLabel, minutesLabel, type Health } from "../src/lib/system-health";

const quiet = (): Health => ({
  checked_at: "2026-10-22T07:00:00Z",
  google: {
    mode: "mock",
    breaker: { state: "closed", opened_at: null, open_until: null, failures_in_window: 0 },
    errors_24h: [],
    rate: [],
    places: { daily_cap: 0, calls_today: 0 },
  },
  sync: { connected: 3, late: 0, worst: [] },
  access_problems: [],
  queue: { pending: 2, running: 0, retrying: 0, due_late: 0, oldest_due_seconds: 20, dead: 0 },
  dead_jobs: [],
  publications: { failed_7d: 0, stuck: [], failed: [] },
  photos: { failed_7d: 0, stuck_checking: 0, recent: [] },
  delivery: {
    emails_failed_24h: 0,
    emails_sent_24h: 9,
    emails_queued_late: 0,
    notices_failed_24h: 0,
    notices_sending_late: 0,
    slack_unsent: 0,
    slack_oldest_unsent_minutes: 0,
    recent_failures: [],
  },
});

describe("what needs attention", () => {
  it("is empty on a quiet system", () => {
    expect(attentionOf(quiet())).toEqual([]);
  });

  it("puts an open breaker, a dead job and a stuck publication first, in red", () => {
    const h = quiet();
    h.google.breaker = { state: "open", opened_at: "x", open_until: "y", failures_in_window: 0 };
    h.queue.dead = 2;
    h.publications.stuck = [
      {
        id: "p",
        business: "B",
        location_id: "l",
        kind: "review_reply",
        route: "api",
        state: "checking",
        since: "z",
        attempts: 1,
        checks: 3,
        error: null,
      },
    ];
    h.sync.late = 1;
    const a = attentionOf(h);
    expect(a.map((x) => x.id)).toEqual(["breaker", "dead", "stuck", "sync"]);
    expect(a.filter((x) => x.level === "red")).toHaveLength(3);
    expect(a[1]!.text).toBe("2 dead jobs to retry or cancel.");
    expect(a[2]!.text).toBe("1 publication is stuck.");
  });

  it("turns red when a job has waited more than 10 minutes, as the monitor does", () => {
    const h = quiet();
    h.queue.oldest_due_seconds = 601;
    expect(attentionOf(h)[0]).toMatchObject({ id: "queue", level: "red" });
    h.queue.oldest_due_seconds = 600;
    expect(attentionOf(h)).toEqual([]);
  });

  it("names the error types plainly and the lag in hours and days", () => {
    expect(errorTypeLabel("rate_limited")).toBe("Rate limited (429)");
    expect(errorTypeLabel("something_new")).toBe("something_new");
    expect(minutesLabel(null)).toBe("never");
    expect(minutesLabel(45)).toBe("45 min");
    expect(minutesLabel(185)).toBe("3 h 5 min");
    expect(minutesLabel(2900)).toBe("2 days");
  });
});

describe("the panel", () => {
  const src = readFileSync("src/components/staff/system-health-panel.tsx", "utf8");
  it("reads and acts only through the staff functions", () => {
    for (const fn of [
      "staff_system_health",
      "staff_job_retry",
      "staff_job_cancel",
      "staff_business_diagnostics",
    ])
      expect(src).toContain(fn);
    expect(src).not.toMatch(/\.from\("(jobs|publications|google_connections)"\)/);
  });
  it("uses no em dashes, en dashes or exclamation marks in its text", () => {
    for (const text of [src, readFileSync("src/lib/system-health.ts", "utf8")]) {
      expect(text).not.toMatch(/[—–]/);
      expect(text.replace(/!==|!=|!\w|!\(|!\)|\w!/g, "")).not.toMatch(/!/);
    }
  });
});
