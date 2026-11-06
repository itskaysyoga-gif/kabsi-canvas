// Launch 4 part D (6 Nov 2026), Speed 2 part A: the first touch of a search box wakes profile-snapshot once per page, with the same
// headers as a suggestion (so the browser's one preflight is cached for the calls that follow) and a body the function
// answers at once without Google. The function side is proven in supabase/functions/_shared/profile-snapshot.test.ts.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("wakeSuggestions", () => {
  // Speed 2 part A: the warm call goes to the route on kabsi.co first; only when the route says it is not set up is the
  // function woken, with the suggestion call's headers (so its preflight is cached for the calls that follow).
  it("sends one warm call per page to the route, and wakes the function only when the route is not set up", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    let configured = false;
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(
        new Response(JSON.stringify({ ok: true, configured }), { status: 200 }),
      );
    });
    const { wakeSuggestions } = await import("../src/lib/profile-check");
    wakeSuggestions();
    wakeSuggestions();
    wakeSuggestions();
    await vi.waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[0]!.url).toBe("/api/suggest");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ action: "warm" });
    expect(Object.keys(calls[0]!.init.headers as Record<string, string>)).toEqual(["content-type"]);
    expect(calls[1]!.url).toMatch(/\/functions\/v1\/profile-snapshot$/);
    expect(calls[1]!.init.method).toBe("POST");
    expect(JSON.parse(String(calls[1]!.init.body))).toEqual({ action: "warm" });
    const h = calls[1]!.init.headers as Record<string, string>;
    expect(Object.keys(h).sort()).toEqual(["apikey", "authorization", "content-type"]);

    vi.resetModules();
    calls.length = 0;
    configured = true;
    const again = await import("../src/lib/profile-check");
    again.wakeSuggestions();
    await new Promise((r) => setTimeout(r, 10));
    expect(calls.map((c) => c.url)).toEqual(["/api/suggest"]);
  });

  it("a failed warm call may be tried again on the next touch, and never throws", async () => {
    let n = 0;
    vi.stubGlobal("fetch", () => {
      n++;
      return Promise.reject(new TypeError("offline"));
    });
    const { wakeSuggestions } = await import("../src/lib/profile-check");
    expect(() => wakeSuggestions()).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    wakeSuggestions();
    expect(n).toBe(2);
  });

  it("the box wakes the function on its first touch, before the bot check", () => {
    const box = readFileSync("src/components/kabsi/business-combobox.tsx", "utf8");
    const warm = box.slice(box.indexOf("const warm = useCallback"));
    expect(warm.indexOf("wakeSuggestions()")).toBeGreaterThan(0);
    expect(warm.indexOf("wakeSuggestions()")).toBeLessThan(warm.indexOf("takeToken()"));
  });
});
