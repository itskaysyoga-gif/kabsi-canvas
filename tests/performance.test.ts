// Lane R, 22 Oct 2026: the public pages paint fast on a first visit (docs/reports/lighthouse-home-2026-10-22.md). These
// tests keep the four things that earned it: no app code in the first load, the privacy banner and Nora after the first
// paint, statistics that wait for the page, and a head without forty preload hints. The consent rules are unchanged.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { afterPaint } from "../src/lib/after-paint";
import { dropModulePreloads, wantsLeanHead, withLeanHead } from "../src/lib/head-hints";
import { CONSENT_VERSION, CONSENT_WORDING } from "../src/lib/consent-rules";
import { hasStoredSession, signInInUrl } from "../src/lib/stored-session";

const read = (f: string) => readFileSync(f, "utf8");

describe("no app code in the first load of a public page", () => {
  // Importing @/lib/supabase loads supabase-js (about 55 KB compressed). These files are in every public page's first
  // load, so they may reach it only with a dynamic import() (or not at all).
  const FIRST_LOAD = [
    "src/routes/__root.tsx",
    "src/components/auth/auth-provider.tsx",
    "src/components/layouts/public-layout.tsx",
    "src/components/assistant/deferred-assistant.tsx",
    "src/components/shared/deferred-privacy-banner.tsx",
    // Web 2: the public pages' own parts (the design studio's system).
    "src/components/kabsi/site-chrome.tsx",
    "src/components/kabsi/site-header.tsx",
    "src/components/kabsi/site-footer.tsx",
    "src/components/kabsi/ui.tsx",
    "src/components/kabsi/scan-box.tsx",
    "src/components/kabsi/scan-live.tsx",
    "src/components/kabsi/d4-home.tsx",
    "src/components/kabsi/d5-founding.tsx",
    "src/components/kabsi/d2-tools.tsx",
    "src/components/kabsi/d2-partners.tsx",
    "src/lib/public-api.ts",
    "src/components/coach/coach-list.tsx",
    "src/lib/consent.ts",
    "src/lib/attribution.ts",
    "src/lib/telemetry.ts",
    "src/lib/coach.ts",
    "src/lib/profile-check.ts",
    "src/lib/site-photos.ts",
    "src/lib/review-page.ts",
    "src/lib/unsubscribe.ts",
    "src/routes/google-review-link.tsx",
    "src/routes/index.tsx",
    "src/routes/pricing.tsx",
    "src/routes/how-it-works.tsx",
  ];
  it("import the Supabase client or the app's function client only with import()", () => {
    for (const f of FIRST_LOAD) {
      const code = read(f);
      expect(code, f).not.toMatch(/from "@\/lib\/supabase"/);
      expect(code, f).not.toMatch(/from "@\/lib\/reviews"/);
      expect(code, f).not.toMatch(/from "@\/components\/assistant\/assistant-widget"/);
      expect(code, f).not.toMatch(/from "@\/components\/shared\/privacy-banner"/);
    }
  });
  it("send the URL and the anon headers from the light config file", () => {
    expect(read("src/lib/supabase-config.ts")).not.toMatch(/from "@supabase\/supabase-js"/);
    expect(read("src/lib/supabase.ts")).toMatch(
      /export \{ anonHeaders, anonJwt, supabaseUrl \} from/,
    );
  });
  it("keep Home and its demonstration in the route's own chunk, with no lazy boundary over the hero (Design 6, Web 3)", () => {
    // The router splits every route file into its own chunk, so d6-home rides in Home's chunk, not the shared one
    // (checked in the build on 31 Oct 2026: the Home text is in a 28 KB route chunk, the entry grew 0.6 KB). A React.lazy
    // boundary around it was thrown away and drawn again when the shell updated first, blanking the hero on slow phones.
    const top = read("src/routes/index.tsx");
    expect(top).toMatch(/import \{ D6Home \} from "@\/components\/kabsi\/d6-home"/);
    expect(top).not.toMatch(/\blazy\(|<Suspense/);
    expect(top).not.toMatch(/from "@\/components\/kabsi\/(d6-demo|whatsapp)"/);
    expect(read("vite.config.ts")).not.toMatch(/autoCodeSplitting:\s*false/);
  });
});

describe("the privacy banner and Nora come after the first paint", () => {
  it("the root loads the banner and Nora through the deferred wrappers", () => {
    expect(read("src/routes/__root.tsx")).toContain("<DeferredPrivacyBanner />");
    expect(read("src/components/kabsi/site-chrome.tsx")).toContain(
      '<DeferredAssistant surface="site" />',
    );
  });
  it("the consent check runs as the page hydrates, before analytics, whether or not the banner has loaded", () => {
    const root = read("src/routes/__root.tsx");
    const consent = root.indexOf("void initConsent();");
    const analytics = root.indexOf("startAnalytics();");
    expect(consent).toBeGreaterThan(-1);
    expect(analytics).toBeGreaterThan(consent);
  });
  it("opening Privacy choices before the banner has loaded loads it and opens it", () => {
    const code = read("src/components/shared/deferred-privacy-banner.tsx");
    expect(code).toContain("OPEN_EVENT");
    expect(code).toContain("openPrivacyChoices()");
    expect(read("src/components/shared/privacy-banner.tsx")).toContain("mounted.current?.()");
  });
  it("the bar is one short line, so it never becomes the largest thing on the page", () => {
    const bar = CONSENT_WORDING[CONSENT_VERSION]!.opt_in!;
    expect(bar.length).toBeLessThan(80);
  });
});

describe("the head of a public page", () => {
  const head =
    '<html><head><meta charset="utf-8"/><link rel="stylesheet" href="/assets/s.css"/>' +
    '<link rel="modulepreload" href="/assets/a.js"/><link rel="modulepreload" href="/assets/b.js"/>' +
    '<link rel="preload" href="/fonts/f.woff2" as="font" type="font/woff2" crossorigin="anonymous"/></head><body><p>Hello</p>' +
    '<link rel="modulepreload" href="/assets/in-body.js"/></body></html>';

  it("loses only the module preload hints", () => {
    const out = dropModulePreloads(head);
    expect(out).not.toContain('href="/assets/a.js"');
    expect(out).toContain('<link rel="stylesheet" href="/assets/s.css"/>');
    expect(out).toContain('rel="preload" href="/fonts/f.woff2"');
    expect(out).toContain("<p>Hello</p>");
  });

  async function stream(chunks: string[], init: ResponseInit = {}) {
    const enc = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const x of chunks) c.enqueue(enc.encode(x));
        c.close();
      },
    });
    const res = withLeanHead(
      new Response(body, { headers: { "content-type": "text/html" }, ...init }),
    );
    return res.text();
  }

  it("is rewritten in a stream, even when a tag is split across chunks, and the body is untouched", async () => {
    const cut = head.indexOf("/assets/a.js") + 4;
    const out = await stream([head.slice(0, cut), head.slice(cut, cut + 30), head.slice(cut + 30)]);
    expect(out).not.toContain('href="/assets/a.js"');
    expect(out).not.toContain('href="/assets/b.js"');
    expect(out).toContain("in-body.js"); // only the head is touched
    expect(out).toContain("<p>Hello</p>");
  });
  it("passes a response with no head through unchanged", async () => {
    expect(await stream(["<p>fragment</p>"])).toBe("<p>fragment</p>");
  });
  it("applies to public HTML pages and not to the app, sign-in, setup, an API or a POST", () => {
    const html = () =>
      new Response("x", { headers: { "content-type": "text/html; charset=utf-8" } });
    const get = (p: string) => new Request(`https://kabsi.co${p}`);
    for (const p of ["/", "/pricing", "/how-it-works", "/for/restaurants"])
      expect(wantsLeanHead(get(p), html()), p).toBe(true);
    for (const p of [
      "/app",
      "/app/plan",
      "/login",
      "/start",
      "/staff",
      "/a/token",
      "/activate/CODE",
    ])
      expect(wantsLeanHead(get(p), html()), p).toBe(false);
    expect(wantsLeanHead(new Request("https://kabsi.co/", { method: "POST" }), html())).toBe(false);
    expect(
      wantsLeanHead(
        get("/"),
        new Response("{}", { headers: { "content-type": "application/json" } }),
      ),
    ).toBe(false);
    expect(
      wantsLeanHead(
        get("/"),
        new Response("x", { status: 404, headers: { "content-type": "text/html" } }),
      ),
    ).toBe(false);
  });
  it("is wired into the server entry", () => {
    expect(read("src/server.ts")).toMatch(
      /wantsLeanHead\(request, normal\) \? withLeanHead\(normal\) : normal/,
    );
  });
});

