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
// Reviews, local posts and media (mybusiness.googleapis.com v4) answered 403 SERVICE_DISABLED until Google opened
// the service on 22 Oct 2026 (the v4.probe files and reviews.list.error.json keep that error's shape). Session 18
// captured them the same day (reviews.list, posts.list and media.list for both profiles); their cases are below.
// No review on either profile has a reply yet, so reviewReply is checked against Google's documented shape only
// (mocks.test.ts) until the first live reply (P0.7-05). Run with: scripts/deno-check.sh.
import assert from "node:assert/strict";
import * as accounts from "./accounts/mock.ts";
import * as admins from "./admins/mock.ts";
import * as attributes from "./attributes/mock.ts";
import * as categoriesMock from "./categories/mock.ts";
import { io } from "./client.ts";
import * as google from "./index.ts";
import * as locations from "./locations/mock.ts";
import * as mediaMock from "./media/mock.ts";
import * as notifications from "./notifications/mock.ts";
import * as performance from "./performance/mock.ts";
import * as placeActions from "./placeActions/mock.ts";
import * as postsMock from "./posts/mock.ts";
import * as reviewsMock from "./reviews/mock.ts";
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
const mockRow: reviewsMock.MockReviewRow = {
  review_id: "mock-1", google_location_id: L, reviewer_name: "Sam", star_rating: 4, comment: "Good coffee.",
  create_time: "2026-10-01T09:00:00.000Z", reply_comment: null, reply_update_time: null,
};
// The list calls are compared as a whole; their items are compared one by one below.
const items = (key: string) => async (name: string): Promise<Json> => ({ ...(await body(name))[key][0], ...merge(...(await body(name))[key]) });

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
  ["reviews.listReviews (a page, no reply yet)", () => Promise.resolve({ reviews: [reviewsMock.reviewFromRow(A, mockRow)], totalReviewCount: 1 }), ["reviews.list.yawmiyati.json", "reviews.list.abouhamze.json"]],
  ["reviews.reviewFromRow (a rating with no text)", () => Promise.resolve(reviewsMock.reviewFromRow(A, { ...mockRow, comment: null })), ["review:reviews.list.yawmiyati.json", "review:reviews.list.abouhamze.json"]],
  ["posts.listLocalPosts", () => postsMock.listLocalPosts(A, L), ["posts.list.yawmiyati.json", "posts.list.abouhamze.json"]],
  ["posts.createLocalPost (with a photo and a link)", () => postsMock.createLocalPost(A, L, {
    languageCode: "en", summary: "New pastries.", topicType: "STANDARD", callToAction: { actionType: "LEARN_MORE", url: "https://kabsi.co" },
    media: [{ mediaFormat: "PHOTO", sourceUrl: "https://kabsi.co/x.jpg" }],
  }), ["post:posts.list.yawmiyati.json", "post:posts.list.abouhamze.json"]],
  ["posts.getLocalPost", () => postsMock.getLocalPost(`${A}/${L}/localPosts/1`), ["post:posts.list.abouhamze.json"]],
  ["media.listMedia", () => mediaMock.listMedia(A, L), ["media.list.yawmiyati.json", "media.list.abouhamze.json"]],
  ["media.createMedia (an uploaded photo)", () => mediaMock.createMedia(A, L, { mediaFormat: "PHOTO", locationAssociation: { category: "EXTERIOR" }, dataRef: { resourceName: "r" } }), ["item:media.list.yawmiyati.json", "item:media.list.abouhamze.json"]],
  ["media.getMedia", () => mediaMock.getMedia(`${A}/${L}/media/1`), ["item:media.list.abouhamze.json"]],
];

// "review:", "post:" and "item:" compare against the items of a list response rather than the whole body.
const realBody = (f: string) => {
  const [k, name] = f.includes(":") ? f.split(":") : ["", f];
  return k ? items({ review: "reviews", post: "localPosts", item: "mediaItems" }[k]!)(name) : body(name);
};

