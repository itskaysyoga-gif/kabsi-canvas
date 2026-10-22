import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { ConfirmStep } from "../src/components/onboarding/confirm-step";
import {
  DETAILS,
  continueLabel,
  detailsPayload,
  rowsFromFacts,
  valueProblem,
} from "../src/lib/confirm-details";
import { confirmMode } from "../src/lib/onboarding-flow";
import type { Location } from "../src/lib/onboarding";
import { BANNER_DAYS, trialBannerLine, trialLength } from "../src/lib/trial-banner";

// P0.4-05 (K-18, K-141): confirm your details after access, and the trial banner.
const FACTS = [
  { key: "name", value: { display: "Yawmiyati Bakery" }, status: "needs_confirmation" },
  { key: "phone", value: { display: "+961 1 234 567" }, status: "needs_confirmation" },
  {
    key: "regular_hours",
    value: { display: "Mon to Sat 07:00 to 19:00", raw: { periods: [] } },
    status: "needs_confirmation",
  },
  { key: "website", value: { display: "https://yawmiyati.example" }, status: "verified" },
  { key: "main_category", value: { display: "Bakery" }, status: "needs_confirmation" },
  { key: "open_status", value: { display: "Open", raw: "OPEN" }, status: "needs_confirmation" },
];
const rows = rowsFromFacts(FACTS);

describe("the six details (P0.4-05)", () => {
  it("are name, phone, hours, website, category and open status, in that order", () => {
    expect(DETAILS.map((d) => d.key)).toEqual([
      "name",
      "phone",
      "regular_hours",
      "website",
      "main_category",
      "open_status",
    ]);
    expect(rows.map((r) => r.label)).toEqual([
      "Business name",
      "Phone",
      "Opening hours",
      "Website",
      "Main category",
      "Open status",
    ]);
  });

  it("shows what Google shows, and a row Kabsi has not read is still there to add", () => {
    expect(rows[0]!.shown).toEqual({ display: "Yawmiyati Bakery", raw: null });
    expect(rows[3]!.confirmed).toBe(true);
    expect(rows[1]!.confirmed).toBe(false);
    const none = rowsFromFacts([]);
    expect(none).toHaveLength(6);
    expect(none.every((r) => r.shown === null)).toBe(true);
  });

  it("Correct sends the value as shown, with Google's own shape where there is one", () => {
    const p = detailsPayload(rows, {
      name: { kind: "correct" },
      regular_hours: { kind: "correct" },
      open_status: { kind: "correct" },
    });
    expect(p).toEqual({
      name: { display: "Yawmiyati Bakery" },
      regular_hours: { display: "Mon to Sat 07:00 to 19:00", raw: { periods: [] } },
      open_status: { display: "Open", raw: "OPEN" },
    });
  });

  it("Change sends what the owner typed, and an open status as one of the three Google knows", () => {
    const p = detailsPayload(rows, {
      phone: { kind: "change", value: " +961 3 111 222 " },
      open_status: { kind: "change", value: "Closed temporarily" },
    });
    expect(p).toEqual({
      phone: { display: "+961 3 111 222" },
      open_status: { display: "Closed temporarily", raw: "CLOSED_TEMPORARILY" },
    });
  });

  it("sends nothing for a row the owner did not mark, and nothing for Correct on a row that was never read", () => {
    expect(detailsPayload(rows, {})).toEqual({});
    expect(detailsPayload(rowsFromFacts([]), { name: { kind: "correct" } })).toEqual({});
  });

  it("refuses what the database would refuse, in the owner's words", () => {
    expect(valueProblem("phone", "call me")).toMatch(/phone number/);
    expect(valueProblem("website", "example.com")).toMatch(/https:\/\//);
    expect(valueProblem("website", "https://example.com")).toBeNull();
    expect(valueProblem("name", "x".repeat(101))).toMatch(/100 characters/);
    expect(valueProblem("name", "  ")).toMatch(/Correct/);
    expect(valueProblem("open_status", "Sometimes")).toMatch(/open/i);
    expect(detailsPayload(rows, { phone: { kind: "change", value: "call me" } })).toEqual({});
  });

  it("the button says Skip for now until something is marked", () => {
    expect(continueLabel(0)).toBe("Skip for now");
    expect(continueLabel(2)).toBe("Save and see my replies");
  });
});

const loc: Location = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Yawmiyati Bakery",
  address: null,
  country: "LB",
  status: "active",
  onboarding_step: "confirm",
  consent_at: "2026-10-22T10:00:00Z",
  access_granted_at: null,
  created_at: "2026-10-22T10:00:00Z",
};
const render = (l: Location, facts: unknown) => {
  const qc = new QueryClient();
  qc.setQueryData(["detail-facts", l.id], facts);
  qc.setQueryData(["access-state", l.id], l.access_granted_at ? "granted" : "pending");
  qc.setQueryData(["google-live"], false);
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: qc },
      createElement(ConfirmStep, { location: l, onChanged: async () => {} }),
    ),
  );
};

