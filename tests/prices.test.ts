import { describe, expect, it } from "vitest";
import { PRICES } from "../src/lib/site";

// Constants that D274, D281 and the spec fix; Q04 changes the rest (Pro monthly and yearly, no 6-month plan).
describe("PRICES", () => {
  it("keeps the Lebanon bundle and partner rates from the spec", () => {
    expect(PRICES.pro12).toBe(120);
    expect(PRICES.partnerRate).toBe(8);
    expect(PRICES.foundingRate).toBe(6);
  });

  it("extra cards cost $10 each or $40 for five", () => {
    expect(PRICES.extraCard).toBe(10);
    expect(PRICES.fiveCards).toBe(40);
    expect(PRICES.fiveCards).toBeLessThan(PRICES.extraCard * 5);
  });

  it("founding partners pay less than other partners", () => {
    expect(PRICES.foundingRate).toBeLessThan(PRICES.partnerRate);
  });

  it("every price is a positive whole number of dollars", () => {
    for (const [name, value] of Object.entries(PRICES)) {
      expect(Number.isInteger(value), name).toBe(true);
      expect(value, name).toBeGreaterThan(0);
    }
  });
});
