import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PLAN_PRICES, PLAN_PRICE_ROWS, PRICES_SENTENCE } from "../src/lib/site";
import { readText } from "./helpers/facts";

// The prices of lane R (22 Oct 2026), in US dollars: Essentials 19 a month or 190 a year, Pro 39 or 390, an extra
// location 15 or 150. The earlier single Pro price (19 a month or 190 a year) is retired: it is now the Essentials price,
// and nothing may call it the Pro price. Card payments are marked coming until Creem opens.
describe("PLAN_PRICES", () => {
  it("are the three prices, in whole dollars, and yearly is ten months", () => {
    expect(PLAN_PRICES).toEqual({
      essentialsMonthly: 19,
      essentialsYearly: 190,
      proMonthly: 39,
      proYearly: 390,
      extraLocationMonthly: 15,
      extraLocationYearly: 150,
    });
    expect(PLAN_PRICES.essentialsYearly).toBe(PLAN_PRICES.essentialsMonthly * 10);
    expect(PLAN_PRICES.proYearly).toBe(PLAN_PRICES.proMonthly * 10);
    expect(PLAN_PRICES.extraLocationYearly).toBe(PLAN_PRICES.extraLocationMonthly * 10);
  });
  it("read the same in the sentence and in the Plan page rows", () => {
    expect(PRICES_SENTENCE).toBe(
      "Essentials is $19 a month or $190 a year. Pro is $39 a month or $390 a year. An extra location is $15 a month or $150 a year. Prices are in US dollars, plus tax where it applies.",
    );
    expect(PLAN_PRICE_ROWS.map((r) => `${r.name}: ${r.price}`)).toEqual([
      "Kabsi Essentials: $19 a month or $190 a year",
      "Kabsi Pro: $39 a month or $390 a year",
      "Extra location: $15 a month or $150 a year",
    ]);
  });
});

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p, ext);
    return ext.test(name) && name !== "routeTree.gen.ts" && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

/** Every file a visitor, an owner or Nora can read a price in. */
const READABLE = [
  ...files("src", /\.(ts|tsx)$/),
  ...files("supabase/functions/_shared/email", /\.ts$/),
  ...files("docs/email-previews", /\.(txt|html)$/),
  "knowledge/kabsi-facts.md",
  "public/llms.txt",
  "public/llms-full.txt",
];

// A price that means something else, and where it is allowed.
const OTHER_AMOUNTS: Record<string, string[]> = {
  $35: ["src/components/app/knowledge-form.tsx"], // an example price in a help text
  $50: ["knowledge/kabsi-facts.md", "public/llms-full.txt", "public/llms.txt"], // the old partner payout minimum, named as changed
  $25: [
    "knowledge/kabsi-facts.md",
    "public/llms-full.txt",
    "public/llms.txt",
    "src/components/kabsi/d2-partners.tsx",
    "src/routes/partners_.terms.tsx",
  ], // the partner payout minimum (30.15 section 5)
  $0: ["knowledge/kabsi-facts.md", "public/llms-full.txt"],
};

describe("no retired price (lane R, 22 Oct 2026)", () => {
  it("nothing calls $19 a month or $190 a year the Pro price", () => {
    for (const f of READABLE) {
      const text = readText(f);
      expect(text, `${f}: Pro at the retired price`).not.toMatch(
        /\bPro\b[^.\n|]{0,40}\$(19|190)\b/,
      );
      expect(text, `${f}: the earlier single price`).not.toMatch(
        /earlier Pro price|\$19 Pro price|Pro \| \$19|Pro, monthly \| \$19/,
      );
    }
  });
  it("every dollar amount a reader can see is one of the six prices", () => {
    const allowed = new Set(Object.values(PLAN_PRICES).map((n) => `$${n}`));
    for (const f of READABLE.filter((p) => !/kabsi-facts|llms-full/.test(p))) {
      const text = readText(f).replace(/\$\{[^}]*\}/g, "");
      for (const m of text.matchAll(/\$(\d{2,}[\d,]*)/g)) {
        const amount = `$${m[1]}`;
        if (allowed.has(amount)) continue;
        expect(OTHER_AMOUNTS[amount] ?? [], `${f} shows ${amount}`).toContain(f);
      }
    }
  });
  it("the facts file and llms-full.txt quote the six prices and no other Pro price", () => {
    for (const f of ["knowledge/kabsi-facts.md", "public/llms-full.txt"]) {
      const text = readText(f);
      expect(text).toContain("Essentials is $19 a month or $190 a year");
      expect(text).toContain("Pro is $39 a month or $390 a year");
      expect(text).toContain("An extra location is $15 a month or $150 a year");
      expect(text).toContain(
        "Card payments in US dollars are coming. Until they open there is nothing to pay.",
      );
    }
  });
});
