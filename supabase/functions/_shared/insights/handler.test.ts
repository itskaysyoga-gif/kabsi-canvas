// P0.5-05 (K-26, K-138, K-126): who may read the figures, what is labelled Example, and that search terms are Pro only.
// Google, the database and the clock are stubbed.
import { assertEquals, assertMatch } from "jsr:@std/assert@1";
import { type Deps, type InsightsAnswer, makeHandler } from "./handler.ts";

const LOC = "11111111-1111-4111-8111-111111111111";
const NOW = new Date("2026-10-21T12:00:00Z");

function setup(o: {
  user?: boolean; role?: string | null; source?: "live" | "mock" | "none"; pro?: boolean; limited?: boolean; googleFails?: boolean;
} = {}) {
  const calls = { daily: 0, terms: 0, logged: [] as Record<string, unknown>[], errors: 0 };
  const deps: Deps = {
    getUser: () => Promise.resolve(o.user === false ? null : { id: "user-1" }),
    memberRole: () => Promise.resolve(o.role === undefined ? "owner" : o.role),
    source: () => Promise.resolve(o.source ?? "mock"),
    featureAccess: () => Promise.resolve({ pro: o.pro ?? true }),
    loadDaily: () => {
      calls.daily++;
      if (o.googleFails) return Promise.reject(new Error("google 500"));
      return Promise.resolve({ CALL_CLICKS: { "2026-10-02": 3, "2026-09-02": 2 } });
    },
    loadTerms: () => {
      calls.terms++;
      return Promise.resolve([{ searchKeyword: "pizza", insightsValue: { threshold: "15" } }, { searchKeyword: "pizza near me", insightsValue: { value: "52" } }]);
    },
    rateLimit: () => Promise.resolve(!o.limited),
    now: () => NOW,
    log: (f) => calls.logged.push(f),
    captureError: () => {
      calls.errors++;
      return Promise.resolve();
    },
    cors: { "access-control-allow-origin": "*" },
  };
  const post = (body: unknown) =>
    makeHandler(deps)(new Request("https://x.test/insights", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  return { post, calls };
}

Deno.test("signed out is refused", async () => {
  const { post } = setup({ user: false });
  assertEquals((await post({ location_id: LOC })).status, 401);
});

Deno.test("a staff member or a stranger gets the same 404", async () => {
  for (const role of ["staff", null]) {
    const { post, calls } = setup({ role });
    const res = await post({ location_id: LOC });
    assertEquals(res.status, 404);
    assertEquals(calls.daily + calls.terms, 0);
  }
});

Deno.test("a bad id and a rate limit are refused before anything is read", async () => {
  assertEquals((await setup().post({ location_id: "nope" })).status, 400);
  assertEquals((await setup({ limited: true }).post({ location_id: LOC })).status, 429);
});

Deno.test("mock mode answers labelled examples and makes no Google call", async () => {
  const { post, calls } = setup({ source: "mock" });
  const res = await post({ location_id: LOC });
  const a = (await res.json()) as InsightsAnswer;
  assertEquals(res.status, 200);
  assertEquals(a.example, true);
  assertEquals(a.available, true);
  assertEquals(calls.daily + calls.terms, 0);
  assertMatch(a.summary!.headline, /^\d+ customers? interacted with your Google profile this month/);
  assertEquals(a.summary!.tiles.length >= 4, true);
});

Deno.test("live mode reads both months in one call and is not labelled Example", async () => {
  const { post, calls } = setup({ source: "live" });
  const a = (await (await post({ location_id: LOC })).json()) as InsightsAnswer;
  assertEquals(a.example, false);
  assertEquals(calls.daily, 1);
  assertEquals(a.summary!.interactions, { this: 3, last: 2 });
});

Deno.test("search terms are Pro only, with fewer than 15 for small counts", async () => {
  const pro = (await (await setup({ source: "live", pro: true }).post({ location_id: LOC })).json()) as InsightsAnswer;
  assertEquals(pro.pro, true);
  assertEquals(pro.terms!.month_label, "September");
  assertEquals(pro.terms!.items, [
    { term: "pizza near me", count: 52, fewer_than: null },
    { term: "pizza", count: null, fewer_than: 15 },
  ]);
  const basic = setup({ source: "live", pro: false });
  const answer = (await (await basic.post({ location_id: LOC })).json()) as InsightsAnswer;
  assertEquals(answer.pro, false);
  assertEquals(answer.terms, null);
  assertEquals(basic.calls.terms, 0); // the terms are not even fetched
  const example = (await (await setup({ source: "mock", pro: false }).post({ location_id: LOC })).json()) as InsightsAnswer;
  assertEquals(example.terms, null);
});

Deno.test("a business with no Google location has no figures, and no error", async () => {
  const { post } = setup({ source: "none" });
  const a = (await (await post({ location_id: LOC })).json()) as InsightsAnswer;
  assertEquals(a.available, false);
  assertEquals(a.summary, null);
});

Deno.test("a Google failure is reported and answered plainly", async () => {
  const { post, calls } = setup({ source: "live", googleFails: true });
  const res = await post({ location_id: LOC });
  assertEquals(res.status, 502);
  assertEquals(calls.errors, 1);
});

Deno.test("the log line carries no search term and no figure", async () => {
  const { post, calls } = setup({ source: "live" });
  await post({ location_id: LOC });
  assertEquals(calls.logged, [{ ok: true, source: "live", pro: true }]);
});
