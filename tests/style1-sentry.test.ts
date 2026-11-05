// Style 1 part C (master plan 30.33 item 4): the website's Sentry sends nothing from Kabsi's own automated runs
// (Playwright, the nightly check, Lighthouse), and every Edge Function starts through serve(), so captureError can
// drop automated calls and repeats (supabase/functions/_shared/sentry-gate.ts and its Deno tests).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUTOMATED_UA_PATTERN, telemetryHeadScripts } from "../src/lib/telemetry";

function beforeSendFor(navigator: { userAgent: string; webdriver?: boolean }) {
  const boot = String((telemetryHeadScripts[0] as { children: string }).children);
  let opts: Record<string, unknown> = {};
  const win: Record<string, unknown> = { posthog: { __SV: 1, init: () => undefined } };
  const Sentry = { init: (o: Record<string, unknown>) => (opts = o) };
  new Function("window", "location", "Sentry", "posthog", "document", "navigator", boot)(
    win,
    { hostname: "kabsi.co", origin: "https://kabsi.co" },
    Sentry,
    win.posthog,
    {},
    navigator,
  );
  (win.sentryOnLoad as () => void)();
  return opts.beforeSend as (e: Record<string, unknown>) => Record<string, unknown> | null;
}

const PHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const HEADLESS =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36";

describe("Style 1 part C: the website's Sentry", () => {
  it("drops events from webdriver, headless Chrome and Lighthouse", () => {
    expect(beforeSendFor({ userAgent: PHONE, webdriver: true })({ message: "x" })).toBeNull();
    expect(beforeSendFor({ userAgent: HEADLESS })({ message: "x" })).toBeNull();
    expect(
      beforeSendFor({ userAgent: "Mozilla/5.0 Chrome-Lighthouse" })({ message: "x" }),
    ).toBeNull();
  });

  it("still sends a real visitor's error", () => {
    expect(beforeSendFor({ userAgent: PHONE, webdriver: false })({ message: "x" })).toEqual({
      message: "x",
    });
  });

  it("uses the same automated list as the Edge Functions", () => {
    const edge = readFileSync("supabase/functions/_shared/sentry-gate.ts", "utf8");
    expect(edge).toContain(`/${AUTOMATED_UA_PATTERN}/i`);
  });
});

describe("Style 1 part C: every Edge Function starts through serve()", () => {
  const dirs = readdirSync("supabase/functions").filter((d) =>
    existsSync(`supabase/functions/${d}/index.ts`),
  );
  for (const d of dirs) {
    const src = readFileSync(`supabase/functions/${d}/index.ts`, "utf8");
    if (!src.includes("captureError")) continue;
    it(d, () => {
      expect(src).not.toMatch(/^Deno\.serve\(/m);
      expect(src).toMatch(/^serve\(/m);
    });
  }
});
