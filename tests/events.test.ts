// P0.6-02 (G-31, G-32, G-44, K-127): one name per action, server events never from the browser, and where a sign-up came from.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  anonHeaders: {},
  supabaseUrl: "https://example.supabase.co",
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) }, rpc: vi.fn() },
}));

const MIGRATION = readFileSync("supabase/migrations/20261021234210_product_events.sql", "utf8");
const TELEMETRY = readFileSync("src/lib/telemetry.ts", "utf8");

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}
function union(name: string): string[] {
  const block = TELEMETRY.match(new RegExp(`export type ${name} =([^;]+);`))?.[1] ?? "";
  return [...block.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]!);
}

describe("event names", () => {
  const browser = union("BrowserEvent");
  const server = union("ServerEvent");

  it("follow object_action in lower case, and the two lists never share a name", () => {
    for (const e of [...browser, ...server]) expect(e).toMatch(/^[a-z]+(_[a-z]+)+$/);
    expect(browser.filter((e) => server.includes(e))).toEqual([]);
  });

  it("are exactly the G-31 and G-44 names the card lists", () => {
    expect([...browser, ...server].sort()).toEqual(
      [
        "landing_viewed",
        "business_found",
        "snapshot_viewed",
        "registration_completed",
        "connect_started",
        "profile_state_seen",
        "setup_call_booked",
        "google_access_granted",
        "details_confirmed",
        "reply_draft_ready",
        "reply_approved",
        "reply_published",
        "backlog_cleared",
        "profile_change_decided",
        "photo_published",
        "post_published",
        "weekly_report_opened",
        "trial_converted",
        "payment_failed",
        "subscription_paused",
        "subscription_cancelled",
      ].sort(),
    );
  });

  it("the database sends only server names", () => {
    const sent = [...MIGRATION.matchAll(/'([a-z]+(?:_[a-z]+)+)'/g)]
      .map((m) => m[1]!)
      .filter((n) => server.includes(n) || browser.includes(n));
    expect(sent.length).toBeGreaterThan(10);
    for (const n of sent) expect(server).toContain(n);
  });
});

describe("track in the browser", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends browser events and drops retired and server names", async () => {
    const posthog = { capture: vi.fn() };
    vi.stubGlobal("window", { posthog });
    const { track } = await import("../src/lib/telemetry");
    track("snapshot_viewed", { source: "tool" });
    track("reply_published", { channel: "dashboard" });
    track("free_tool_used", { source: "x" });
    expect(posthog.capture).toHaveBeenCalledTimes(1);
    expect(posthog.capture).toHaveBeenCalledWith("snapshot_viewed", { source: "tool" });
  });

  it("weekly_report_opened is sent once per report, with the business and where it was opened", async () => {
    const posthog = { capture: vi.fn() };
    vi.stubGlobal("window", { posthog });
    const { trackReportOpened } = await import("../src/lib/telemetry");
    trackReportOpened("loc-1", "rep-1");
    trackReportOpened("loc-1", "rep-1");
    trackReportOpened("loc-1", "rep-2");
    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenNthCalledWith(1, "weekly_report_opened", {
      location_id: "loc-1",
      source: "app",
    });
  });

  it("the Weekly Care Report screen fires it", () => {
    const screen = readFileSync("src/routes/_authenticated/app/report.tsx", "utf8");
    expect(screen).toContain("trackReportOpened");
    expect(screen).toContain("useEffect");
  });

  it("landing_viewed carries the page type and UTM fields, and private pages send nothing", async () => {
    const posthog = { capture: vi.fn() };
    vi.stubGlobal("window", { posthog });
    const { trackLanding } = await import("../src/lib/telemetry");
    trackLanding(
      "/pricing",
      "?utm_source=meta&utm_medium=paid_social&utm_campaign=us_reviews_202611&x=1",
    );
    trackLanding("/for/dentists", "");
    trackLanding("/app/reviews", "?utm_source=meta");
    expect(posthog.capture).toHaveBeenCalledTimes(2);
    expect(posthog.capture).toHaveBeenNthCalledWith(1, "landing_viewed", {
      page_type: "pricing",
      utm_source: "meta",
      utm_medium: "paid_social",
      utm_campaign: "us_reviews_202611",
    });
    expect(posthog.capture).toHaveBeenNthCalledWith(2, "landing_viewed", {
      page_type: "industry",
      category: "dentists",
    });
  });
});

describe("attribution", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function load(advertising: boolean) {
    let cookies = "";
    const doc = {
      get cookie() {
        return cookies;
      },
      set cookie(v: string) {
        cookies = (cookies ? cookies + "; " : "") + v.split(";")[0];
        lastCookie = v;
      },
      referrer: "",
    };
    let lastCookie = "";
    vi.stubGlobal("window", {
      localStorage: memoryStorage(),
      sessionStorage: memoryStorage(),
      location: { protocol: "https:" },
    });
    vi.stubGlobal("document", doc);
    const consent = await import("../src/lib/consent");
    const fetchGeo = vi.fn(
      async () => new Response(JSON.stringify({ country: advertising ? "US" : "GB" })),
    ) as unknown as typeof fetch;
    await consent.initConsent(fetchGeo);
    const attribution = await import("../src/lib/attribution");
    return { attribution, lastCookie: () => lastCookie };
  }

  it("keeps the first touch, moves the last touch only with UTMs, and sets the via cookie for 60 days", async () => {
    const { attribution, lastCookie } = await load(true);
    attribution.captureTouch(
      "https://kabsi.co/meta?utm_source=meta&utm_campaign=us_reviews_202611&fbclid=AbC_1",
      "https://l.facebook.com/x",
    );
    attribution.captureTouch("https://kabsi.co/pricing", "");
    attribution.captureTouch("https://kabsi.co/?utm_source=partner&via=dana7", "");
    const p = attribution.attributionPayload();
    expect(p["first"]).toMatchObject({
      utm_source: "meta",
      landing: "/meta",
      referrer: "l.facebook.com",
    });
    expect(p["last"]).toMatchObject({ utm_source: "partner", landing: "/" });
    expect(p["fbclid"]).toBe("AbC_1");
    expect(String(p["fbc"])).toMatch(/^fb\.1\.\d+\.AbC_1$/);
    expect(p["via"]).toBe("DANA7");
    expect(lastCookie()).toContain(`Max-Age=${60 * 86400}`);
  });

  it("keeps no advertising identifier where advertising waits for a yes", async () => {
    const { attribution } = await load(false);
    attribution.captureTouch("https://kabsi.co/meta?utm_source=meta&fbclid=AbC_1", "");
    const p = attribution.attributionPayload();
    expect(p["fbclid"]).toBeNull();
    expect(p["fbc"]).toBeNull();
    expect(p["first"]).toMatchObject({ utm_source: "meta" });
  });
});
