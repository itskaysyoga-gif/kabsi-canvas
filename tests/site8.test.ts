// SITE-8 (R-167, lane R): the public pages scannable in seconds. Headlines of 7 words or fewer, one support line of 18
// words or fewer, no paragraph over 25 words (35 on Pricing), the trade hero line the trade's own, one trust list, the
// Google claims one line each with their sources in one footnote, and nothing required gone.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDUSTRIES } from "../src/content/industries";
import { TRADE_WORK } from "../src/content/industries/trade-work";
import { tradeH1, tradeHeroLine } from "../src/components/kabsi/d9-industry";
import {
  FAQ_V31,
  HERO_MARKS,
  HOME_HERO,
  PRICE,
  PROBLEM,
  PROOF,
  START,
  TELL,
  WEEK,
} from "../src/components/marketing/v31-data";
import {
  BILLING_QUESTIONS,
  FIRST_DAYS,
  HOW,
  LEAVING,
  PRICING,
} from "../src/components/marketing/v31-more";
import { TRIAL_LINE } from "../src/lib/offer";

const words = (s: string) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const read = (p: string) => readFileSync(p, "utf8");

describe("SITE-8: headlines and support lines", () => {
  it("keeps every section headline at 7 words or fewer", () => {
    for (const h of [
      HOME_HERO.title,
      PROBLEM.title,
      WEEK.title,
      TELL.title,
      START.title,
      PROOF.title,
      PRICE.title,
      HOW.title,
      PRICING.title,
      FIRST_DAYS.title,
      LEAVING.title,
      "When Google changes something, you see it.",
      "Built for your kind of business.",
    ])
      expect(words(h), h).toBeLessThanOrEqual(7);
    for (const i of INDUSTRIES) expect(words(tradeH1(i)), i.slug).toBeLessThanOrEqual(7);
  });
  it("keeps each support line at 18 words or fewer", () => {
    for (const l of [HOME_HERO.line, TELL.line, HOW.line, PRICING.line])
      expect(words(l), l).toBeLessThanOrEqual(18);
  });
  it("gives each trade page its own hero line, never Home's", () => {
    const seen = new Set<string>();
    for (const i of INDUSTRIES) {
      const l = tradeHeroLine(i);
      expect(words(l), i.slug).toBeLessThanOrEqual(18);
      expect(l).not.toBe(HOME_HERO.line);
      expect(seen.has(l), i.slug).toBe(false);
      seen.add(l);
    }
    expect(read("src/components/kabsi/d9-industry.tsx")).toContain("{tradeHeroLine(i)}");
  });
  it("keeps the three 'What Kabsi does' items to a bold line and 12 words", () => {
    for (const [slug, w] of Object.entries(TRADE_WORK))
      for (const x of w.does) expect(words(x.text), `${slug}: ${x.text}`).toBeLessThanOrEqual(12);
  });
});

describe("SITE-8: short paragraphs, facts once", () => {
  it("has no paragraph over 25 words on Home and How it works, and none over 35 on Pricing", () => {
    for (const t of [
      ...PROBLEM.points.map((p) => p.text),
      START.firstDay,
      TELL.voiceLine,
      ...HOW.steps.map((s) => s.text),
      HOW.ask,
      ...FAQ_V31.map((f) => f.a),
    ])
      expect(words(t), t).toBeLessThanOrEqual(25);
    for (const t of [
      ...FIRST_DAYS.steps.map((s) => s.text),
      FIRST_DAYS.starts,
      ...LEAVING.points.map((p) => p.text),
      LEAVING.law,
      PRICING.free,
      ...BILLING_QUESTIONS.map((q) => q.a),
    ])
      expect(words(t), t).toBeLessThanOrEqual(35);
  });
  it("shows the trial terms in full in the price band only, a line each", () => {
    expect(PRICE.termLines.join(" ")).toBe(TRIAL_LINE);
    expect(read("src/components/marketing/v31-pages.tsx")).not.toContain("TRIAL_LINE");
    expect(read("src/components/marketing/v31-pages.tsx")).toContain("{TRIAL_SHORT}");
  });
  it("keeps one trust list, with every required line", () => {
    expect([...HERO_MARKS]).toEqual(
      expect.arrayContaining([
        "No Google password",
        "Nothing is published without your yes",
        "Kabsi never contacts your customers",
        "Independent and not affiliated with Google",
      ]),
    );
    const home = read("src/components/marketing/v31.tsx");
    expect(home.slice(home.indexOf("export function V31Home"))).not.toContain("<TrustLines");
    expect(read("src/components/kabsi/d9-industry.tsx")).not.toContain("<TrustLines");
  });
  it("keeps each Google claim to one line, with the sources in one footnote", () => {
    for (const p of PROBLEM.points) {
      expect(words(p.text)).toBeLessThanOrEqual(12);
      expect(p.source).toMatch(/^https:\/\/support\.google\.com\/business\/answer\/\d+/);
    }
    const home = read("src/components/marketing/v31.tsx");
    expect(home).toContain("Sources: Google Business Profile Help");
    expect(home.match(/PROBLEM_SOURCES\.map/g)).toHaveLength(1);
  });
  it("uses no dashes or exclamation marks in the new words", () => {
    for (const f of [
      "src/components/marketing/v31-data.ts",
      "src/components/marketing/v31-more.ts",
      "src/content/industries/trade-work.ts",
    ])
      for (const q of read(f).match(/"[^"\n]*"/g) ?? [])
        expect(q, f).not.toMatch(/[\u2013\u2014!]/);
  });
});
