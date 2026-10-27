// The one place that builds Kabsi's facts (master plan 27.12). knowledge/facts/*.md are the public facts that Nora and the
// website use, in file-name order; knowledge/facts/llms.txt is the short llms.txt. knowledge/internal/ holds team notes and is
// never read here, so it never reaches Nora, the website or the llms files. The outputs are:
//   knowledge/kabsi-facts.md   the combined facts (what Nora reads and the Edge Functions import)
//   public/llms-full.txt       the combined facts behind a short header (llmstxt.org)
//   public/llms.txt            a copy of knowledge/facts/llms.txt
// Run `node scripts/build-kb.mjs` after editing anything in knowledge/facts/; `--check` fails when an output is out of date.
import { readdirSync, readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const factsDir = new URL("knowledge/facts/", root);

export const OUTPUTS = {
  combined: "knowledge/kabsi-facts.md",
  full: "public/llms-full.txt",
  short: "public/llms.txt",
};

const LLMS_FULL_HEAD = `# Kabsi: full facts\n\n> Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, a weekly Results Report and fresh posts. The owner approves every change and nothing goes to Google without it. Kabsi is independent and not affiliated with Google. Short version: https://kabsi.co/llms.txt\n\n`;

/** The combined facts: every knowledge/facts/*.md in file-name order, joined as they were split. */
export function buildFacts() {
  const files = readdirSync(factsDir)
    .filter((f) => f.endsWith(".md"))
    .sort();
  const kb = files.map((f) => readFileSync(new URL(f, factsDir), "utf8")).join("");
  if (/[\u2014\u2013]/.test(kb))
    throw new Error(
      "The facts contain an em dash or an en dash (house rule: none). Remove it first.",
    );
  return kb;
}

export const buildLlmsFull = (kb = buildFacts()) => LLMS_FULL_HEAD + kb.trim() + "\n";
export const buildLlmsShort = () => readFileSync(new URL("llms.txt", factsDir), "utf8");

/** All three outputs as { path: text }. */
export function buildAll() {
  const kb = buildFacts();
  return {
    [OUTPUTS.combined]: kb,
    [OUTPUTS.full]: buildLlmsFull(kb),
    [OUTPUTS.short]: buildLlmsShort(),
  };
}
