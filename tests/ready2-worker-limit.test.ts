// Ready 2 part C (master plan 30.19 section 6): go.kabsi.co counts each visitor address against VISITOR_LIMIT
// (30 a minute, wrangler.jsonc) before any card is looked up. Over it: 429 with Retry-After 60 and no KV, database or tap.
// The root and /_check are not counted, and a missing or failing binding never breaks a tap.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error the Worker is plain JavaScript
import worker from "../workers/kabsi-go/src/index.js";
// @ts-expect-error the Worker is plain JavaScript
import { visitorKey } from "../workers/kabsi-go/src/visitor.js";

const ctx = { waitUntil: vi.fn() };
const req = (path: string, ip: string | null = "203.0.113.7") =>
  new Request(`https://go.kabsi.co${path}`, { headers: ip ? { "cf-connecting-ip": ip } : {} });
const card = {
  d: "https://search.google.com/local/writereview?placeid=x",
  b: "biz",
  a: true,
  m: "direct",
};
const store = () => ({ get: vi.fn().mockResolvedValue(card), put: vi.fn() });
const limiter = (success: boolean) => ({ limit: vi.fn().mockResolvedValue({ success }) });

afterEach(() => vi.restoreAllMocks());

describe("go.kabsi.co rate limit per visitor", () => {
  it("lets a visitor under the limit through to the card", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    const VISITOR_LIMIT = limiter(true);
    const res = await worker.fetch(req("/ABCDEF"), { STICKERS: store(), VISITOR_LIMIT }, ctx);
    expect(res.status).toBe(302);
    expect(VISITOR_LIMIT.limit).toHaveBeenCalledWith({ key: "v:203.0.113.7" });
  });

  it("answers 429 over the limit, before KV or the database is read", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const STICKERS = store();
    const res = await worker.fetch(
      req("/ABCDEF"),
      { STICKERS, VISITOR_LIMIT: limiter(false) },
      ctx,
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    expect(STICKERS.get).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("counts unknown codes too, so guessing is slowed", async () => {
    const res = await worker.fetch(
      req("/nonsense"),
      { STICKERS: store(), VISITOR_LIMIT: limiter(false) },
      ctx,
    );
    expect(res.status).toBe(429);
  });

  it("does not count the root or the uptime check", async () => {
    const VISITOR_LIMIT = limiter(false);
    expect((await worker.fetch(req("/"), { STICKERS: store(), VISITOR_LIMIT }, ctx)).status).toBe(
      302,
    );
    expect(
      (await worker.fetch(req("/_check"), { STICKERS: { get: vi.fn() }, VISITOR_LIMIT }, ctx))
        .status,
    ).toBe(200);
    expect(VISITOR_LIMIT.limit).not.toHaveBeenCalled();
  });

  it("fails open: no binding, no address, or a binding error still redirects", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null));
    expect((await worker.fetch(req("/ABCDEF"), { STICKERS: store() }, ctx)).status).toBe(302);
    expect(
      (
        await worker.fetch(
          req("/ABCDEF", null),
          { STICKERS: store(), VISITOR_LIMIT: limiter(false) },
          ctx,
        )
      ).status,
    ).toBe(302);
    const broken = { limit: vi.fn().mockRejectedValue(new Error("down")) };
    expect(
      (await worker.fetch(req("/ABCDEF"), { STICKERS: store(), VISITOR_LIMIT: broken }, ctx))
        .status,
    ).toBe(302);
  });

  it("counts an IPv6 visitor by its /64, an IPv4 visitor by its address", () => {
    expect(visitorKey("203.0.113.7")).toBe("203.0.113.7");
    expect(visitorKey("2001:db8:aa:bb:1:2:3:4")).toBe("2001:db8:aa:bb::/64");
    expect(visitorKey("2001:0db8:00aa:00bb:ffff::1")).toBe("2001:db8:aa:bb::/64");
    expect(visitorKey("2001:db8::1")).toBe("2001:db8:0:0::/64");
  });

  it("the binding in wrangler.jsonc is 30 a minute", () => {
    const raw = readFileSync(
      new URL("../workers/kabsi-go/wrangler.jsonc", import.meta.url),
      "utf8",
    );
    const cfg = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
    const b = cfg.unsafe.bindings.find((x: { name: string }) => x.name === "VISITOR_LIMIT");
    expect(b).toMatchObject({
      type: "ratelimit",
      namespace_id: "4301",
      simple: { limit: 30, period: 60 },
    });
  });
});
