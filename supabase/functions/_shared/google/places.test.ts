// Run: deno test supabase/functions/_shared/google/places.test.ts
// The Places cost guard (K-100, P0.2-06). The counter and the cache live in the database and are tested in
// supabase/tests/places_cost_guard.sql; here their answers are given and Google is a stub with a call counter, so these
// tests prove what the Places layer does with them.
import assert from "node:assert/strict";
import { autocomplete, getPlace, guard, searchText } from "./places/live.ts";
import type { Place } from "./types.ts";

const real = { ...guard };
const realFetch = globalThis.fetch;

// A world with a day's cap and a cache. Every request to Google is counted and its headers kept.
function world(cap: number, cached: Record<string, Place> = {}) {
  const seen = { requests: [] as { url: string; mask: string | null }[], taken: [] as string[], put: [] as string[] };
  let used = 0;
  guard.take = (kind) => {
    seen.taken.push(kind);
    if (used >= cap) return Promise.resolve(false);
    used++;
    return Promise.resolve(true);
  };
  guard.cacheGet = (placeId, mask) => Promise.resolve(cached[`${placeId}|${mask}`] ?? null);
  guard.cachePut = (placeId, mask, place) => {
    cached[`${placeId}|${mask}`] = place;
    seen.put.push(`${placeId}|${mask}`);
    return Promise.resolve();
  };
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    seen.requests.push({ url: String(input), mask: new Headers(init?.headers).get("x-goog-fieldmask") });
    return Promise.resolve(new Response(JSON.stringify({ rating: 4.5, userRatingCount: 10, places: [], suggestions: [] }), { status: 200 }));
  };
  return seen;
}
function restore() {
  Object.assign(guard, real);
  globalThis.fetch = realFetch;
}
const MASK = "rating,userRatingCount";

Deno.test("a cache hit makes no Places request and takes nothing from the cap", async () => {
  const seen = world(100, { [`p1|${MASK}`]: { rating: 4.2, userRatingCount: 7 } });
  try {
    const r = await getPlace("k", "p1", MASK);
    assert.equal(r.cached, true);
    assert.equal(r.data.rating, 4.2);
    assert.equal(seen.requests.length, 0);
    assert.deepEqual(seen.taken, []);
  } finally {
    restore();
  }
});

Deno.test("a miss asks Places once, caches the answer, and the second lookup is a hit", async () => {
  const seen = world(100);
  try {
    const first = await getPlace("k", "p2", MASK);
    assert.equal(first.ok, true);
    assert.equal(first.cached, undefined);
    assert.equal(seen.requests.length, 1);
    assert.deepEqual(seen.put, [`p2|${MASK}`]);
    const second = await getPlace("k", "p2", MASK);
    assert.equal(second.cached, true);
    assert.equal(seen.requests.length, 1, "the second lookup made no request");
    // Another field mask is another cache entry.
    await getPlace("k", "p2", "primaryType");
    assert.equal(seen.requests.length, 2);
  } finally {
    restore();
  }
});

Deno.test("the kill switch: past the cap nothing is sent and the result says back soon", async () => {
  const seen = world(3);
  try {
    for (let i = 0; i < 3; i++) assert.equal((await searchText("k", `q${i}`, 5, "places.id")).ok, true);
    assert.equal(seen.requests.length, 3);
    const over = await searchText("k", "one more", 5, "places.id");
    assert.equal(over.backSoon, true);
    assert.equal(over.ok, false);
    assert.equal(seen.requests.length, 3, "the fourth request never reached Google");
    const lookup = await getPlace("k", "p3", MASK);
    assert.equal(lookup.backSoon, true);
    assert.equal(seen.requests.length, 3);
  } finally {
    restore();
  }
});

Deno.test("a counter that cannot be read sends nothing (fails closed)", async () => {
  const seen = world(100);
  guard.take = () => Promise.resolve(false);
  try {
    assert.equal((await searchText("k", "x", 5, "places.id")).backSoon, true);
    assert.equal(seen.requests.length, 0);
  } finally {
    restore();
  }
});

Deno.test("every request carries its field mask, never the reviews field; autocomplete carries a session token", async () => {
  const seen = world(100);
  try {
    await searchText("k", "coffee", 5, "places.id,places.displayName");
    await getPlace("k", "p4", MASK, "session-1");
    await autocomplete("k", "har", "session-1");
    const [search, details, auto] = seen.requests;
    assert.equal(search.mask, "places.id,places.displayName");
    assert.equal(details.mask, MASK);
    assert.match(details.url, /\/places\/p4\?sessionToken=session-1$/);
    assert.equal(auto.mask, null, "Autocomplete takes no field mask");
    assert.ok(seen.requests.every((r) => !/review/i.test(r.mask ?? "")), "no request asks for the reviews field");
    assert.deepEqual(seen.taken, ["search", "details", "autocomplete"]);
  } finally {
    restore();
  }
});
