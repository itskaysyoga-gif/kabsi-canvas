// Site 3b, Part 0 item 1 (R-161): the WhatsApp sign-in code is made on intent, not when the panel opens. The bot check still
// starts at panel open and its token is only held; opening the panel and choosing Google or email stores no sign-in row and
// spends no start (a start is one call to auth-whatsapp/start, which stores the row and counts against 10 an hour).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { shouldMakeCode } from "../src/components/auth/whatsapp-signin";

const read = (f: string) => readFileSync(f, "utf8");
const NOW = 1_000_000;
const fresh = { expiresAt: NOW + 9 * 60_000 };
const stale = { expiresAt: NOW + 2 * 60_000 };

describe("shouldMakeCode", () => {
  it("makes no code without intent, however good the check is", () => {
    expect(shouldMakeCode({ wanted: false, token: "t", busy: false, start: null, now: NOW })).toBe(
      false,
    );
  });
  it("makes no code without a passed check, even with intent", () => {
    expect(shouldMakeCode({ wanted: true, token: "", busy: false, start: null, now: NOW })).toBe(
      false,
    );
  });
  it("makes one code on intent with a passed check", () => {
    expect(shouldMakeCode({ wanted: true, token: "t", busy: false, start: null, now: NOW })).toBe(
      true,
    );
  });
  it("never makes a second while one is on its way or one still has over 5 minutes", () => {
    expect(shouldMakeCode({ wanted: true, token: "t", busy: true, start: null, now: NOW })).toBe(
      false,
    );
    expect(shouldMakeCode({ wanted: true, token: "t", busy: false, start: fresh, now: NOW })).toBe(
      false,
    );
  });
  it("replaces a code with under 5 minutes left", () => {
    expect(shouldMakeCode({ wanted: true, token: "t", busy: false, start: stale, now: NOW })).toBe(
      true,
    );
  });
});

describe("the panel", () => {
  const step = read("src/components/auth/whatsapp-signin.tsx");
  const panel = read("src/components/auth/sign-in-panel.tsx");
  it("starts a code only through the intent path and still starts the bot check at open", () => {
    // The only caller of startWhatsapp is the effect guarded by shouldMakeCode; the token callback only holds the token.
    expect(step.match(/startWhatsapp\(/g)).toHaveLength(1);
    expect(step).toMatch(
      /if \(!shouldMakeCode\(\{ wanted, token, busy, start, now: Date\.now\(\) \}\)\) return;/,
    );
    expect(step).toMatch(/<Turnstile key=\{round\} onToken=\{setToken\} \/>/);
    expect(panel).toMatch(/const wa = useWaPrestart\(waOn\)/);
  });
  it("counts pointing, focusing and touching the button as intent, in both places it appears", () => {
    expect(step).toMatch(/onPointerEnter=\{\(e\) => \{/);
    expect(step).toMatch(/HOVER_DWELL_MS = 200/);
    expect(step).toMatch(/if \(document\.hasFocus\(\)\) onIntent\(\);/);
    expect(step).toMatch(/onTouchStart=\{onIntent\}/);
    expect(panel.match(/onIntent=\{intent\}/g)).toHaveLength(2);
  });
  it("does not count the page moving focus to the first button as intent", () => {
    expect(panel).toMatch(/const intent = \(\) => \{\s*if \(!quiet\.current\) wa\.want\(\);/);
    expect(panel).toMatch(
      /quiet\.current = true;\s*el\?\.focus\(\{ preventScroll: true \}\);\s*quiet\.current = false;/,
    );
  });
  it("a failed start spends the intent, so a refreshed token alone starts nothing; Try again asks anew", () => {
    expect(step).toMatch(/setWanted\(false\);\s*setError\(/);
    expect(step).toMatch(
      /const again = useCallback\(\(\) => \{[\s\S]*?setWanted\(true\);[\s\S]*?setRound/,
    );
  });
  it("moves focus only after the phone order is read, and never to the first button on a phone", () => {
    expect(panel).toMatch(/if \(!deviceRead\) return;/);
    expect(panel).toMatch(/if \(step === "choose" && phone && !moved\.current\) return;/);
  });
  it("makes the Google and email choices without touching the sign-in code", () => {
    const google = panel.slice(
      panel.indexOf("async function google()"),
      panel.indexOf("async function sendCode"),
    );
    expect(google).not.toMatch(/wa\.|startWhatsapp|want/);
    const email = panel.slice(
      panel.indexOf("async function sendCode"),
      panel.indexOf("async function verifyCode"),
    );
    expect(email).not.toMatch(/wa\.|startWhatsapp|want/);
  });
  it("reads the place token at open so the code is ready within a second of the tap", () => {
    expect(step).toMatch(/if \(on\) warmGeoToken\(\);/);
    expect(read("src/lib/wa-signin.ts")).toMatch(/4 \* 60_000/);
  });
});