describe("afterPaint", () => {
  type W = EventTarget & Record<string, unknown>;
  let win: W;
  beforeEach(() => {
    vi.useFakeTimers();
    win = Object.assign(new EventTarget(), {
      setTimeout: (f: () => void, ms: number) => setTimeout(f, ms) as unknown as number,
      clearTimeout: (n: number) => clearTimeout(n),
      requestIdleCallback: (f: () => void) => setTimeout(f, 0) as unknown as number,
      cancelIdleCallback: (n: number) => clearTimeout(n),
    }) as W;
    vi.stubGlobal("window", win);
    vi.stubGlobal("document", { readyState: "complete" });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("runs once, after the delay and an idle moment, not before", () => {
    const run = vi.fn();
    afterPaint(run, 1500);
    vi.advanceTimersByTime(1499);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(run).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(10_000);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("runs at once when the visitor touches the page, and only once", () => {
    const run = vi.fn();
    afterPaint(run, 1500);
    win.dispatchEvent(new Event("touchstart"));
    expect(run).toHaveBeenCalledTimes(1);
    win.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(5000);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("waits for the load event when the page is still loading", () => {
    vi.stubGlobal("document", { readyState: "loading" });
    const run = vi.fn();
    afterPaint(run, 100);
    vi.advanceTimersByTime(5000);
    expect(run).not.toHaveBeenCalled();
    win.dispatchEvent(new Event("load"));
    vi.advanceTimersByTime(110);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it("can be cancelled", () => {
    const run = vi.fn();
    afterPaint(run, 100)();
    vi.advanceTimersByTime(5000);
    expect(run).not.toHaveBeenCalled();
  });
  it("does nothing on the server", () => {
    vi.unstubAllGlobals();
    const run = vi.fn();
    expect(() => afterPaint(run)()).not.toThrow();
    expect(run).not.toHaveBeenCalled();
  });
});

describe("a stored session", () => {
  it("is read from storage without loading the client", () => {
    const store = (keys: string[]) => ({
      length: keys.length,
      key: (i: number) => keys[i] ?? null,
    });
    vi.stubGlobal("window", { localStorage: store(["kabsi_consent", "sb-abc123-auth-token"]) });
    expect(hasStoredSession()).toBe(true);
    vi.stubGlobal("window", { localStorage: store(["sb-abc123-auth-token-code-verifier"]) });
    expect(hasStoredSession()).toBe(true);
    vi.stubGlobal("window", { localStorage: store(["kabsi_consent", "kabsi_geo"]) });
    expect(hasStoredSession()).toBe(false);
    vi.unstubAllGlobals();
    expect(hasStoredSession()).toBe(false);
  });
  it("notices a sign-in coming back in the address", () => {
    expect(signInInUrl("?code=abc", "")).toBe(true);
    expect(signInInUrl("", "#access_token=x&type=magiclink")).toBe(true);
    expect(signInInUrl("?utm_source=ad", "")).toBe(false);
  });
});

describe("statistics wait for the page, and keep what happened meanwhile", () => {
  it("starts PostHog 1.5 seconds after load or at the first touch, and sends what waited if statistics are still allowed", () => {
    const code = read("src/lib/telemetry.ts");
    expect(code).toContain("const WAIT_MS = 1500;");
    expect(code).toContain("afterPaint(runStart, WAIT_MS)");
    expect(code).toMatch(
      /if \(paused \|\| !analyticsAllowed\(\)\) return;\s+for \(const \[event, properties\] of list\)/,
    );
    expect(code).toMatch(/if \(!window\.posthog\) \{[^}]*waiting\.push/);
  });
});
