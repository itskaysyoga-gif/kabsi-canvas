// FIX-5: the bot check never leaves a dead button. Sign in and the free check show a button that is active, say
// "Checking your connection" while the check finishes, and offer Try again after 15 seconds.
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BOT_CHECK_WAIT_MS,
  BotCheckTimeout,
  CHECKING_LINE,
  ERROR_LINE,
  INTERACTIVE_HINT,
  SLOW_LINE,
  botCheckOutcome,
  elapsedMs,
  requireToken,
  sendButtonState,
  tapAction,
} from "../src/lib/bot-check";
import {
  TURNSTILE_SRC,
  loadTurnstileScript,
  preloadTurnstile,
  resetTurnstileScriptForTest,
  turnstileAskedAt,
} from "../src/lib/turnstile-script";
import { Button } from "../src/components/kabsi/ui";

const read = (f: string) => readFileSync(f, "utf8");

describe("the button states", () => {
  it("is active with its own words before anything is tapped", () => {
    expect(sendButtonState({ busy: false, waiting: false, label: "Send me a code" })).toEqual({
      loading: false,
      label: "Send me a code",
      waiting: false,
    });
  });
  it("says Checking your connection with the spinner while it waits for the token", () => {
    expect(sendButtonState({ busy: false, waiting: true, label: "Send me a code" })).toEqual({
      loading: true,
      label: CHECKING_LINE,
      waiting: true,
    });
    expect(CHECKING_LINE).toBe("Checking your connection");
  });
  it("goes back to its own words with the spinner once the request is on its way", () => {
    expect(sendButtonState({ busy: true, waiting: false, label: "Send me a code" })).toMatchObject({
      loading: true,
      label: "Send me a code",
    });
  });
  it("renders the three states as real buttons, none of them a silent dead one", () => {
    const html = (o: { busy: boolean; waiting: boolean }) => {
      const s = sendButtonState({ ...o, label: "Send me a code" });
      return renderToStaticMarkup(
        createElement(Button, { type: "submit", full: true, loading: s.loading }, s.label),
      );
    };
    const idle = html({ busy: false, waiting: false });
    expect(idle).toContain("Send me a code");
    expect(idle).not.toMatch(/ disabled(=|>|\s)/);
    const waiting = html({ busy: false, waiting: true });
    expect(waiting).toContain("Checking your connection");
    expect(waiting).toContain('aria-busy="true"');
    expect(html({ busy: true, waiting: false })).toContain('aria-busy="true"');
  });
});

describe("a tap", () => {
  it("answers an invalid form with the form's own error, never silence", () => {
    expect(tapAction({ valid: false, hasToken: false })).toBe("invalid");
    expect(tapAction({ valid: false, hasToken: true })).toBe("invalid");
  });
  it("sends at once with a token, and waits for the token without one", () => {
    expect(tapAction({ valid: true, hasToken: true })).toBe("ready");
    expect(tapAction({ valid: true, hasToken: false })).toBe("wait");
  });
});

describe("the sign in panel", () => {
  const src = read("src/components/auth/sign-in-panel.tsx");
  it("never disables the send button on a missing token", () => {
    expect(src).not.toMatch(/disabled=\{!token\}/);
    expect(src).not.toMatch(/disabled=\{busy \|\| !token\}/);
  });
  it("waits for the token on a tap and sends when it arrives", () => {
    expect(src).toMatch(/tapAction\(\{ valid: true, hasToken: Boolean\(token\) \}\) === "wait"/);
    expect(src).toMatch(
      /if \(!waiting \|\| !token\) return;[\s\S]{0,80}setWaiting\(false\);[\s\S]{0,40}sendCode\(\)/,
    );
  });
  it("ends a wait after 15 seconds on its own, so a tap after the widget gave up is never stuck", () => {
    expect(src).toMatch(/window\.setTimeout\(\(\) => setWaiting\(false\), BOT_CHECK_WAIT_MS\)/);
  });
  it("counts a later widget from its own mount, not from the first script request", () => {
    const w = read("src/components/turnstile.tsx");
    expect(w).toMatch(/attempt === 0 && !firstWidgetUsed/);
  });
  it("stops waiting when the check fails, and starts the script at page load", () => {
    expect(src).toContain("onFail={() => setWaiting(false)}");
    expect(src).toMatch(/useEffect\(\(\) => \{\s*preloadTurnstile\(\);\s*\}, \[\]\)/);
  });
});

