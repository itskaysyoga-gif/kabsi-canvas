import { describe, expect, it } from "vitest";
import {
  backlogBreakdown,
  backlogCounts,
  cardAction,
  cardRisk,
  checkStrip,
  headline,
  historyLine,
  homeState,
  isBacklogMember,
  isBacklogSummary,
  MAX_CARDS,
  progressLine,
  nextMonday,
  nextReportLine,
  waitingLead,
} from "../src/lib/home-state";
import type { Task } from "../src/lib/tasks";

// P0.3-07: Home is the Action Center (K-06). Two states, at most three cards, a strip that turns amber when the last
// check is older than 6 hours. The screen reads these functions, so the states are held here.
const HOUR = 3_600_000;
const now = Date.parse("2026-10-20T12:00:00Z");
const ago = (ms: number) => new Date(now - ms).toISOString();

const task = (n: number, over: Partial<Task> = {}): Task => ({
  id: `t${n}`,
  kind: "review_reply",
  priority: "recommended",
  title: `Task ${n}`,
  why: "",
  recommendation: null,
  path: "/app/inbox",
  evidence: {},
  created_at: ago(n * HOUR),
  ...over,
});

describe("Home states", () => {
  it("is all clear with no tasks, and profile gaps do not turn it amber", () => {
    const clear = homeState([]);
    expect(clear.kind).toBe("clear");
    expect(headline(0)).toBe("You're all caught up");
    const gaps = homeState([task(1, { kind: "profile_gap", priority: "nice" })]);
    expect(gaps.kind).toBe("clear");
    expect(gaps.gaps).toHaveLength(1);
  });

  it("shows at most three cards and keeps the rest behind See all", () => {
    const s = homeState([1, 2, 3, 4, 5].map((n) => task(n)));
    expect(s.kind).toBe("attention");
    expect(s.cards).toHaveLength(MAX_CARDS);
    expect(s.rest).toHaveLength(2);
    expect(s.total).toBe(5);
    expect(headline(5)).toBe("5 things need your attention");
    expect(headline(1)).toBe("1 thing needs your attention");
    expect(headline(2)).toBe("2 things need your attention");
  });

  it("keeps the order list_tasks gives (urgent first)", () => {
    const s = homeState([task(1, { priority: "urgent" }), task(2), task(3)]);
    expect(s.cards.map((t) => t.id)).toEqual(["t1", "t2", "t3"]);
  });
});

describe("the last-check strip", () => {
  it("is green and says how long ago when the check is fresh", () => {
    const s = checkStrip({
      lastCheckAt: ago(14 * 60_000),
      accessLost: false,
      concierge: false,
      now,
    });
    expect(s.tone).toBe("green");
    expect(s.checked).toBe("Checked 14 minutes ago");
    expect(s.connection).toBe("Google connected");
  });

  it("stays green at 5 hours and turns amber at 7 hours", () => {
    const five = checkStrip({
      lastCheckAt: ago(5 * HOUR),
      accessLost: false,
      concierge: false,
      now,
    });
    expect(five.tone).toBe("green");
    const seven = checkStrip({
      lastCheckAt: ago(7 * HOUR),
      accessLost: false,
      concierge: false,
      now,
    });
    expect(seven.tone).toBe("amber");
    expect(seven.checked).toBe("Last checked 7 hours ago");
  });

  it("is red when access is lost and grey for a business the team looks after", () => {
    expect(
      checkStrip({ lastCheckAt: ago(HOUR), accessLost: true, concierge: false, now }).tone,
    ).toBe("red");
    const c = checkStrip({ lastCheckAt: null, accessLost: false, concierge: true, now });
    expect(c.tone).toBe("grey");
    expect(c.checked).toBeNull();
  });
});

describe("cards", () => {
  it("labels risk only where there is one", () => {
    expect(cardRisk(task(1, { evidence: { risk: "high" } }))?.label).toBe("High risk");
    expect(cardRisk(task(1, { evidence: { risk: "low" } }))).toBeNull();
    expect(cardRisk(task(1, { kind: "post" }))).toBeNull();
  });

  it("gives every card a primary and Later, never a score or points", () => {
    for (const kind of [
      "review_reply",
      "profile_change",
      "post",
      "photo_batch",
      "hours_confirm",
      "reconnect",
    ] as const) {
      const a = cardAction(task(1, { kind }));
      expect(a.primary.length).toBeGreaterThan(0);
      expect(a.secondary).toBe("Later");
    }
  });

  it("writes history in plain words", () => {
    expect(historyLine("approval", "ok", "review_reply")).toBe("You approved it");
    expect(historyLine("publication", "live", "review_reply")).toBe("It is on Google");
    expect(historyLine("something_new", null, null)).toBe("Something new");
  });
});

describe("the day-one backlog card (P0.3-10)", () => {
  const summary = task(1, {
    title: "We found 23 unanswered reviews. Replies are ready.",
    evidence: {
      backlog_summary: true,
      total: 23,
      low: 14,
      other: 7,
      high: 2,
      drafting: 0,
      more_waiting: 0,
      trial: false,
    },
  });
  const member = (n: number) =>
    task(n, { evidence: { review_id: `r${n}`, backlog: true, risk: "low" } });

  it("is one card: the old reviews' own tasks fold into it", () => {
    const s = homeState([summary, ...[2, 3, 4, 5, 6].map(member), task(9, { kind: "post" })]);
    expect(s.kind).toBe("attention");
    expect(s.total).toBe(2);
    expect(s.cards.map((t) => t.id)).toEqual(["t1", "t9"]);
    expect(isBacklogSummary(summary)).toBe(true);
    expect(isBacklogMember(member(2))).toBe(true);
    expect(isBacklogMember(summary)).toBe(false);
  });

  it("counts low risk, to read one by one and needing care", () => {
    const c = backlogCounts(summary);
    expect(c).toMatchObject({ total: 23, low: 14, other: 7, high: 2, trial: false });
    expect(backlogBreakdown(c)).toBe(
      "14 low risk, ready to approve together. 7 to read one by one. 2 need care, with no draft.",
    );
  });

  it("says how far the published replies have got", () => {
    expect(progressLine(14, 23)).toBe("14 of 23 sent to Google");
    expect(progressLine(23, 23)).toBe("All 23 sent to Google");
  });
});

describe("Design 3 Home lines", () => {
  it("counts what waits in the lead line", () => {
    expect(waitingLead(1)).toBe(
      "1 thing needs you. Each one is on WhatsApp too: answer wherever you are.",
    );
    expect(waitingLead(3)).toBe(
      "3 things need you. Each one is on WhatsApp too: answer wherever you are.",
    );
  });
  it("names the next Monday after today, never today", () => {
    // Tuesday 27 October 2026 and Monday 2 November 2026, at noon UTC.
    expect(nextMonday(new Date("2026-10-27T12:00:00Z"), "UTC")).toBe("Monday 2 November");
    expect(nextMonday(new Date("2026-11-02T12:00:00Z"), "UTC")).toBe("Monday 9 November");
    expect(nextReportLine("Monday 2 November")).toBe(
      "Monday 2 November on WhatsApp: what Kabsi did, what waits for your yes, and one next step.",
    );
  });
});
