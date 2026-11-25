import { describe, expect, it } from "vitest";
import { CHOICE_FROM_DAY, daysUntil, planChoice } from "@/lib/plan-choice";
import { ADD_CARD_LABEL, CARD_PAYMENTS_COMING } from "@/lib/plans";
import { PRICES_SENTENCE } from "@/lib/site";
import { NEVER_NAMES } from "./helpers/house-rules";

const now = new Date("2026-11-10T09:00:00Z");
const trial = (day: number, endsInDays: number, graceInDays = endsInDays + 7) => ({
  state: "trial" as const,
  trial: {
    started_at: "2026-10-28T09:00:00Z",
    ends_at: new Date(now.getTime() + endsInDays * 86_400_000).toISOString(),
    grace_ends_at: new Date(now.getTime() + graceInDays * 86_400_000).toISOString(),
    day,
  },
});

describe("plan choice from day 11", () => {
  it("shows nothing before day 11, with a paid plan, in early access or when entitlements cannot be read", () => {
    expect(planChoice(trial(CHOICE_FROM_DAY - 1, 4), now)).toBeNull();
    expect(planChoice({ state: "paid", trial: null }, now)).toBeNull();
    expect(planChoice({ state: "concierge", trial: null }, now)).toBeNull();
    expect(planChoice({ state: "none", trial: null }, now)).toBeNull();
    expect(planChoice(null, now)).toBeNull();
  });

  it("counts the days left from day 11", () => {
    const c = planChoice(trial(11, 3), now)!;
    expect(c.title).toBe("Your free trial ends in 3 days");
    expect(planChoice(trial(13, 1), now)!.title).toBe("Your free trial ends in 1 day");
    expect(planChoice(trial(14, 0), now)!.title).toBe("Your free trial ends today");
  });

  it("in grace says nothing is published and what is waiting stays waiting", () => {
    const c = planChoice({ ...trial(15, -1, 6), state: "grace" }, now)!;
    expect(c.tone).toBe("attention");
    expect(c.body).toContain("publishes nothing");
    expect(c.body).toContain("6 days more");
    expect(c.cta).toMatchObject({ label: ADD_CARD_LABEL, checkout: true });
  });

  it("after an ended plan says what is paused and that the review link keeps working", () => {
    const c = planChoice({ state: "ended", trial: null }, now)!;
    expect(c.body).toContain("Drafts, Google Protection and the weekly report are paused");
    expect(c.body).toContain("review link and QR code keep working");
  });

  it("APP-2: never says card payments are coming; after the trial the button is Add a card to keep Kabsi", () => {
    const cards = [
      planChoice(trial(11, 3), now)!,
      planChoice({ ...trial(15, -1, 6), state: "grace" }, now)!,
      planChoice({ state: "ended", trial: null }, now)!,
    ];
    for (const c of cards) {
      expect(c.body).toContain(PRICES_SENTENCE);
      expect(c.body).not.toMatch(/coming|until they open/i);
      expect(c.body).not.toContain(CARD_PAYMENTS_COMING);
    }
  });

  it("only ever links to the Plan page, never a checkout, and uses no dash or exclamation mark", () => {
    const cards = [
      planChoice(trial(11, 3), now)!,
      planChoice({ ...trial(15, -1, 6), state: "grace" }, now)!,
      planChoice({ state: "ended", trial: null }, now)!,
    ];
    for (const c of cards) {
      expect(c.cta.to).toBe("/app/plan");
      const all = `${c.title} ${c.body} ${c.cta.label}`;
      expect(all).not.toMatch(/[–—!]/);
      expect(all).not.toMatch(NEVER_NAMES);
      expect(all).not.toMatch(/checkout/i);
    }
  });

  it("daysUntil rounds up and never goes below 0", () => {
    expect(daysUntil("2026-11-10T10:00:00Z", now)).toBe(1);
    expect(daysUntil("2026-11-01T10:00:00Z", now)).toBe(0);
  });
});
