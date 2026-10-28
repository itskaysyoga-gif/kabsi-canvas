import { describe, expect, it } from "vitest";
import * as server from "../supabase/functions/_shared/email/report-body";
import * as client from "../src/lib/date-range";
import { receiptText } from "../supabase/functions/_shared/results-report/receipt";
import { starRow } from "../supabase/functions/_shared/email/review";

// Eval 1: the Results Report's dates read "19 to 25 October" within a month and "28 October to 3 November" across months,
// the same in the email (subject, title, preheader), on WhatsApp and on the Reports page.
describe("Results Report date ranges (Eval 1)", () => {
  const cases: [{ from: string; to: string }, string][] = [
    [{ from: "2026-10-19", to: "2026-10-25" }, "19 to 25 October"],
    [{ from: "2026-10-28", to: "2026-11-03" }, "28 October to 3 November"],
    [{ from: "2026-12-28", to: "2027-01-03" }, "28 December to 3 January"],
    [{ from: "Oct 19", to: "Oct 26" }, "Oct 19 to Oct 26"],
  ];
  it("reads the same on the server and on the page", () => {
    for (const [p, want] of cases) {
      expect(server.dateRange(p)).toBe(want);
      expect(client.dateRange(p)).toBe(want);
    }
  });

  it("the WhatsApp report line starts with the week", () => {
    const base = {
      business: "Rose Lane Salon",
      waiting: 0,
      next: null,
      google: null,
      growth: null,
      ai: null,
      rival: null,
    };
    expect(
      receiptText({
        ...base,
        dates: "19 to 25 October",
        did: [{ key: "replies", label: "Replies sent to Google", count: 3 }],
      }),
    ).toMatch(/^Rose Lane Salon, 19 to 25 October\. Kabsi did: replies sent to Google 3\./);
    expect(receiptText({ ...base, dates: "28 October to 3 November", did: [] })).toMatch(
      /^Rose Lane Salon, 28 October to 3 November: a quiet week\./,
    );
  });
});

describe("the review email's rating (Eval 1)", () => {
  it("shows five star characters, read out as n of 5 stars", () => {
    expect(starRow(5)).toContain('aria-label="5 of 5 stars"');
    expect(starRow(5)).toContain(">★★★★★<");
    expect(starRow(2)).toContain(">★★☆☆☆<");
    expect(starRow(2)).toContain('role="img"');
  });
});
