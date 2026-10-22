// Nora's evaluation (P0.6-06; K-104). Scores the 60 questions in questions.ts against knowledge/kabsi-facts.md and exits 1
// unless the gate holds.
//
//   node scripts/nora-eval/run-nora-eval.ts --stub pass    the checker and the facts file, no network (also "fail")
//   node scripts/nora-eval/run-nora-eval.ts --live         the real Nora; needs ANTHROPIC_API_KEY (R-43), not run until
//                                                          the AI credit is on, and then only when Rashid says so (2.12)
//
// Add --out <file> to keep the findings. Nothing is stored and no account is read.
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { gate, liveModel, runAll, stubModel, type Answerer } from "./nora-eval.ts";
import { noraRules } from "../../supabase/functions/_shared/nora-rules.ts";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const kb = readFileSync(new URL("../../knowledge/kabsi-facts.md", import.meta.url), "utf8");
const out = flag("--out");
const stub = flag("--stub") as "pass" | "fail" | undefined;

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
  model = liveModel(key, process.env.NORA_MODEL ?? "claude-sonnet-5-5", noraRules(false, ""));
} else {
  console.error("Use --live or --stub pass|fail.");
  process.exit(2);
}

const { score, answers } = await runAll(model, kb, { concurrency: stub ? 1 : 4 });
const g = gate(score);
if (out) writeFileSync(out, JSON.stringify({ score, gate: g, answers }, null, 1));
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
    g.pass ? "Gate: passed." : `Gate: blocked. ${g.failures.join("; ")}.`,
  ].join("\n"),
);
process.exit(g.pass ? 0 : 1);
