// Launch 4 (R-118 item 3): the fixed public pages may be kept at Vercel's edge; nothing private, personal or scheduled is.
import { describe, expect, it } from "vitest";
import { EDGE_CACHE_CONTROL, wantsEdgeCache, withEdgeCache } from "../src/lib/edge-cache";

const html = (init: ResponseInit = {}) =>
  new Response("<html></html>", {
    status: 200,
    ...init,
    headers: { "content-type": "text/html; charset=utf-8", ...(init.headers ?? {}) },
  });
const get = (path: string, method = "GET") => new Request(`https://kabsi.co${path}`, { method });

describe("edge cache for public pages", () => {
  it("keeps Home, Pricing, /scan, /founding and an industry page", () => {
    for (const p of ["/", "/pricing", "/scan", "/founding", "/for/hair-salon", "/privacy"])
      expect(wantsEdgeCache(get(p), html()), p).toBe(true);
  });

  it("never keeps the app, sign-in, a saved check, the guides, link pages or unknown paths", () => {
    for (const p of [
      "/app",
      "/app/reviews",
      "/login",
      "/start",
      "/staff",
      "/partner",
      "/a/abc",
      "/scan/KAB-12345678",
      "/guides",
      "/guides/reply-to-google-reviews",
      "/h/abc",
      "/u/abc",
      "/unsubscribe",
      "/billing/done",
      "/nope",
    ])
      expect(wantsEdgeCache(get(p), html()), p).toBe(false);
  });

  it("never keeps an error, a redirect, a POST, a non-page answer or a response that sets a cookie", () => {
    expect(wantsEdgeCache(get("/"), html({ status: 500 }))).toBe(false);
    expect(wantsEdgeCache(get("/"), new Response(null, { status: 307 }))).toBe(false);
    expect(wantsEdgeCache(get("/", "POST"), html())).toBe(false);
    expect(
      wantsEdgeCache(
        get("/"),
        new Response("{}", { headers: { "content-type": "application/json" } }),
      ),
    ).toBe(false);
    expect(wantsEdgeCache(get("/"), html({ headers: { "set-cookie": "a=b" } }))).toBe(false);
  });

  it("sets a short edge life and no browser cache", async () => {
    const r = withEdgeCache(html());
    expect(r.headers.get("cache-control")).toBe(EDGE_CACHE_CONTROL);
    expect(EDGE_CACHE_CONTROL).toContain("max-age=0");
    expect(EDGE_CACHE_CONTROL).toContain("s-maxage=600");
    expect(await r.text()).toBe("<html></html>");
  });
});
