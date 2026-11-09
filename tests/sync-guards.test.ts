// Sync 1 part B (master plan 30.45 item 6): the guards that walk every surface of docs/SYNC.md. prices.test.ts, claims-k144.test.ts,
// website-home.test.ts and the email, WhatsApp and request book tests each keep watching their own screens; this file
// runs one set of rules over all of them at once: the plan prices, the founding prices, the extra location and the founding
// places (read from src/lib/site.ts), the never-say names and claims, and the house style.
import { describe, expect, it } from "vitest";
import { CATALOGUE } from "../supabase/functions/_shared/creem";
import { FOUNDING_PRICES, PLAN_PRICES } from "../src/lib/site";
import {
  BANG,
  DASHES,
  NEVER_CLAIMS,
  RETIRED_NAMES,
  SAYS_NOT,
  KNOWN_FINDINGS,
  SURFACES,
  isKnown,
  placeCountProblems,
  priceProblems,
  surfaceText,
  type Surface,
} from "./helpers/house-rules";

const each = (fn: (s: Surface, file: string, text: string) => string[]): string[] =>
  SURFACES.flatMap((s) => s.files.flatMap((f) => fn(s, f, surfaceText(s, f)).map((p) => `${f}: ${p}`)));

describe("the surface list", () => {
  it("covers the surfaces of docs/SYNC.md and every file it names exists", () => {
    const names = SURFACES.map((s) => s.name);
    for (const n of ["Facts", "Copy deck", "Auth emails", "WhatsApp agent, templates and request book", "Outbound templates", "Creem products and billing words", "Nora's rules and pages", "Share image words"]) {
      expect(names).toContain(n);
    }
    for (const s of SURFACES) expect(s.files.length, s.name).toBeGreaterThan(0);
    expect(SURFACES.flatMap((s) => s.files).length).toBeGreaterThan(400);
  });
  it("is named in docs/SYNC.md", async () => {
    const { readFileSync } = await import("node:fs");
    const sync = readFileSync("docs/SYNC.md", "utf8");
    expect(sync).toContain("tests/sync-guards.test.ts");
    expect(sync).toContain("tests/helpers/house-rules.ts");
  });
});

describe("a Kabsi plan costs what src/lib/site.ts says, on every surface", () => {
  it("facts, COPY.md, auth and product emails, WhatsApp, Outbound, billing, Nora, server copy and share images", () => {
    expect(each((_s, _f, t) => priceProblems(t))).toEqual([]);
  });
  it("the Creem catalogue holds the same amounts, in cents", () => {
    const want: Record<string, number> = {
      essentials_month: FOUNDING_PRICES.essentialsMonthly,
      essentials_year: FOUNDING_PRICES.essentialsYearly,
      pro_month: FOUNDING_PRICES.proMonthly,
      pro_year: FOUNDING_PRICES.proYearly,
      essentials_month_list: PLAN_PRICES.essentialsMonthly,
      essentials_year_list: PLAN_PRICES.essentialsYearly,
      pro_month_list: PLAN_PRICES.proMonthly,
      pro_year_list: PLAN_PRICES.proYearly,
      extra_month: PLAN_PRICES.extraLocationMonthly,
      extra_year: PLAN_PRICES.extraLocationYearly,
    };
    expect(Object.keys(CATALOGUE).sort()).toEqual(Object.keys(want).sort());
    for (const [key, product] of Object.entries(CATALOGUE)) expect(product.price, key).toBe(want[key]! * 100);
  });
  it("the founding place counts are the constants (30 paying businesses, 25 applications)", () => {
    expect(each((_s, _f, t) => placeCountProblems(t))).toEqual([]);
  });
  it("catches a different amount for a plan, a wrong period and a wrong count", () => {
    expect(priceProblems("Essentials is $39 a month.")).toHaveLength(1);
    expect(priceProblems("Pro is $59 a month or $390 a year.")).toEqual([]);
    expect(priceProblems("Pro is $590 a month.")).toHaveLength(1);
    expect(priceProblems("An extra location is $15 a month or 150 US dollars a year.")).toEqual([]);
    expect(priceProblems("The extra location is $25 a month.")).toHaveLength(1);
    expect(priceProblems("Plans start at $9 a month.")).toHaveLength(1);
    expect(priceProblems("You earn $14.75 a month for each Pro business a partner refers.")).toEqual([]);
    expect(priceProblems("Pro was $19 a month before 30 Oct.")).toEqual([]);
    expect(placeCountProblems("The first 40 paying businesses pay less.")).toHaveLength(1);
    expect(placeCountProblems("12 of 30 founding places left. Founding 25. 25 places left.")).toEqual([]);
    expect(placeCountProblems("Founding 20")).toHaveLength(1);
  });
});


/** The lines a never-say rule reads: a prose line, or a line of code a reader sees; a question may name a claim to answer it. */
const linesOf = (s: Surface, t: string) =>
  (s.kind === "code" ? t.split("\n") : t.split("\n")).filter((line) => !/\?\**\s*$/.test(line));
/** Where a line may say that something is gone or never promised: prose (facts, COPY.md) and Nora's own rules. */
const mayNegate = (s: Surface) => s.kind !== "code" || s.name === "Nora's rules and pages";

describe("the never-say list runs over every surface, not only the site", () => {
  it("no retired or never-used product name, except where a line says it is gone", () => {
    expect(
      each((s, _f, t) =>
        linesOf(s, t)
          .filter((line) => RETIRED_NAMES.test(line) && !(mayNegate(s) && SAYS_NOT.test(line)) && !isKnown(line))
          .map((line) => line.slice(0, 120)),
      ),
    ).toEqual([]);
  });
  it("every known finding still applies, so each is removed with its fix", () => {
    for (const k of KNOWN_FINDINGS) {
      const hit = SURFACES.some((s) => s.files.some((f) => surfaceText(s, f).includes(k.text)));
      expect(hit, `${k.why} is fixed: remove it from KNOWN_FINDINGS`).toBe(true);
    }
  });
  it("no promise the claims rule forbids, except where a line says Kabsi does not make it", () => {
    expect(
      each((s, _f, t) =>
        linesOf(s, t)
          .filter((line) => NEVER_CLAIMS.test(line) && !(mayNegate(s) && SAYS_NOT.test(line)))
          .map((line) => line.slice(0, 120)),
      ),
    ).toEqual([]);
  });
  it("no em dash, no en dash and no exclamation mark in a line a reader sees", () => {
    expect(each((_s, _f, t) => (DASHES.test(t) ? ["a dash"] : []))).toEqual([]);
    expect(
      each((_s, _f, t) =>
        t
          .split("\n")
          .filter((line) => BANG.test(line))
          .map((line) => line.slice(0, 100)),
      ),
    ).toEqual([]);
  });
  it("catches each kind of break", () => {
    expect(RETIRED_NAMES.test("Open your Profile Score")).toBe(true);
    expect(RETIRED_NAMES.test("Your weekly report")).toBe(false);
    expect(NEVER_CLAIMS.test("Kabsi replies automatically")).toBe(true);
    expect(NEVER_CLAIMS.test("Nothing goes live without your yes")).toBe(false);
    expect(BANG.test("Thank you!")).toBe(true);
    expect(BANG.test("a != b and !important")).toBe(false);
    expect(DASHES.test("one — two")).toBe(true);
    expect(SAYS_NOT.test("Weekly Care Report is retired")).toBe(true);
  });
});
