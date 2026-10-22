import { describe, expect, it } from "vitest";
import {
  CARD_PAYMENTS_COMING as EMAIL_CARD_PAYMENTS_COMING,
  PLAN_PRICES as EMAIL_PRICES,
  PRICES_SENTENCE as EMAIL_SENTENCE,
} from "../supabase/functions/_shared/email/lifecycle-copy";
import { OPT_IN_COUNTRIES } from "../supabase/functions/_shared/lifecycle";
import { CARD_PAYMENTS_COMING } from "../src/lib/plans";
import { PLAN_PRICES, PRICES_SENTENCE } from "../src/lib/site";

// P0.4-10: the lifecycle emails quote the prices the site shows. The rules and the time-travel tests are in
// supabase/functions/_shared/lifecycle.test.ts (Deno).
describe("lifecycle emails", () => {
  it("quote the same prices as the site (K-106, G-30)", () => {
    expect(EMAIL_PRICES).toEqual(PLAN_PRICES);
    expect(EMAIL_SENTENCE).toBe(PRICES_SENTENCE);
    expect(EMAIL_CARD_PAYMENTS_COMING).toBe(CARD_PAYMENTS_COMING);
    expect(PLAN_PRICES.proYearly).toBe(PLAN_PRICES.proMonthly * 10);
  });

  it("need an opt-in in the launch markets the law or G-24 name, and not in the others", () => {
    for (const c of ["GB", "IE", "AE", "SA"]) expect(OPT_IN_COUNTRIES.has(c), c).toBe(true);
    for (const c of ["US", "CA", "AU", "NZ", "SG"]) expect(OPT_IN_COUNTRIES.has(c), c).toBe(false);
  });
});
