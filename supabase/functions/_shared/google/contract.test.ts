// Contract tests (P0.7-01b): every real Google response captured for Kabsi's own two profiles
// (tests/fixtures/google/live/) and the mock of the same call go through the same code, and must agree.
//
// Two kinds of check:
//  1. Shape: a mock may leave a field out (Google omits unset fields), but every field it returns must exist in
//     the real response with the same type. "[removed]" in a fixture is the capture filter's mark for a field it
//     blanked (phone numbers), so it matches any value.
//  2. Parser: the production code in index.ts (the same functions the jobs call) is run on the real fixture and on
//     the mock's answer, with fetch standing in for Google. Both must give the same kind of result, and the real
//     one must give the values the fixture holds.
//
// Reviews, local posts and media (mybusiness.googleapis.com v4) answer 403 SERVICE_DISABLED for the project, so
// there is no real response to compare yet. Those three modules are listed in BLOCKED: the test checks that the
// capture still says 403 and, the day a real fixture appears (reviews.list.<profile>.json, posts.list.<profile>.json,
// media.list.<profile>.json), it fails until the module's case below is added. Run with: scripts/deno-check.sh.
import assert from "node:assert/strict";
import * as accounts from "./accounts/mock.ts";
import * as admins from "./admins/mock.ts";
import * as attributes from "./attributes/mock.ts";
import * as categoriesMock from "./categories/mock.ts";
import { io } from "./client.ts";
import * as google from "./index.ts";
import * as locations from "./locations/mock.ts";
import * as notifications from "./notifications/mock.ts";
import * as performance from "./performance/mock.ts";
import * as placeActions from "./placeActions/mock.ts";
import * as updates from "./updates/mock.ts";
import * as verifications from "./verifications/mock.ts";

const LIVE = new URL("../../../../tests/fixtures/google/live/", import.meta.url);
// deno-lint-ignore no-explicit-any
type Json = any;
const fixture = async (name: string): Promise<Json> => JSON.parse(await Deno.readTextFile(new URL(name, LIVE)));
const body = async (name: string): Promise<Json> => (await fixture(name)).body;
const PROFILES = {
  yawmiyati: { location: "locations/4825254240697973899", title: "Yawmiyati" },
  abouhamze: { location: "locations/1850906632456176734", title: "Abou Hamze Auto Center" },
} as const;
const GROUP = "accounts/113746201522792609010";

// ─── Shape
const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);
const REMOVED = "[removed]";

/** The differences between a mock answer and the real one: a field the real response never has, or another type. */
export function shapeProblems(actual: Json, real: Json, path = "$"): string[] {
  if (real === REMOVED) return [];
  if (kind(actual) !== kind(real)) return [`${path}: mock ${kind(actual)} where Google returns ${kind(real)}`];
  if (Array.isArray(actual)) {
    // The items of one list carry different optional fields: compare against all the real items together.
    const items = real as Json[];
    const sample = items.length && items.every((x) => kind(x) === "object") ? merge(...items) : items[0];
    return sample === undefined ? [] : actual.flatMap((x, i) => shapeProblems(x, sample, `${path}[${i}]`));
  }
  if (kind(actual) === "object") {
    return Object.entries(actual).flatMap(([k, v]) =>
      k in real ? shapeProblems(v, real[k], `${path}.${k}`) : [`${path}.${k}: the mock returns it, Google's real response does not`]
    );
  }
  return [];
}

// Several real responses of one call (one per profile) are merged, so a field either profile has counts.
function merge(...bodies: Json[]): Json {
  const out: Json = {};
  for (const b of bodies) {
    for (const [k, v] of Object.entries(b)) {
      out[k] = kind(v) === "object" && kind(out[k]) === "object" ? merge(out[k], v) : kind(v) === "array" && kind(out[k]) === "array" ? [...out[k], ...v] : (k in out ? out[k] : v);
    }
  }
  return out;
}

// A demo location id always runs on the mock (R-17), so the parser tests use a plain mock id to reach the live code path.
const A = accounts.MOCK_ACCOUNT, L = "locations/mock-contract-test";
admins.useAdminStore({ read: () => Promise.resolve({ removed: false, refuse: false }), remove: () => Promise.resolve() });

