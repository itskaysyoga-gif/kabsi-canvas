// Nora's evaluation (P0.6-06; K-104). Scores the 60 questions in questions.ts against the facts built from knowledge/facts/ (scripts/kb-lib.mjs) and exits 1
// unless the gate holds.
//
//   node scripts/nora-eval/run-nora-eval.ts --stub pass    the checker and the facts file, no network (also "fail")
//   node scripts/nora-eval/run-nora-eval.ts --live --sample 20   the real Nora on 20 questions spread over the set; needs
//                                                          ANTHROPIC_API_KEY; by hand only, when Rashid says so (R-45, 2.12)
//   node scripts/nora-eval/run-nora-eval.ts --live --with-28 --judge --budget 2.5   all 80 questions (the 60 and the
//                                                          20 of 28.7), each scored by the judge (26.1), stopped at the budget
//
// Add --out <file> to keep the findings. Nothing is stored and no account is read.
import { writeFileSync } from "node:fs";
import process from "node:process";
import { gate, liveModel, runAll, sample, stubModel, type Answerer } from "./nora-eval.ts";
import { QUESTIONS } from "./questions.ts";
import { QUESTIONS_28 } from "./questions-28.ts";
import { addRun, JUDGE_MODEL, makeJudge, summarize, type JudgeScore } from "../eval/judge.ts";
import { costMicros, type Usage } from "../../supabase/functions/_shared/ai/agents.ts";
import { readFileSync } from "node:fs";
import { noraRules } from "../../supabase/functions/_shared/nora-rules.ts";
import { buildFacts } from "../kb-lib.mjs";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const kb = buildFacts();
const out = flag("--out");
const stub = flag("--stub") as "pass" | "fail" | undefined;

const used: Usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
const noraModel = process.env.NORA_MODEL ?? "claude-sonnet-5-5";
let model: Answerer;
if (stub) {
  model = stubModel(stub);
} else if (args.includes("--live")) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error(
      "Nora's evaluation needs the ANTHROPIC_API_KEY secret. Nothing was run, so the gate is closed.",
    );
    process.exit(2);
  }
  // The same words as the assistant function, with no WhatsApp number (there is none).
  model = liveModel(key, noraModel, noraRules(false, ""), used);
} else {
  console.error("Use --live or --stub pass|fail.");
  process.exit(2);
}

const all = args.includes("--with-28") ? [...QUESTIONS, ...QUESTIONS_28] : QUESTIONS;
const n = Number(flag("--sample") ?? all.length);
const only = n >= all.length ? all : sample(n);
const judge = args.includes("--judge") && !stub ? makeJudge(process.env.ANTHROPIC_API_KEY!) : undefined;
const spent = () => costMicros(noraModel, used) + (judge?.cost() ?? 0);
const budgetUsd = flag("--budget") ? Number(flag("--budget")) : undefined;
const { score, answers, stopped } = await runAll(model, kb, {
  concurrency: stub ? 1 : 4, only, budget: budgetUsd ? { spent, micros: budgetUsd * 1e6 } : undefined,
});
const g = gate(score, only.length);
// The judge scores every answer given, while the budget lasts.
const judged: Record<string, JudgeScore> = {};
if (judge) {
  for (const q of only) {
    if (!answers[q.id] || (budgetUsd && spent() >= budgetUsd * 1e6)) continue;
    try {
      judged[q.id] = await judge.nora({ facts: kb, question: q.gloss ? `${q.ask}\n(${q.gloss})` : q.ask, answer: answers[q.id] });
    } catch { /* an unreadable verdict is left out, never counted as a score */ }
  }
}
const sum = summarize(Object.values(judged));
const cost = { noraUsd: costMicros(noraModel, used) / 1e6, judgeUsd: (judge?.cost() ?? 0) / 1e6, totalUsd: spent() / 1e6 };
if (out) writeFileSync(out, JSON.stringify({ score, gate: g, stopped, cost, judge: sum, judged, answers }, null, 1));
if (judge && flag("--scores")) {
  const file = flag("--scores")!;
  let prev = {};
  try { prev = JSON.parse(readFileSync(file, "utf8")); } catch { /* first run */ }
  const run = { date: new Date().toISOString(), model: score.model, judge: JUDGE_MODEL, cases: score.questions, judged: Object.keys(judged).length, ...sum, costUsd: cost.totalUsd };
  writeFileSync(file, JSON.stringify(addRun(prev, "nora", run), null, 1) + "\n");
}
console.log(
  [
    `Nora evaluation, model ${score.model}: ${score.questions} questions (${Object.entries(
      score.byLang,
    )
      .map(([l, n]) => `${l} ${n}`)
      .join(", ")})`,
    `  honesty failures ${score.honestyFailures} (must be 0)`,
    `  rule failures ${score.ruleFailures} (must be 0)`,
    `  facts the file no longer holds ${score.supportFailures} (must be 0)`,
    `  style failures ${score.styleFailures} (must be 0)`,
    `  did not run ${score.errors} (must be 0)`,
    ...score.findings.slice(0, 40).map((f) => `    ${f.id} ${f.kind}: ${f.detail}`),
    ...(judge ? [`  judge (${JUDGE_MODEL}) on ${Object.keys(judged).length} answers: overall ${sum.overall} of 5; ${Object.entries(sum.mean).map(([k, v]) => `${k} ${v}`).join(", ")}`] : []),
    `  cost: Nora ${cost.noraUsd.toFixed(3)} USD, judge ${cost.judgeUsd.toFixed(3)} USD, total ${cost.totalUsd.toFixed(3)} USD${stopped ? ` (stopped at the ${budgetUsd} USD budget)` : ""}`,
    g.pass ? "Gate: passed." : `Gate: blocked. ${g.failures.join("; ")}.`,
  ].join("\n"),
);
process.exit(g.pass ? 0 : 1);
