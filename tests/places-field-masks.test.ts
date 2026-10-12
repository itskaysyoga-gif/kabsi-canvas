import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// P0.2-06 (K-100): every Places request carries a field mask, and the reviews field is never asked for (it moves the
// whole call to the 30 dollar per 1,000 tier). Places is called only through the Google layer.
const FUNCTIONS = join(__dirname, "..", "supabase", "functions");
const LAYER = join(FUNCTIONS, "_shared", "google");

function walk(dir: string, out: string[] = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.ts$/.test(name) && !/\.test\.ts$/.test(name)) out.push(p);
  }
  return out;
}
const files = walk(FUNCTIONS);

describe("Places field masks (P0.2-06)", () => {
  it("the helper that sends a Places request is called with a mask, except Autocomplete", () => {
    const live = readFileSync(join(LAYER, "places", "live.ts"), "utf8");
    const calls = [...live.matchAll(/await places\(([^\n]*)/g)].map((m) => m[1]);
    expect(calls).toHaveLength(3);
    for (const c of calls) {
      if (c.includes("/places:autocomplete")) expect(c).toMatch(/key, null,/);
      else expect(c).toMatch(/key, fieldMask/);
    }
  });

  it("nothing outside the Google layer calls the Places helper or the Places host", () => {
    for (const f of files.filter((f) => !f.startsWith(LAYER))) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/places\.googleapis\.com/);
      expect(text, f).not.toMatch(/\bplaces\(\s*["'`]\//);
    }
  });

  it("every searchText and getPlace call outside the layer passes a literal mask without the reviews field", () => {
    let seen = 0;
    for (const f of files.filter((f) => !f.startsWith(LAYER))) {
      const text = readFileSync(f, "utf8");
      for (const m of text.matchAll(/\b(?:searchText|getPlace)\(([^\n]*)\)/g)) {
        const mask = m[1].match(/"([^"]*[a-zA-Z.,]+)"\s*(?:,\s*[^,]*)?$/)?.[1] ?? "";
        expect(mask, `${f}: ${m[0]}`).not.toBe("");
        expect(mask.toLowerCase(), `${f}: ${m[0]}`).not.toContain("review");
        seen++;
      }
    }
    expect(seen).toBe(5);
  });
});
