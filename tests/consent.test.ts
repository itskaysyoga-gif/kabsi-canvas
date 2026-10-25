// P0.6-01 (G-18, G-21, R-04): the consent rules, the proof row and the advertising gate.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONSENT_ASK_FIRST } from "../src/lib/region";
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

describe("rules by country (master plan 20.4)", () => {
  it("asks first in the EU, the EEA, the UK and Switzerland, and when the country is unknown; nowhere else", () => {
    for (const cc of ["DE", "IE", "FR", "NO", "IS", "GB", "CH"])
      expect(browserRules.ruleFor(cc)).toBe("opt_in");
    for (const cc of [null, "", "XX", "zz9"]) expect(browserRules.ruleFor(cc)).toBe("opt_in");
    for (const cc of ["US", "CA", "AU", "NZ", "SG", "LB", "AE", "SA"])
      expect(browserRules.ruleFor(cc)).toBe("notice");
  });

  it("keeps the browser and the server copies equal", () => {
    expect(serverRules.CONSENT_VERSION).toBe(browserRules.CONSENT_VERSION);
    expect(serverRules.CONSENT_WORDING).toEqual(browserRules.CONSENT_WORDING);
    expect([...serverRules.ASK_FIRST].sort()).toEqual([...CONSENT_ASK_FIRST].sort());
    for (const cc of ["GB", "CH", "DE", "US", "AE", null])
      expect(serverRules.ruleFor(cc)).toBe(browserRules.ruleFor(cc));
  });

  it("shows the bar and the switch with the lines of docs/COPY.md and 20.4", () => {
    const w = browserRules.CONSENT_WORDING[browserRules.CONSENT_VERSION]!;
    const copy = readFileSync("docs/COPY.md", "utf8");
    expect(copy).toContain(`**Cookie bar:** "${w.opt_in}"`);
    expect(w.panel).toBe("Let Kabsi measure its ads");
    const banner = readFileSync("src/components/shared/privacy-banner.tsx", "utf8");
    for (const label of ["Accept", "Only necessary", "Details", "Your privacy choices"])
      expect(banner).toContain(label);
    expect(readFileSync("src/components/layouts/public-layout.tsx", "utf8")).toContain(
      "Your privacy choices",
    );
  });

  it("uses no dashes or exclamation marks in the wording", () => {
    expect(JSON.stringify(browserRules.CONSENT_WORDING)).not.toMatch(/[\u2013\u2014!]/);
  });
});

describe("the proof row", () => {
  const base = {
    visitor_id: VISITOR,
    action: "accept",
    analytics: true,
    advertising: true,
    version: "2026-10-25",
    page: "/pricing?utm_source=x",
  };

  it("stores the server's own bar wording, the path only, and the network country", () => {
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
      rule: "opt_in",
      page: "/pricing",
      language: "en",
      method: "banner",
    });
    expect(r.row["wording"]).toBe(
      "Kabsi uses cookies to measure visits and improve ads. You choose.",
    );
  });

  it("stores the switch line for a choice made in the panel, under every rule", () => {
    for (const country of ["US", "DE"]) {
      const r = consentRow({
        ...base,
        action: "switch",
        method: "panel",
        advertising: false,
        analytics: false,
        country,
        country_source: "network",
      });
      if ("error" in r) throw new Error(r.error);
      expect(r.row).toMatchObject({
        method: "panel",
        wording: "Let Kabsi measure its ads",
        advertising: false,
      });
    }
  });

  it("refuses a bar choice where no bar is shown", () => {
    expect(consentRow({ ...base, country: "US", country_source: "network" })).toEqual({
      error: "bad_version",
    });
  });

  it("still reads a choice of the earlier version", () => {
    const r = consentRow({
      ...base,
      version: "2026-10-21",
      country: "DE",
      country_source: "network",
    });
    if ("error" in r) throw new Error(r.error);
    expect(r.row["wording"]).toBe(browserRules.CONSENT_WORDING["2026-10-21"]!.opt_in);
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

  it("UK: the bar shows, no advertising tag before a yes, then it loads once; statistics cookieless meanwhile", async () => {
    const { consent, posts } = await load("GB");
    const pixel = vi.fn();
    consent.runWhenAdvertisingAllowed(pixel);
    expect(consent.getConsent().rule).toBe("opt_in");
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
      version: "2026-10-25",
      method: "banner",
    });
  });

  it("Switzerland: Only necessary keeps the tag out and stops statistics, and still writes one record", async () => {
    const { consent, posts } = await load("CH");
    const pixel = vi.fn();
    consent.runWhenAdvertisingAllowed(pixel);
    await consent.saveChoice("decline", { analytics: false, advertising: false }, "/pricing");
    expect(pixel).not.toHaveBeenCalled();
    expect(consent.analyticsAllowed()).toBe(false);
    expect(posts).toHaveLength(1);
  });

  it("US: no bar, the tag may load at once, PostHog stays cookieless, and the switch turns ads off", async () => {
    const { consent, posts } = await load("US");
    const pixel = vi.fn();
    consent.runWhenAdvertisingAllowed(pixel);
    expect(consent.getConsent().rule).toBe("notice");
    expect(consent.needsChoice()).toBe(false);
    expect(pixel).toHaveBeenCalledTimes(1);
    expect(consent.analyticsPersistent()).toBe(false);
    await consent.saveChoice("switch", { analytics: false, advertising: false }, "/", "panel");
    expect(consent.advertisingAllowed()).toBe(false);
    expect(posts[0]).toMatchObject({ action: "switch", method: "panel" });
  });

  it("a choice counts for 12 months, then the bar asks again", async () => {
    const { consent } = await load("DE");
    await consent.saveChoice("accept", { analytics: true, advertising: true }, "/");
    const s = consent.getConsent();
    expect(consent.needsChoice(s)).toBe(false);
    const old = {
      ...s,
      choice: { ...s.choice!, at: new Date(Date.now() - 366 * 86_400_000).toISOString() },
    };
    expect(consent.needsChoice(old)).toBe(true);
    expect(consent.advertisingAllowed(old)).toBe(false);
  });
});
