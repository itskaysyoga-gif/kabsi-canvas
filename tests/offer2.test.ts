// OFFER-2 (blueprint 3.1, R-163): one plan, one place for the price and trial words, and the Creem side of it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as offer from "@/lib/offer";
import {
  CATALOGUE,
  createBody,
  descriptionOf,
  effectOf,
  FOUNDING_MONTHS,
  foundingEndOf,
  OFFER_KEYS,
  setupPlan,
  TRIAL_DAYS,
} from "../supabase/functions/_shared/creem";

const EXACT = `// The public offer (blueprint 3.1, R-163). One place for price and trial wording.
export const PRICE_MONTHLY_USD = 29;
export const FOUNDING_MONTHLY_USD = 19;
export const TRIAL_DAYS = 14;
export const TRIAL_LINE = "14 days free. Then 29 US dollars a month until you cancel. A card is needed to start. Cancel before day 14 and you pay nothing.";
export const FOUNDING_LINE = "19 US dollars a month for your first 12 months. From month 13 the price is 29 US dollars a month. We email you 14 days before the change.";
export const PRIMARY_CTA = "Check my business free";
`;

describe("the offer file", () => {
  it("is exactly the shared text, and the Edge Functions' copy is the same file", () => {
    expect(readFileSync("src/lib/offer.ts", "utf8")).toBe(EXACT);
    expect(readFileSync("supabase/functions/_shared/offer.ts", "utf8")).toBe(EXACT);
  });
  it("agrees with the Creem catalogue", () => {
    expect(CATALOGUE.essentials_month_list.price).toBe(offer.PRICE_MONTHLY_USD * 100);
    expect(CATALOGUE.essentials_month.price).toBe(offer.FOUNDING_MONTHLY_USD * 100);
    expect(CATALOGUE.extra_month.price).toBe(offer.PRICE_MONTHLY_USD * 100);
    expect(TRIAL_DAYS).toBe(offer.TRIAL_DAYS);
    expect(FOUNDING_MONTHS).toBe(12);
    expect(OFFER_KEYS).toEqual(["essentials_month_list", "essentials_month", "extra_month"]);
  });
});

describe("Creem checkout", () => {
  it("states the month-13 price on the founding product, and the plain description on the list product", () => {
    expect(descriptionOf("essentials_month")).toBe(offer.FOUNDING_LINE);
    expect(createBody("essentials_month", "https://kabsi.co/billing/done")).toMatchObject({
      price: 1900,
      description: offer.FOUNDING_LINE,
    });
    expect(createBody("essentials_month_list", "https://kabsi.co/billing/done")).toMatchObject({
      price: 2900,
      name: "Kabsi, monthly",
    });
    expect(descriptionOf("essentials_month_list")).not.toMatch(/19/);
  });
  it("the founding price ends 12 months after the first payment", () => {
    expect(foundingEndOf(new Date("2026-12-10T09:00:00Z")).toISOString()).toBe(
      "2027-12-10T09:00:00.000Z",
    );
    expect(foundingEndOf(new Date("2028-02-29T09:00:00Z")).toISOString()).toBe(
      "2029-02-28T09:00:00.000Z",
    );
  });
  it("a trial with a card opens the plan until Creem's trial end, and is not a payment", () => {
    const e = effectOf(
      {
        id: "evt_t",
        eventType: "subscription.trialing",
        created_at: Date.now(),
        object: {
          id: "sub_1",
          status: "trialing",
          product: { id: "prod_eml" },
          current_period_end_date: "2026-12-08T00:00:00Z",
        },
      },
      { essentials_month_list: "prod_eml" },
    );
    expect(e).toMatchObject({
      paid: false,
      alert: null,
      write: { state: "active", plan: "essentials", periodEnd: "2026-12-08T00:00:00Z" },
    });
  });
});

describe("the plan screen", () => {
  it("shows one plan with the shared lines and no Pro or yearly choice", () => {
    const src = readFileSync("src/routes/_authenticated/app/plan.tsx", "utf8");
    expect(src).toMatch(/TRIAL_LINE/);
    expect(src).toMatch(/FOUNDING_LINE/);
    expect(src).not.toMatch(/choosePro|PLAN_COPY\.yearly|Segmented/);
  });
});

describe("review fixes", () => {
  it("a late trialing event for a cancelled subscription changes nothing", () => {
    const e = effectOf(
      {
        id: "evt_t2",
        eventType: "subscription.trialing",
        created_at: Date.now(),
        object: {
          id: "sub_1",
          status: "canceled",
          product: { id: "prod_eml" },
        },
      },
      { essentials_month_list: "prod_eml" },
    );
    expect(e.write).toBeNull();
  });
  it("the plan and the extra location, both 29 a month, are matched only by their names", () => {
    const p = (id: string, name: string) => ({
      id,
      name,
      price: 2900,
      currency: "USD",
      billing_type: "recurring",
      billing_period: "every-month",
      status: "active",
    });
    expect(setupPlan([p("x", "Something at 29")]).reuse).toEqual([]);
    const r = setupPlan([p("b", "Kabsi, extra location, monthly"), p("a", "Kabsi, monthly")]).reuse;
    expect(r.find((x) => x.key === "essentials_month_list")?.id).toBe("a");
    expect(r.find((x) => x.key === "extra_month")?.id).toBe("b");
  });
});
