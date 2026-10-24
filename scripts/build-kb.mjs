// Builds the facts (master plan 27.12): knowledge/facts/*.md into knowledge/kabsi-facts.md, public/llms-full.txt and
// public/llms.txt, through scripts/kb-lib.mjs. Run after editing anything in knowledge/facts/:
//   node scripts/build-kb.mjs           write the three files
//   node scripts/build-kb.mjs --check   exit 1 if a file is out of date (nothing is written)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { buildAll } from "./kb-lib.mjs";

const check = process.argv.includes("--check");
const outputs = buildAll();
let stale = 0;
for (const [path, text] of Object.entries(outputs)) {
  const url = new URL(`../${path}`, import.meta.url);
  const current = existsSync(url) ? readFileSync(url, "utf8") : null;
  if (check) {
    if (current !== text) {
      stale += 1;
      console.error(`${path} is out of date: run node scripts/build-kb.mjs`);
    }
  } else {
    writeFileSync(url, text);
    console.log(`${path}: ${text.split(/\s+/).length} words`);
  }
}
if (check && stale) process.exit(1);
