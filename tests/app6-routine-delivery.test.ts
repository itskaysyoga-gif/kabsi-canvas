// App 6 (master plan 30.34 item 5): the rules behind Settings' "Where your routine messages go", without a screen.
import { describe, expect, it } from "vitest";
import {
  backOnEmail,
  chosenChannel,
  choiceFailedLine,
  deliveryFailedLine,
  whatsappBlock,
  withPref,
  type DeliveryInput,
} from "../src/lib/routine-delivery";

const active = { state: "active", review_alerts: true, digest_optin: true } as const;
const base: DeliveryInput = {
  whatsappOn: true,
  status: active,
  statusFailed: false,
  stored: null,
  prefs: [],
};

describe("why WhatsApp cannot be chosen", () => {
  it("is null while WhatsApp is connected", () => {
    expect(whatsappBlock(base)).toBeNull();
  });
  it("says it is not open yet when Kabsi has no number, with nothing to fix", () => {
    const b = whatsappBlock({ ...base, whatsappOn: false });
    expect(b).toEqual({
      line: "WhatsApp is not open yet. Your reports and reminders come by email.",
      fix: null,
    });
  });
  it("Launch 1: says WhatsApp is paused when it is switched off for owners, and blocks only on a read false", () => {
    expect(whatsappBlock({ ...base, ownersOn: false })).toEqual({
      line: "WhatsApp messages from Kabsi are paused for now. Your reports and reminders come by email.",
      fix: null,
    });
    expect(whatsappBlock({ ...base, ownersOn: true })).toBeNull();
    // Not read yet, or the read failed: nothing is blocked on a guess.
    expect(whatsappBlock({ ...base, ownersOn: undefined })).toBeNull();
    // No number at all still says so first.
    expect(whatsappBlock({ ...base, whatsappOn: false, ownersOn: false })?.line).toBe(
      "WhatsApp is not open yet. Your reports and reminders come by email.",
    );
  });
  it("Launch 1: a WhatsApp choice reads as Email while owners' WhatsApp is paused", () => {
    expect(
      chosenChannel({
        ...base,
        ownersOn: false,
        statusFailed: false,
        stored: "whatsapp",
        prefs: [],
      }),
    ).toBe("email");
  });
  it("says to connect it below when there is no opt-in, for none and pending", () => {
    for (const state of ["none", "pending"] as const) {
      const b = whatsappBlock({ ...base, status: { state } });
      expect(b?.line).toBe("WhatsApp is not connected yet. Connect it below, then choose it here.");
      expect(b?.fix).toBe("connect");
    }
  });
  it("says it is stopped and to connect it again", () => {
    const b = whatsappBlock({ ...base, status: { state: "stopped" } });
    expect(b?.line).toBe("WhatsApp is stopped. Connect it again below, then choose it here.");
    expect(b?.fix).toBe("connect");
  });
  it("says it could not check when the read failed", () => {
    const b = whatsappBlock({ ...base, status: undefined, statusFailed: true });
    expect(b?.line).toBe("We could not check your WhatsApp. Refresh the page and try again.");
  });
  it("every line is one short plain sentence pair, with no dash and no exclamation mark", () => {
    const lines = [
      whatsappBlock({ ...base, whatsappOn: false })!.line,
      whatsappBlock({ ...base, status: { state: "none" } })!.line,
      whatsappBlock({ ...base, status: { state: "stopped" } })!.line,
      whatsappBlock({ ...base, status: undefined, statusFailed: true })!.line,
      deliveryFailedLine("whatsapp"),
      deliveryFailedLine("email"),
      choiceFailedLine(),
    ];
    for (const l of lines) {
      expect(l).not.toMatch(/[–—!]/);
      expect(l.split(/\s+/).length).toBeLessThanOrEqual(15);
    }
  });
});

describe("what the control shows as chosen", () => {
  it("shows the stored choice", () => {
    expect(chosenChannel({ ...base, stored: "whatsapp" })).toBe("whatsapp");
    expect(chosenChannel({ ...base, stored: "email" })).toBe("email");
  });
  it("reads Email while WhatsApp cannot carry anything, as the engine does", () => {
    expect(chosenChannel({ ...base, stored: "whatsapp", status: { state: "stopped" } })).toBe(
      "email",
    );
    expect(chosenChannel({ ...base, stored: "whatsapp", whatsappOn: false })).toBe("email");
  });
  it("before any stored choice reads Email, unless the earlier switch turned both routine emails off for WhatsApp", () => {
    expect(chosenChannel(base)).toBe("email");
    const off = [
      { category: "review_new", channel: "email", frequency: "off" },
      { category: "weekly_report", channel: "email", frequency: "off" },
    ] as const;
    expect(chosenChannel({ ...base, prefs: [...off] })).toBe("whatsapp");
    expect(chosenChannel({ ...base, prefs: [off[0]] })).toBe("email");
  });
});

describe("the page's own copy of the choices", () => {
  it("changes one choice and leaves the others", () => {
    const before = [
      { category: "review_new", channel: "email", frequency: "instant" },
      { category: "trial", channel: "email", frequency: "off" },
    ] as const;
    const next = withPref([...before], {
      category: "review_new",
      channel: "email",
      frequency: "off",
    });
    expect(next.find((p) => p.category === "review_new")?.frequency).toBe("off");
    expect(next.find((p) => p.category === "trial")?.frequency).toBe("off");
    expect(next).toHaveLength(2);
    expect(before[0].frequency).toBe("instant");
  });
  it("puts the two routine emails back to default on Email, and nothing else", () => {
    const next = backOnEmail([
      { category: "review_new", channel: "email", frequency: "off" },
      { category: "trial", channel: "email", frequency: "off" },
    ]);
    const f = (c: string) => next.find((p) => p.category === c)?.frequency;
    expect(f("review_new")).toBe("default");
    expect(f("weekly_report")).toBe("default");
    expect(f("trial")).toBe("off");
  });
});
