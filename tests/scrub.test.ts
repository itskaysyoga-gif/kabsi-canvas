// Master plan 20.5: Sentry and PostHog drop phone numbers, emails and review text before sending.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { EMAIL_PATTERN, PHONE_PATTERN, scrubProps, scrubString } from "../src/lib/scrub";
import { telemetryHeadScripts } from "../src/lib/telemetry";

describe("scrubbing in the browser", () => {
  it("replaces emails and phone numbers, and keeps dates, times, counts and ids", () => {
    expect(scrubString("Call +1 (555) 010-0101 or mail owner@example.com")).toBe(
      "Call [phone] or mail [email]",
    );
    expect(scrubString("WhatsApp 96170123456")).toBe("WhatsApp [phone]");
    const keep =
      "Job 42 failed at 2026-10-25T10:00:00Z for 3f1d2c4b-5a6e-4f70-8a9b-0c1d2e3f4a5b, 120 reviews";
    expect(scrubString(keep)).toBe(keep);
  });

  it("drops review text and contact keys from event properties, and leaves PostHog's own keys alone", () => {
    const out = scrubProps({
      comment: "The waiter was rude",
      reviewer_name: "Sam",
      text: "a review",
      email: "a@b.co",
      phone: "+15550100101",
      source: "home",
      note: "ring 15550100101",
      $current_url: "https://kabsi.co/pricing",
      token: "phc_public",
    });
    expect(out).toEqual({
      source: "home",
      note: "ring [phone]",
      $current_url: "https://kabsi.co/pricing",
      token: "phc_public",
    });
  });

  it("the inline boot script uses the same patterns for Sentry and PostHog", () => {
    const boot = String((telemetryHeadScripts[0] as { children: string }).children);
    expect(boot).toContain(JSON.stringify(EMAIL_PATTERN));
    expect(boot).toContain(JSON.stringify(PHONE_PATTERN));
    expect(boot).toContain("props(e.properties)");
    expect(boot).toContain("props(event.extra)");
    expect(boot).toContain("x.value = pii(x.value)");
    // The boot script is valid JavaScript.
    expect(() => new Function(boot)).not.toThrow();
  });
});

describe("scrubbing on the server", () => {
  it("captureError runs messages and extras through the same phone and email rule", () => {
    const src = readFileSync("supabase/functions/_shared/kabsi.ts", "utf8");
    expect(src).toContain("const PHONE_RE = /\\+\\d[\\d\\s().-]{6,}\\d|\\b\\d{9,15}\\b/g;");
    expect(src).toContain("scrubText(String(err.message");
    expect(new RegExp(PHONE_PATTERN).source).toBe("\\+\\d[\\d\\s().-]{6,}\\d|\\b\\d{9,15}\\b");
  });
});
