// Master plan 28.7: the 20 questions on the new position (maps, AI answers, competitors, review requests, the free
// check, the plans). Stub models only (no Anthropic call). The 60 questions of nora-sync.test.ts stay as they are; the
// live run asks all 80 (scripts/nora-eval/run-nora-eval.ts --with-28).
import { describe, expect, it } from "vitest";
import { gate, passStub, runAll } from "../scripts/nora-eval/nora-eval.ts";
import { QUESTIONS } from "../scripts/nora-eval/questions.ts";
import { QUESTIONS_28 } from "../scripts/nora-eval/questions-28.ts";
import { readText } from "./helpers/facts";

const facts = readText("knowledge/kabsi-facts.md");

describe("Nora's 20 questions of 28.7", () => {
  it("are 20, with ids that do not clash with the 60, and a gloss for each that is not English", () => {
    expect(QUESTIONS_28).toHaveLength(20);
    const ids = new Set([...QUESTIONS, ...QUESTIONS_28].map((q) => q.id));
    expect(ids.size).toBe(80);
    for (const q of QUESTIONS_28) if (q.lang !== "en") expect(q.gloss, q.id).toBeTruthy();
    for (const l of ["es", "fr", "ar"])
      expect(
        QUESTIONS_28.some((q) => q.lang === l),
        l,
      ).toBe(true);
  });

  it("cover the new position: maps, AI answers, competitors, review requests, the free check and the plans", () => {
    const topics = QUESTIONS_28.map((q) => q.topic).join("|");
    for (const t of [
      "Visibility Map",
      "AI Visibility",
      "Competitor Watch",
      "Ask a customer",
      "free check",
      "each plan holds",
    ])
      expect(topics, t).toContain(t);
  });

  it("rest on lines the facts file holds today, and the reference answers pass every check", async () => {
    const { score } = await runAll(passStub, facts, { only: QUESTIONS_28 });
    expect(score.findings).toEqual([]);
    expect(gate(score, 20).pass).toBe(true);
  });

  it("all 80 together pass on the reference answers", async () => {
    const { score } = await runAll(passStub, facts, { only: [...QUESTIONS, ...QUESTIONS_28] });
    expect(score.findings).toEqual([]);
    expect(gate(score, 80).pass).toBe(true);
  });
});
