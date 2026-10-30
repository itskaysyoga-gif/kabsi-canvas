// Scope 1 (master plan 30.19 section 3 item 1): the honest limits line, Nora's three stub cases on it, and the two
// checker fixes of the Eval 1 row (en02 number reading, n71 coming flag). Stub models only: no Anthropic call, EVAL_LIVE
// stays false.
import { describe, expect, it } from "vitest";
import { check, gate, numbersIn, passStub, runAll } from "../scripts/nora-eval/nora-eval.ts";
import { QUESTIONS } from "../scripts/nora-eval/questions.ts";
import { QUESTIONS_28 } from "../scripts/nora-eval/questions-28.ts";
import { QUESTIONS_SCOPE1 } from "../scripts/nora-eval/questions-scope1.ts";
import { readText } from "./helpers/facts";

const facts = readText("knowledge/kabsi-facts.md");
const LINE =
  "Today, Kabsi works only with your Google Business Profile. It does not connect to booking systems, Tripadvisor, Booking.com, Airbnb, Facebook reviews, a till or a CRM, and it does not message your customers.";

describe("the honest limits line", () => {
  it("is in the facts and in both llms files, word for word", () => {
    expect(facts).toContain(LINE);
    expect(readText("public/llms-full.txt")).toContain(LINE);
    expect(readText("public/llms.txt")).toContain(LINE);
  });
  it("tells Nora to say not available today, never never, no date, and to offer the free check", () => {
    expect(facts).toMatch(/Say it is \*\*not available today\*\*\. Do not say "never"/);
    expect(facts).toMatch(/offer the free Google profile check at kabsi\.co\/scan/);
  });
});

describe("Nora's three Scope 1 cases", () => {
  it("are three and their ids do not clash with the other 80", () => {
    expect(QUESTIONS_SCOPE1.map((q) => q.id)).toEqual(["sc01", "sc02", "sc03"]);
    const ids = new Set([...QUESTIONS, ...QUESTIONS_28, ...QUESTIONS_SCOPE1].map((q) => q.id));
    expect(ids.size).toBe(83);
  });
  it("pass on the reference answers and rest on facts the file holds", async () => {
    const { score } = await runAll(passStub, facts, { only: QUESTIONS_SCOPE1 });
    expect(score.findings).toEqual([]);
    expect(gate(score, 3).pass).toBe(true);
  });
  it("fail an answer that says never, gives a date or leaves out the free check", () => {
    const q = QUESTIONS_SCOPE1[0]!;
    const bad = [
      "Kabsi never works with Tripadvisor. Today, Kabsi works only with your Google Business Profile.",
      "That is not available today, but it is planned for next year. Try the free check at kabsi.co/scan.",
      "That is not available today. Today, Kabsi works only with your Google Business Profile.",
    ];
    for (const a of bad) expect(check(q, a, facts).length, a).toBeGreaterThan(0);
  });
});

describe("the Eval 1 row: en02 and n71", () => {
  it("reads '3 monthly' as a count, not as '3 month'", () => {
    expect(numbersIn("3 monthly and 1 monthly")).toEqual([]);
    expect(numbersIn("14 days, 3 months, 10 posts, 50%")).toEqual([
      "14 day",
      "3 month",
      "10 post",
      "50 %",
    ]);
  });
  it("accepts an honest plan answer with the true counts (en02)", () => {
    const en02 = QUESTIONS.find((q) => q.id === "en02")!;
    const answer =
      "Essentials checks 1 search term monthly and Pro checks 5 weekly, with 3 monthly posts on Essentials. Neither plan is available yet, and card payments are not open yet.";
    expect(check(en02, answer, facts).filter((f) => f.kind === "honesty")).toEqual([]);
  });
  it("does not require n71 to be a coming item, and keeps the plain no", () => {
    const n71 = QUESTIONS_28.find((q) => q.id === "n71")!;
    expect(n71.coming).toBeFalsy();
    expect(
      check(
        n71,
        "No, Kabsi does not message your customers. Use your review link and QR code.",
        facts,
      ),
    ).toEqual([]);
  });
});
