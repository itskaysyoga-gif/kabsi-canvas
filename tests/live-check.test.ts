// Live check (8 Nov 2026, R-126): three small defects found on kabsi.co, each held by a test.
import { afterEach, describe, expect, it, vi } from "vitest";
import { pageHead } from "../src/lib/site";

describe("robots meta on every page", () => {
  const robots = (o: { noindex?: boolean }) =>
    pageHead({ title: "t", description: "d", path: "/x", ...o }).meta.find(
      (m) => (m as { name?: string }).name === "robots",
    );
  it("a public page says index, with large image previews", () => {
    expect(robots({})).toEqual({
      name: "robots",
      content: "index, follow, max-image-preview:large",
    });
  });
  it("a page kept out of search says noindex and nothing else", () => {
    expect(robots({ noindex: true })).toEqual({ name: "robots", content: "noindex" });
  });
});

describe("withdrawing a yes to statistics", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });
  it("keeps PostHog opted out after posthog.reset(), which clears the flag", async () => {
    // A PostHog that behaves as the live one does: reset() forgets the opt-out (checked on kabsi.co, 8 Nov 2026).
    let optedOut = false;
    const posthog = {
      capture: vi.fn(),
      opt_out_capturing: vi.fn(() => void (optedOut = true)),
      opt_in_capturing: vi.fn(() => void (optedOut = false)),
      set_config: vi.fn(),
      identify: vi.fn(),
      reset: vi.fn(() => void (optedOut = false)),
    };
    vi.stubGlobal("window", { posthog });
    const consent = await import("../src/lib/consent");
    const spy = vi.spyOn(consent, "analyticsPersistent");
    const allowed = vi.spyOn(consent, "analyticsAllowed");
    const { setAnalyticsPaused } = await import("../src/lib/telemetry");
    // A yes: capture on, identifier kept.
    allowed.mockReturnValue(true);
    spy.mockReturnValue(true);
    setAnalyticsPaused(true);
    setAnalyticsPaused(false);
    expect(optedOut).toBe(false);
    // The withdrawal: statistics refused, identifier dropped.
    allowed.mockReturnValue(false);
    spy.mockReturnValue(false);
    setAnalyticsPaused(true);
    setAnalyticsPaused(false);
    expect(posthog.reset).toHaveBeenCalled();
    expect(optedOut).toBe(true);
  });
});

describe("clearMetaCookies", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("expires _fbp and _fbc on the host and on the parent domain", async () => {
    const written: string[] = [];
    vi.stubGlobal("location", { hostname: "www.kabsi.co" });
    vi.stubGlobal("document", {
      set cookie(v: string) {
        written.push(v);
      },
    });
    const { clearMetaCookies } = await import("../src/lib/meta-pixel");
    clearMetaCookies();
    for (const name of ["_fbp", "_fbc"]) {
      expect(written).toContain(`${name}=; Max-Age=0; path=/`);
      expect(written).toContain(`${name}=; Max-Age=0; path=/; domain=www.kabsi.co`);
      expect(written).toContain(`${name}=; Max-Age=0; path=/; domain=kabsi.co`);
    }
    expect(written.some((w) => /domain=co$/.test(w))).toBe(false);
  });
});
