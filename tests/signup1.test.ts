// Signup 1 (master plan 30.50 item 3, R-150): the order of the three ways, the Google button only when the provider is on,
// and the contact email screen in onboarding. The server rules and refusals are tested in Deno
// (supabase/functions/_shared/wa-signin.test.ts and whatsapp/signin.test.ts).
import { afterEach, describe, expect, it, vi } from "vitest";
import { waysOrder } from "../src/lib/wa-signin";
import { screenOf, type OnboardingStatus } from "../src/lib/onboarding-flow";
import { WHATSAPP_SIGNIN_CONSENT, signinHref } from "../supabase/functions/_shared/wa-signin";
import { googleState } from "../supabase/functions/_shared/signin-provider-check";

describe("the three ways", () => {
  it("puts WhatsApp first on a phone and Google first on a desktop, the email code last", () => {
    expect(waysOrder(true)).toEqual(["whatsapp", "google", "email"]);
    expect(waysOrder(false)).toEqual(["google", "whatsapp", "email"]);
  });
  it("opens WhatsApp with the exact message and never sends a code", () => {
    expect(signinHref("12057456874", "AB23CD")).toBe(
      "https://wa.me/12057456874?text=Kabsi%20sign%20in%20AB23CD",
    );
    expect(WHATSAPP_SIGNIN_CONSENT).toMatch(/Reply STOP at any time to stop\.$/);
    expect(WHATSAPP_SIGNIN_CONSENT).not.toMatch(/[‒-―!]/);
  });
});

describe("Google sign-in on or off", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("reads Auth's settings: only a clear false hides the button", async () => {
    for (const [body, ok, want] of [
      [{ external: { google: false, email: true } }, true, false],
      [{ external: { google: true } }, true, true],
      [{}, false, true],
    ] as const) {
      vi.resetModules();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok, json: async () => body })),
      );
      const { googleSignInOn } = await import("../src/lib/wa-signin");
      expect(await googleSignInOn()).toBe(want);
    }
  });
  it("the daily check reads the same answer", () => {
    expect(googleState({ external: { google: false } })).toBe("off");
    expect(googleState({ external: { google: true } })).toBe("on");
    expect(googleState({})).toBe("unread");
  });
});

describe("onboarding asks for the contact email only of WhatsApp sign-ups", () => {
  const status = {
    location_id: "l",
    confirmed: true,
    check: null,
    questions_done: true,
    is_demo: false,
    whatsapp: true,
    consent: false,
    accepted: false,
    checked: false,
    first_task_done: false,
    trial_ends_at: null,
  } as unknown as OnboardingStatus;
  it("shows Where should receipts go? once, then moves on; WhatsApp is already connected", () => {
    expect(screenOf({ status, whatsappOn: true, seen: {}, askEmail: true })).toBe("email");
    expect(screenOf({ status, whatsappOn: true, seen: { email: true }, askEmail: true })).toBe(
      "manager",
    );
    expect(screenOf({ status, whatsappOn: true, seen: {}, askEmail: false })).toBe("manager");
  });
});
