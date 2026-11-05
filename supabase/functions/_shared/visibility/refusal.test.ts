// Go live 1 (master plan 30.28): what counts as the provider refusing, and the free check when it does. Stubbed, no paid call.
import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { ProviderError, type MapsProvider } from "./dataforseo.ts";
import { startCheck } from "./free-check.ts";
import { refusalAlert, refusalOf } from "./refusal.ts";

Deno.test("golive1: refusals from DataForSEO's codes, and what is not one", () => {
  assertEquals(refusalOf(new ProviderError("dataforseo_40200")), "no_balance");
  assertEquals(refusalOf(new ProviderError("dataforseo_task_40210")), "no_balance");
  assertEquals(refusalOf(new ProviderError("dataforseo_http_402")), "no_balance");
  assertEquals(refusalOf(new ProviderError("dataforseo_40203")), "cap");
  assertEquals(refusalOf(new Error("ai_visibility_cap_reached")), "cap");
  assertEquals(refusalOf(new ProviderError("dataforseo_40201")), "blocked");
  assertEquals(refusalOf(new ProviderError("dataforseo_http_500")), "provider_error");
  assertEquals(refusalOf(new Error("dataforseo_not_configured")), null);
  assertEquals(refusalOf(new TypeError("x is undefined")), null);
});

Deno.test("golive1: one alert key a day, whatever the reason or the part", () => {
  const day = new Date("2026-11-05T09:00:00Z"), later = new Date("2026-11-05T22:00:00Z");
  assertEquals(refusalAlert("no_balance", "free check", day).key, refusalAlert("cap", "AI answer", later).key);
  assertEquals(refusalAlert("no_balance", "free check", day).key, "dataforseo_refused:2026-11-05");
  assertEquals(refusalAlert("no_balance", "free check", day).summary, "DataForSEO refused the free check: no balance left. Kabsi tries again later on its own");
  for (const r of ["no_balance", "cap", "blocked", "provider_error"] as const) {
    const s = refusalAlert(r, "nearby check", day).summary;
    assertEquals(/[!–—]/.test(s), false, s);
  }
});

Deno.test("golive1: the free check stops at the first refused call and spends nothing more", async () => {
  let calls = 0;
  const refusing: MapsProvider = {
    live: true,
    liveOne: () => { calls++; return Promise.reject(new ProviderError("dataforseo_40200")); },
    post: () => { calls++; return Promise.resolve({}); },
    ready: () => Promise.resolve([]),
    get: () => Promise.resolve(null),
  } as unknown as MapsProvider;
  const spent: number[] = [];
  const err = await assertRejects(() => startCheck({
    provider: refusing, source: "live", code: () => "ABCDEFGH", room: () => Promise.resolve(true),
    spend: (_c, m) => { spent.push(m); return Promise.resolve(); }, ai: () => Promise.resolve(null),
  }, { name: "Yawmiyati", address: null, country: "AE", city: "Dubai", place_id: null, term: "bakery" }));
  assertEquals(refusalOf(err), "no_balance", "the endpoint turns this into { state: 'unavailable' }");
  assertEquals(calls, 1, "the 49 tasks are never posted");
  assertEquals(spent, []);
  // The month's cap: no call at all, and the endpoint answers unavailable too (reason paused).
  const capped = await startCheck({
    provider: refusing, source: "live", code: () => "ABCDEFGH", room: () => Promise.resolve(false),
    spend: () => Promise.resolve(), ai: () => Promise.resolve(null),
  }, { name: "Yawmiyati", address: null, country: "AE", city: "Dubai", place_id: null, term: "bakery" });
  assertEquals(capped, { ok: false, reason: "paused" });
  assertEquals(calls, 1);
});

// Review of 5 Nov: DataForSEO can answer 20000 for the request and put the refusal on each task.
Deno.test("golive1: a refusal on each posted task is read as a refusal, not as tasks not made", async () => {
  const { dataForSeo } = await import("./dataforseo.ts");
  const fake = ((_u: string, _i?: RequestInit) =>
    Promise.resolve(new Response(JSON.stringify({ status_code: 20000, tasks: [{ id: "t1", status_code: 40210, data: { tag: "x:0:0" } }] }), { status: 200 }))) as typeof fetch;
  const p = dataForSeo("login", "password", fake);
  const err = await assertRejects(() => p.post([{ keyword: "bakery", lat: 1, lng: 1, tag: "x:0:0" }]));
  assertEquals(refusalOf(err), "no_balance");
  // The free check carries it up (the endpoint answers unavailable and alerts once); other post failures keep the fast part.
  const refusingPost: MapsProvider = {
    live: true, liveOne: () => Promise.resolve([{ title: "Yawmiyati", cid: "c", place_id: null, lat: 25, lng: 55, rank: 1, category: "Bakery", rating: null, reviews: null, photos: null, categories: [] }]),
    post: () => Promise.reject(new ProviderError("dataforseo_task_40200")), ready: () => Promise.resolve([]), get: () => Promise.resolve(null),
  } as unknown as MapsProvider;
  const deps = { provider: refusingPost, source: "live" as const, code: () => "ABCDEFGH", room: () => Promise.resolve(true), spend: () => Promise.resolve(), ai: () => Promise.resolve(null) };
  const input = { name: "Yawmiyati", address: null, country: "AE", city: "Dubai", place_id: null, term: "bakery" };
  assertEquals(refusalOf(await assertRejects(() => startCheck(deps, input))), "no_balance");
  const flaky = { ...deps, provider: { ...refusingPost, post: () => Promise.reject(new ProviderError("dataforseo_50000")) } as MapsProvider };
  const kept = await startCheck(flaky, input);
  assertEquals(kept.ok === true && kept.row.state, "failed");
});