const shapeCases: [string, () => Promise<Json>, string[]][] = [
  ["accounts.listAccounts", () => accounts.listAccounts(), ["accounts.list.json"]],
  ["accounts.listInvitations", () => accounts.listInvitations(A), ["accounts.invitations.json"]],
  ["admins.listLocationAdmins", () => admins.listLocationAdmins(L), ["admins.list.yawmiyati.json", "admins.list.abouhamze.json"]],
  ["attributes.getAttributes", () => attributes.getAttributes(L), ["attributes.get.yawmiyati.json"]],
  ["notifications.getNotificationSetting", () => notifications.getNotificationSetting(A), ["notifications.get.json"]],
  ["placeActions.listPlaceActionLinks", () => placeActions.listPlaceActionLinks(L), ["placeActions.list.yawmiyati.json"]],
  ["verifications.getVoiceOfMerchantState", () => verifications.getVoiceOfMerchantState(L), ["verifications.voiceOfMerchant.yawmiyati.json"]],
  ["verifications.listVerifications", () => verifications.listVerifications(L), ["verifications.list.yawmiyati.json", "verifications.list.abouhamze.json"]],
  ["performance.searchKeywordsMonthly", () => performance.searchKeywordsMonthly(L, { year: 2026, month: 7 }, { year: 2026, month: 9 }), ["performance.searchKeywords.yawmiyati.json", "performance.searchKeywords.abouhamze.json"]],
  ["performance.dailyMetrics", () => performance.dailyMetrics(L, ["CALL_CLICKS", "WEBSITE_CLICKS"], { year: 2026, month: 9, day: 29 }, { year: 2026, month: 10, day: 1 }), ["performance.dailyMetrics.yawmiyati.json"]],
  ["locations.listLocations", () => locations.listLocations(A, "name,title,metadata"), ["locations.list.group.json"]],
  ["locations.locationFromFields (a full listing)", () => Promise.resolve(locations.locationFromFields(L, {
    title: "Harbour Lane Coffee", phone: "+1 555 0100", address: "12 Harbour Lane", website: "https://kabsi.co", categories: "Coffee shop",
    open_status: "OPEN", map_pin: "33.1, 35.2",
  })), ["locations.get.yawmiyati.json", "locations.get.abouhamze.json"]],
  ["locations.locationFromFields (a listing Google changed)", () => Promise.resolve(locations.locationFromFields(L, {
    title: "Harbour Lane Coffee", website: "https://kabsi.co", merchant: { title: "Harbour Lane Coffee", website: "https://example.com" },
  }, true)), ["locations.get.abouhamze.json"]],
  ["updates.googleUpdatedFromFields (nothing differs)", () => Promise.resolve(updates.googleUpdatedFromFields(L, { title: "Harbour Lane Coffee", merchant: { title: "Harbour Lane Coffee" } })), ["updates.getGoogleUpdated.yawmiyati.json"]],
  ["updates.googleUpdatedFromFields (Google changed two fields)", () => Promise.resolve(updates.googleUpdatedFromFields(L, {
    title: "Harbour Lane Coffee", website: "https://kabsi.co", map_pin: "33.1, 35.2",
    merchant: { title: "Harbour Lane Coffee", website: "https://example.com", map_pin: "33.0, 35.0" },
  })), ["updates.getGoogleUpdated.abouhamze.json"]],
];

for (const [name, run, files] of shapeCases) {
  Deno.test(`contract (shape): mock ${name} agrees with Google's real response`, async () => {
    const real = merge(...await Promise.all(files.map(body)));
    const problems = shapeProblems(await run(), real);
    assert.deepEqual(problems, [], `${name}:\n${problems.join("\n")}`);
  });
}

Deno.test("contract (shape): the check finds a field Google does not return and a wrong type", () => {
  assert.deepEqual(shapeProblems({ name: "x", extra: 1 }, { name: "y" }), ["$.extra: the mock returns it, Google's real response does not"]);
  assert.deepEqual(shapeProblems({ attributes: [] }, { name: "y", attributes: "z" }), ["$.attributes: mock array where Google returns string"]);
  assert.deepEqual(shapeProblems({ phoneNumbers: { primaryPhone: "1" } }, { phoneNumbers: REMOVED }), []);
});

