// Check 2 (1 Nov 2026): finding the right business. The browser side of the suggestions never shows an error (any failure
// means "no suggestions, search then pick"), and every line a visitor reads here is in docs/COPY.md word for word.
// The combobox, the one-match question and the change link are proven in a browser by tests/e2e/check2-find-business.spec.ts;
// the Edge Function (bot check, limits, cap, session token) by supabase/functions/_shared/profile-snapshot.test.ts.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { suggestBusinesses } from "../src/lib/profile-check";

const SESSION = "6f1c2c2e-9a0b-4f0e-8d57-0a4e0d1f3b21";
const reply = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe("suggestBusinesses", () => {
  it("sends the session token and the bot check, then the pass, and returns at most 5", async () => {
    const seen: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", (_u: string, init: RequestInit) => {
      seen.push(JSON.parse(String(init.body)));
      return reply(200, {
        available: true,
        pass: "p1",
        suggestions: Array.from({ length: 7 }, (_, i) => ({
          place_id: `ChIJ${i}`,
          name: `n${i}`,
          address: "a",
        })),
      });
    });
    const first = await suggestBusinesses({
      query: "smile",
      sessionToken: SESSION,
      turnstile: "t",
    });
    expect(first.available).toBe(true);
    expect(first.pass).toBe("p1");
    expect(first.suggestions).toHaveLength(5);
    await suggestBusinesses({ query: "smile d", sessionToken: SESSION, pass: "p1" });
    expect(seen[0]).toEqual({
      action: "suggest",
      query: "smile",
      session_token: SESSION,
      turnstile: "t",
    });
    expect(seen[1]).toEqual({
      action: "suggest",
      query: "smile d",
      session_token: SESSION,
      pass: "p1",
    });
  });

  it("says not available on any refusal, error or network failure, and never throws", async () => {
    for (const status of [400, 429, 500, 503]) {
      vi.stubGlobal("fetch", () => reply(status, { error: "x", message: "x" }));
      expect(
        await suggestBusinesses({ query: "smile", sessionToken: SESSION, turnstile: "t" }),
      ).toEqual({
        suggestions: [],
        available: false,
      });
    }
    // The server's own "not available" (the day cap, a Google error) is the same to the page.
    vi.stubGlobal("fetch", () => reply(200, { suggestions: [], available: false }));
    expect(
      (await suggestBusinesses({ query: "smile", sessionToken: SESSION, turnstile: "t" }))
        .available,
    ).toBe(false);
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));
    expect(
      (await suggestBusinesses({ query: "smile", sessionToken: SESSION, turnstile: "t" }))
        .available,
    ).toBe(false);
  });

  it("tells the page when the pass ran out, so it asks again with a fresh bot check", async () => {
    vi.stubGlobal("fetch", () => reply(400, { error: "challenge_failed", message: "x" }));
    expect(await suggestBusinesses({ query: "smile", sessionToken: SESSION, pass: "old" })).toEqual(
      {
        suggestions: [],
        available: false,
        challengeFailed: true,
      },
    );
  });

  it("lets an abort through, so a newer keystroke can cancel an older call", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new DOMException("aborted", "AbortError")));
    await expect(
      suggestBusinesses({ query: "smile", sessionToken: SESSION, turnstile: "t" }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});

describe("the lines a visitor reads", () => {
  const copy = readFileSync("docs/COPY.md", "utf8");
  const live = readFileSync("src/components/kabsi/scan-live.tsx", "utf8");
  const combo = readFileSync("src/components/kabsi/business-combobox.tsx", "utf8");
  const lines = [
    "Is this your business?",
    "This is my business",
    "Not here? Search again",
    "Not your business? Change it",
    "Find your business again",
    "Add the city, or type the name exactly as it shows on Google.",
  ];
  it("are in docs/COPY.md and in the screen, word for word", () => {
    for (const l of lines) {
      expect(copy, l).toContain(l);
      expect(live, l).toContain(l);
    }
    expect(copy).toContain("No suggestions. Press Enter to search.");
    expect(combo).toContain("No suggestions. Press Enter to search.");
    expect(combo).toContain("Use the up and down arrow keys, then Enter to choose.");
  });
  it("carry no dash and no exclamation mark", () => {
    for (const l of [...lines, "No suggestions. Press Enter to search."])
      expect(l).not.toMatch(/[–—!]/);
  });
  it("show the attribution Google's Places policy asks for, as the words Google Maps, not translated", () => {
    expect(combo).toContain('translate="no"');
    expect(combo).toMatch(/<span translate="no">Google Maps<\/span>/);
  });
  it("Scan 3: the tab keeps only the suggestions' signed pass, under one key, nothing from Places", () => {
    const store = readFileSync("src/lib/suggest-pass.ts", "utf8");
    expect(store.match(/sessionStorage\.setItem\(([^,]+),/g)).toEqual([
      "sessionStorage.setItem(PASS_KEY,",
    ]);
    expect(store).not.toMatch(/localStorage|indexedDB|place_id|FoundBusiness|Snapshot/);
  });
  it("never ask Places for more than the place ID to keep: nothing is stored from a suggestion", () => {
    expect(combo).not.toMatch(/localStorage|sessionStorage|indexedDB/);
    expect(readFileSync("src/lib/profile-check.ts", "utf8")).not.toMatch(
      /localStorage|sessionStorage/,
    );
  });
});
