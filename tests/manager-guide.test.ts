import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManagerGuide } from "../src/components/onboarding/manager-guide";
import { accessPill } from "../src/lib/access-status";
import { FLOW, confirmMode, flowStepOf } from "../src/lib/onboarding-flow";
import {
  COMPUTER_CARDS,
  PHONE_CARDS,
  listingUrl,
  mailtoUrl,
  readyMessage,
  stepsUrl,
  whatsappShareUrl,
} from "../src/lib/manager-guide";
import { KABSI_GROUP_ID } from "../src/lib/site";

// P0.4-03 (K-93, K-141): the guide, the live status, the exits and the six steps.
const words = (cards: typeof COMPUTER_CARDS) => cards.map((c) => `${c.title} ${c.text}`).join(" ");

describe("the Manager guide (P0.4-03)", () => {
  it("has five cards on a computer and on a phone, one step each", () => {
    expect(COMPUTER_CARDS).toHaveLength(5);
    expect(PHONE_CARDS).toHaveLength(5);
  });

  it("uses the real desktop screenshots, all present, and plain text on a phone (input I2)", () => {
    const shots = COMPUTER_CARDS.flatMap((c) => c.images ?? []);
    expect(shots).toHaveLength(6);
    for (const img of shots) {
      expect(existsSync(`public${img.src}`)).toBe(true);
      expect(img.alt.length).toBeGreaterThan(10);
    }
    expect(PHONE_CARDS.flatMap((c) => c.images ?? [])).toHaveLength(0);
  });

  it("the last card carries the ID with Copy and the first opens the owner's own listing", () => {
    for (const cards of [COMPUTER_CARDS, PHONE_CARDS]) {
      expect(cards[0]!.opensListing).toBe(true);
      expect(cards[4]!.showsId).toBe(true);
    }
    expect(listingUrl("computer", "Yawmiyati & Co")).toBe(
      "https://www.google.com/search?q=Yawmiyati%20%26%20Co",
    );
    expect(listingUrl("phone", "Yawmiyati")).toBe("https://business.google.com/");
  });

  it("never asks for a password or a code, and keeps house style", () => {
    const all = words(COMPUTER_CARDS) + words(PHONE_CARDS);
    expect(all).not.toMatch(/[—–!]/);
    expect(all).not.toMatch(/password|verification code|your code/i);
    expect(all).not.toContain(KABSI_GROUP_ID);
  });

  it("renders the group ID large with Copy, the card, the switch and the setup call", () => {
    const html = renderToStaticMarkup(createElement(ManagerGuide, { businessName: "Yawmiyati" }));
    expect(html).toContain(KABSI_GROUP_ID);
    expect(html).toContain("Copy group ID");
    expect(html).toContain("Step 1 of 5");
    expect(html).toContain("Show me the phone version");
    expect(html).toContain("setup call");
    expect(html).toContain("Open my Google listing");
    expect(html).toContain("/help/manager-steps/desktop/step-1-open-profile.png");
    // the 20 second clip slot renders nothing until the clip exists
    expect(html).not.toContain("<video");
  });

  it("opens on the card the link names", () => {
    const html = renderToStaticMarkup(createElement(ManagerGuide, { start: 5 }));
    expect(html).toContain("Step 5 of 5");
    expect(html).toContain("step-6-choose-manager.png");
  });
});

describe("the exits", () => {
  it("the one-tap link goes back to the step, with the business and the card", () => {
    expect(stepsUrl("https://kabsi.co", "Yawmiyati", 3)).toBe(
      "https://kabsi.co/manager-steps?b=Yawmiyati&s=3",
    );
    expect(stepsUrl("https://kabsi.co")).toBe("https://kabsi.co/manager-steps");
    expect(stepsUrl("https://kabsi.co", "X", 9)).toBe("https://kabsi.co/manager-steps?b=X");
  });

  it("the ready message for someone else asks only for a Manager invitation", () => {
    const m = readyMessage("Yawmiyati", "https://kabsi.co/manager-steps?b=Yawmiyati");
    expect(m).toContain("Yawmiyati");
    expect(m).toContain("https://kabsi.co/manager-steps");
    expect(m).toMatch(/Manager/);
    expect(m).toMatch(/never asks for a Google password or a verification code/);
    expect(m).not.toContain(KABSI_GROUP_ID);
    expect(m).not.toMatch(/[—–!]/);
  });

  it("the share links work without a Kabsi number", () => {
    expect(whatsappShareUrl("hi there")).toBe("https://wa.me/?text=hi%20there");
    expect(mailtoUrl("A b", "c d")).toBe("mailto:?subject=A%20b&body=c%20d");
  });
});

describe("the live status pill", () => {
  it("says waiting, with the 30 second check, once access is live and the owner agreed", () => {
    const p = accessPill({ state: "pending", consented: true, live: true })!;
    expect(p.text).toBe("Waiting for your invitation. We check every 30 seconds.");
    expect(p.connected).toBe(false);
  });
  it("before Gate A it promises an email, because a person accepts by hand", () => {
    const p = accessPill({ state: "pending", consented: true, live: false })!;
    expect(p.text).toBe("We'll email you when access is ready");
  });
  it("turns green and moves on when access_state is granted", () => {
    const p = accessPill({ state: "granted", consented: true, live: true })!;
    expect(p.tone).toBe("green");
    expect(p.text).toBe("Invitation received. You're connected");
    expect(p.connected).toBe(true);
  });
  it("shows nothing before the owner agreed, and flags lost access", () => {
    expect(accessPill({ state: "none", consented: false, live: true })).toBeNull();
    expect(accessPill({ state: "lost", consented: true, live: true })!.tone).toBe("amber");
  });
  it("no pill text breaks house style", () => {
    for (const state of ["pending", "granted", "lost"] as const) {
      for (const live of [true, false]) {
        const p = accessPill({ state, consented: true, live })!;
        expect(`${p.text} ${p.detail ?? ""}`).not.toMatch(/[—–!]/);
      }
    }
  });
});

describe("the six steps", () => {
  it("lists them in the order of K-141", () => {
    expect(FLOW.map((s) => s.label)).toEqual([
      "Check",
      "Sign up",
      "Connect",
      "About you",
      "Confirm",
      "Trial",
    ]);
  });
  it("maps the stored step to a screen", () => {
    expect(flowStepOf("business")).toBe("check");
    expect(flowStepOf("access")).toBe("connect");
    expect(flowStepOf("knowledge")).toBe("questions");
    expect(flowStepOf("confirm")).toBe("confirm");
    expect(flowStepOf("plan")).toBe("confirm");
    expect(flowStepOf("done")).toBe("done");
  });
  it("step 5 waits for access and then asks to confirm", () => {
    expect(confirmMode({ access_granted_at: null })).toBe("waiting");
    expect(confirmMode({ access_granted_at: "2026-10-22T10:00:00Z" })).toBe("confirm");
  });
});