for (const [name, run, files] of shapeCases) {
  Deno.test(`contract (shape): mock ${name} agrees with Google's real response`, async () => {
    const real = merge(...await Promise.all(files.map(realBody)));
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
Deno.test("contract: every live fixture is a 200 response, except the record of the v4 services before they opened", async () => {
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

// Google opened mybusiness.googleapis.com on 22 Oct 2026: the 403 records stay as the error's shape, and each of
// the three modules has a real fixture for both profiles.
Deno.test("contract: reviews, posts and media have a real fixture for both profiles, and the 403 record keeps its shape", async () => {
  for (const p of ["yawmiyati", "abouhamze"]) {
    const fx = await fixture(`v4.probe.${p}.json`);
    for (const k of ["reviews", "localPosts", "media"]) {
      assert.equal(fx.calls[k].reason, "SERVICE_DISABLED", `${p} ${k}`);
      assert.equal(fx.calls[k].service, "mybusiness.googleapis.com", `${p} ${k}`);
    }
    for (const m of ["reviews.list", "posts.list", "media.list"]) assert.equal((await fixture(`${m}.${p}.json`))._status, 200, `${m}.${p}`);
  }
});

// ─── Parser: the production code on the real fixture and on the mock's answer
type Route = [needle: string | RegExp, answer: Json, status?: number];
async function withGoogle<T>(routes: Route[], run: () => Promise<T>): Promise<T> {
  const was = { fetch: globalThis.fetch, writesPaused: io.writesPaused, token: io.token, gate: io.gate, failure: io.failure, sleep: io.sleep, mode: Deno.env.get("GOOGLE_MODE") };
  const calls: string[] = [];
  Deno.env.set("GOOGLE_MODE", "live");
  io.writesPaused = () => Promise.resolve(false);
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
    Object.assign(io, { writesPaused: was.writesPaused, token: was.token, gate: was.gate, failure: was.failure, sleep: was.sleep });
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

Deno.test("contract (parser): reviews from the real lists: a rating with no text, no reply, and Google's own updateTime", async () => {
  for (const [name, n, texts] of [["yawmiyati", 1, 0], ["abouhamze", 2, 2]] as const) {
    const p = PROFILES[name];
    const r = await withGoogle([[`${p.location}/reviews?`, await body(`reviews.list.${name}.json`)]], () => google.listReviews(GROUP, p.location));
    assert.equal(r.length, n, name);
    assert.equal(r.filter((x) => x.comment !== null).length, texts, name);
    for (const x of r) {
      assert.equal(x.rating, 5);
      assert.equal(x.reply, null, "no reply on Google yet");
      assert.ok(x.updateTime && x.createTime, name);
      assert.ok(x.reviewId.startsWith("AbFvOq"), name);
    }
  }
  // The mock's review comes out the same way.
  const m = await withGoogle([[`${L}/reviews?`, { reviews: [reviewsMock.reviewFromRow(A, mockRow)], totalReviewCount: 1 }]], () => google.listReviews(A, L));
  assert.equal(m.length, 1);
  assert.equal(m[0].updateTime, mockRow.create_time);
});

Deno.test("contract (parser): reviews follow Google's nextPageToken, 50 at a time", async () => {
  const p = PROFILES.abouhamze;
  const [first, second] = (await body("reviews.list.abouhamze.json")).reviews;
  const r = await withGoogle([
    [/pageToken=next1/, { reviews: [second], averageRating: 5, totalReviewCount: 2 }],
    [`${p.location}/reviews?pageSize=50`, { reviews: [first], averageRating: 5, totalReviewCount: 2, nextPageToken: "next1" }],
  ], () => google.listReviews(GROUP, p.location));
  assert.deepEqual(r.map((x) => x.reviewId), [first.reviewId, second.reviewId]);
});

Deno.test("contract (parser): a real post reads as live, by its name and by its text", async () => {
  const p = PROFILES.abouhamze;
  const list = await body("posts.list.abouhamze.json");
  const post = list.localPosts[0];
  assert.equal(await withGoogle([[post.name, post]], () => google.localPostState(GROUP, p.location, post.name, "x")), "live");
  assert.equal(await withGoogle([[`${p.location}/localPosts?`, list]], () => google.localPostState(GROUP, p.location, null, post.summary)), "live");
  assert.equal(await withGoogle([[`${p.location}/localPosts?`, list]], () => google.localPostState(GROUP, p.location, null, "Another text")), null);
  // The mock's created post reads back the same way.
  const made = await postsMock.createLocalPost(A, L, { languageCode: "en", summary: "New pastries.", topicType: "STANDARD" });
  assert.equal(await withGoogle([[made.name!, made]], () => google.localPostState(A, L, made.name!, "New pastries.")), "live");
});

Deno.test("contract (parser): a real photo is found by its name", async () => {
  const p = PROFILES.yawmiyati;
  const item = (await body("media.list.yawmiyati.json")).mediaItems[0];
  assert.equal(await withGoogle([[item.name, item]], () => google.mediaExists(p.location, item.name)), true);
  assert.equal(await withGoogle([[item.name, { error: { code: 404, status: "NOT_FOUND" } }, 404]], () => google.mediaExists(p.location, item.name)), false);
});
