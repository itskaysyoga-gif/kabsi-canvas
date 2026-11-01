// Lean 1 (speed): the blocking speed check. Reads the Lighthouse reports (lhr-*.json) of Home at 390 px and fails when the
// median misses the budget. Every other page stays report only (scripts/lighthouse-summary.mjs).
//   node scripts/lighthouse-gate.mjs [dir] [path]       dir default .lighthouseci, path default /
// Budgets, from the environment so the number lives in the workflow that applies it:
//   LH_LCP_MS   largest contentful paint, default 2500 (the Lean 1 gate)
//   LH_JS_KB    script transfer size, default 150 (the Lean 1 gate; master plan 24.9 says 120)
// The workflow may set a higher LH_JS_KB while the first-load script is being brought down; it is lowered in the same
// pull request that earns it, and docs/progress/archive/2026-11-01-lean1.md says where the number stands.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".lighthouseci";
const want = process.argv[3] ?? "/";
const lcpMax = Number(process.env.LH_LCP_MS ?? 2500);
const jsMax = Number(process.env.LH_JS_KB ?? 150);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};
const runs = [];
if (existsSync(dir))
  for (const f of readdirSync(dir).filter((n) => /^lhr-.*\.json$/.test(n))) {
    const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
    if (new URL(r.finalUrl).pathname !== want) continue;
    const items = r.audits["resource-summary"]?.details?.items ?? [];
    runs.push({
      lcp: r.audits["largest-contentful-paint"].numericValue,
      tbt: r.audits["total-blocking-time"].numericValue,
      js: (items.find((i) => i.resourceType === "script")?.transferSize ?? NaN) / 1024,
    });
  }
const need = Number(process.env.LH_RUNS ?? 3);
if (runs.length < need || runs.some((r) => ![r.lcp, r.tbt, r.js].every(Number.isFinite))) {
  console.error(
    `::error::The gate needs ${need} complete Lighthouse reports for ${want} in ${dir} and has ${runs.length}: it cannot say yes.`,
  );
  process.exit(1);
}
const lcp = median(runs.map((r) => r.lcp));
const tbt = median(runs.map((r) => r.tbt));
const js = median(runs.map((r) => r.js));
const fails = [];
if (!(lcp <= lcpMax))
  fails.push(`LCP ${(lcp / 1000).toFixed(2)} s is over ${(lcpMax / 1000).toFixed(1)} s`);
if (!(js <= jsMax)) fails.push(`script ${js.toFixed(0)} KB is over ${jsMax} KB`);
const lines = [
  `Speed gate, ${want} on a throttled phone, median of ${runs.length} runs:`,
  "",
  "| Measure | Median | Budget | Result |",
  "| --- | --- | --- | --- |",
  `| LCP | ${(lcp / 1000).toFixed(2)} s | ${(lcpMax / 1000).toFixed(1)} s | ${lcp <= lcpMax ? "pass" : "FAIL"} |`,
  `| Script (transfer) | ${js.toFixed(0)} KB | ${jsMax} KB | ${js <= jsMax ? "pass" : "FAIL"} |`,
  `| TBT (report only) | ${tbt.toFixed(0)} ms | 150 ms | ${tbt <= 150 ? "ok" : "over"} |`,
];
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
if (fails.length) {
  console.error(`::error::Speed gate failed: ${fails.join("; ")}`);
  process.exit(1);
}
