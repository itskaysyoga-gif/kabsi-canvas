// K-108: design values come from the one theme block in src/styles.css, never from arbitrary values.
// Fails on a Tailwind arbitrary colour (bg-[#123456], text-[rgb(...)]), an arbitrary font (font-[Inter]),
// an inline colour or font in a style prop, and any hex colour in styles.css outside the @theme block.
//   node scripts/check-tokens.mjs            scans src
//   node scripts/check-tokens.mjs a.txt b.tsx  scans only those files (used by the test fixture)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const COLOUR_UTILS =
  "bg|text|border|ring|ring-offset|fill|stroke|from|via|to|outline|shadow|decoration|divide|accent|caret|placeholder";
const RULES = [
  [
    new RegExp(`(?:^|[\\s"'\`:!-])(?:${COLOUR_UTILS})-\\[(?:color:)?#[0-9a-fA-F]{3,8}\\]`),
    "arbitrary hex colour",
  ],
  [
    new RegExp(
      `(?:^|[\\s"'\`:!-])(?:${COLOUR_UTILS})-\\[(?:color:)?(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\\(`,
    ),
    "arbitrary colour function",
  ],
  [/(?:^|[\s"'`:!])font-\[/, "arbitrary font"],
  [
    /style=\{\{[^}]*(?:color|background|backgroundColor|fill|stroke|borderColor)\s*:\s*["'`]#[0-9a-fA-F]{3,8}/,
    "inline hex colour",
  ],
  [/style=\{\{[^}]*fontFamily\s*:/, "inline font family"],
];
const SCAN_EXT = /\.(tsx?|jsx?|mjs|css)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "routeTree.gen.ts") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (SCAN_EXT.test(name)) out.push(p);
  }
  return out;
}

/** Returns [{ line, rule, text }] for one file's contents. */
export function checkSource(file, text) {
  const found = [];
  const lines = text.split("\n");
  const isStyles = /(^|\/)styles\.css$/.test(file);
  let inTheme = false;
  lines.forEach((line, i) => {
    if (isStyles) {
      if (/^\s*@theme\b[^{]*\{/.test(line)) inTheme = true;
      else if (inTheme && /^\}/.test(line)) inTheme = false;
      else if (!inTheme && /#[0-9a-fA-F]{3,8}\b/.test(line.replace(/\/\*.*?\*\//g, ""))) {
        found.push({ line: i + 1, rule: "hex colour outside the @theme block", text: line.trim() });
      }
      return;
    }
    for (const [re, rule] of RULES) {
      if (re.test(line)) found.push({ line: i + 1, rule, text: line.trim() });
    }
  });
  return found;
}

const args = process.argv.slice(2);
const files = args.length ? args : walk(join(root, "src"));
let bad = 0;
for (const f of files) {
  for (const v of checkSource(f, readFileSync(f, "utf8"))) {
    bad++;
    console.error(`${relative(process.cwd(), f)}:${v.line}: ${v.rule}: ${v.text.slice(0, 120)}`);
  }
}
if (bad) {
  console.error(`\n${bad} design token violation(s). Use the tokens in src/styles.css (K-108).`);
  process.exit(1);
}
console.log(`Design tokens ok (${files.length} files).`);
