// P0.4-02: Google sign-in asks only for openid, email and profile (R-11), and the snapshot is kept across sign-up.
import { afterEach, describe, expect, it, vi } from "vitest";

describe("Continue with Google", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("builds an authorize URL that asks for openid only on top of Auth's email and profile", async () => {
    vi.stubGlobal("window", { location: { origin: "https://kabsi.co" } });
    const { continueWithGoogle, GOOGLE_SCOPES_REQUESTED } = await import("@/lib/signup");
    const url = new URL((await continueWithGoogle("/start", { skipBrowserRedirect: true }))!);
    expect(url.origin + url.pathname).toBe(
      "https://ynjdqjlmdwjgbfezevxy.supabase.co/auth/v1/authorize",
    );
    expect(url.searchParams.get("provider")).toBe("google");
    expect(url.searchParams.get("scopes")).toBe("openid");
    expect(url.searchParams.get("redirect_to")).toBe("https://kabsi.co/login?next=%2Fstart");
    expect([...GOOGLE_SCOPES_REQUESTED].sort()).toEqual(["email", "openid", "profile"]);
    expect(url.toString()).not.toMatch(/business\.manage|plus\.business/);
  });

  it("never sends the owner off site after sign-in", async () => {
    const { safeNext } = await import("@/lib/signup");
    expect(safeNext("//evil.example")).toBe("/app");
    expect(safeNext("/\\evil.example")).toBe("/app");
    expect(safeNext("https://evil.example")).toBe("/app");
    expect(safeNext("/start")).toBe("/start");
  });
});

describe("the kept snapshot", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("survives the trip to sign-in for a day, then is forgotten", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    const { keepSnapshot, keptSnapshot, forgetSnapshot } = await import("@/lib/signup");
    const s = {
      place_id: "ChIJaaaaaaaaaaaaaaaa",
      name: "Harbour Lane Coffee",
      address: "12 Harbour Lane",
    };
    keepSnapshot(s);
    expect(keptSnapshot()).toEqual(s);
    const old = JSON.parse(store.get("kabsi.snapshot")!);
    store.set("kabsi.snapshot", JSON.stringify({ ...old, at: Date.now() - 25 * 3600 * 1000 }));
    expect(keptSnapshot()).toBeNull();
    keepSnapshot(s);
    forgetSnapshot();
    expect(keptSnapshot()).toBeNull();
  });
});
