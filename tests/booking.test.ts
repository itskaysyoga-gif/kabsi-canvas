import { describe, expect, it } from "vitest";
import {
  BOOKING_ANSWERS,
  BOOKING_URL,
  bookingHref,
  bookingUrl,
  type BookingKind,
} from "../src/lib/site";

describe("booking links (P0.1-V3)", () => {
  const kinds = Object.keys(BOOKING_ANSWERS) as BookingKind[];

  it("has exactly the three answers to the required question", () => {
    expect(Object.values(BOOKING_ANSWERS)).toEqual([
      "Setting up my Google profile",
      "Partner or agency",
      "Something else",
    ]);
  });

  it("preselects each answer on the one event link", () => {
    for (const kind of kinds) {
      const url = new URL(bookingUrl(kind));
      expect(`${url.origin}${url.pathname}`).toBe(BOOKING_URL);
      expect(url.searchParams.get("a1")).toBe(BOOKING_ANSWERS[kind]);
    }
  });

  it("adds the inline-widget parameters only for the embed", () => {
    expect(bookingUrl("setup")).not.toContain("embed_type");
    expect(bookingUrl("setup", true)).toContain("embed_type=Inline");
  });

  it("never points at a dead link: placeholder falls back to email, a real link goes to Calendly", () => {
    for (const kind of kinds) {
      const href = bookingHref(kind);
      if (BOOKING_URL.includes("PLACEHOLDER"))
        expect(href.startsWith("mailto:hello@kabsi.co")).toBe(true);
      else expect(href.startsWith("https://calendly.com/")).toBe(true);
    }
  });
});
