// Speed 2 part A: POST /api/suggest on kabsi.co. The bot check, the limits and the cap (one database call), the database
// and Google at the same time with Google's answer dropped on a refusal, the 10 minute cache, Server-Timing, the pass
// shared with profile-snapshot, and nothing personal in the cache or the log.
import { createHmac, createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cacheKey,
  makeSuggestHandler,
  type SuggestDeps,
  type Take,
  visitorIp,
} from "@/server/suggest";

const SECRET = "test-turnstile-secret";
const SALT = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
const IP = "203.0.113.7";
const NOW = Date.UTC(2026, 10, 6, 13, 0, 0);
const TOKEN = "0b6f1c1e-2c64-4b8f-9b52-1d6a2f7c9e10";
const PREDICTION = {
  suggestions: [
    {
      placePrediction: {
        placeId: "ChIJ_test_place_1",
        structuredFormat: {
          mainText: { text: "Seven One Salon" },
          secondaryText: { text: "Dubai" },
        },
      },
    },
  ],
};

type Rig = {
  deps: SuggestDeps;
  takes: { visitor: string; limits: unknown; places: boolean }[];
  google: string[];
  logs: Record<string, unknown>[];
  cache: Map<string, unknown>;
  setTake: (t: Take) => void;
  release: () => void;
};

