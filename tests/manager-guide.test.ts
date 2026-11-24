import { BOOKING_EMAIL_HELPER, BOOKING_EMAIL_LABEL, BOOKING_READY } from "../src/lib/site";
import { existsSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ManagerGuide } from "../src/components/onboarding/manager-guide";
import { accessPill } from "../src/lib/access-status";
import {
  LATER,
  RESUME_CODE,
  STAGES,
  STAGE_OF,
  accessOf,
  confirmMode,
  resumePath,
  resumeTarget,
  screenOf,
  trialStartedToday,
  type OnboardingStatus,
} from "../src/lib/onboarding-flow";
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
    // R-126: while the calendar link is not set the booking link is an email, with its helper.
    expect(html).toContain(BOOKING_READY ? "setup call" : BOOKING_EMAIL_LABEL);
    if (!BOOKING_READY) expect(html).toContain(BOOKING_EMAIL_HELPER);
    expect(html).toContain("Open my Google profile");
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

describe("the four stages (V4, master plan 30.16 section 3)", () => {
  const base: OnboardingStatus = {
    location_id: "l",
    business: "Rose Lane Salon",
    time_zone: "Asia/Dubai",
    is_demo: false,
    check: null,
    confirmed: true,
    whatsapp: true,
    setup_ok: true,
    keyword: null,
    consent: true,
    accepted: true,
    checked: true,
    trial_ends_at: null,
    first_task_done: false,
    resume_code: null,
  };
  const at = (s: Partial<OnboardingStatus>, seen = {}, whatsappOn = true, now?: number) =>
    screenOf({ status: { ...base, ...s }, whatsappOn, seen, ...(now ? { now } : {}) });
  it("names the three steps in order (GATE-2)", () => {
    expect([...STAGES]).toEqual(["Find your business", "Add Kabsi on Google", "WhatsApp or email"]);
  });
  it("opens the next unfinished screen: find, Manager access, WhatsApp or email, then the trial with a card", () => {
    expect(screenOf({ status: null, whatsappOn: true, seen: {} })).toBe("find");
    expect(at({ confirmed: false, check: { code: "RLS2345A", term: "hair salon" } })).toBe("check");
    expect(
      at({ confirmed: false, check: { code: "RLS2345A", term: "hair salon" } }, { check: true }),
    ).toBe("confirm");
    expect(at({ confirmed: false })).toBe("confirm");
    // Step 2 comes before WhatsApp now.
    expect(at({ whatsapp: false, checked: false })).toBe("manager");
    expect(at({ accepted: false, checked: false })).toBe("manager");
    expect(at({ checked: false })).toBe("manager");
    // Access works, once.
    expect(at({ whatsapp: false })).toBe("checked");
    // Step 3: WhatsApp or email.
    expect(at({ whatsapp: false }, { checked: true })).toBe("channel");
    expect(at({ whatsapp: false }, { checked: true, whatsapp: true })).toBe("whatsapp");
    expect(at({ whatsapp: false }, { checked: true, whatsapp: true }, false)).toBe("channel");
    expect(
      screenOf({
        status: { ...base, whatsapp: false },
        whatsappOn: true,
        seen: { checked: true },
        channel: "email",
        trial: "needed",
      }),
    ).toBe("trial");
    // The trial with a card: no trial starts without one.
    expect(
      screenOf({ status: base, whatsappOn: true, seen: { checked: true }, trial: "needed" }),
    ).toBe("trial");
    expect(
      screenOf({ status: base, whatsappOn: true, seen: { checked: true }, trial: undefined }),
    ).toBe("trial");
    expect(
      screenOf({ status: base, whatsappOn: true, seen: { checked: true }, trial: "started" }),
    ).toBe("first_task");
    expect(
      screenOf({ status: base, whatsappOn: true, seen: { checked: true }, trial: "closed" }),
    ).toBe("trial");
    expect(
      screenOf({
        status: base,
        whatsappOn: true,
        seen: { checked: true, trial: true },
        trial: "closed",
      }),
    ).toBe("first_task");
    // Paid on the needed state never passes: Continue exists only while plans are closed.
    expect(
      screenOf({
        status: base,
        whatsappOn: true,
        seen: { checked: true, trial: true },
        trial: "needed",
      }),
    ).toBe("trial");
    expect(at({ first_task_done: true })).toBe("later");
  });
  it("a demo business skips step 3 and the trial", () => {
    expect(at({ is_demo: true, whatsapp: false })).toBe("first_task");
  });
  it("trialStartedToday still reads an older Kabsi trial", () => {
    const now = Date.parse("2026-10-27T10:00:00Z");
    expect(trialStartedToday("2026-11-10T10:00:00Z", now)).toBe(true);
    expect(trialStartedToday("2026-11-05T10:00:00Z", now)).toBe(false);
    expect(trialStartedToday(null)).toBe(true);
  });
  it("puts each screen on its step", () => {
    expect(STAGE_OF.check).toBe(0);
    expect(STAGE_OF.confirm).toBe(0);
    expect(STAGE_OF.manager).toBe(1);
    expect(STAGE_OF.channel).toBe(2);
    expect(STAGE_OF.whatsapp).toBe(2);
    expect(STAGE_OF.trial).toBe(3);
    expect(STAGE_OF.first_task).toBe(3);
  });
  it("tracks access in three states", () => {
    expect(accessOf({ consent: false, accepted: false, checked: false })).toBe("not_started");
    expect(accessOf({ consent: true, accepted: false, checked: false })).toBe("invite_pending");
    expect(accessOf({ consent: true, accepted: true, checked: false })).toBe("accepted");
    expect(accessOf({ consent: true, accepted: true, checked: true })).toBe("checked");
  });
  it("the resume link opens /start for a setup step and Home otherwise", () => {
    expect(RESUME_CODE.test("0123456789abcdef0123")).toBe(true);
    expect(RESUME_CODE.test("0123456789ABCDEF0123")).toBe(false);
    expect(resumePath("0123456789abcdef0123")).toBe("/start/resume/0123456789abcdef0123");
    for (const p of ["/start/business", "/start/whatsapp", "/start/manager"])
      expect(resumeTarget(p)).toBe("/start");
    expect(resumeTarget("/app")).toBe("/app");
    expect(resumeTarget("https://evil.example/start")).toBe("/app");
    expect(resumeTarget(undefined)).toBe("/app");
  });
  it("the rest of setup keeps house style", () => {
    const all = LATER.map((l) => `${l.title} ${l.line}`).join(" ") + STAGES.join(" ");
    expect(all).not.toMatch(/[—–!]|listing|visibility/i);
    expect(LATER).toHaveLength(6);
  });
  it("the old step 5 waits for access and then asks to confirm", () => {
    expect(confirmMode({ access_granted_at: null })).toBe("waiting");
    expect(confirmMode({ access_granted_at: "2026-10-22T10:00:00Z" })).toBe("confirm");
  });
});
