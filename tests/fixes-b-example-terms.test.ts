// Fixes B (R-126, DSH-01): the example search terms follow the business's trade. Every trade has its own list in the same
// shape and counts, and a hair salon is never shown a cafe term.
import { describe, expect, it } from "vitest";
import {
  EXAMPLE_TERMS_BY_TRADE,
  exampleTermsFor,
  tradeOf,
  type Trade,
} from "../supabase/functions/_shared/insights/example";

const TRADES = Object.keys(EXAMPLE_TERMS_BY_TRADE) as Trade[];
const CAFE_WORDS = /coffee|latte|flat white|cafe|brunch|pastr|espresso|oat milk/i;

describe("example search terms by trade", () => {
  it("covers hair salon, barber, beauty and nails, spa, clinic, restaurant, cafe, gym and a general list", () => {
    expect([...TRADES].sort()).toEqual(
      [
        "barber",
        "beauty_nails",
        "cafe",
        "clinic",
        "general",
        "gym",
        "hair_salon",
        "restaurant",
        "spa",
      ].sort(),
    );
  });

  it("gives every trade seven terms in the same shape: five counts, then two below the threshold", () => {
    for (const t of TRADES) {
      const rows = EXAMPLE_TERMS_BY_TRADE[t];
      expect(rows, t).toHaveLength(7);
      expect(
        rows.map((r) => r.insightsValue?.value ?? null),
        t,
      ).toEqual(["142", "86", "61", "37", "24", null, null]);
      expect(rows.slice(5).map((r) => r.insightsValue?.threshold)).toEqual(["15", "15"]);
      for (const r of rows) expect(r.searchKeyword).not.toMatch(/[\u2013\u2014!]/);
    }
  });

  it("gives every trade its own list: no two lists are the same and none shares a term with the cafe list", () => {
    const seen = new Set<string>();
    for (const t of TRADES) {
      const key = EXAMPLE_TERMS_BY_TRADE[t].map((r) => r.searchKeyword).join("|");
      expect(seen.has(key), t).toBe(false);
      seen.add(key);
      if (t === "cafe") continue;
      const cafe = new Set(EXAMPLE_TERMS_BY_TRADE.cafe.map((r) => r.searchKeyword));
      for (const r of EXAMPLE_TERMS_BY_TRADE[t])
        expect(cafe.has(r.searchKeyword!), `${t}: ${r.searchKeyword}`).toBe(false);
    }
  });

  it("never gives a hair salon a cafe term, whether the trade comes from the category, its label or the name", () => {
    const cafe = new Set(EXAMPLE_TERMS_BY_TRADE.cafe.map((r) => r.searchKeyword));
    for (const b of [
      { category: "hair_salon" },
      { categoryLabel: "Hair salon" },
      { name: "Juniper Hair Studio" },
      { category: "hair_salon", categoryLabel: "Hair salon", name: "Juniper Hair Studio" },
      { category: "hair_care" },
    ]) {
      const rows = exampleTermsFor(b);
      expect(tradeOf(b)).toBe("hair_salon");
      for (const r of rows) {
        expect(cafe.has(r.searchKeyword!)).toBe(false);
        expect(r.searchKeyword).not.toMatch(CAFE_WORDS);
      }
    }
  });

  it("reads the trade from Google's category first, then its label, then the name", () => {
    const cases: [Parameters<typeof tradeOf>[0], Trade][] = [
      [{ category: "barber_shop" }, "barber"],
      [{ category: "beauty_salon" }, "beauty_nails"],
      [{ categoryLabel: "Nail salon" }, "beauty_nails"],
      [{ category: "spa" }, "spa"],
      [{ category: "doctor" }, "clinic"],
      [{ categoryLabel: "Dental clinic" }, "clinic"],
      [{ category: "restaurant" }, "restaurant"],
      [{ category: "cafe" }, "cafe"],
      [{ category: "coffee_shop" }, "cafe"],
      [{ category: "gym" }, "gym"],
      [{ categoryLabel: "Hair and beauty salon" }, "hair_salon"],
      [{ category: "hair_salon", name: "Harbour Lane Coffee" }, "hair_salon"],
      [
        { category: "establishment", categoryLabel: "Salon", name: "Coffee and Cuts" },
        "hair_salon",
      ],
      [{ category: "bar", name: "Hair of the Dog Pub" }, "general"],
      [{ category: "bakery", name: "Spa Road Bakery" }, "general"],
      [{ category: "florist", name: "Beauty and Bloom" }, "general"],
      [{ name: "Smith Barbershop" }, "barber"],
      [{ categoryLabel: "Salon" }, "hair_salon"],
      [{ name: "Harbour Lane Coffee" }, "cafe"],
      [{ category: "bakery", name: "Rye and Co" }, "general"],
      [{}, "general"],
      [{ category: null, categoryLabel: null, name: null }, "general"],
    ];
    for (const [b, want] of cases) expect(tradeOf(b), JSON.stringify(b)).toBe(want);
  });
});
