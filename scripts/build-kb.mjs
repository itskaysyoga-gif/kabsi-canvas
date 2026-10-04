// Publishes the knowledge base (knowledge/kabsi-facts.md) as public/llms-full.txt: the full-facts file for AI
// search (llmstxt.org) and the source the website assistant reads (D261). Run after editing the KB:
//   node scripts/build-kb.mjs
import { readFileSync, writeFileSync } from "node:fs";

const kb = readFileSync(new URL("../knowledge/kabsi-facts.md", import.meta.url), "utf8");
if (/—/.test(kb)) throw new Error("The knowledge base contains an em dash (house rule D244). Remove it first.");
const head = `# Kabsi: full facts\n\n> Kabsi keeps a local business's Google Business Profile complete and current by following Google's own published guidance, and the owner approves every change: a Profile Score, a Do now list with a ready draft for each item, a reply to every review in the reviewer's language, a weekly post, photo checks, special hours and Listing Shield. Nothing is posted until the owner approves it. Kabsi is independent and not affiliated with Google. Short version: https://kabsi-app.lovable.app/llms.txt\n\n`;
writeFileSync(new URL("../public/llms-full.txt", import.meta.url), head + kb.trim() + "\n");
console.log(`public/llms-full.txt: ${kb.split(/\s+/).length} words`);
