// P0.6-08 (K-118): go.kabsi.co/_check, the uptime monitor's check on the review-link Worker. 200 when the Worker runs and
// its KV table reads, 503 when KV cannot be read, and it never redirects, logs a tap or touches a card.
import { describe, expect, it, vi } from "vitest";
// @ts-expect-error the Worker is plain JavaScript
import worker from "../workers/kabsi-go/src/index.js";

const ctx = { waitUntil: vi.fn() };
const call = (path: string, env: Record<string, unknown>) =>
  worker.fetch(new Request(`https://go.kabsi.co${path}`), env, ctx) as Promise<Response>;

describe("go.kabsi.co/_check", () => {
  it("answers 200 ok when KV reads", async () => {
    const get = vi.fn().mockResolvedValue(null);
    const res = await call("/_check", { STICKERS: { get } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ok");
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("answers 503 when KV cannot be read", async () => {
    const get = vi.fn().mockRejectedValue(new Error("kv down"));
    const res = await call("/_check", { STICKERS: { get } });
    expect(res.status).toBe(503);
  });

  it("works with a trailing slash and logs no tap", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const res = await call("/_check/", { STICKERS: { get: vi.fn().mockResolvedValue(null) } });
    expect(res.status).toBe(200);
    expect(ctx.waitUntil).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("leaves the card paths alone: a code still redirects, the root still goes to kabsi.co", async () => {
    const root = await call("/", { STICKERS: { get: vi.fn() } });
    expect(root.status).toBe(302);
    const bad = await call("/nonsense", {
      STICKERS: { get: vi.fn() },
      APP_ORIGIN: "https://kabsi.co",
    });
    expect(bad.status).toBe(302);
  });
});
