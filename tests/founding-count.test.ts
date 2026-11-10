import { describe, expect, it } from "vitest";
import { foundingCountResponse } from "@/lib/founding-count";
import { FOUNDING_COUNT_PATH, loadFoundingPlaces } from "@/lib/public-api";
import { readFileSync } from "node:fs";

// Founding 1 (R-151): the count answers only to the private invite slug, and nothing about it is ever cached. The slug in
// these tests is invented; the real one lives only in app_settings.
const SLUG = "AbCdEfGhIjKlMnOpQrStUvWx";
const COUNT = { total: 25, left: 12, open_to_any: false, by_trade: {} };
const answer = (body: unknown, status = 200) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("Founding 1: the Founding 25 count through kabsi.co, only with the invite slug", () => {
  it("passes the count on with the slug, no-store and noindex, and no edge cache header", async () => {
    let asked = "";
    let askedWith = "";
    const r = await foundingCountResponse(SLUG, (async (u: string, init?: RequestInit) => {
      asked = String(u);
      askedWith = (init?.headers as Record<string, string>)["x-founding-invite"] ?? "";
      return new Response(JSON.stringify(COUNT));
    }) as unknown as typeof fetch);
    // The slug rides in a header, never in the address (so no request log keeps it).
    expect(asked).toMatch(/\/functions\/v1\/programs\/founding$/);
    expect(askedWith).toBe(SLUG);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(COUNT);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(r.headers.has("vercel-cdn-cache-control")).toBe(false);
  });

  it("answers 404 with no slug, a slug of the wrong shape or a wrong slug, and asks nobody for the first two", async () => {
    let calls = 0;
    const counting = (async () => {
      calls++;
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404 });
    }) as unknown as typeof fetch;
    for (const s of [null, undefined, "", "short", `${SLUG}x`, "AbCdEfGhIjKlMnOpQrStUv!?", 42]) {
      const r = await foundingCountResponse(s, counting);
      expect(r.status, String(s)).toBe(404);
      expect(r.headers.get("cache-control")).toBe("no-store");
    }
    expect(calls).toBe(0);
    const wrong = await foundingCountResponse(SLUG, counting);
    expect(wrong.status).toBe(404);
    // A gateway 404 (the function is missing) is not "wrong slug": the page says unavailable, never not found, to a real invite.
    const gone = await foundingCountResponse(SLUG, answer({ code: "NOT_FOUND" }, 404));
    expect(gone.status).toBe(503);
    expect(calls).toBe(1);
    expect(await wrong.json()).toEqual({ error: "not_found" });
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
      const r = await foundingCountResponse(SLUG, f);
      expect(r.status).toBe(503);
      expect(r.headers.get("cache-control")).toBe("no-store");
      expect(r.headers.has("vercel-cdn-cache-control")).toBe(false);
    }
  });

  it("the page asks its own address with the slug and never uses a cached answer", async () => {
    const calls: [string, RequestInit | undefined][] = [];
    const real = globalThis.fetch;
    globalThis.fetch = (async (u: string, init?: RequestInit) => {
      calls.push([String(u), init]);
      return new Response(JSON.stringify(COUNT));
    }) as unknown as typeof fetch;
    try {
      expect(await loadFoundingPlaces(SLUG)).toEqual(COUNT);
    } finally {
      globalThis.fetch = real;
    }
    expect(calls).toEqual([
      [FOUNDING_COUNT_PATH, { cache: "no-store", headers: { "x-founding-invite": SLUG } }],
    ]);
    expect(FOUNDING_COUNT_PATH).toBe("/api/founding-count");
    expect(readFileSync("src/routes/api.founding-count.ts", "utf8")).toContain(
      'headers.get("x-founding-invite")',
    );
  });
});
