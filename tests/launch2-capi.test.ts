// Launch 2 part A (master plan 30.36 item 4): Lead and FreeScanCompleted go to Meta twice, from the Pixel and from Kabsi's
// server, with the same event id, so Meta keeps one. The server side (supabase/functions/_shared/meta-capi-web.ts) has its
// own Deno tests for consent given, consent missing and the payload; here the browser half: the id matches, and nothing
// goes to the server without a stored choice.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Call = { url: string; body: Record<string, unknown> };

function fakeBrowser(store: Record<string, string>) {
  const fetched: Call[] = [];
  const fbq = vi.fn();
  const listeners: Record<string, () => void> = {};
  const win = {
    location: { href: "https://kabsi.co/scan?utm_source=meta&fbclid=QA" },
    localStorage: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
    },
    sessionStorage: { getItem: () => null, setItem: () => undefined },
    addEventListener: (e: string, f: () => void) => void (listeners[e] = f),
    removeEventListener: () => undefined,
    setTimeout: () => 0,
    clearTimeout: () => undefined,
    fbq: undefined as unknown,
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", {
    cookie: "_fbp=fb.1.1730000000000.123; _fbc=fb.1.1730000000000.QA",
    readyState: "loading",
    head: { appendChild: () => undefined },
    createElement: () => ({}),
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: { body?: string }) => {
      if (String(url).includes("/consent"))
        fetched.push({ url: String(url), body: JSON.parse(init?.body ?? "{}") });
      if (String(url).includes("/api/geo"))
        return new Response(JSON.stringify({ country: "GB" }), {
          headers: { "content-type": "application/json" },
        });
      return new Response("{}", { status: 200 });
    }),
  );
  return { fetched, fbq, win };
}

async function load() {
  vi.resetModules();
  vi.stubEnv("VITE_META_PIXEL_ID", "123456789");
  const consent = await import("@/lib/consent");
  const pixel = await import("@/lib/meta-pixel");
  return { consent, pixel };
}

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("the server copy of Lead and FreeScanCompleted", () => {
  it("carries the event id the Pixel used, the same name, the page without its query, and Meta's cookies", async () => {
    const b = fakeBrowser({});
    const { consent, pixel } = await load();
    await consent.initConsent();
    await consent.saveChoice("accept", { analytics: true, advertising: true }, "/scan");
    pixel.pixelPageView("/scan");
    b.win.fbq = b.fbq;
    pixel.pixelCustom("FreeScanCompleted");
    pixel.pixelEvent("Lead", { content_name: "free_check_report" });
    const pixelIds = b.fbq.mock.calls
      .filter((c) => c[1] === "FreeScanCompleted" || c[1] === "Lead")
      .map((c) => [c[1], (c[3] as { eventID: string }).eventID]);
    const server = b.fetched.filter((c) => c.url.endsWith("/functions/v1/consent/meta"));
    expect(server.map((c) => [c.body.event_name, c.body.event_id])).toEqual(pixelIds);
    expect(pixelIds).toHaveLength(2);
    const visitor = consent.liveChoice()!.visitor;
    expect(server[0].body).toEqual({
      visitor_id: visitor,
      event_name: "FreeScanCompleted",
      event_id: pixelIds[0][1],
      event_source_url: "https://kabsi.co/scan",
      fbp: "fb.1.1730000000000.123",
      fbc: "fb.1.1730000000000.QA",
    });
    expect(server[1].body.content_name).toBe("free_check_report");
  });

  it("sends nothing to the server, and nothing to the Pixel, without a choice that allows ads", async () => {
    const b = fakeBrowser({});
    const { consent, pixel } = await load();
    await consent.initConsent();
    await consent.saveChoice("decline", { analytics: false, advertising: false }, "/scan");
    b.win.fbq = b.fbq;
    pixel.pixelPageView("/scan");
    pixel.pixelCustom("FreeScanCompleted");
    pixel.pixelEvent("Lead", { content_name: "founding_25" });
    expect(b.fbq).not.toHaveBeenCalled();
    expect(b.fetched.filter((c) => c.url.endsWith("/consent/meta"))).toEqual([]);
  });

  it("never sends PageView, ViewContent or FreeScanStarted to the server", async () => {
    const b = fakeBrowser({});
    const { consent, pixel } = await load();
    await consent.initConsent();
    await consent.saveChoice("accept", { analytics: true, advertising: true }, "/pricing");
    b.win.fbq = b.fbq;
    pixel.pixelPageView("/pricing");
    pixel.pixelCustom("FreeScanStarted");
    expect(b.fetched.filter((c) => c.url.endsWith("/consent/meta"))).toEqual([]);
  });

  it("builds the body from the page address without its query string", async () => {
    const { pixel } = await load();
    expect(
      pixel.serverCopyBody(
        "Lead",
        "e1",
        "v1",
        "https://kabsi.co/founding?utm_source=meta#form",
        { fbp: null, fbc: null },
        "founding_25",
      ),
    ).toEqual({
      visitor_id: "v1",
      event_name: "Lead",
      event_id: "e1",
      event_source_url: "https://kabsi.co/founding",
      fbp: null,
      fbc: null,
      content_name: "founding_25",
    });
  });
});
