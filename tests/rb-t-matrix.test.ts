// RB-T (master plan 30.50 item 8): the scenario matrix document is written from the rows the fake-world test runs, and the
// industry table names each of the 21 industries exactly once.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matrixMarkdown, ROWS } from "../supabase/functions/_shared/whatsapp/rb-t.matrix";
import { INDUSTRY_PACKS, NO_PACK_EVER } from "../supabase/functions/_shared/request-book/packs/industries";
import { INDUSTRIES } from "@/content/industries";

describe("RB-T scenario matrix", () => {
  it("docs/kabsi-3/scenario-matrix.md is exactly the rows (run scripts/request-eval/matrix-doc.ts after a change)", () => {
    const doc = readFileSync("docs/kabsi-3/scenario-matrix.md", "utf8");
    expect(doc).toBe(matrixMarkdown() + "\n");
  });
  it("has one row per scenario per pack", () => {
    for (const p of ["salon", "gym", "garage"]) expect(ROWS.filter((r) => r.pack === p).length).toBe(ROWS.length / 3);
  });
  it("the document holds no em dash, en dash or exclamation mark", () => {
    expect(matrixMarkdown()).not.toMatch(/[‒-―−！!]/);
  });
});

describe("RB-T industry table", () => {
  it("maps each of the 21 industries once, and nothing else", () => {
    expect(Object.keys(INDUSTRY_PACKS).sort()).toEqual(INDUSTRIES.map((i) => i.slug).sort());
    expect(INDUSTRIES.length).toBe(21);
  });
  it("clinics and health map to none", () => {
    for (const s of NO_PACK_EVER) expect(INDUSTRY_PACKS[s]).toBeNull();
    for (const i of INDUSTRIES) if (/clinic|dental|physio|veterinary|optician/.test(i.slug)) expect(INDUSTRY_PACKS[i.slug]).toBeNull();
  });
});
