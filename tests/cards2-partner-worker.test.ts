import { describe, expect, it, vi } from "vitest";
import worker from "../workers/kabsi-go/src/index.js";
import { served } from "../supabase/functions/_shared/card-served";

// Cards 2, partner side (master plan 30.50 item 9): an unclaimed partner card with its business set sends a tap straight
// to that business's Google review form (no page in between, no rating question, no filter); the tap is logged like any
// other, with no IP address. The Worker itself is unchanged: the database lookup (tap function) and the KV copy (kv-sync)
// serve such a card as an active direct link through one rule, card-served.ts.
const GOOGLE = "https://search.google.com/local/writereview?placeid=ChIJpartner0001";
const PARTNER_ROW = {
  status: "unassigned",
  destination: GOOGLE,
  location_id: null,
  page_mode: "page",
  partner_id: "p-1",
};

describe("served: one rule for the tap function and kv-sync", () => {
  it("serves an unclaimed partner card with its business as an active direct link, never the page", () => {
    expect(served(PARTNER_ROW)).toEqual({
      status: "active",
      destination: GOOGLE,
      location_id: null,
      page_mode: "direct",
    });
  });
  it("leaves a partner card with no business, a switched off one and a plain unassigned card unserved", () => {
    expect(served({ ...PARTNER_ROW, destination: null }).status).toBe("unassigned");
    expect(served({ ...PARTNER_ROW, status: "disabled" }).status).toBe("disabled");
    expect(served({ ...PARTNER_ROW, partner_id: null }).status).toBe("unassigned");
    expect(served({ ...PARTNER_ROW, destination: "https://example.com/x" }).status).toBe(
      "unassigned",
    );
  });
  it("keeps a claimed card exactly as before", () => {
    const row = {
      status: "active",
      destination: GOOGLE,
      location_id: "loc",
      page_mode: "page",
      partner_id: "p-1",
    };
    expect(served(row)).toEqual({
      status: "active",
      destination: GOOGLE,
      location_id: "loc",
      page_mode: "page",
    });
  });
});

describe("the go.kabsi.co Worker with a partner card", () => {
  async function tap(tapAnswer: Record<string, unknown> | null) {
    const kv = { get: vi.fn(async () => null), put: vi.fn(async () => undefined) };
    const waits: Promise<unknown>[] = [];
    const calls: { method: string; headers: Record<string, string>; body: string | null }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        calls.push({
          method: init?.method ?? "GET",
          headers: Object.fromEntries(new Headers(init?.headers).entries()),
          body: (init?.body as string) ?? null,
        });
        if ((init?.method ?? "GET") === "GET")
          return tapAnswer ? Response.json(tapAnswer) : new Response(null, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    );
    const res = await worker.fetch(
      new Request("https://go.kabsi.co/PRT234", {
        headers: { "user-agent": "Android", "cf-connecting-ip": "203.0.113.9" },
      }),
      {
        STICKERS: kv,
        APP_ORIGIN: "https://kabsi.co",
        TAP_FUNCTION_URL: "https://tap.test",
        TAP_SECRET: "s",
      },
      { waitUntil: (p: Promise<unknown>) => waits.push(p) },
    );
    await Promise.all(waits);
    vi.unstubAllGlobals();
    return { res, calls };
  }

  it("goes straight to the business's Google review form and logs the tap with no IP", async () => {
    const s = served(PARTNER_ROW);
    const { res, calls } = await tap({
      status: s.status,
      destination: s.destination,
      business_id: null,
      page_mode: s.page_mode,
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe(GOOGLE);
    const post = calls.find((c) => c.method === "POST")!;
    expect(post).toBeTruthy();
    expect(post.body).not.toContain("203.0.113.9");
    expect(JSON.parse(post.body!)).toMatchObject({
      code: "PRT234",
      source: "nfc",
      device: "android",
    });
  });

  it("sends a partner card with no business yet to the activate page", async () => {
    const s = served({ ...PARTNER_ROW, destination: null });
    const { res, calls } = await tap({
      status: s.status,
      destination: s.destination,
      business_id: null,
      page_mode: s.page_mode,
    });
    expect(res.headers.get("location")).toBe("https://kabsi.co/activate/PRT234");
    expect(calls.some((c) => c.method === "POST")).toBe(false);
  });
});

describe("the partner's card links words", () => {
  it("one link per line for the card writer; no dash or exclamation mark; taps, never reviews", async () => {
    const { CARD_COPY, linksText, cardLinkUrl } = await import("../src/lib/partner-cards");
    expect(cardLinkUrl("ABC234")).toBe("https://go.kabsi.co/ABC234");
    expect(
      linksText([
        { code: "ABC234", state: "new", destination: null, taps: 0, minted_at: "" },
        { code: "DEF567", state: "set", destination: null, taps: 1, minted_at: "" },
      ]),
    ).toBe("https://go.kabsi.co/ABC234\nhttps://go.kabsi.co/DEF567");
    const all =
      JSON.stringify(CARD_COPY) +
      [1, 3]
        .map((n) => CARD_COPY.setButton(n) + CARD_COPY.setDone(n) + CARD_COPY.taps(n))
        .join(" ");
    expect(all).not.toMatch(/[—–!]/);
    expect(all).not.toMatch(/\breviews from\b|more reviews|ranking/i);
  });
});

describe("the kv-sync trigger follows a change of partner", () => {
  it("fires on partner_id, on top of the live conditions", async () => {
    const { readFileSync } = await import("node:fs");
    const sql = readFileSync("supabase/migrations/20261111070159_cards2_partner.sql", "utf8");
    const fn = sql.slice(sql.indexOf("create or replace function public.cards_kv_sync()"));
    for (const col of ["status", "destination", "location_id", "page_mode", "partner_id"])
      expect(fn).toContain(`old.${col} is distinct from new.${col}`);
  });
});
