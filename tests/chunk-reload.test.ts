// Fix 3 part B (Sentry KABSI-WEB-C): a route file that fails to load after a deploy reloads the page once, to the same
// address, and a second failure shows the error page instead of reloading again (no loop).
import { describe, expect, it } from "vitest";
import { GUARD_MS, isChunkLoadError, reloadOnceForChunk, type ReloadEnv } from "@/lib/chunk-reload";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
  };
}
function env(storage: ReloadEnv["storage"], href = "https://kabsi.co/for", at = 1_000_000) {
  const e = {
    storage,
    href,
    reloads: 0,
    clock: at,
    reload: () => void e.reloads++,
    now: () => e.clock,
  };
  return e;
}
// The lazy route's import, stubbed to fail the way the browser does once the old file is gone.
const failingImport = () =>
  Promise.reject(
    new TypeError(
      "Failed to fetch dynamically imported module: https://kabsi.co/assets/for.index-DGl23FJB.js",
    ),
  );

describe("chunk reload", () => {
  it("knows the browsers' messages for a missing route file, and nothing else", () => {
    expect(
      isChunkLoadError(
        new TypeError("Failed to fetch dynamically imported module: https://kabsi.co/assets/x.js"),
      ),
    ).toBe(true);
    expect(
      isChunkLoadError(
        new TypeError("error loading dynamically imported module: https://kabsi.co/assets/x.js"),
      ),
    ).toBe(true);
    expect(isChunkLoadError(new TypeError("Importing a module script failed."))).toBe(true);
    expect(isChunkLoadError(new Error("Unable to preload CSS for /assets/x.css"))).toBe(true);
    expect(isChunkLoadError(new Error("Something else broke"))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });

  it("a failed import reloads once to the same address, and the second failure shows the error page", async () => {
    const storage = memoryStorage();
    const first = env(storage);
    const err1 = await failingImport().catch((e) => e);
    expect(isChunkLoadError(err1)).toBe(true);
    expect(reloadOnceForChunk(first)).toBe(true);
    expect(first.reloads).toBe(1);
    // After the reload the same tab, same address, fails again: no second reload.
    const second = env(storage, "https://kabsi.co/for", 1_000_000 + 2_000);
    const err2 = await failingImport().catch((e) => e);
    expect(isChunkLoadError(err2)).toBe(true);
    expect(reloadOnceForChunk(second)).toBe(false);
    expect(second.reloads).toBe(0);
  });

  it("another address, or a later deploy past the guard, may reload once again", () => {
    const storage = memoryStorage();
    expect(reloadOnceForChunk(env(storage, "https://kabsi.co/for"))).toBe(true);
    expect(reloadOnceForChunk(env(storage, "https://kabsi.co/pricing", 1_000_100))).toBe(true);
    expect(
      reloadOnceForChunk(env(storage, "https://kabsi.co/pricing", 1_000_100 + GUARD_MS + 1)),
    ).toBe(true);
  });

  it("never reloads when the mark cannot be kept, so the page can never loop", () => {
    expect(reloadOnceForChunk(env(null))).toBe(false);
    const dropping = { getItem: () => null, setItem: () => {} };
    const e = env(dropping);
    expect(reloadOnceForChunk(e)).toBe(false);
    expect(e.reloads).toBe(0);
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {},
    };
    expect(reloadOnceForChunk(env(throwing))).toBe(false);
  });

  it("is a no-op on the server", () => {
    expect(reloadOnceForChunk()).toBe(false);
  });
});
