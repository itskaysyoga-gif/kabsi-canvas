import { describe, expect, it } from "vitest";
import middleware, { config } from "../middleware";
import { adClickRewrite, isTrackingKey } from "@/lib/ad-click";
import { CACHED_PATHS } from "@/lib/edge-cache";

const req = (path: string, method = "GET") => new Request(`https://kabsi.co${path}`, { method });

describe("Speed 2 part C: ad clicks are served the clean page's cached copy", () => {
  it("the middleware runs on exactly the edge cached pages", () => {
    expect([...config.matcher].sort()).toEqual([...CACHED_PATHS].sort());
  });

  it("rewrites a query of tracking parameters only to the clean address", () => {
    for (const q of [
      "?fbclid=test",
      "?utm_source=meta&utm_medium=paid_social&utm_campaign=launch&utm_content=a&utm_term=b&fbclid=QA123",
      "?gclid=x",
      "?ttclid=x",
      "?utm_id=1&ad_id=1&adset_id=2&campaign_id=3",
    ]) {
      expect(adClickRewrite(req(`/pricing${q}`))?.toString()).toBe("https://kabsi.co/pricing");
    }
    expect(adClickRewrite(req("/?fbclid=1", "HEAD"))?.toString()).toBe("https://kabsi.co/");
  });

  it("leaves every other query, page and method alone", () => {
    expect(adClickRewrite(req("/pricing"))).toBeNull();
    expect(adClickRewrite(req("/pricing?"))).toBeNull();
    // Founding 1 (R-151): the private invite page is never cached, so a tracking query is left alone there.
    expect(adClickRewrite(req("/founding/abc?fbclid=1"))).toBeNull();
    expect(adClickRewrite(req("/scan?place=ChIJabc&fbclid=1"))).toBeNull();
    expect(adClickRewrite(req("/pricing?plan=pro"))).toBeNull();
    expect(adClickRewrite(req("/guides/x?fbclid=1"))).toBeNull();
    expect(adClickRewrite(req("/for/salons?fbclid=1"))).toBeNull();
    expect(adClickRewrite(req("/scan/ABC123?fbclid=1"))).toBeNull();
    expect(adClickRewrite(req("/founding?fbclid=1", "POST"))).toBeNull();
    expect(isTrackingKey("utm_")).toBe(false);
    expect(isTrackingKey("UTM_SOURCE")).toBe(false);
  });

  it("answers with Vercel's rewrite header, or nothing", () => {
    expect(middleware(req("/pricing?fbclid=test"))?.headers.get("x-middleware-rewrite")).toBe(
      "https://kabsi.co/pricing",
    );
    expect(middleware(req("/pricing?x=1"))).toBeUndefined();
  });
});