// ─── Fixtures stay what the capture says they are
Deno.test("contract: every live fixture is a 200 response, except the three closed v4 services", async () => {
  const seen: string[] = [];
  for await (const f of Deno.readDir(LIVE)) {
    if (!f.name.endsWith(".json")) continue;
    seen.push(f.name);
    const fx = await fixture(f.name);
    if (f.name === "reviews.list.error.json" || f.name.startsWith("v4.probe.")) {
      assert.equal(fx._status, 403, f.name);
      continue;
    }
    assert.equal(fx._status, 200, `${f.name}: status`);
    assert.ok(fx.body && typeof fx.body === "object", `${f.name}: body`);
    assert.match(String(fx._doc), /^https:\/\/developers\.google\.com\/my-business\//, `${f.name}: _doc`);
  }
  assert.ok(seen.length >= 27, `only ${seen.length} live fixtures found`);
});

// The reviews, local posts and media modules cannot be compared yet: Google has not opened mybusiness.googleapis.com.
const BLOCKED = ["reviews", "localPosts", "media"] as const;
Deno.test("contract: reviews, posts and media are still closed on Google's side, and no real fixture exists for them", async () => {
  for (const p of ["yawmiyati", "abouhamze"]) {
    const fx = await fixture(`v4.probe.${p}.json`);
    for (const k of BLOCKED) {
      assert.equal(fx.calls[k].status, 403, `${p} ${k}`);
      assert.equal(fx.calls[k].reason, "SERVICE_DISABLED", `${p} ${k}`);
      assert.equal(fx.calls[k].service, "mybusiness.googleapis.com", `${p} ${k}`);
    }
  }
  const names: string[] = [];
  for await (const f of Deno.readDir(LIVE)) names.push(f.name);
  // The day Google opens the service and a session captures these, this fails: add the module's shape and parser
  // cases above, remove the 403 probe files and update docs/google/mock-vs-real.md.
  const real = names.filter((n) => /^(reviews\.list|posts\.list|media\.list)\.(yawmiyati|abouhamze)\.json$/.test(n));
  assert.deepEqual(real, [], "a real fixture for reviews, posts or media exists: add its contract cases");
});

// ─── Parser: the production code on the real fixture and on the mock's answer
type Route = [needle: string | RegExp, answer: Json, status?: number];
async function withGoogle<T>(routes: Route[], run: () => Promise<T>): Promise<T> {
  const was = { fetch: globalThis.fetch, token: io.token, gate: io.gate, failure: io.failure, sleep: io.sleep, mode: Deno.env.get("GOOGLE_MODE") };
  const calls: string[] = [];
  Deno.env.set("GOOGLE_MODE", "live");
  io.token = () => Promise.resolve("test-token");
  io.gate = () => Promise.resolve({});
  io.failure = () => Promise.resolve();
  io.sleep = () => Promise.resolve();
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    const hit = routes.find(([needle]) => typeof needle === "string" ? url.includes(needle) : needle.test(url));
    if (!hit) throw new Error(`contract test: no route for ${url}`);
    return Promise.resolve(new Response(JSON.stringify(hit[1]), { status: hit[2] ?? 200, headers: { "content-type": "application/json" } }));
  }) as typeof fetch;
  try {
    const out = await run();
    assert.ok(calls.every((c) => c.startsWith("GET ")), `a write reached the stub: ${calls.filter((c) => !c.startsWith("GET ")).join(", ")}`);
    return out;
  } finally {
    globalThis.fetch = was.fetch;
    Object.assign(io, { token: was.token, gate: was.gate, failure: was.failure, sleep: was.sleep });
    if (was.mode === undefined) Deno.env.delete("GOOGLE_MODE"); else Deno.env.set("GOOGLE_MODE", was.mode);
  }
}

const seed = { name: "x", address: null };
const FIELDS = ["name", "phone", "address", "website", "regular_hours", "main_category", "open_status", "map_pin"];

Deno.test("contract (parser): readProtection on Yawmiyati's real listing", async () => {
  const p = PROFILES.yawmiyati;
  const r = await withGoogle([[`${p.location}:getGoogleUpdated`, await body("updates.getGoogleUpdated.yawmiyati.json")], [`/${p.location}?`, await body("locations.get.yawmiyati.json")]],
    () => google.readProtection(p.location, seed));
  assert.deepEqual(Object.keys(r.listing), FIELDS);
  assert.equal(r.listing.name.display, "Yawmiyati");
  assert.equal(r.listing.main_category.display, "Media company");
  assert.equal(r.listing.website.display, "http://yawmiyati.com/");
  assert.equal(r.listing.open_status.display, "Open");
  assert.equal(r.listing.map_pin.display, "33.88457, 35.54615");
  assert.match(r.listing.regular_hours.display, /Mon/);
  assert.deepEqual(r.googleUpdated, []);
});

