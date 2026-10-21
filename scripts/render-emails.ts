// Renders every email kind to docs/email-previews/<kind>.html and <kind>.txt, plus index.html (P0.8-02).
// Run after changing any email:  deno run --allow-read --allow-write scripts/render-emails.ts
// Nothing is sent: the files are for reading in a browser. tests/email-previews.test.ts keeps them current.
import { previewIndex, previews } from "../supabase/functions/_shared/email/previews.ts";

const dir = new URL("../docs/email-previews/", import.meta.url);
await Deno.mkdir(dir, { recursive: true });
const keep = new Set(["index.html"]);
const list = previews();
for (const p of list) {
  await Deno.writeTextFile(new URL(`${p.kind}.html`, dir), p.html);
  await Deno.writeTextFile(new URL(`${p.kind}.txt`, dir), p.text);
  keep.add(`${p.kind}.html`).add(`${p.kind}.txt`);
}
await Deno.writeTextFile(new URL("index.html", dir), previewIndex(list));
for await (const f of Deno.readDir(dir))
  if (f.isFile && !keep.has(f.name)) await Deno.remove(new URL(f.name, dir));
console.log(`docs/email-previews: ${list.length} emails`);
