import { describe, expect, it } from "vitest";
import { PRICES } from "../src/lib/site";

// Constants that D281 and the spec fix; Q04 added Pro monthly and yearly. K-123 to K-127 removed the Lebanon bundle,
// the card prices and the partner rates (P0.8-01).
describe("PRICES", () => {
  it("is in US dollars with the plan and extra-location prices only (K-123 to K-127)", () => {
    expect(PRICES.proMonthly).toBe(19);
    expect(PRICES.proYearly).toBe(190);
    expect(PRICES.extraLocationMonthly).toBe(15);
    expect(PRICES.extraLocationYearly).toBe(150);
    // No Lebanon bundle, no card prices, no partner or founding rates.
    expect(Object.keys(PRICES).sort()).toEqual(
      ["extraLocationMonthly", "extraLocationYearly", "proMonthly", "proYearly"].sort(),
    );
  });

  it("every price is a positive whole number of dollars", () => {
    for (const [name, value] of Object.entries(PRICES)) {
      expect(Number.isInteger(value), name).toBe(true);
      expect(value, name).toBeGreaterThan(0);
    }
  });
});
