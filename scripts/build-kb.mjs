// Publishes the knowledge base (knowledge/kabsi-facts.md) as public/llms-full.txt: the full-facts file for AI
// search (llmstxt.org) and the source the website assistant reads (K-104). Run after editing the KB:
//   node scripts/build-kb.mjs
import { readFileSync, writeFileSync } from "node:fs";

const kb = readFileSync(new URL("../knowledge/kabsi-facts.md", import.meta.url), "utf8");
if (/—/.test(kb)) throw new Error("The knowledge base contains an em dash (house rule: no em dashes). Remove it first.");
const head = `# Kabsi: full facts\n\n> Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, a Weekly Care Report and fresh posts. The owner approves every change and nothing is published without it. Kabsi is independent and not affiliated with Google. Short version: https://kabsi-app.lovable.app/llms.txt\n\n`;
writeFileSync(new URL("../public/llms-full.txt", import.meta.url), head + kb.trim() + "\n");
console.log(`public/llms-full.txt: ${kb.split(/\s+/).length} words`);
