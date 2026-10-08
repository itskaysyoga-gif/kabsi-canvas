import { describe, expect, it } from "vitest";
import { LEGACY_REDIRECT_ENABLED, legacyRedirectTarget } from "../src/lib/legacy-host";

describe("legacyRedirectTarget", () => {
  it("is switched off until kabsi.co is on Vercel", () => {
    expect(LEGACY_REDIRECT_ENABLED).toBe(false);
    expect(legacyRedirectTarget("https://kabsi-app.lovable.app/pricing")).toBeNull();
  });

  it("keeps the path and query of an old email link when on", () => {
    expect(legacyRedirectTarget("https://kabsi-app.lovable.app/a/abc123?x=1", true)).toBe(
      "https://kabsi.co/a/abc123?x=1",
    );
    expect(legacyRedirectTarget("https://kabsi-app.lovable.app/", true)).toBe("https://kabsi.co/");
  });

  it("leaves every other host alone", () => {
    for (const host of ["kabsi.co", "www.kabsi.co", "kabsi-canvas.vercel.app", "localhost"]) {
      expect(legacyRedirectTarget(`https://${host}/pricing`, true)).toBeNull();
    }
  });
});
