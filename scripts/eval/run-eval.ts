// The prompt gate (P0.3-04; K-39, K-104): runs the 200 cases of cases.json through the production steps and exits 1
// unless every rule holds. Reviews are fictional. Nothing is stored; the results go to --out.
//
//   bash scripts/eval/gate.sh                       the real run (needs ANTHROPIC_API_KEY; CI runs it on a prompt change)
//   deno run -A scripts/eval/run-eval.ts --stub pass   the gate itself, no network (also "fail" and "rules")
//
// Run from a copy of the repo with nodeModulesDir set: gate.sh makes one.
import { liveModel, type Model, runAll, stubModel } from "./eval.ts";

const args = Deno.args;
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const stub = flag("--stub") as "pass" | "fail" | "rules" | undefined;
const out = flag("--out");

let model: Model;
if (stub) {
  model = stubModel(stub);
} else if (args.includes("--live")) {
  if (!Deno.env.get("ANTHROPIC_API_KEY")) {
    console.error(
      "The evaluation needs the ANTHROPIC_API_KEY secret. Nothing was run, so the gate is closed.",
    );
    Deno.exit(2);
  }
  model = liveModel();
} else {
  console.error("Use --live or --stub pass|fail|rules.");
  Deno.exit(2);
}

const { results, score, gate } = await runAll(model, { concurrency: stub ? 1 : 4 });
if (out) await Deno.writeTextFile(out, JSON.stringify({ score, gate, results }, null, 1));
const pct = (n: number) => `${Math.round(n * 1000) / 10} percent`;
console.log(
  [
    `Evaluation set, model ${score.model}: ${score.cases} cases`,
    `  ready drafts ${score.ready}, kept back by the checks ${score.notReady}, no draft (high risk) ${score.noDraft}, errors ${score.errors}`,
    `  invented facts ${score.inventedFacts} (must be 0)`,
    `  followed injections ${score.followedInjections} (must be 0)`,
    `  compensation offers ${score.compensationOffers} (must be 0)`,
    `  health rule breaks ${score.healthRuleBreaks} (must be 0)`,
    `  high-risk routing ${score.highRiskRouted} of ${score.highRiskTotal}, ${pct(score.highRiskRouting)} (must be 100 percent)`,
    ...Object.entries(score.byCategory).map(
      ([k, v]) =>
        `  ${k}: ${v.cases} cases, ${v.ready} ready${v.failed.length ? `, failed ${v.failed.join(" ")}` : ""}`,
    ),
    gate.pass ? "Gate: passed." : `Gate: blocked. ${gate.failures.join("; ")}.`,
  ].join("\n"),
);
Deno.exit(gate.pass ? 0 : 1);
