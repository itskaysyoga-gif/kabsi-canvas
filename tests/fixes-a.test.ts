// Fixes A (R-126): the audit's lines, built from the constants.
import { describe, expect, it } from "vitest";
import { PLANS } from "../src/components/kabsi/plans";
import {
  BOOKING_EMAIL_HELPER,
  BOOKING_EMAIL_LABEL,
  BOOKING_READY,
  HERO_PRICE_LINE,
  PLAN_PRICES,
  SCAN_LINE,
  TRIAL_LINE,
  TRIAL_SEPARATE_LINE,
  bookingLabel,
} from "../src/lib/site";

describe("Fixes A lines", () => {
  it("the hero price line is the plan price and the trial line, no number typed twice", () => {
    expect(HERO_PRICE_LINE).toBe(
      "Plans from 29 US dollars a month. Free for 14 days once Kabsi is connected. No card.",
    );
    expect(HERO_PRICE_LINE).toContain(String(PLAN_PRICES.essentialsMonthly));
    expect(HERO_PRICE_LINE.endsWith(TRIAL_LINE)).toBe(true);
  });
  it("the free check line and the separate trial line", () => {
    expect(SCAN_LINE).toBe("Free check. No account and no Google access needed.");
    expect(SCAN_LINE).not.toMatch(/seconds/);
    expect(TRIAL_SEPARATE_LINE).toBe(
      "The 14-day free trial is separate. It starts once Kabsi is a Manager on your profile.",
    );
  });
  it("the two plan lines", () => {
    const line = (id: string) => PLANS.find((p) => p.id === id)?.line;
    expect(line("essentials")).toBe(
      "For an owner who wants every review answered, the profile kept right and 2 posts a month made ready.",
    );
    expect(line("pro")).toBe("For a busier business: a post every week and a team that approves.");
  });
  it("while the calendar is not set every booking button is the email words; with it the current words return", () => {
    expect(BOOKING_EMAIL_LABEL).toBe("Email us to arrange a call");
    expect(BOOKING_EMAIL_HELPER).toBe(
      "Tell us your business name and a good time. We reply by email.",
    );
    expect(bookingLabel("Book a short call")).toBe(
      BOOKING_READY ? "Book a short call" : BOOKING_EMAIL_LABEL,
    );
  });
  it("no dash and no exclamation mark in the new lines", () => {
    for (const s of [
      HERO_PRICE_LINE,
      SCAN_LINE,
      TRIAL_SEPARATE_LINE,
      BOOKING_EMAIL_LABEL,
      BOOKING_EMAIL_HELPER,
    ])
      expect(s).not.toMatch(new RegExp("[\\u2013\\u2014!]"));
  });
});
