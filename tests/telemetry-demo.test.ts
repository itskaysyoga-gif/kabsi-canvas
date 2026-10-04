// P0.1-06 (R-17): nothing from a demo business reaches PostHog.
import { afterEach, describe, expect, it, vi } from "vitest";

describe("setAnalyticsPaused", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("drops events while a demo business is on screen and resumes for a real one", async () => {
    const posthog = { capture: vi.fn(), opt_out_capturing: vi.fn(), opt_in_capturing: vi.fn() };
    vi.stubGlobal("window", { posthog });
    const { setAnalyticsPaused, track } = await import("../src/lib/telemetry");

    track("reply_published", { channel: "dashboard" });
    expect(posthog.capture).toHaveBeenCalledTimes(1);

    setAnalyticsPaused(true);
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);
    track("reply_published", { channel: "dashboard" });
    expect(posthog.capture).toHaveBeenCalledTimes(1);

    setAnalyticsPaused(true);
    expect(posthog.opt_out_capturing).toHaveBeenCalledTimes(1);

    setAnalyticsPaused(false);
    expect(posthog.opt_in_capturing).toHaveBeenCalledTimes(1);
    track("reply_published", { channel: "dashboard" });
    expect(posthog.capture).toHaveBeenCalledTimes(2);
  });

  it("never opts a visitor in who was never paused", async () => {
    const posthog = { capture: vi.fn(), opt_out_capturing: vi.fn(), opt_in_capturing: vi.fn() };
    vi.stubGlobal("window", { posthog });
    const { setAnalyticsPaused } = await import("../src/lib/telemetry");
    setAnalyticsPaused(false);
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });
});
