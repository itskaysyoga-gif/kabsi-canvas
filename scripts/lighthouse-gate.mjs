// Lean 1 (speed): the blocking speed check. Reads the Lighthouse reports (lhr-*.json) of Home at 390 px and fails when the
// median misses the budget. Copy 3 (master plan 30.29 item 2 and 30.30 item 5): Pricing and /scan are gated too, each with
// its own script budget, so neither grows. Every other page stays report only (scripts/lighthouse-summary.mjs).
//   node scripts/lighthouse-gate.mjs [dir] [path]       dir default .lighthouseci, path default /
// Budgets, from the environment so the number lives in the workflow that applies it:
//   LH_LCP_MS   largest contentful paint, default 2500 (the Lean 1 gate)
//   LH_JS_KB    script transfer size of the one page named on the command line, default 150 (the Lean 1 gate; master plan
//               24.9 says 120)
//   LH_PAGES    several pages at once, "path=KB" pairs separated by commas, for example "/=205,/pricing=215,/scan=235".
//               When it is set the command line's path is ignored and every listed page is gated.
// The workflow may set a higher budget while the first-load script is being brought down; it is lowered in the same
// pull request that earns it, and docs/progress/archive/2026-11-01-lean1.md says where the number stands. CI's budgets
// (Home 205, Pricing 215, /scan 235 KB) and the live ones (Home 215, Pricing 225, /scan 245 KB) are in the `speed` job of
// ci.yml and in lighthouse-live.yml.
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".lighthouseci";
const want = process.argv[3] ?? "/";
const lcpMax = Number(process.env.LH_LCP_MS ?? 2500);
const need = Number(process.env.LH_RUNS ?? 3);

/** The pages to gate and the script budget (KB) of each. */
const pages = (() => {
  const list = String(process.env.LH_PAGES ?? "").trim();
  if (!list) return [{ path: want, jsMax: Number(process.env.LH_JS_KB ?? 150) }];
  return list.split(",").map((pair) => {
    const [p, kb] = pair.trim().split("=");
    const jsMax = Number(kb);
    if (!p || !p.startsWith("/") || !Number.isFinite(jsMax) || jsMax <= 0) {
      console.error(
        `::error::LH_PAGES wants path=KB pairs such as /pricing=215, and has "${pair}".`,
      );
      process.exit(1);
    }
    return { path: p, jsMax };
  });
})();

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)];
};

const reports = [];
if (existsSync(dir))
  for (const f of readdirSync(dir).filter((n) => /^lhr-.*\.json$/.test(n)))
    reports.push(JSON.parse(readFileSync(join(dir, f), "utf8")));

const lines = [];
const fails = [];
for (const { path, jsMax } of pages) {
  const runs = [];
  for (const r of reports) {
    if (new URL(r.finalUrl).pathname !== path) continue;
    const items = r.audits["resource-summary"]?.details?.items ?? [];
    runs.push({
      lcp: r.audits["largest-contentful-paint"].numericValue,
      tbt: r.audits["total-blocking-time"].numericValue,
      js: (items.find((i) => i.resourceType === "script")?.transferSize ?? NaN) / 1024,
    });
  }
  if (runs.length < need || runs.some((r) => ![r.lcp, r.tbt, r.js].every(Number.isFinite))) {
    console.error(
      `::error::The gate needs ${need} complete Lighthouse reports for ${path} in ${dir} and has ${runs.length}: it cannot say yes.`,
    );
    process.exit(1);
  }
  const lcp = median(runs.map((r) => r.lcp));
  const tbt = median(runs.map((r) => r.tbt));
  const js = median(runs.map((r) => r.js));
  if (!(lcp <= lcpMax))
    fails.push(`${path}: LCP ${(lcp / 1000).toFixed(2)} s is over ${(lcpMax / 1000).toFixed(1)} s`);
  if (!(js <= jsMax)) fails.push(`${path}: script ${js.toFixed(0)} KB is over ${jsMax} KB`);
  lines.push(
    `Speed gate, ${path} on a throttled phone, median of ${runs.length} runs:`,
    "",
    "| Measure | Median | Budget | Result |",
    "| --- | --- | --- | --- |",
    `| LCP | ${(lcp / 1000).toFixed(2)} s | ${(lcpMax / 1000).toFixed(1)} s | ${lcp <= lcpMax ? "pass" : "FAIL"} |`,
    `| Script (transfer) | ${js.toFixed(0)} KB | ${jsMax} KB | ${js <= jsMax ? "pass" : "FAIL"} |`,
    `| TBT (report only) | ${tbt.toFixed(0)} ms | 150 ms | ${tbt <= 150 ? "ok" : "over"} |`,
    "",
  );
}
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
if (fails.length) {
  console.error(`::error::Speed gate failed: ${fails.join("; ")}`);
  process.exit(1);
}
