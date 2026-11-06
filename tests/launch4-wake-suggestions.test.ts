// Launch 4 part D (6 Nov 2026): the first touch of a search box wakes profile-snapshot once per page, with the same
// headers as a suggestion (so the browser's one preflight is cached for the calls that follow) and a body the function
// answers at once without Google. The function side is proven in supabase/functions/_shared/profile-snapshot.test.ts.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("wakeSuggestions", () => {
  it("sends one warm call per page, with the suggestion call's headers", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    });
    const { wakeSuggestions } = await import("../src/lib/profile-check");
    wakeSuggestions();
    wakeSuggestions();
    wakeSuggestions();
    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toMatch(/\/functions\/v1\/profile-snapshot$/);
    expect(calls[0]!.init.method).toBe("POST");
    expect(JSON.parse(String(calls[0]!.init.body))).toEqual({ action: "warm" });
    const h = calls[0]!.init.headers as Record<string, string>;
    expect(Object.keys(h).sort()).toEqual(["apikey", "authorization", "content-type"]);
  });

  it("a failed warm call may be tried again on the next touch, and never throws", async () => {
    let n = 0;
    vi.stubGlobal("fetch", () => {
      n++;
      return Promise.reject(new TypeError("offline"));
    });
    const { wakeSuggestions } = await import("../src/lib/profile-check");
    expect(() => wakeSuggestions()).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
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
