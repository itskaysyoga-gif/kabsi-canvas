// Guides 3 (C): the house rules for every guide's content file. A guide that breaks one does not merge.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_GUIDES, EARLIER, ORDER } from "../src/content/guides";
import { scheduledAt } from "../src/content/guides/schedule";
import { guideText, textOf, wordCount } from "../src/content/guides/text";
import { INDUSTRIES } from "../src/content/industries";

const FILES = readdirSync("src/content/guides").filter((f) => f.endsWith(".tsx"));
const NEW = ALL_GUIDES.filter((g) => (ORDER as readonly string[]).includes(g.slug));
const ON_TEMPLATE = ALL_GUIDES.filter((g) => FILES.includes(`${g.slug}.tsx`));
const SLUGS = new Set<string>([...ORDER, ...EARLIER]);

// Master plan 30.15 section 1, 30.20 section 3 and COPY 0.1: never in a line a reader sees.
const NEVER = [
  /top of google/i,
  /more customers/i,
  /more bookings/i,
  /fully automatic/i,
  /set and forget/i,
  /we manage everything/i,
  /google[- ]approved/i,
  /google partner/i,
  /we remove bad reviews/i,
  /no work needed/i,
  /ai recommends you/i,
  /\bguarantee/i,
  /rank higher/i,
  /higher visibility/i,
  /\bvisibility\b/i,
  /\bgrid\b/i,
  /\bgeo\b/i,
  /profile score/i,
  /\bdo now\b/i,
  /listing shield/i,
  /put mine back/i,
  /\b24\/7\b/,
];

describe("Guides 3 content files", () => {
  it("every content file is a guide in the order, and every guide in the order has its file", () => {
    for (const f of FILES) expect(SLUGS.has(f.replace(/\.tsx$/, "")), f).toBe(true);
    for (const s of [...ORDER, ...EARLIER]) expect(FILES, s).toContain(`${s}.tsx`);
  });

  it("the new guides publish one every 2 days at 06:00 UTC, the first on the merge day", () => {
    ORDER.forEach((s, i) => {
      const g = NEW.find((x) => x.slug === s);
      if (g) expect(g.publishAt, s).toBe(scheduledAt(i));
    });
  });

  for (const g of ON_TEMPLATE) {
    describe(g.slug, () => {
      const text = guideText(g);
      const all = [g.title, g.description, g.summary, g.topic, text].join("\n");
      it("title of 60 characters or fewer, a description under 160", () => {
        expect(g.title.length).toBeLessThanOrEqual(60);
        expect(g.description.length).toBeLessThan(160);
        expect(g.description.length).toBeGreaterThan(60);
      });
      it("900 to 1,800 words", () => {
        const n = wordCount(text);
        expect(n, `${g.slug}: ${n} words`).toBeGreaterThanOrEqual(900);
        expect(n, `${g.slug}: ${n} words`).toBeLessThanOrEqual(1800);
      });
      it("the answer in at most two sentences, then three or four lines in short", () => {
        expect(g.answer.split(/(?<=[.?])\s+(?=[A-Z])/).length).toBeLessThanOrEqual(2);
        expect(g.inShort.length).toBeGreaterThanOrEqual(3);
        expect(g.inShort.length).toBeLessThanOrEqual(4);
      });
      it("no em dash, en dash, exclamation mark or Arabic", () => {
        const raw = readFileSync(`src/content/guides/${g.slug}.tsx`, "utf8");
        expect(raw).not.toMatch(/[\u2013\u2014]/);
        expect(all).not.toMatch(/!/);
        expect(raw).not.toMatch(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/);
      });
      it("none of the never-say words", () => {
        for (const re of NEVER) expect(all, `${g.slug} ${re}`).not.toMatch(re);
      });
      it("every heading is a question with a one-paragraph answer, ids unique", () => {
        const ids = g.sections.map((s) => s.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const s of g.sections) {
          expect(s.heading, s.id).toMatch(/\?$/);
          expect(s.answer.length, s.id).toBeGreaterThan(60);
          expect(s.id).toMatch(/^[a-z0-9-]+$/);
        }
      });
      it("sources are https pages with the day they were read, and the checked date is one of them", () => {
        expect(g.sources.length).toBeGreaterThanOrEqual(2);
        for (const s of g.sources) {
          expect(s.url, s.title).toMatch(/^https:\/\//);
          expect(s.read, s.title).toMatch(/^2026-\d\d-\d\d$/);
        }
        expect(g.sources.map((s) => s.read)).toContain(g.checked);
      });
      it("related guides and industry pages exist", () => {
        for (const r of g.related) expect(SLUGS.has(r), r).toBe(true);
        expect(g.related).not.toContain(g.slug);
        for (const i of g.industries)
          expect(
            INDUSTRIES.some((x) => x.slug === i),
            i,
          ).toBe(true);
      });
      it("says what Kabsi does once, and ends it with the free check", () => {
        const k = textOf(g.kabsi.body);
        expect(k.length).toBeGreaterThan(120);
        expect(
          JSON.stringify(g.kabsi.body, (_k, v) => (typeof v === "function" ? undefined : v)),
        ).toContain("/scan");
      });
    });
  }
});
