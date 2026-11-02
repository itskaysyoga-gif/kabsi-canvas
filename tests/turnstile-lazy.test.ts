// Fix 1 (QA 2 H6): the bot check on /google-review-link, /partners and /founding loads on the form's first touch, never
// at page start. The script is not asked for before a touch, and is asked for once after the first focus.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  FIRST_TOUCH_EVENTS,
  TURNSTILE_SRC,
  loadTurnstileScript,
  resetTurnstileScriptForTest,
  startOnFirstTouch,
} from "../src/lib/turnstile-script";

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

describe("the bot check loads on the first touch", () => {
  it("asks for nothing before the form is touched, and for the script once after the first focus", () => {
    const form = new EventTarget();
    startOnFirstTouch(form, () => void loadTurnstileScript());
    expect(added).toHaveLength(0);

    form.dispatchEvent(new Event("focusin"));
    expect(added).toHaveLength(1);
    expect(added[0]!.src).toBe(TURNSTILE_SRC);
    expect(added[0]!.src).toContain("challenges.cloudflare.com");

    // More touches do not load it again.
    form.dispatchEvent(new Event("focusin"));
    form.dispatchEvent(new Event("input"));
    expect(added).toHaveLength(1);
  });

  it("a press or typing counts as the first touch too", () => {
    for (const kind of FIRST_TOUCH_EVENTS) {
      const start = vi.fn();
      const form = new EventTarget();
      startOnFirstTouch(form, start);
      expect(start).not.toHaveBeenCalled();
      form.dispatchEvent(new Event(kind));
      form.dispatchEvent(new Event(kind));
      expect(start).toHaveBeenCalledTimes(1);
    }
  });

  it("a form that goes away before it is touched loads nothing", () => {
    const start = vi.fn();
    const form = new EventTarget();
    const stop = startOnFirstTouch(form, start);
    stop();
    form.dispatchEvent(new Event("focusin"));
    expect(start).not.toHaveBeenCalled();
  });

  it("a page where the script is already there adds it no second time", async () => {
    vi.stubGlobal("window", { turnstile: {} });
    await loadTurnstileScript();
    expect(added).toHaveLength(0);
  });
});
