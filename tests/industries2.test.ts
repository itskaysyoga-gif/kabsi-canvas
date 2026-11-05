// Industries 2 (master plan 30.32): every industry page on the Design 9 template. The section rule (30.25 item 3), the
// search words (item 4), the SEO limits (B-017) and the yellow rule (item 3) are checked here for every page, so a new
// trade cannot ship without them. The long reading blocks are exempt (30.29 item 2, B-014).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDUSTRIES, industriesAtoZ, industry, industryIndexed } from "../src/content/industries";

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const DASH_OR_BANG = /[–—!]/;
// The never-say list (COPY.md 0.1, master plan 30.15 section 1, K-144): no rankings, more reviews, customers or revenue.
const NEVER = [
  /\brank(s|ing|ings)?\b/i,
  /top of google/i,
  /more (reviews|customers|calls|bookings|clients|patients|revenue|sales)/i,
  /\bguarantee/i,
  /\bautomatically\b/i,
  /\blisting\b/i,
  /\bvisibility\b/i,
  /google[- ]?(approved|partner)/i,
  /\b24\/7\b/,
  /set and forget/i,
];

const pages = INDUSTRIES.filter((i) => i.finished);

describe("every industry page on Design 9 (Industries 2)", () => {
  it("follows the section rule: an H1 of at most 8 words, lines of at most 20", () => {
    for (const i of pages) {
      const p = i.page;
      expect(words(p.h1), i.slug).toBeLessThanOrEqual(8);
      expect(words(p.line), i.slug).toBeLessThanOrEqual(20);
      expect(words(p.watch.line), i.slug).toBeLessThanOrEqual(20);
      expect(words(`What Kabsi watches for a ${i.name}`), i.slug).toBeLessThanOrEqual(8);
      expect(words(`Questions ${i.name} owners ask`), i.slug).toBeLessThanOrEqual(8);
    }
  });

  it("puts one key phrase of the H1 on the yellow bar, exactly once", () => {
    for (const i of pages) {
      expect(i.page.h1.split(i.page.mark).length - 1, i.slug).toBe(1);
    }
  });

  it("has a title under 60 characters in one pattern, and a description under 160", () => {
    for (const i of pages) {
      expect(i.page.title.length, i.slug).toBeLessThan(60);
      expect(i.page.title, i.slug).toMatch(/^.+ Google Business Profile help \| Kabsi$/);
      expect(i.page.description.length, i.slug).toBeLessThan(160);
    }
  });

  it("uses its main query once in the title, the H1 or its line, the answer and the description", () => {
    const has = (s: string, q: string) => s.toLowerCase().includes(q.toLowerCase());
    for (const i of pages) {
      const q = i.page.query;
      expect(has(i.page.title, q), `${i.slug} title`).toBe(true);
      expect(has(i.page.h1, q) || has(i.page.line, q), `${i.slug} h1 or line`).toBe(true);
      expect(has(i.page.answer, q), `${i.slug} answer`).toBe(true);
      expect(has(i.page.description, q), `${i.slug} description`).toBe(true);
    }
  });

  it("has five trade questions, three jobs, an Example watch, post and AI answer, and two related trades", () => {
    for (const i of pages) {
      expect(i.faqs, i.slug).toHaveLength(5);
      expect(i.page.jobs, i.slug).toHaveLength(3);
      expect(i.page.watch.fields.length, i.slug).toBeGreaterThanOrEqual(4);
      expect(i.page.post.quote, i.slug).toBeTruthy();
      expect(i.page.ai.question.endsWith("?"), i.slug).toBe(true);
      for (const r of i.page.related) {
        expect(industry(r), `${i.slug} related ${r}`).toBeDefined();
        expect(r, i.slug).not.toBe(i.slug);
      }
    }
  });

  it("only watches details Kabsi watches (facts 04, Google Profile)", () => {
    const WATCHED = new Set([
      "Name",
      "Main category",
      "Phone",
      "Website",
      "Address",
      "Service area",
      "Opening hours",
      "Special hours",
      "Description",
      "Open status",
      "Attributes",
    ]);
    for (const i of pages)
      for (const f of i.page.watch.fields) expect(WATCHED.has(f), `${i.slug}: ${f}`).toBe(true);
  });

  it("never uses a dash, an exclamation mark or a never-say word in the page's own lines", () => {
    for (const i of pages) {
      const text = JSON.stringify({ page: i.page, faqs: i.faqs, lead: i.lead });
      expect(DASH_OR_BANG.test(text), i.slug).toBe(false);
      for (const n of NEVER) expect(text, `${i.slug}: ${n}`).not.toMatch(n);
    }
  });

  it("has a wide (3:2) and a tall photo with alt text", () => {
    for (const i of pages) {
      const [wide, tall] = i.photos;
      expect(wide.w / wide.h, i.slug).toBeCloseTo(1.5, 1);
      expect(tall.h, i.slug).toBeGreaterThan(tall.w);
      expect(wide.alt && tall.alt, i.slug).toBeTruthy();
    }
  });

  it("/for lists every indexed page alphabetically", () => {
    const list = industriesAtoZ();
    expect(list.map((i) => i.slug).sort()).toEqual(
      INDUSTRIES.filter(industryIndexed)
        .map((i) => i.slug)
        .sort(),
    );
    const names = list.map((i) => i.plural);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "en")));
  });

  it("puts the highlight in one shared component, used by the hero title, the industry pages and /for", () => {
    expect(readFileSync("src/components/kabsi/d9-title.tsx", "utf8")).toContain("<Highlight>");
    const page = readFileSync("src/components/kabsi/d9-industry.tsx", "utf8");
    expect(page).toContain("<Marked text={p.h1} mark={p.mark} />");
    expect(page).toContain("<Marked text={FOR_HERO.h1} mark={FOR_HERO.mark} />");
    expect(readFileSync("DESIGN.md", "utf8")).toContain("The highlight bar");
  });
});
