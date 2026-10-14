import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as server from "../supabase/functions/_shared/ai/risk";
import * as client from "../src/lib/review-risk";

// P0.3-03: three review risk levels (K-13). The behaviour tests (every trigger, the higher-wins merge with a stubbed
// Haiku, no draft for high, the clinic rule) are the Deno tests in supabase/functions/_shared/review-risk.test.ts and
// the pgTAP file supabase/tests/review_risk.sql. These hold the words equal in the emails and on the screens, and keep
// the retired urgent flag out of the app.
const root = join(__dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Review risk levels (P0.3-03)", () => {
  it("the reasons, levels and sentences are the same on the screens and in the emails", () => {
    expect(client.RISK_ISSUES).toEqual(server.RISK_REASONS);
    expect(client.HIGH_RISK_TITLE).toBe(server.HIGH_RISK_TITLE);
    expect(client.HIGH_RISK_CHECKLIST).toEqual(server.HIGH_RISK_CHECKLIST);
    expect(client.HIGH_RISK_TITLE).toBe("This review needs a little more care.");
  });

  it("the screens pick the same issue lines as the emails", () => {
    for (const reasons of [
      [],
      ["low_rating"],
      ["refund", "low_rating"],
      ["regulated_industry"],
      ["complaint", "regulated_industry", "low_rating"],
      ["crime", "refund", "staff_complaint"],
      ["unknown_key", "privacy"],
    ]) {
      expect(client.issueLines(reasons)).toEqual(server.issueLines(reasons));
    }
    expect(client.issueLines(["refund"])).toEqual([
      "They mention a refund. Kabsi didn't promise one.",
    ]);
  });

  it("owner words keep the house style: no dashes, no exclamation marks", () => {
    const words = [
      ...Object.values(server.RISK_REASONS).map((r) => r.issue),
      server.HIGH_RISK_TITLE,
      ...server.HIGH_RISK_CHECKLIST,
    ];
    for (const w of words) expect(w).not.toMatch(/[—–!]/);
  });

  it("nothing in the app, the functions or the worker reads the retired urgent flag", () => {
    const files = [
      "src/lib/reviews.ts",
      "src/lib/dashboard.ts",
      "src/routes/_authenticated/app/inbox.tsx",
      "src/routes/_authenticated/app/index.tsx",
      "src/routes/a.$token.tsx",
      "supabase/functions/_shared/reviews.ts",
      "supabase/functions/api/action.ts",
      "supabase/functions/api/approve.ts",
      "supabase/functions/slack/index.ts",
    ];
    for (const f of files) expect(read(f), f).not.toMatch(/urgency|\.urgent\b|urgent_waiting/);
  });
});
