// Style 1 part C (master plan 30.33 item 4): no Sentry event from automated runs, and a repeated error at most once per
// 10 minutes.
import { assertEquals, assertNotEquals } from "jsr:@std/assert@1";
import {
  fingerprint,
  inAutomatedRequest,
  isAutomated,
  limiterKey,
  REPEAT_WINDOW_MS,
  repeatWindow,
  withRequest,
} from "./sentry-gate.ts";

const PLAYWRIGHT_UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36";
const PHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

Deno.test("style1 sentry: smoke, QA and headless runs are automated; a phone is not", () => {
  assertEquals(isAutomated(new Headers({ "x-kabsi-smoke": "1" })), true);
  assertEquals(isAutomated(new Headers({ "x-kabsi-qa": "1" })), true);
  assertEquals(isAutomated(new Headers({ "user-agent": PLAYWRIGHT_UA })), true);
  assertEquals(isAutomated(new Headers({ "user-agent": "Mozilla/5.0 Chrome-Lighthouse" })), true);
  assertEquals(isAutomated(new Headers({ "user-agent": "kabsi-nightly/1" })), true);
  assertEquals(isAutomated(new Headers({ "user-agent": PHONE_UA })), false);
  assertEquals(isAutomated(new Headers({ "x-kabsi-smoke": "0", "user-agent": PHONE_UA })), false);
  assertEquals(isAutomated(new Headers()), false);
});

Deno.test("style1 sentry: the request's facts reach code deep inside its handler, and only there", async () => {
  assertEquals(inAutomatedRequest(), false);
  const seen = await withRequest(new Request("https://x", { headers: { "x-kabsi-qa": "1" } }), async () => {
    await new Promise((r) => setTimeout(r, 1));
    return inAutomatedRequest();
  });
  assertEquals(seen, true);
  assertEquals(withRequest(new Request("https://x", { headers: { "user-agent": PHONE_UA } }), () => inAutomatedRequest()), false);
  assertEquals(inAutomatedRequest(), false);
});

Deno.test("style1 sentry: the same error is sent once per 10 minutes, a different one is not held back", () => {
  const w = repeatWindow();
  const a = fingerprint("coach", "Error", "google 404 for 123456 after 3 tries");
  const a2 = fingerprint("coach", "Error", "google 404 for 987654 after 3 tries");
  assertNotEquals(a, fingerprint("coach", "Error", "google 500 for 123456 after 3 tries"));
  const b = fingerprint("coach", "TypeError", "x is undefined");
  assertEquals(a, a2);
  assertEquals(w.allow(a, 0), true);
  assertEquals(w.allow(a2, 60_000), false);
  assertEquals(w.allow(b, 60_000), true);
  assertEquals(w.allow(a, REPEAT_WINDOW_MS - 1), false);
  assertEquals(w.allow(a, REPEAT_WINDOW_MS), true);
});

Deno.test("style1 sentry: ids and quoted values fold into one fingerprint; the limiter key is short and stable", async () => {
  assertEquals(
    fingerprint("f", "Error", 'no row "abc" for 0b1f6b0e-1d2c-4c3a-9f00-123456789abc'),
    fingerprint("f", "Error", 'no row "abc" for 7c9e6679-7425-40de-944b-e07fc1f90ae7'),
  );
  assertNotEquals(fingerprint("f", "Error", "a"), fingerprint("g", "Error", "a"));
  const k = await limiterKey("f|Error|a");
  assertEquals(k, await limiterKey("f|Error|a"));
  assertEquals(/^sentry:[0-9a-f]{24}$/.test(k), true);
});
