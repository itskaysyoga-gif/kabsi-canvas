// Guides 4 part C (master plan 30.32 item 4): the sitemap's lastmod for a page is the day of the last commit that touched the
// page's route or its content file (the sources listed in src/content/sitemap-pages.json), never a hand-typed date. This writes
// src/content/lastmod.json at build (the build script runs it first). Guides use their own `updated` date and are not here.
// Vercel clones with a short history, where `git log` cannot tell the real day: the script then tries to fetch the rest, and if
// it cannot, it keeps the file as it is in the repository (the last full run) and says so. Run by hand: node scripts/write-lastmod.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const pages = JSON.parse(readFileSync("src/content/sitemap-pages.json", "utf8"));
const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const OUT = "src/content/lastmod.json";

try {
  if (git("rev-parse", "--is-shallow-repository") === "true") {
    try {
      execFileSync("git", ["fetch", "--unshallow", "--quiet"], { stdio: "ignore", timeout: 60000 });
    } catch {
      /* no network or no rights: handled below */
    }
  }
  if (git("rev-parse", "--is-shallow-repository") === "true") {
    console.log("write-lastmod: the git history is short here, so lastmod.json is kept as committed.");
    process.exit(0);
  }
  const out = {};
  for (const p of pages) {
    const days = p.sources.map((f) => git("log", "-1", "--format=%cs", "--", f)).filter(Boolean);
    if (!days.length) throw new Error(`no commit found for ${p.path}`);
    out[p.path] = days.sort().at(-1);
  }
  writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.log(`write-lastmod: wrote ${Object.keys(out).length} dates to ${OUT}.`);
} catch (e) {
  console.log(`write-lastmod: kept ${OUT} as committed (${e.message}).`);
}
