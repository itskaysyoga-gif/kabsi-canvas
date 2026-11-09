// The request book extraction evaluation runner (RB-D).
//
//   deno run -A scripts/request-eval/run.ts --mock             CI: the recorded answers of the last hand run, no network
//   deno run -A scripts/request-eval/run.ts --oracle           the cases against the code with a perfect quoting model
//   ANTHROPIC_API_KEY=... deno run -A scripts/request-eval/run.ts --live --budget 5 --out result.json
//                                                              by hand on the real model (stops at the budget, at most 5)
//   ... --only id1,id2     run only these cases      --failures    list every case that did not score fully
//
// The live run prints one RECORD line per case (id, prompt hash, the model's answer) so the answers can be saved as
// recorded.json; the model's answers hold the fictional case texts and nothing else. EVAL_LIVE is not used: this is
// never run by CI, only by hand (the "Eval live" workflow, switch request_eval).
import {
  failures,
  loadSuite,
  marks,
  oracleAnswer,
  promptHash,
  report,
  requestFor,
  runCases,
  type RunOptions,
  type Suite,
} from "./eval.ts";
import type { Ask } from "../../supabase/functions/_shared/request-book/extract.ts";

export type Recorded = {
  version: number;
  model: string;
  recordedAt: string;
  cases: Record<string, { hash: string; answer: string | null }>;
};

export async function loadRecorded(): Promise<Recorded> {
  return JSON.parse(
    await Deno.readTextFile(new URL("./recorded.json", import.meta.url)),
  ) as Recorded;
}

/** An Ask that answers from a recording, by the hash of the exact prompt. A prompt that changed has no recording. */
export async function recordedAsk(
  suite: Suite,
  rec: Recorded,
): Promise<{ ask: Ask; missing: string[] }> {
  const byHash = new Map<string, string | null>();
  for (const e of Object.values(rec.cases)) byHash.set(e.hash, e.answer);
  const missing: string[] = [];
  for (const c of suite.cases) {
    const r = requestFor(suite, c);
    if (!byHash.has(await promptHash(r.system, r.user))) missing.push(c.id);
  }
  const ask: Ask = async (req) => {
    const h = await promptHash(req.system, req.user);
    if (!byHash.has(h)) throw new Error("no recording for this prompt");
    return byHash.get(h) ?? Promise.reject(new Error("recorded failure"));
  };
  return { ask, missing };
}

export function oracleAsk(suite: Suite): Ask {
  const byUser = new Map(
    suite.cases.map((c) => [requestFor(suite, c).user + requestFor(suite, c).system, c]),
  );
  return (req) => {
    const c = byUser.get(req.user + req.system);
    return c ? Promise.resolve(oracleAnswer(suite, c)) : Promise.reject(new Error("unknown case"));
  };
}

async function main() {
  const args = Deno.args;
  const flag = (n: string) => {
    const i = args.indexOf(n);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const suite = await loadSuite();
  const only = flag("--only")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const out = flag("--out");

  let ask: Ask;
  let spent: (() => number) | undefined;
  let mayStart: (() => boolean) | undefined;
  let onAnswer: RunOptions["onAnswer"];
  let concurrency = 1;
  const recorded: Recorded = {
    version: 1,
    model: "",
    recordedAt: new Date().toISOString(),
    cases: {},
  };

  if (args.includes("--oracle")) {
    ask = oracleAsk(suite);
  } else if (args.includes("--mock")) {
    const rec = await loadRecorded();
    const r = await recordedAsk(suite, rec);
    if (r.missing.length && !only) {
      console.error(
        `The recording does not cover ${r.missing.length} case prompts (the prompt or the cases changed): ${r.missing.slice(0, 5).join(", ")}. Re-record by hand.`,
      );
      Deno.exit(2);
    }
    ask = r.ask;
  } else if (args.includes("--live")) {
    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      console.error("The live run needs the ANTHROPIC_API_KEY secret. Nothing was run.");
      Deno.exit(2);
    }
    const budget = Number(flag("--budget") ?? "5");
    // The cap Rashid allowed for RB-D: never more than 5 US dollars, whatever the input says.
    if (!(budget > 0 && budget <= 5)) {
      console.error(
        "--budget takes a number of US dollars above 0 and at most 5. Nothing was run.",
      );
      Deno.exit(2);
    }
    const { live } = await import("./live.ts");
    const l = live(budget);
    ask = l.ask;
    spent = l.spentUsd;
    mayStart = () => l.mayStart();
    concurrency = 4;
    recorded.model = l.model;
    onAnswer = async (c, req, answer) => {
      const hash = await promptHash(req.system, req.user);
      recorded.cases[c.id] = { hash, answer };
      console.log(`RECORD ${JSON.stringify({ id: c.id, hash, answer })}`);
    };
  } else {
    console.error("Use --mock, --oracle or --live.");
    Deno.exit(2);
  }

  const run = await runCases(suite, ask, { concurrency, mayStart, onAnswer, only });
  const m = marks(suite, run.results);
  console.log(report(m));
  if (run.skipped.length)
    console.log(
      `Stopped at the budget: ${run.skipped.length} cases not run (${run.skipped.slice(0, 5).join(", ")} ...).`,
    );
  if (spent) console.log(`Spent ${spent().toFixed(4)} US dollars.`);
  if (args.includes("--failures") || args.includes("--live"))
    for (const f of failures(run.results)) console.log(`  ${f}`);
  if (out)
    await Deno.writeTextFile(
      out,
      JSON.stringify(
        {
          marks: m,
          skipped: run.skipped,
          spentUsd: spent?.() ?? 0,
          recorded,
          results: run.results,
        },
        null,
        1,
      ),
    );
  Deno.exit(m.pass.all && run.skipped.length === 0 ? 0 : 1);
}

if (import.meta.main) await main();
