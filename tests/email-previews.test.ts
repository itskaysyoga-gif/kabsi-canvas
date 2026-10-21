import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { catalog } from "../supabase/functions/_shared/email/catalog";
import { previewIndex, previews } from "../supabase/functions/_shared/email/previews";

// P0.8-02: docs/email-previews holds one HTML file (and its plain text) per email kind in the catalog, and they match
// what the template renders today. After changing an email run: deno run --allow-read --allow-write scripts/render-emails.ts
const dir = join(__dirname, "..", "docs", "email-previews");
const read = (f: string) => readFileSync(join(dir, f), "utf8");

describe("email previews", () => {
  const list = previews();

  it("one HTML and one text file per email kind in the catalog, nothing else", () => {
    expect(list.length).toBe(catalog().length);
    const files = readdirSync(dir).sort();
    const want = ["index.html", ...list.flatMap((p) => [`${p.kind}.html`, `${p.kind}.txt`])].sort();
    expect(files).toEqual(want);
  });

  it("every preview is current", () => {
    for (const p of list) {
      expect(existsSync(join(dir, `${p.kind}.html`)), p.kind).toBe(true);
      expect(read(`${p.kind}.html`), p.kind).toBe(p.html);
      expect(read(`${p.kind}.txt`), p.kind).toBe(p.text);
    }
    expect(read("index.html")).toBe(previewIndex(list));
  });
});
