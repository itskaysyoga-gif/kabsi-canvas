import { describe, expect, it } from "vitest";
import { FOUNDING_COUNT_CDN_CACHE, foundingCountResponse } from "@/lib/founding-count";
import { FOUNDING_COUNT_PATH, loadFoundingPlaces } from "@/lib/public-api";
import { readFileSync } from "node:fs";

const COUNT = { total: 25, left: 12, open_to_any: false, by_trade: {} };
const answer = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("Speed 2 part B: the founding count through kabsi.co", () => {
  it("passes the count on with the edge cache header", async () => {
    let asked = "";
    const r = await foundingCountResponse((async (u: string) => {
      asked = String(u);
      return new Response(JSON.stringify(COUNT));
    }) as unknown as typeof fetch);
    expect(asked).toMatch(/\/functions\/v1\/programs\/founding$/);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(COUNT);
    expect(r.headers.get("vercel-cdn-cache-control")).toBe(FOUNDING_COUNT_CDN_CACHE);
    expect(FOUNDING_COUNT_CDN_CACHE).toBe("max-age=60, stale-while-revalidate=600");
  });

  it("never caches a count it could not read", async () => {
    for (const f of [
      answer({ error: "unavailable" }, 503),
      answer({ left: "12" }),
      answer({ total: 25, left: -1 }),
      (async () => {
        throw new Error("down");
      }) as unknown as typeof fetch,
    ]) {
      const r = await foundingCountResponse(f);
      expect(r.status).toBe(503);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(r.headers.has("vercel-cdn-cache-control")).toBe(false);
    }
  });

  it("the page asks its own address with a plain GET (no preflight)", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (u: string, init?: RequestInit) => {
      calls.push([String(u), init]);
      return new Response(JSON.stringify(COUNT));
    }) as unknown as typeof fetch;
    try {
      expect(await loadFoundingPlaces()).toEqual(COUNT);
    } finally {
      globalThis.fetch = real;
    }
    expect(calls).toEqual([[FOUNDING_COUNT_PATH, undefined]]);
    expect(FOUNDING_COUNT_PATH).toBe("/api/founding-count");
    expect(readFileSync("src/routes/api.founding-count.ts", "utf8")).toContain("foundingCountResponse()");
  });
});