describe("the script", () => {
  type FakeScript = { src: string; async: boolean; onload?: () => void; remove: () => void };
  let added: FakeScript[];
  beforeEach(() => {
    added = [];
    resetTurnstileScriptForTest();
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement: () => ({ src: "", async: false, remove: () => undefined }),
      head: { appendChild: (s: FakeScript) => added.push(s) },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("preloadTurnstile asks for the script once, with no touch", () => {
    preloadTurnstile();
    preloadTurnstile();
    expect(added).toHaveLength(1);
    expect(added[0]!.src).toBe(TURNSTILE_SRC);
  });
  it("counts the start from the first request, not from the box being drawn", async () => {
    const before = turnstileAskedAt();
    void loadTurnstileScript();
    const first = turnstileAskedAt();
    await new Promise((r) => setTimeout(r, 15));
    expect(turnstileAskedAt()).toBe(first);
    expect(first).toBeGreaterThanOrEqual(before);
  });
  it("is asked for at page load on /login but only on touch on the speed budget pages", () => {
    // /login (the sign in panel) preloads; /scan, Home and the trade pages keep first touch (the combobox warms on focus).
    expect(read("src/components/auth/sign-in-panel.tsx")).toContain("preloadTurnstile()");
    expect(read("src/components/kabsi/scan-box.tsx")).not.toContain("preloadTurnstile");
    expect(read("src/components/kabsi/business-combobox.tsx")).not.toContain("preloadTurnstile");
  });
});

describe("the free check", () => {
  const live = read("src/components/kabsi/scan-live.tsx");
  const box = read("src/components/kabsi/business-combobox.tsx");
  it("shows the waiting state on the search card and on both forms", () => {
    expect(live).toContain("waiting={waiting}");
    expect(live).toContain('label: "Save my place"');
    expect(live).toContain('label: "Send me this report"');
  });
  it("shows the slow line and a Try again button when no token comes, and sends nothing", () => {
    expect(live).toContain("requireToken(await take())");
    expect(live).toMatch(/kind === "slow" && <SlowCheck/);
    expect(live).toContain("{SLOW_LINE}");
  });
  it("starts the bot check when the search box gets focus, a press or input", () => {
    expect(box).toMatch(/onFocus=\{\(\) => \{\s*warm\(\);/);
    expect(box).toContain("onPointerDown={warm}");
    expect(box).toMatch(/onChange=\{\(e\) => \{[\s\S]{0,160}warm\(\);/);
  });
});

describe("the widget", () => {
  const src = read("src/components/turnstile.tsx");
  it("gives up after 15 seconds", () => {
    expect(BOT_CHECK_WAIT_MS).toBe(15_000);
    expect(src).toContain("const GIVE_UP_MS = BOT_CHECK_WAIT_MS");
    expect(src).toContain("no_token_15s");
    expect(src).not.toContain("no_token_10s");
  });
  it("puts one line above the box when a tap is needed, and the slow line on a time out", () => {
    expect(src).toMatch(/interactive && !failed \?[\s\S]{0,200}\{INTERACTIVE_HINT\}/);
    expect(src).toContain('failed === "slow" ? SLOW_LINE : ERROR_LINE');
    expect(INTERACTIVE_HINT).toBe("Tap the box to confirm you are a person");
    expect(SLOW_LINE).toBe("This is taking longer than usual.");
  });
  it("keeps the Sentry message the same, so older counts still line up", () => {
    expect(src).toContain("`Turnstile failed: ${code}`");
  });
});

describe("the measurement", () => {
  it("names the four outcomes", () => {
    expect(botCheckOutcome({ token: true, wasInteractive: false })).toBe("passed");
    expect(botCheckOutcome({ token: true, wasInteractive: true })).toBe("interactive");
    expect(botCheckOutcome({ token: false, wasInteractive: false })).toBe("failed");
    expect(botCheckOutcome({ token: false, wasInteractive: true, timedOut: true })).toBe(
      "timed_out",
    );
  });
  it("counts whole milliseconds, never negative", () => {
    expect(elapsedMs(1000, 1234.4)).toBe(234);
    expect(elapsedMs(2000, 1000)).toBe(0);
  });
  it("sends bot_check_finished with a surface, an outcome and a number, and nothing else", () => {
    const tel = read("src/lib/telemetry.ts");
    expect(tel).toContain('"bot_check_finished"');
    expect(read("docs/EVENTS.md")).toContain("`bot_check_finished`");
    const widget = read("src/components/turnstile.tsx");
    expect(widget).toMatch(/track\("bot_check_finished", \{\s*surface,\s*outcome:[\s\S]{0,120}ms:/);
    expect(read("src/components/auth/sign-in-panel.tsx")).toContain('surface="login"');
    expect(read("src/components/kabsi/scan-live.tsx")).toContain('surface="free_check"');
    expect(read("src/components/kabsi/business-combobox.tsx")).toContain('surface="search_box"');
  });
  it("throws the timeout for an empty token and passes a real one", () => {
    expect(() => requireToken("")).toThrow(BotCheckTimeout);
    expect(requireToken("abc")).toBe("abc");
  });
});

describe("the words", () => {
  it("carry no dash and no exclamation mark", () => {
    for (const line of [CHECKING_LINE, INTERACTIVE_HINT, SLOW_LINE, ERROR_LINE])
      expect(line).not.toMatch(/[–—!-]/);
  });
});

// FIX-5 item 5: /api/suggest after SITE-7's lazy load of the suggestions client. The route is the same; only the page's
// import moved. A "warm" call is the wake-up: it never carries suggestions and takes about 0 ms by design.
describe("/api/suggest for a real query", () => {
  const SALT = "https://example.supabase.co";
  const logs: Record<string, unknown>[] = [];
  const handler = async () => {
    const { makeSuggestHandler } = await import("../src/server/suggest");
    return makeSuggestHandler({
      env: (n) => ({ PLACES_API_KEY: "k", TURNSTILE_SECRET_KEY: "s", SUGGEST_ROUTE_KEY: "r" })[n],
      take: async () => ({ allowed: true }),
      autocomplete: async () => ({
        ok: true,
        status: 200,
        data: {
          suggestions: [
            {
              placePrediction: {
                placeId: "ChIJ_barber_manchester_1",
                structuredFormat: {
                  mainText: { text: "Northern Quarter Barbers" },
                  secondaryText: { text: "Manchester, UK" },
                },
              },
            },
          ],
        },
      }),
      verifyTurnstile: async (t) => t === "good",
      log: (f) => void logs.push(f),
      now: () => Date.UTC(2026, 10, 25, 12, 0, 0),
      salt: SALT,
    });
  };
  const post = (body: unknown) =>
    new Request("https://kabsi.co/api/suggest", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify(body),
    });

  it("returns suggestions for barber Manchester and logs outcome ok", async () => {
    const res = await (
      await handler()
    )(
      post({
        action: "suggest",
        query: "barber Manchester",
        session_token: "0123456789abcdef0123",
        turnstile: "good",
      }),
    );
    const j = (await res.json()) as { suggestions: { name: string }[]; available: boolean };
    expect(res.status).toBe(200);
    expect(j.available).toBe(true);
    expect(j.suggestions.map((s) => s.name)).toEqual(["Northern Quarter Barbers"]);
    expect(logs.at(-1)).toMatchObject({ fn: "suggest", status: 200, outcome: "ok" });
  });
  it("answers warm with ok and no suggestions, on purpose, and logs outcome warm", async () => {
    const res = await (await handler())(post({ action: "warm" }));
    expect(await res.json()).toEqual({ ok: true, configured: true });
    expect(logs.at(-1)).toMatchObject({ outcome: "warm" });
  });
  it("refuses a suggest with no check and logs challenge_failed", async () => {
    const res = await (
      await handler()
    )(
      post({
        action: "suggest",
        query: "barber Manchester",
        session_token: "0123456789abcdef0123",
      }),
    );
    expect(res.status).toBe(400);
    expect(logs.at(-1)).toMatchObject({ outcome: "challenge_failed" });
  });
});
