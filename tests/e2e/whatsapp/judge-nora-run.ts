// QA 1 (30.12 item 7): scores the answers Nora gave in a live replay (scenario nora_live of the whatsapp function's replay route)
// with the AI judge of scripts/eval/judge.ts (rubric: accurate, helpful, honest, style) against the facts file. By hand only:
//   ANTHROPIC_API_KEY=... node tests/e2e/whatsapp/judge-nora-run.ts <run.json> [--budget 0.5] [--out judged.json]
// or Actions, "QA Nora judge", Run workflow. The judge model is the check model (Haiku); its cost is printed and kept in the output.
// It stops starting new work at the budget and says so. The question and the answer are fenced as data by the judge itself.
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { makeJudge } from "../../../scripts/eval/judge.ts";
import { buildFacts } from "../../../scripts/kb-lib.mjs";

const args = process.argv.slice(2);
const flag = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const file = args.find((a) => !a.startsWith("--") && a !== flag("--budget") && a !== flag("--out"));
const key = process.env["ANTHROPIC_API_KEY"];
if (!file || !key) {
  console.error(
    "Usage: ANTHROPIC_API_KEY=... node tests/e2e/whatsapp/judge-nora-run.ts <run.json> [--budget 0.5] [--out judged.json]",
  );
  process.exit(2);
}
const budget = Number(flag("--budget") ?? "0.5");
type Step = { n: number; note: string; sent: string; replies: { body: string }[] };
const run = JSON.parse(readFileSync(file, "utf8")) as { scenario: string; steps: Step[] };
const facts = buildFacts();
const judge = makeJudge(key);
const out: {
  n: number;
  question: string;
  answer: string;
  scores?: Record<string, number>;
  overall?: number;
  note?: string;
  skipped?: string;
}[] = [];
for (const s of run.steps) {
  const question = (() => {
    try {
      return String(JSON.parse(s.sent));
    } catch {
      return s.sent;
    }
  })();
  const answer = s.replies.map((r) => r.body).join("\n\n");
  if (judge.cost() / 1e6 >= budget) {
    out.push({ n: s.n, question, answer, skipped: "budget reached" });
    continue;
  }
  const j = await judge.nora({ facts, question, answer });
  out.push({ n: s.n, question, answer, scores: j.scores, overall: j.overall, note: j.note });
}
const judged = out.filter((x) => x.scores);
const mean = (k: string) =>
  Math.round(
    (judged.reduce((a, x) => a + (x.scores?.[k] ?? 0), 0) / Math.max(1, judged.length)) * 100,
  ) / 100;
const summary = {
  scenario: run.scenario,
  date: new Date().toISOString().slice(0, 10),
  judge: "claude-haiku-4-5",
  answers: run.steps.length,
  judged: judged.length,
  mean: Object.fromEntries(["accurate", "helpful", "honest", "style"].map((k) => [k, mean(k)])),
  overall:
    Math.round(
      (judged.reduce((a, x) => a + (x.overall ?? 0), 0) / Math.max(1, judged.length)) * 100,
    ) / 100,
  judgeCostUsd: Math.round(judge.cost()) / 1e6,
  budgetUsd: budget,
  stoppedAtBudget: out.some((x) => x.skipped),
};
console.log(JSON.stringify(summary, null, 2));
for (const x of out)
  console.log(
    `${x.n}. ${JSON.stringify(x.question)} -> overall ${x.overall ?? "-"} ${x.note ?? x.skipped ?? ""}`,
  );
const dest = flag("--out");
if (dest) writeFileSync(dest, JSON.stringify({ summary, answers: out }, null, 2));
