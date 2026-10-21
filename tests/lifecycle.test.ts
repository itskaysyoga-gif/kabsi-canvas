import { describe, expect, it } from "vitest";
import { PRICE_MONTHLY, PRICE_YEARLY } from "../supabase/functions/_shared/email/lifecycle-copy";
import { OPT_IN_COUNTRIES } from "../supabase/functions/_shared/lifecycle";
import { PRICES } from "../src/lib/site";

// P0.4-10: the lifecycle emails quote the prices the site shows. The rules and the time-travel tests are in
// supabase/functions/_shared/lifecycle.test.ts (Deno).
describe("lifecycle emails", () => {
  it("quote the same prices as the site (K-106, G-30)", () => {
    expect(PRICE_MONTHLY).toBe(PRICES.proMonthly);
    expect(PRICE_YEARLY).toBe(PRICES.proYearly);
    expect(PRICE_YEARLY).toBe(PRICE_MONTHLY * 10);
  });

  it("need an opt-in in the launch markets the law or G-24 name, and not in the others", () => {
    for (const c of ["GB", "IE", "AE", "SA"]) expect(OPT_IN_COUNTRIES.has(c), c).toBe(true);
    for (const c of ["US", "CA", "AU", "NZ", "SG"]) expect(OPT_IN_COUNTRIES.has(c), c).toBe(false);
  });
});