function rig(
  opts: { holdGoogle?: boolean; turnstile?: boolean; env?: Record<string, string> } = {},
): Rig {
  let take: Take = { allowed: true };
  let release = () => {};
  const hold = new Promise<void>((r) => (release = r));
  const r: Rig = {
    takes: [],
    google: [],
    logs: [],
    cache: new Map(),
    setTake: (t) => (take = t),
    release: () => release(),
    deps: undefined as unknown as SuggestDeps,
  };
  const env: Record<string, string> = {
    PLACES_API_KEY: "places-key",
    TURNSTILE_SECRET_KEY: SECRET,
    SUGGEST_DB_URL: "postgres://suggest_route.test:x@localhost:6543/postgres",
    ...opts.env,
  };
  r.deps = {
    env: (n) => env[n] || undefined,
    take: async (visitor, limits, places) => {
      r.takes.push({ visitor, limits, places });
      return take;
    },
    autocomplete: async (_key, input) => {
      r.google.push(input);
      if (opts.holdGoogle) await hold;
      return { ok: true, status: 200, data: PREDICTION };
    },
    verifyTurnstile: async (t) => (opts.turnstile ?? true) && t === "good-token",
    cacheGet: async (k) => (r.cache.get(k) as never) ?? null,
    cacheSet: async (k, v) => void r.cache.set(k, v),
    log: (f) => void r.logs.push(f),
    now: () => NOW,
    salt: SALT,
  };
  return r;
}

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("https://kabsi.co/api/suggest", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": `${IP}, 10.0.0.1`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
const suggest = (extra: Record<string, unknown> = {}) =>
  post({
    action: "suggest",
    query: "seven one",
    session_token: TOKEN,
    turnstile: "good-token",
    ...extra,
  });

/** The pass profile-snapshot makes (supabase/functions/_shared/profile-snapshot.ts makePass), computed independently. */
function snapshotPass(ip = IP, expiry = Math.floor(NOW / 1000) + 900) {
  const visitor = createHash("sha256")
    .update(`${SALT}:2026-11-06:${ip}`)
    .digest("hex")
    .slice(0, 24);
  return `${expiry}.${createHmac("sha256", SECRET).update(`suggest:${visitor}:${expiry}`).digest("hex")}`;
}

afterEach(() => vi.restoreAllMocks());

describe("Speed 2 part A: /api/suggest", () => {
  it("answers suggestions, with a pass, the cap taken in the same database call, and Server-Timing", async () => {
    const r = rig();
    const res = await makeSuggestHandler(r.deps)(suggest());
    expect(res.status).toBe(200);
    const j = (await res.json()) as { suggestions: unknown; available: boolean; pass: string };
    expect(j.available).toBe(true);
    expect(j.suggestions).toEqual([
      { place_id: "ChIJ_test_place_1", name: "Seven One Salon", address: "Dubai" },
    ]);
    expect(j.pass).toBe(snapshotPass());
    expect(r.takes).toEqual([
      { visitor: expect.stringMatching(/^[0-9a-f]{24}$/), limits: [20, 120, 60], places: true },
    ]);
    expect(r.google).toEqual(["seven one"]);
    for (const part of ["db", "google", "total"]) {
      expect(res.headers.get("server-timing")).toMatch(new RegExp(`(^|, )${part};dur=\\d+`));
    }
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("uses the same visitor hash and pass as profile-snapshot, so a pass from either path works on the other", async () => {
    const r = rig();
    const res = await makeSuggestHandler(r.deps)(
      suggest({ turnstile: undefined, pass: snapshotPass() }),
    );
    const j = (await res.json()) as { available: boolean; pass?: string };
    expect(j.available).toBe(true);
    expect(j.pass).toBeUndefined(); // a good pass is kept, not renewed
    const visitor = createHash("sha256")
      .update(`${SALT}:2026-11-06:${IP}`)
      .digest("hex")
      .slice(0, 24);
    expect(r.takes[0]!.visitor).toBe(visitor);
  });

  it("the bot check comes first: no token and no good pass reaches neither the database nor Google", async () => {
    for (const body of [
      { turnstile: undefined },
      { turnstile: "bad-token" },
      { turnstile: undefined, pass: snapshotPass("198.51.100.1") }, // another visitor's pass
      { turnstile: undefined, pass: snapshotPass(IP, Math.floor(NOW / 1000) - 1) }, // run out
    ]) {
      const r = rig();
      const res = await makeSuggestHandler(r.deps)(suggest(body));
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe("challenge_failed");
      expect(r.takes).toEqual([]);
      expect(r.google).toEqual([]);
    }
  });

  it("a refused limit drops Google's answer: 429, no suggestions, nothing cached", async () => {
    const r = rig({ holdGoogle: true });
    r.setTake({ allowed: false, reason: "rate_limited" });
    const handler = makeSuggestHandler(r.deps);
    const res = await handler(suggest());
    r.release();
    expect(res.status).toBe(429);
    expect(JSON.stringify(await res.json())).not.toContain("Seven One");
    expect(r.cache.size).toBe(0);
    // A visitor this instance has not seen allowed goes to the database first: no Google call at all.
    expect(r.google).toEqual([]);
  });

  it("after a refusal the instance asks the database first, so a visitor over the limits costs no Google call", async () => {
    const r = rig();
    const handler = makeSuggestHandler(r.deps);
    await handler(suggest({ query: "abc one" }));
    expect(r.google).toEqual(["abc one"]);
    r.setTake({ allowed: false, reason: "rate_limited" });
    await handler(suggest({ query: "abc two", turnstile: undefined, pass: snapshotPass() }));
    expect(r.google).toEqual(["abc one", "abc two"]); // in parallel, right after an allowed call
    // A fresh allowed window is needed again: the next calls ask the database first.
    await handler(suggest({ query: "abc three", turnstile: undefined, pass: snapshotPass() }));
    expect(r.google).toEqual(["abc one", "abc two"]);
  });

  it("at the day's cap the box becomes a plain search (available false), with the pass kept", async () => {
    const r = rig();
    r.setTake({ allowed: false, reason: "back_soon" });
    const res = await makeSuggestHandler(r.deps)(suggest());
    expect(res.status).toBe(200);
    const j = (await res.json()) as { available: boolean; suggestions: unknown[]; pass?: string };
    expect(j).toMatchObject({ available: false, suggestions: [] });
    expect(typeof j.pass).toBe("string");
  });

  it("a database that cannot be asked fails closed", async () => {
    const r = rig();
    r.setTake({ allowed: false, reason: "error" });
    const j = (await (await makeSuggestHandler(r.deps)(suggest())).json()) as {
      available: boolean;
    };
    expect(j.available).toBe(false);
  });

  it("a repeat within 10 minutes is answered from the cache: no Google call, nothing from the cap, the limits still count", async () => {
    const r = rig();
    const handler = makeSuggestHandler(r.deps);
    await handler(suggest({ query: "Seven  One" }));
    const res = await handler(
      suggest({ query: "seven one", turnstile: undefined, pass: snapshotPass() }),
    );
    const j = (await res.json()) as { available: boolean; suggestions: unknown[] };
    expect(j.available).toBe(true);
    expect(j.suggestions).toHaveLength(1);
    expect(r.google).toEqual(["Seven  One"]);
    expect(r.takes.map((t) => t.places)).toEqual([true, false]);
    expect(res.headers.get("server-timing")).not.toContain("google");
    // A refused limit is refused on a cached answer too.
    r.setTake({ allowed: false, reason: "rate_limited" });
    expect((await handler(suggest({ turnstile: undefined, pass: snapshotPass() }))).status).toBe(
      429,
    );
  });

  it("the cache holds only Google's list for a prefix and a country: never the visitor, the pass or the token", async () => {
    const r = rig();
    await makeSuggestHandler(r.deps)(suggest({}));
    const [[key, value]] = [...r.cache.entries()];
    expect(key).toBe("XX:seven one");
    const text = JSON.stringify(value);
    expect(text).not.toContain(IP);
    expect(text).not.toContain(TOKEN);
    expect(text).not.toMatch(/pass|visitor|session/);
    expect(cacheKey(" Seven\tOne ", "GB")).toBe("GB:seven one");
    expect(cacheKey("seven one", "gb")).toBe("XX:seven one");
  });

  it("the log line carries the outcome and timings only", async () => {
    const r = rig();
    const handler = makeSuggestHandler(r.deps);
    await handler(suggest());
    r.setTake({ allowed: false, reason: "rate_limited" });
    await handler(suggest({ query: "other letters" }));
    const text = JSON.stringify(r.logs);
    for (const bad of [IP, TOKEN, "seven", "other letters", "good-token", SECRET, "places-key"]) {
      expect(text).not.toContain(bad);
    }
    expect(r.logs[0]).toMatchObject({ fn: "suggest", status: 200, outcome: "ok", cache: "miss" });
  });

  it("refuses bad input, other sites and other methods; says when it is not set up", async () => {
    const r = rig();
    const h = makeSuggestHandler(r.deps);
    expect((await h(suggest({ query: "ab" }))).status).toBe(400);
    expect((await h(suggest({ session_token: "short" }))).status).toBe(400);
    expect((await h(suggest({ query: "x".repeat(121) }))).status).toBe(400);
    expect((await h(post({ action: "suggest" }, { origin: "https://evil.example" }))).status).toBe(
      403,
    );
    expect((await h(new Request("https://kabsi.co/api/suggest"))).status).toBe(405);
    expect((await h(post({ action: "nope" }))).status).toBe(400);
    expect(r.google).toEqual([]);
    const off = rig({ env: { SUGGEST_DB_URL: "" } });
    const res = await makeSuggestHandler(off.deps)(suggest());
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toBe("not_configured");
    const warm = await makeSuggestHandler(off.deps)(post({ action: "warm" }));
    expect(await warm.json()).toEqual({ ok: true, configured: false });
  });

  it("the pass action counts the minute only and asks no Google", async () => {
    const r = rig();
    const res = await makeSuggestHandler(r.deps)(post({ action: "pass", turnstile: "good-token" }));
    expect(((await res.json()) as { pass: string }).pass).toBe(snapshotPass());
    expect(r.takes).toEqual([
      { visitor: expect.any(String), limits: [20, null, null], places: false },
    ]);
    expect(r.google).toEqual([]);
  });

  it("reads the visitor's address from Vercel's x-forwarded-for, never a made-up value", () => {
    const h = (v: Record<string, string>) => new Request("https://kabsi.co/", { headers: v });
    expect(visitorIp(h({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
    expect(visitorIp(h({ "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
    expect(visitorIp(h({ "x-forwarded-for": "<script>" }))).toBe("unknown");
    expect(visitorIp(h({}))).toBe("unknown");
  });

  it("the route holds no service key and the Google address stays in the Google layer", () => {
    const deps = readFileSync("src/server/suggest-deps.ts", "utf8");
    expect(deps).toContain("SUGGEST_DB_URL");
    expect(deps).toContain("suggest_take");
    expect(deps).not.toMatch(/googleapis/);
    expect(
      readFileSync("supabase/functions/_shared/google/places/autocomplete-web.ts", "utf8"),
    ).toContain("places.googleapis.com/v1/places:autocomplete");
  });
});

describe("Speed 2 part A: the review's findings (6 Nov)", () => {
  it("a visitor not allowed lately goes to the database first: a burst costs no Google call", async () => {
    const r = rig();
    r.setTake({ allowed: false, reason: "rate_limited" });
    const h = makeSuggestHandler(r.deps);
    await Promise.all(["aaa one", "aaa two", "aaa three"].map((q) => h(suggest({ query: q }))));
    expect(r.google).toEqual([]);
  });

  it("after an allowed call, the next letter runs the database and Google together", async () => {
    const r = rig({ holdGoogle: true });
    const h = makeSuggestHandler(r.deps);
    r.release();
    await h(suggest({ query: "bbb one" }));
    r.setTake({ allowed: false, reason: "rate_limited" });
    await h(suggest({ query: "bbb two", turnstile: undefined, pass: snapshotPass() }));
    // The second call started Google before the refusal came back (one uncounted call at most), then the third waits.
    expect(r.google).toEqual(["bbb one", "bbb two"]);
    await h(suggest({ query: "bbb three", turnstile: undefined, pass: snapshotPass() }));
    expect(r.google).toEqual(["bbb one", "bbb two"]);
  });

  it("a cached entry whose stored key differs is never served", async () => {
    const r = rig();
    r.cache.set("XX:seven one", {
      key: "XX:something else",
      suggestions: [{ place_id: "ChIJ_planted_1", name: "Planted", address: "" }],
    });
    const j = (await (await makeSuggestHandler(r.deps)(suggest())).json()) as {
      suggestions: { name: string }[];
    };
    expect(j.suggestions[0]!.name).toBe("Seven One Salon");
    expect(r.google).toEqual(["seven one"]);
  });

  it("at most 10 bot checks a minute per visitor, before Cloudflare is asked", async () => {
    const r = rig({ turnstile: false });
    let asked = 0;
    const verify = r.deps.verifyTurnstile;
    r.deps.verifyTurnstile = async (t, ip) => {
      asked++;
      return verify(t, ip);
    };
    const h = makeSuggestHandler(r.deps);
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await h(suggest())).status);
    expect(codes.slice(0, 10).every((c) => c === 400)).toBe(true);
    expect(codes.slice(10)).toEqual([429, 429]);
    expect(asked).toBe(10);
  });

  it("the same host is accepted whatever scheme the edge shows; another host is refused", async () => {
    const r = rig();
    const h = makeSuggestHandler(r.deps);
    const req = (origin: string) =>
      new Request("http://kabsi.co/api/suggest", {
        method: "POST",
        headers: {
          origin,
          host: "kabsi.co",
          "x-forwarded-for": IP,
          "content-type": "application/json",
        },
        body: JSON.stringify({ action: "warm" }),
      });
    expect((await h(req("https://kabsi.co"))).status).toBe(200);
    expect((await h(req("https://www.kabsi.co"))).status).toBe(403);
  });
});