describe("the screen (P0.4-05)", () => {
  it("waits for access: the live status, a way on, and no details to confirm yet", () => {
    expect(confirmMode(loc)).toBe("waiting");
    const html = render(loc, FACTS);
    expect(html).toContain("Waiting for your invitation");
    expect(html).toContain("Go to Home");
    expect(html).toContain("waiting costs you no days");
    expect(html).not.toContain("Correct");
  });

  it("once access works it asks for the six details, each with Correct and Change, and marks the confirmed one", () => {
    const html = render({ ...loc, access_granted_at: "2026-10-22T11:00:00Z" }, FACTS);
    expect(html).toContain("Confirm your details");
    for (const d of DETAILS) expect(html).toContain(d.label);
    expect((html.match(/>Correct</g) ?? []).length).toBe(6);
    expect((html.match(/>Change</g) ?? []).length).toBe(6);
    expect(html).toContain("Approved by you");
    expect(html).toContain("Skip for now");
    expect(html).not.toMatch(/[—–]/);
  });

  it("says Kabsi is reading the profile when no detail has been read yet, and still offers a way on", () => {
    const html = render({ ...loc, access_granted_at: "2026-10-22T11:00:00Z" }, []);
    expect(html).toContain("Kabsi is reading your profile");
    expect(html).toContain("Skip for now");
    expect(html).toContain("Kabsi has not read this yet");
  });
});

describe("the trial banner (P0.4-05, step 6)", () => {
  const t = (days: number, day: number) => ({
    state: "trial" as const,
    trial: {
      started_at: "2026-10-22T10:00:00Z",
      ends_at: new Date(Date.parse("2026-10-22T10:00:00Z") + days * 86_400_000).toISOString(),
      grace_ends_at: "",
      day,
    },
  });
  it("says the trial has started, no card, for the first days", () => {
    expect(trialBannerLine(t(14, 1))).toBe("Your 14-day Pro trial has started. No card needed.");
    expect(trialBannerLine(t(14, BANNER_DAYS))).not.toBeNull();
  });
  it("says 30 days through a partner link", () => {
    expect(
      trialLength({ started_at: "2026-10-22T10:00:00Z", ends_at: "2026-11-21T10:00:00Z" }),
    ).toBe(30);
    expect(trialBannerLine(t(30, 1))).toBe("Your 30-day Pro trial has started. No card needed.");
  });
  it("is gone after the first days, and never for a business that is not on a trial", () => {
    expect(trialBannerLine(t(14, BANNER_DAYS + 1))).toBeNull();
    expect(trialBannerLine({ state: "concierge", trial: null })).toBeNull();
    expect(trialBannerLine({ state: "none", trial: null })).toBeNull();
    expect(trialBannerLine({ state: "paid", trial: null })).toBeNull();
  });
  it("house style", () => {
    expect(trialBannerLine(t(14, 1))).not.toMatch(/[—–!]/);
  });
});
