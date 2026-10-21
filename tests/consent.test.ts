// P0.6-01 (G-18, G-21, R-04): the consent rules, the proof row and the advertising gate.
import { afterEach, describe, expect, it, vi } from "vitest";
import * as browserRules from "../src/lib/consent-rules";
import * as serverRules from "../supabase/functions/_shared/consent";
import { consentRow } from "../supabase/functions/_shared/consent-row";

vi.mock("@/lib/supabase", () => ({
  anonHeaders: { apikey: "anon", authorization: "Bearer anon" },
  supabaseUrl: "https://example.supabase.co",
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

const VISITOR = "3f1d2c4b-5a6e-4f70-8a9b-0c1d2e3f4a5b";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
function geoFetch(country: string | null) {
  return vi.fn(
    async () => new Response(JSON.stringify({ country }), { status: 200 }),
  ) as unknown as typeof fetch;
}

describe("rules by country", () => {
  it("asks before advertising in the UK, EU, EEA, UAE and Saudi Arabia, and when the country is unknown", () => {
    for (const cc of ["DE", "IE", "FR", "NO", "IS"])
      expect(browserRules.ruleFor(cc)).toBe("opt_in");
    for (const cc of ["GB", "AE", "SA"]) expect(browserRules.ruleFor(cc)).toBe("ads_opt_in");
    for (const cc of [null, "", "XX", "zz9"]) expect(browserRules.ruleFor(cc)).toBe("opt_in");
    for (const cc of ["US", "CA", "AU", "NZ", "SG", "LB"])
      expect(browserRules.ruleFor(cc)).toBe("notice");
  });

  it("keeps the browser and the server copies equal", () => {
    expect(serverRules.CONSENT_VERSION).toBe(browserRules.CONSENT_VERSION);
    expect(serverRules.CONSENT_WORDING).toEqual(browserRules.CONSENT_WORDING);
    for (const cc of ["GB", "DE", "US", "AE", null])
      expect(serverRules.ruleFor(cc)).toBe(browserRules.ruleFor(cc));
  });

  it("uses no dashes or exclamation marks in the wording", () => {
    expect(JSON.stringify(browserRules.CONSENT_WORDING)).not.toMatch(/[–—!]/);
  });
});

describe("the proof row", () => {
  const base = {
    visitor_id: VISITOR,
    action: "accept",
    analytics: true,
    advertising: true,
    version: "2026-10-21",
    page: "/pricing?utm_source=x",
  };

  it("stores the server's own wording for the rule, the path only, and the network country", () => {
    const r = consentRow({
      ...base,
      country: "GB",
      country_source: "network",
      tz: "America/New_York",
    });
    if ("error" in r) throw new Error(r.error);
    expect(r.row).toMatchObject({
      country: "GB",
      country_source: "network",
      rule: "ads_opt_in",
      page: "/pricing",
      language: "en",
    });
    expect(r.row["wording"]).toBe(browserRules.CONSENT_WORDING["2026-10-21"]!.ads_opt_in);
  });

  it("falls back to the time zone, and never keeps an action-link token", () => {
    const r = consentRow({
      ...base,
      country: null,
      country_source: "unknown",
      tz: "Europe/Berlin",
      page: "/a/secret-token",
    });
    if ("error" in r) throw new Error(r.error);
    expect(r.row).toMatchObject({
      country: "DE",
      country_source: "timezone",
      rule: "opt_in",
      page: "/a/:token",
    });
  });

  it("refuses an unknown version, action, visitor or missing choices", () => {
    expect(consentRow({ ...base, version: "1999" })).toEqual({ error: "bad_version" });
    expect(consentRow({ ...base, action: "maybe" })).toEqual({ error: "bad_action" });
    expect(consentRow({ ...base, visitor_id: "x" })).toEqual({ error: "bad_visitor" });
    expect(consentRow({ ...base, analytics: "yes" })).toEqual({ error: "bad_choices" });
  });
});

describe("the advertising gate in the browser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function load(country: string | null) {
    const posts: unknown[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith("/functions/v1/consent")) posts.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    vi.stubGlobal("window", {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
      dispatchEvent: () => true,
    });
    vi.stubGlobal("fetch", fetchMock);
    const consent = await import("../src/lib/consent");
    await consent.initConsent(geoFetch(country));
    return { consent, posts };
  }

  it("UK: no advertising tag before a yes, then it loads once; statistics run cookieless meanwhile", async () => {
    const { consent, posts } = await load("GB");
    const pixel = vi.fn();
    consent.runWhenAdvertisingAllowed(pixel);
    expect(consent.getConsent().rule).toBe("ads_opt_in");
    expect(consent.needsChoice()).toBe(true);
    expect(pixel).not.toHaveBeenCalled();
    expect(consent.analyticsAllowed()).toBe(true);
    expect(consent.analyticsPersistent()).toBe(false);

    await consent.saveChoice("accept", { analytics: true, advertising: true }, "/");
    expect(pixel).toHaveBeenCalledTimes(1);
    expect(consent.analyticsPersistent()).toBe(true);
    expect(consent.needsChoice()).toBe(false);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      action: "accept",
      country: "GB",
      country_source: "network",
      version: "2026-10-21",
    });
  });

  it("UK: declining keeps the tag out and stops statistics, and still writes one record", async () => {
    const { consent, posts } = await load("GB");
    const pixel = vi.fn();
    consent.runWhenAdvertisingAllowed(pixel);
    await consent.saveChoice("decline", { analytics: false, advertising: false }, "/pricing");
    expect(pixel).not.toHaveBeenCalled();
    expect(consent.analyticsAllowed()).toBe(false);
    expect(posts).toHaveLength(1);
  });

  it("US: the notice shows and the tag may load at once", async () => {
    const { consent } = await load("US");
    const pixel = vi.fn();
    consent.runWhenAdvertisingAllowed(pixel);
    expect(consent.getConsent().rule).toBe("notice");
    expect(consent.needsChoice()).toBe(true);
    expect(pixel).toHaveBeenCalledTimes(1);
  });
});
