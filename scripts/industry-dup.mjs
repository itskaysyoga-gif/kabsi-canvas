// Industry 1 (R-144): SEO 1's duplicate measure on the 21 industry pages of a built or live site.
//   PORT=4173 node .output/server/index.mjs &  node scripts/industry-dup.mjs http://localhost:4173
//   node scripts/industry-dup.mjs https://kabsi.co
// Prints each page's own share, the highest pairs and the range, and exits 1 when a page is under 70 percent its own
// text or a pair is above 35 percent. --table prints every pair as a markdown table; --json writes the raw numbers.
import { readFileSync } from "node:fs";
import { failures, measure, pct, sentences } from "./lib/page-dup.mjs";

const origin = (process.argv[2] ?? "http://localhost:4173").replace(/\/$/, "");
const slugs = [
  ...readFileSync("src/content/industries/index.ts", "utf8").matchAll(/from "\.\/([a-z-]+)"/g),
]
  .map((m) => m[1])
  .filter((f) => f !== "types");
// The page address is the content's slug, which is not always the file name.
const addr = slugs.map(
  (f) => readFileSync(`src/content/industries/${f}.ts`, "utf8").match(/slug: "([a-z-]+)"/)[1],
);

const pages = {};
for (const slug of addr) {
  const res = await fetch(`${origin}/for/${slug}`, { redirect: "manual" });
  if (res.status !== 200) throw new Error(`/for/${slug} answered ${res.status}`);
  pages[slug] = sentences(await res.text());
}
const m = measure(pages);
const f = failures(m);
const lo = m.pairs.at(-1);
const hi = m.pairs[0];
console.log(`${addr.length} pages, ${m.pairs.length} pairs, ${m.onEvery} sentences on every page.`);
console.log(
  `Pairs: ${pct(lo.share)} to ${pct(hi.share)}, median ${pct(m.pairs[m.pairs.length >> 1].share)}.`,
);
console.log(`Own text: ${pct(m.own[0].share)} (${m.own[0].page}) to ${pct(m.own.at(-1).share)}.`);
for (const o of m.own)
  console.log(
    `  ${o.page}: ${o.own} of ${o.total} own, ${pct(o.share)} (on no other page: ${o.unique}, ${pct(o.uniqueShare)})`,
  );
console.log("Highest pairs:");
for (const p of m.pairs.slice(0, 8))
  console.log(`  ${p.a} / ${p.b}: ${p.same} of ${p.shorter}, ${pct(p.share)}`);
if (process.argv.includes("--table")) {
  console.log(
    "\n| Page A | Page B | Identical sentences | Share of the shorter page |\n|---|---|---|---|",
  );
  for (const p of m.pairs)
    console.log(`| ${p.a} | ${p.b} | ${p.same} of ${p.shorter} | ${pct(p.share)} |`);
}
const jsonAt = process.argv.indexOf("--json");
if (jsonAt > 0) {
  const { writeFileSync } = await import("node:fs");
  writeFileSync(process.argv[jsonAt + 1], JSON.stringify(m, null, 1));
}
if (f.own.length || f.pairs.length) {
  console.log(
    `FAIL: ${f.own.length} pages under 70 percent own text, ${f.pairs.length} pairs above 35 percent.`,
  );
  process.exit(1);
}
console.log("PASS: every page at least 70 percent its own text, no pair above 35 percent.");
