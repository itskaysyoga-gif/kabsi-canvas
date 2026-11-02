// QA 2: the words check on every email Kabsi sends (the rendered previews and the four Supabase Auth templates) and every
// WhatsApp text Kabsi owns (the templates and the messages in _shared/whatsapp). Prints each hit with its file and context.
import { readFileSync, readdirSync } from "node:fs";
import { words } from "./lib.mjs";

const strip = (h) => h.replace(/<!--[\s\S]*?-->/g, " ").replace(/<!doctype[^>]*>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'");
const files = [
  ...readdirSync("docs/email-previews").filter((f) => f !== "index.html").map((f) => `docs/email-previews/${f}`),
  ...readdirSync("emails/auth").filter((f) => f.endsWith(".html")).map((f) => `emails/auth/${f}`),
];
const hits = [];
for (const f of files) for (const h of words(strip(readFileSync(f, "utf8")))) hits.push({ f, ...h });
// WhatsApp: the string literals of the files that hold what a person reads (comments left out).
for (const f of ["templates.ts", "say.ts", "alert-text.ts", "nora.ts", "google-action.ts", "policy.ts", "agent.ts", "router.ts", "map.ts", "media.ts"]) {
  const src = readFileSync(`supabase/functions/_shared/whatsapp/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const lits = [...src.matchAll(/"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)].map((m) => m[1] ?? m[2]).filter((s) => /\s/.test(s) && /[a-z]{3}/.test(s));
  for (const l of lits) for (const h of words(l)) hits.push({ f: `whatsapp/${f}`, ...h });
}
const seen = new Set();
for (const h of hits) { const k = `${h.f}|${h.name}|${h.context}`; if (seen.has(k)) continue; seen.add(k); console.log(`${h.f}\t${h.name}\t${h.match}\t${h.context}`); }
console.log(`${seen.size} hits in ${files.length} email files and the WhatsApp texts`);
