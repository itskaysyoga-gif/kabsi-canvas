import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  APPEAL_STEPS,
  CATEGORIES,
  EVIDENCE,
  GOOGLE_CHECKED,
  GOOGLE_POLICY_URL,
  nextSteps,
  REPORT_STEPS,
  REVIEWS_TOOL_URL,
  STATE_LABEL,
  type ReportState,
} from "../src/lib/review-report";

// P0.8-11 (K-139): the "Report this review" helper. Google's categories in plain words (dated and linked), an evidence
// checklist, a link to Google's Reviews Management Tool, states that move in order with one appeal, and no promise of
// removal, no legal language and no model call anywhere.
const FILES = ["src/lib/review-report.ts", "src/components/reviews/report-review.tsx"];
const strip = (file: string) =>
  readFileSync(file, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
const allText = () => FILES.map(strip).join("\n");

describe("the words", () => {
  const BANNED = [
    "guarantee",
    "will be removed",
    "we will get it removed",
    "get it removed",
    "lawsuit",
    "defamation",
    "legal action",
    "sue ",
    "lawyer",
    "attorney",
  ];
  it("never promise a removal or use legal language", () => {
    const text = allText().toLowerCase();
    for (const phrase of BANNED) expect(text, phrase).not.toContain(phrase);
  });

  it("say that Google decides and Kabsi cannot remove a review", () => {
    const code = readFileSync("src/components/reviews/report-review.tsx", "utf8");
    expect(code).toContain("Google decides what stays");
    expect(code).toContain("Kabsi cannot remove a review and cannot promise that Google");
  });

  it("have no dash or exclamation mark in a string the owner reads", () => {
    for (const c of CATEGORIES) expect(`${c.name} ${c.plain}`).not.toMatch(/[–—!]/);
    for (const e of EVIDENCE) expect(e.label).not.toMatch(/[–—!]/);
    for (const s of [...REPORT_STEPS, ...APPEAL_STEPS]) expect(s).not.toMatch(/[–—!]/);
    expect(allText()).not.toMatch(/[–—]/);
  });
});

describe("Google's list, dated and linked", () => {
  it("has Google's categories with unique short keys the database accepts", () => {
    const keys = CATEGORIES.map((c) => c.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) expect(k).toMatch(/^[a-z][a-z_]{2,39}$/);
    for (const k of EVIDENCE.map((e) => e.key)) expect(k).toMatch(/^[a-z][a-z_]{1,39}$/);
    for (const must of [
      "fake_content",
      "fake_engagement",
      "off_topic",
      "advertising",
      "impersonation",
      "offensive_content",
    ]) {
      expect(keys).toContain(must);
    }
  });

  it("says when it was read and links Google's own pages", () => {
    expect(GOOGLE_CHECKED).toBe("21 Oct 2026");
    expect(GOOGLE_POLICY_URL).toBe("https://support.google.com/contributionpolicy/answer/7400114");
    expect(readFileSync("src/components/reviews/report-review.tsx", "utf8")).toContain(
      "GOOGLE_CHECKED",
    );
  });

  it("deep links to Google's Reviews Management Tool", () => {
    const url = new URL(REVIEWS_TOOL_URL);
    expect(url.origin).toBe("https://support.google.com");
    expect(url.pathname).toBe("/business/workflow/9945796");
  });

  it("has the evidence checklist: why, dates, proof of no visit, screenshots the owner keeps", () => {
    const keys = EVIDENCE.map((e) => e.key);
    expect(keys).toEqual(
      expect.arrayContaining(["own_words", "dates", "not_a_customer", "screenshots"]),
    );
    expect(EVIDENCE.find((e) => e.key === "screenshots")?.label).toContain(
      "Kabsi does not store them",
    );
  });
});

describe("the states move in order and the appeal can be started once", () => {
  const step = (state: ReportState, appealed = false) =>
    nextSteps({ state, appeal_started_at: appealed ? "2026-10-01T00:00:00Z" : null });

  it("reported, then answered, then removed or still showing", () => {
    expect(step("reported")).toEqual(["answered"]);
    expect(step("answered")).toEqual(["removed", "still_showing"]);
  });

  it("an appeal starts from still showing, once, and ends in removed or still showing", () => {
    expect(step("still_showing")).toEqual(["appealed"]);
    expect(step("appealed", true)).toEqual(["removed", "still_showing"]);
    expect(step("still_showing", true)).toEqual([]);
    expect(step("removed")).toEqual([]);
  });

  it("every state has a plain label", () => {
    for (const s of ["reported", "answered", "still_showing", "removed", "appealed"] as const) {
      expect(STATE_LABEL[s]).toBeTruthy();
    }
  });
});

describe("no model call and no send to Google", () => {
  it("the code path calls no model, no Edge Function and no Google host", () => {
    for (const file of FILES) {
      const code = strip(file);
      expect(code, file).not.toMatch(
        /anthropic|openai|callFunction|functions\.invoke|\bfetch\(|googleapis/i,
      );
    }
    // The only database calls are the three functions, and the only outside links are Google's help pages.
    const lib = strip("src/lib/review-report.ts");
    expect([...lib.matchAll(/\.rpc\("([a-z_]+)"/g)].map((m) => m[1]).sort()).toEqual([
      "advance_review_report",
      "list_review_reports",
      "start_review_report",
    ]);
  });

  it("the migration keeps no review text", () => {
    const sql = readFileSync("supabase/migrations/20261021220000_review_reports.sql", "utf8");
    expect(sql).not.toMatch(/\b(comment|reviewer_name|review_text)\b\s+(text|jsonb)/i);
  });
});