Deno.test("contract (parser): readProtection on Abou Hamze's real listing reads Google's own update (diffMask latlng,websiteUri)", async () => {
  const p = PROFILES.abouhamze;
  const r = await withGoogle([[`${p.location}:getGoogleUpdated`, await body("updates.getGoogleUpdated.abouhamze.json")], [`/${p.location}?`, await body("locations.get.abouhamze.json")]],
    () => google.readProtection(p.location, seed));
  assert.deepEqual([...r.googleUpdated].sort(), ["map_pin", "website"]);
  // What customers see is Google's value for the changed fields, not the owner's (the Facebook page).
  assert.equal(r.listing.website.display, "https://autoabouhamze.com/");
  assert.equal(r.listing.name.display, "Abou Hamze Auto Center - أبو حمزة أوتو سنتر");
  assert.equal(r.listing.main_category.display, "Auto parts store");
});

Deno.test("contract (parser): the same readProtection on the mock's answer gives the same fields and the same kind of result", async () => {
  const f = { title: "Harbour Lane Coffee", website: "https://kabsi.co", map_pin: "33.1, 35.2", open_status: "OPEN", categories: "Coffee shop",
    merchant: { title: "Harbour Lane Coffee", website: "https://example.com", map_pin: "33.0, 35.0", open_status: "OPEN", categories: "Coffee shop" } };
  const r = await withGoogle([[`${L}:getGoogleUpdated`, updates.googleUpdatedFromFields(L, f)], [`/${L}?`, locations.locationFromFields(L, f, true)]],
    () => google.readProtection(L, seed));
  assert.deepEqual(Object.keys(r.listing), FIELDS);
  // The mock flags the listing the way Google does (metadata.hasGoogleUpdated), so the live parser asks for the update.
  assert.deepEqual([...r.googleUpdated].sort(), ["map_pin", "website"]);
  assert.equal(r.listing.website.display, "https://kabsi.co");
  const quiet = { title: "Harbour Lane Coffee", merchant: { title: "Harbour Lane Coffee" } };
  const q = await withGoogle([[`/${L}?`, locations.locationFromFields(L, quiet, true)]], () => google.readProtection(L, seed));
  assert.deepEqual(q.googleUpdated, []);
});

Deno.test("contract (parser): search terms from the real keywords, the threshold counted as 15 (K-117.1)", async () => {
  for (const [name, expect] of [["abouhamze", 2], ["yawmiyati", null]] as const) {
    const p = PROFILES[name];
    const fx = await body(`performance.searchKeywords.${name}.json`);
    const r = await withGoogle([[`${p.location}/searchkeywords`, fx]], () => google.searchKeywords(p.location));
    assert.equal(r.length, (fx.searchKeywordsCounts ?? []).length);
    for (const row of r) assert.ok(row.keyword && Number.isFinite(row.count), `${name}: ${JSON.stringify(row)}`);
    if (expect) assert.ok(r.some((x) => /[؀-ۿ]/.test(x.keyword)), "the Arabic keyword stays");
    if (expect) assert.ok(r.every((x) => x.count === 15), "a low count arrives as threshold 15");
  }
  const mock = await withGoogle([["/searchkeywords", await performance.searchKeywordsMonthly(L, { year: 2026, month: 7 }, { year: 2026, month: 9 })]], () => google.searchKeywords(L));
  assert.deepEqual(mock, []);
});

Deno.test("contract (parser): daily figures from the real series (31 days) and from the mock's zeros", async () => {
  const fx = await body("performance.dailyMetrics.yawmiyati.json");
  const metrics = fx.multiDailyMetricTimeSeries[0].dailyMetricTimeSeries.map((s: Json) => s.dailyMetric as string);
  const p = PROFILES.yawmiyati;
  const r = await withGoogle([[`${p.location}:fetchMultiDailyMetricsTimeSeries`, fx]], () => google.dailyFigures(p.location, metrics, { year: 2026, month: 9, day: 7 }, { year: 2026, month: 9, day: 9 }));
  const sum = (m: string) => Object.values(r[m] ?? {}).reduce((a, b) => a + b, 0);
  // The fixture keeps the first 3 days of each series (7 to 9 Sept 2026; Google sent 31, see its _note).
  assert.equal(sum("BUSINESS_DIRECTION_REQUESTS"), 2);
  assert.equal(sum("BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"), 3);
  assert.equal(sum("BUSINESS_IMPRESSIONS_MOBILE_SEARCH"), 2);
  assert.equal(sum("CALL_CLICKS"), 0);
  // A day Google sends without a value counts as zero and still has its key.
  assert.equal(Object.keys(r.CALL_CLICKS ?? {}).length, 3);
  const mock = await performance.dailyMetrics(L, ["CALL_CLICKS"], { year: 2026, month: 9, day: 30 }, { year: 2026, month: 10, day: 1 });
  const m = await withGoogle([["fetchMultiDailyMetricsTimeSeries", mock]], () => google.dailyFigures(L, ["CALL_CLICKS"], { year: 2026, month: 9, day: 30 }, { year: 2026, month: 10, day: 1 }));
  assert.deepEqual(m, { CALL_CLICKS: { "2026-09-30": 0, "2026-10-01": 0 } });
});

