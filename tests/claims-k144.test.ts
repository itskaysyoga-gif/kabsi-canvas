// K-144, plan 2.11 (lane R, 22 Oct 2026): nothing the owner, a visitor, Nora or an AI assistant can read says what
// Google's ranking uses or rewards. Kabsi says what it does instead. This reads the FAQ, the facts file, the published
// full-facts file and every page and library under src, so a retired line cannot come back.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FAQ } from "../src/lib/faq";
import { readText } from "./helpers/facts";

const RETIRED: RegExp[] = [
  /relevance,? distance,? and prominence/i,
  /\bprominence\b/i,
  /ways to improve (your )?(local )?rank/i,
  /Google'?s own (list|guidance) (of|lists)/i,
  /Google (ranks|prefers|rewards|favou?rs) /i,
  /Google doesn'?t say (that |they |it )/i,
  /Google says helpful replies/i,
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|tsx)$/.test(name) && name !== "routeTree.gen.ts" ? [p] : [];
  });
}

describe("no line says what Google's ranking uses or rewards (K-144)", () => {
  it("the FAQ", () => {
    const words = FAQ.map((f) => `${f.q}\n${f.a}`).join("\n");
    for (const re of RETIRED) expect(words).not.toMatch(re);
  });
  it("the facts file and the published full-facts file", () => {
    for (const file of ["knowledge/kabsi-facts.md", "public/llms-full.txt", "public/llms.txt"]) {
      const text = readText(file);
      for (const re of RETIRED) expect(text, `${file} ${re}`).not.toMatch(re);
    }
  });
  it("every page, library, component and Edge Function", () => {
    const files = [...sources("src"), ...sources("supabase/functions")].filter(
      (f) => !/\.test\.ts$/.test(f) && !f.endsWith("review-graphic/assets.ts"),
    );
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const re of RETIRED) expect(text, `${f} ${re}`).not.toMatch(re);
    }
  });
  it("still says Kabsi promises no ranking, and says what it does", () => {
    const facts = readText("knowledge/kabsi-facts.md");
    expect(facts).toMatch(
      /Nobody can promise a ranking, and we don't\. Kabsi does the parts you control/,
    );
    expect(facts).toMatch(/Never say what Google's ranking uses or rewards/);
  });
});
