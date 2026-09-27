// Publishes the knowledge base (docs/KNOWLEDGE-BASE.md) as public/llms-full.txt: the full-facts file for AI
// search (llmstxt.org) and the source the website assistant reads (D261). Run after editing the KB:
//   node scripts/build-kb.mjs
import { readFileSync, writeFileSync } from "node:fs";

const kb = readFileSync(new URL("../docs/KNOWLEDGE-BASE.md", import.meta.url), "utf8");
if (/—/.test(kb)) throw new Error("The knowledge base contains an em dash (house rule D244). Remove it first.");
const head = `# Kabsi: full facts\n\n> Kabsi is a Google Business Profile assistant for local businesses in any country. Every new Google review arrives by email with a reply drafted in the reviewer's language, and nothing is posted until the owner approves it. Kabsi is independent and not affiliated with Google. Short version: https://kabsi-app.lovable.app/llms.txt\n\n`;
writeFileSync(new URL("../public/llms-full.txt", import.meta.url), head + kb.trim() + "\n");
console.log(`public/llms-full.txt: ${kb.split(/\s+/).length} words`);
