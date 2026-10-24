// Turns the Lighthouse CI reports (.lighthouseci-report/lhr-*.json) into a short table for the job summary
// (master plan 24.9, Ops 1 part B). One row per page, the median of its runs. Report only: this script never fails a build.
//   node scripts/lighthouse-summary.mjs [dir]
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".lighthouseci-report";
if (!existsSync(dir)) {
  console.log(`No Lighthouse reports in ${dir}.`);
  process.exit(0);
}
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN;
};
const byUrl = new Map();
for (const f of readdirSync(dir).filter((n) => /^lhr-.*\.json$/.test(n))) {
  const r = JSON.parse(readFileSync(join(dir, f), "utf8"));
  const script = r.audits["resource-summary"]?.details?.items?.find((i) => i.resourceType === "script")?.transferSize ?? NaN;
  const row = {
    perf: r.categories.performance.score * 100,
    a11y: r.categories.accessibility.score * 100,
    bp: r.categories["best-practices"].score * 100,
    seo: r.categories.seo.score * 100,
    lcp: r.audits["largest-contentful-paint"].numericValue,
    tbt: r.audits["total-blocking-time"].numericValue,
    cls: r.audits["cumulative-layout-shift"].numericValue,
    js: script / 1024,
  };
  const path = new URL(r.finalUrl).pathname;
  byUrl.set(path, [...(byUrl.get(path) ?? []), row]);
}
const lines = [
  "Lighthouse on a throttled phone, report only (budgets of master plan 24.9: performance 95 / 90, other scores 95, LCP 2.0 s, TBT 150 ms, CLS 0.05, JS 120 KB).",
  "",
  "| Page | Perf | A11y | Best | SEO | LCP s | TBT ms | CLS | JS KB |",
  "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
];
for (const [path, rows] of byUrl) {
  const m = (k) => median(rows.map((r) => r[k]));
  lines.push(
    `| ${path} | ${m("perf").toFixed(0)} | ${m("a11y").toFixed(0)} | ${m("bp").toFixed(0)} | ${m("seo").toFixed(0)} | ` +
      `${(m("lcp") / 1000).toFixed(1)} | ${m("tbt").toFixed(0)} | ${m("cls").toFixed(3)} | ${m("js").toFixed(0)} |`,
  );
}
lines.push("", "The CI server is a plain Node server without Vercel's compression and CDN, so JS KB and LCP read worse here than on kabsi.co. Web 2 points this at the Vercel preview and makes it blocking.");
console.log(lines.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join("\n")}\n`);
