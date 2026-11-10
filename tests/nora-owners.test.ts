// Owners 1: the 90 questions a salon, barber, nail, spa, beauty or aesthetics owner in Dubai or Manchester asks Nora
// (scripts/nora-eval/questions-owners.ts). Stub models only: no Anthropic call, EVAL_LIVE stays false. The 60 questions of
// nora-sync.test.ts and the "Nora gate (60 questions)" job stay as they are; the live run asks these with --with-28.
import { describe, expect, it } from "vitest";
import { check, gate, passStub, runAll, support } from "../scripts/nora-eval/nora-eval.ts";
import { QUESTIONS } from "../scripts/nora-eval/questions.ts";
import { QUESTIONS_28 } from "../scripts/nora-eval/questions-28.ts";
import { QUESTIONS_SCOPE1 } from "../scripts/nora-eval/questions-scope1.ts";
import { QUESTIONS_PAGES } from "../scripts/nora-eval/questions-pages.ts";
import { QUESTIONS_OWNERS } from "../scripts/nora-eval/questions-owners.ts";
import { readText } from "./helpers/facts";

const facts = readText("knowledge/kabsi-facts.md");
const ALL = [
  ...QUESTIONS,
  ...QUESTIONS_28,
  ...QUESTIONS_SCOPE1,
  ...QUESTIONS_PAGES,
  ...QUESTIONS_OWNERS,
];

describe("Nora's 92 owner questions", () => {
  it("are 92, ids o01 to o92, unique and clear of every other set", () => {
    expect(QUESTIONS_OWNERS).toHaveLength(92);
    expect(QUESTIONS_OWNERS.map((q) => q.id)).toEqual(
      Array.from({ length: 92 }, (_, i) => `o${String(i + 1).padStart(2, "0")}`),
    );
    expect(new Set(ALL.map((q) => q.id)).size).toBe(ALL.length);
  });

  it("are mostly English, with Arabic and French questions that each carry a gloss", () => {
    const count = (l: string) => QUESTIONS_OWNERS.filter((q) => q.lang === l).length;
    expect(count("ar")).toBe(6);
    expect(count("fr")).toBe(2);
    for (const q of QUESTIONS_OWNERS) if (q.lang !== "en") expect(q.gloss, q.id).toBeTruthy();
  });

  it("rest on one to three lines each that the built facts hold today", () => {
    for (const q of QUESTIONS_OWNERS) {
      expect(q.kb.length, q.id).toBeGreaterThan(0);
      expect(q.kb.length, q.id).toBeLessThanOrEqual(3);
      expect(support(q, facts), q.id).toEqual([]);
    }
  });

  it("have reference answers that pass every check", () => {
    for (const q of QUESTIONS_OWNERS) expect(check(q, q.reference, facts), q.id).toEqual([]);
  });

  it("pass the gate on the reference answers, alone and with the other 90", async () => {
    const one = await runAll(passStub, facts, { only: QUESTIONS_OWNERS });
    expect(one.score.findings).toEqual([]);
    expect(gate(one.score, 92).pass).toBe(true);
    const both = await runAll(passStub, facts, { only: ALL });
    expect(both.score.findings).toEqual([]);
    expect(gate(both.score, 182).pass).toBe(true);
  });
});
