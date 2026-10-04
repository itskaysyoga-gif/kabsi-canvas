// K-34, guardrail 9: Kabsi talks to Google only through supabase/functions/_shared/google/. Fails on any Google API
// host (the googleapis domain) in code outside that folder.
//   node scripts/check-google-calls.mjs              scans src, supabase, workers and scripts
//   node scripts/check-google-calls.mjs a.ts b.txt   scans only those files (used by the test fixture)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const GOOGLE_API = /googleapis\.com/i;
const ALLOWED = join("supabase", "functions", "_shared", "google") + sep;
const DIRS = ["src", "supabase", "workers", "scripts"];
const SCAN_EXT = /\.(tsx?|jsx?|mjs|cjs|sql|toml)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".temp" || name === "dist") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(name)) out.push(p);
  }
  return out;
}

/** Returns [{ line, text }] for each line that names a Google API host. */
export function checkSource(text) {
  const found = [];
  text.split("\n").forEach((line, i) => {
    if (GOOGLE_API.test(line)) found.push({ line: i + 1, text: line.trim() });
  });
  return found;
}

const args = process.argv.slice(2);
const files = args.length
  ? args.map((f) => join(process.cwd(), f))
  : DIRS.flatMap((d) => {
      try {
        return walk(join(root, d));
      } catch {
        return [];
      }
    }).filter((f) => !relative(root, f).startsWith(ALLOWED));

let bad = 0;
for (const file of files) {
  for (const f of checkSource(readFileSync(file, "utf8"))) {
    bad++;
    console.error(
      `${relative(root, file)}:${f.line}: Google API call outside supabase/functions/_shared/google/: ${f.text}`,
    );
  }
}
if (bad) {
  console.error(
    `\n${bad} Google API call(s) outside the Google layer. Add the call to supabase/functions/_shared/google/ and import it from there (K-34).`,
  );
  process.exit(1);
}