Deno.test("contract (parser): Kabsi's own admin entry is found on both real profiles and deleted alone", async () => {
  const accountsBody = await body("accounts.list.json");
  for (const name of ["yawmiyati", "abouhamze"] as const) {
    const p = PROFILES[name];
    const list = await body(`admins.list.${name}.json`);
    let removed = false;
    const deleted: string[] = [];
    const api = {
      listAccounts: () => Promise.resolve(accountsBody),
      listLocationAdmins: () => Promise.resolve(removed ? { admins: list.admins.filter((a: Json) => a.account !== GROUP) } : list),
      deleteLocationAdmin: (n: string) => { deleted.push(n); removed = true; return Promise.resolve({}); },
    };
    assert.equal(await google.removeKabsiEntries(api, p.location), "removed");
    assert.deepEqual(deleted, [`${p.location}/admins/${GROUP.split("/")[1]}`], `${name}: only Kabsi's entry`);
  }
});

Deno.test("contract (parser): the mock's admin list is read the same way", async () => {
  const deleted: string[] = [];
  let removed = false;
  const api = {
    listAccounts: () => accounts.listAccounts(),
    listLocationAdmins: async () => removed ? { admins: (await admins.listLocationAdmins(L)).admins!.filter((a) => a.account !== A) } : await admins.listLocationAdmins(L),
    deleteLocationAdmin: (n: string) => { deleted.push(n); removed = true; return Promise.resolve({}); },
  };
  assert.equal(await google.removeKabsiEntries(api, L), "removed");
  assert.equal(deleted.length, 1);
});

Deno.test("contract (parser): connecting finds both real profiles under the Kabsi Clients group", async () => {
  const list = await body("locations.list.group.json");
  const r = await withGoogle([
    [`${GROUP}/locations`, list], [/\/accounts\/\d+\/locations/, {}],
    [/\/accounts\/\d+\/invitations/, await body("accounts.invitations.json")],
    [/\/v1\/accounts$/, await body("accounts.list.json")],
  ], () => google.acceptInvitationsAndListLocations());
  assert.equal(r.accepted, 0);
  assert.deepEqual(r.skipped, []);
  assert.deepEqual(r.locations.map((l) => [l.accountId, l.locationId, l.title]).sort(), [
    [GROUP, PROFILES.abouhamze.location, "Abou Hamze Auto Center - أبو حمزة أوتو سنتر"],
    [GROUP, PROFILES.yawmiyati.location, "Yawmiyati"],
  ].sort());
  assert.ok(r.locations.every((l) => l.placeId?.startsWith("ChIJ")));
});

Deno.test("contract (parser): the Profile Coach's numbers from the real listings", async () => {
  for (const [name, desc, extra] of [["yawmiyati", false, 1], ["abouhamze", true, 0]] as const) {
    const p = PROFILES[name];
    const r = await withGoogle([[`${p.location}/attributes`, await body(`attributes.get.yawmiyati.json`)], [`/${p.location}?`, (await body("locations.list.group.json")).locations.find((l: Json) => l.name === p.location)]],
      () => google.coachRead(p.location));
    assert.equal(r.source, "live");
    assert.equal(r.additionalCategories, extra, name);
    assert.equal(r.descriptionLength > 0, desc, name);
    assert.equal(r.attributes, 0, "a location with no attributes returns only its name");
  }
});

Deno.test("contract (parser): the category lookup takes the exact match, though Google also returns longer names", async () => {
  const p = PROFILES.abouhamze;
  const r = await withGoogle([["/categories?", await body("categories.list.abouhamze.json")]], () => google.findCategory(p.location, "LB", "Auto parts store"));
  assert.deepEqual(r, { name: "categories/gcid:auto_parts_store", displayName: "Auto parts store" });
  const y = await withGoogle([["/categories?", await body("categories.list.yawmiyati.json")]], () => google.findCategory(PROFILES.yawmiyati.location, "LB", "Media company"));
  assert.equal(y?.name, "categories/gcid:media_company");
  assert.equal(await withGoogle([["/categories?", await body("categories.list.abouhamze.json")]], () => google.findCategory(p.location, "LB", "Used auto parts")), null);
  assert.ok(await categoriesMock.findCategory("LB", "Coffee shop"));
});
