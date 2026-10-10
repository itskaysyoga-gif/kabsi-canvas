// Every mock module answers in the shape Google documents (P0.1-11). Each fixture in tests/fixtures/google/ is built
// from Google's documented response for one call and names its documentation page in "_doc". A mock may leave a
// field out (Google omits empty fields), but every field it returns must exist in the fixture with the same type.
// Run with: deno test --no-check _shared/ (scripts/deno-check.sh).
import assert from "node:assert/strict";
import * as accounts from "./accounts/mock.ts";
import * as admins from "./admins/mock.ts";
import * as attributes from "./attributes/mock.ts";
import * as locations from "./locations/mock.ts";
import * as media from "./media/mock.ts";
import * as notifications from "./notifications/mock.ts";
import * as performance from "./performance/mock.ts";
import * as placeActions from "./placeActions/mock.ts";
import * as places from "./places/mock.ts";
import * as posts from "./posts/mock.ts";
import * as reviews from "./reviews/mock.ts";
import * as updates from "./updates/mock.ts";
import * as verifications from "./verifications/mock.ts";

import fxAccounts from "../../../../tests/fixtures/google/accounts.list.json" with { type: "json" };
import fxInvitations from "../../../../tests/fixtures/google/accounts.invitations.json" with { type: "json" };
import fxAdmins from "../../../../tests/fixtures/google/admins.list.json" with { type: "json" };
import fxAttributes from "../../../../tests/fixtures/google/attributes.get.json" with { type: "json" };
import fxLocation from "../../../../tests/fixtures/google/locations.get.json" with { type: "json" };
import fxLocations from "../../../../tests/fixtures/google/locations.list.json" with { type: "json" };
import fxMedia from "../../../../tests/fixtures/google/media.create.json" with { type: "json" };
import fxMediaList from "../../../../tests/fixtures/google/media.list.json" with { type: "json" };
import fxNotif from "../../../../tests/fixtures/google/notifications.get.json" with { type: "json" };
import fxDaily from "../../../../tests/fixtures/google/performance.dailyMetrics.json" with { type: "json" };
import fxKeywords from "../../../../tests/fixtures/google/performance.searchKeywords.json" with { type: "json" };
import fxActions from "../../../../tests/fixtures/google/placeActions.list.json" with { type: "json" };
import fxPlace from "../../../../tests/fixtures/google/places.get.json" with { type: "json" };
import fxSearch from "../../../../tests/fixtures/google/places.searchText.json" with { type: "json" };
import fxPost from "../../../../tests/fixtures/google/posts.create.json" with { type: "json" };
import fxPosts from "../../../../tests/fixtures/google/posts.list.json" with { type: "json" };
import fxReview from "../../../../tests/fixtures/google/reviews.get.json" with { type: "json" };
import fxReviews from "../../../../tests/fixtures/google/reviews.list.json" with { type: "json" };
import fxReply from "../../../../tests/fixtures/google/reviews.updateReply.json" with { type: "json" };
import fxUpdated from "../../../../tests/fixtures/google/updates.getGoogleUpdated.json" with { type: "json" };
import fxVom from "../../../../tests/fixtures/google/verifications.voiceOfMerchant.json" with { type: "json" };
import fxVerifs from "../../../../tests/fixtures/google/verifications.list.json" with { type: "json" };

const kind = (v: unknown) => (v === null ? "null" : Array.isArray(v) ? "array" : typeof v);

// Throws with the path of the first field the fixture does not have, or whose type differs.
function assertShape(actual: unknown, fixture: unknown, path = "$") {
  assert.equal(kind(actual), kind(fixture), `${path}: ${kind(actual)} where Google returns ${kind(fixture)}`);
  if (Array.isArray(actual)) {
    // Items of one list can carry different optional fields: compare against all the fixture's items together.
    const items = fixture as unknown[];
    const sample = items.every((x) => kind(x) === "object") && items.length ? Object.assign({}, ...items.toReversed()) : items[0];
    if (sample !== undefined) actual.forEach((item, i) => assertShape(item, sample, `${path}[${i}]`));
  } else if (kind(actual) === "object") {
    const f = fixture as Record<string, unknown>;
    for (const [k, v] of Object.entries(actual as Record<string, unknown>)) {
      assert.ok(k in f && !k.startsWith("_"), `${path}.${k}: not in Google's documented response`);
      assertShape(v, f[k], `${path}.${k}`);
    }
  }
}

const A = accounts.MOCK_ACCOUNT, L = "locations/demo-harbour-lane-coffee";
const row: reviews.MockReviewRow = {
  review_id: "mock-1", google_location_id: L, reviewer_name: "Sam", star_rating: 4, comment: "Good coffee.",
  create_time: "2026-10-01T09:00:00.000Z", reply_comment: "Thank you, Sam.", reply_update_time: "2026-10-01T10:00:00.000Z",
};

const cases: [string, () => Promise<unknown>, unknown][] = [
  ["accounts.listAccounts", () => accounts.listAccounts(), fxAccounts],
  ["accounts.listInvitations", () => accounts.listInvitations(A), fxInvitations],
  ["locations.listLocations", () => locations.listLocations(A, "name,title,metadata"), fxLocations],
  ["locations.locationFromFields", () => Promise.resolve(locations.locationFromFields(L, { title: "Harbour Lane Coffee", phone: "+1 555 0100", address: "12 Harbour Lane", website: "https://kabsi.co", categories: "Coffee shop", specialHours: [{ startDate: { year: 2026, month: 12, day: 24 }, endDate: { year: 2026, month: 12, day: 24 }, closed: true }] })), fxLocation],
  ["reviews.reviewFromRow", () => Promise.resolve(reviews.reviewFromRow(A, row)), fxReview],
  ["reviews.list page", () => Promise.resolve({ reviews: [reviews.reviewFromRow(A, row)], totalReviewCount: 1 }), fxReviews],
  ["reviews.updateReply", () => Promise.resolve(reviews.replyNow("Thank you.")), fxReply],
  ["posts.createLocalPost", () => posts.createLocalPost(A, L, { languageCode: "en", summary: "New pastries.", topicType: "STANDARD", callToAction: { actionType: "LEARN_MORE", url: "https://kabsi.co" } }), fxPost],
  ["posts.listLocalPosts", () => posts.listLocalPosts(A, L), fxPosts],
  ["posts.getLocalPost", () => posts.getLocalPost(`${A}/${L}/localPosts/1`), fxPost],
  ["media.createMedia", () => media.createMedia(A, L, { mediaFormat: "PHOTO", locationAssociation: { category: "EXTERIOR" }, sourceUrl: "https://kabsi.co/x.jpg" }), fxMedia],
  ["media.listMedia", () => media.listMedia(A, L), fxMediaList],
  ["media.getMedia", () => media.getMedia(`${A}/${L}/media/1`), fxMedia],
  ["performance.searchKeywordsMonthly", () => performance.searchKeywordsMonthly(L, { year: 2026, month: 7 }, { year: 2026, month: 10 }), fxKeywords],
  ["performance.dailyMetrics", () => performance.dailyMetrics(L, ["CALL_CLICKS", "WEBSITE_CLICKS"], { year: 2026, month: 9, day: 29 }, { year: 2026, month: 10, day: 1 }), fxDaily],
  ["attributes.getAttributes", () => attributes.getAttributes(L), fxAttributes],
  ["notifications.getNotificationSetting", () => notifications.getNotificationSetting(A), fxNotif],
  ["updates.getGoogleUpdated", () => Promise.resolve(updates.googleUpdatedFromFields(L, { title: "Harbour Lane Coffee", website: "https://kabsi.co", merchant: { title: "Harbour Lane Coffee", website: "https://example.com" } })), fxUpdated],
  ["admins.listLocationAdmins", () => {
    admins.useAdminStore({ read: () => Promise.resolve({ removed: false, refuse: false }), remove: () => Promise.resolve() });
    return admins.listLocationAdmins(L);
  }, fxAdmins],
  ["verifications.getVoiceOfMerchantState", () => verifications.getVoiceOfMerchantState(L), fxVom],
  ["verifications.listVerifications", () => verifications.listVerifications(L), fxVerifs],
  ["placeActions.listPlaceActionLinks", () => placeActions.listPlaceActionLinks(L), fxActions],
  ["places.searchText", async () => (await places.searchText("k", "coffee", 5, "places.id,places.displayName,places.formattedAddress,places.addressComponents")).data, fxSearch],
  ["places.getPlace", async () => (await places.getPlace("k", "x", "rating,userRatingCount,primaryType,primaryTypeDisplayName,types,addressComponents")).data, fxPlace],
];

for (const [name, run, fixture] of cases) {
  Deno.test(`mock ${name} answers in Google's documented shape`, async () => {
    assertShape(await run(), fixture);
  });
}

Deno.test("every fixture names the Google documentation page it was built from", () => {
  for (const [name, , fixture] of cases) {
    const doc = (fixture as { _doc?: string })._doc ?? "";
    assert.match(doc, /^https:\/\/developers\.google\.com\/(my-business|maps)\//, `${name}: _doc`);
  }
});

Deno.test("the shape check rejects a field Google does not return, and a wrong type", () => {
  assert.throws(() => assertShape({ reviewId: "x", starRatingNumber: 5 }, fxReview), /starRatingNumber/);
  assert.throws(() => assertShape({ starRating: 5 }, fxReview), /starRating/);
});

Deno.test("a mock review keeps the stored values", () => {
  const r = reviews.reviewFromRow(A, row);
  assert.equal(r.name, `${A}/${L}/reviews/mock-1`);
  assert.equal(r.starRating, "FOUR");
  assert.equal(r.reviewReply?.comment, "Thank you, Sam.");
  assert.equal(r.updateTime, row.reply_update_time);
  const bare = reviews.reviewFromRow(A, { ...row, comment: null, reply_comment: null, reply_update_time: null });
  assert.equal("comment" in bare || "reviewReply" in bare || "updateTime" in bare, false);
});

Deno.test("a new mock listing invents no phone and no category (K-99, A13)", () => {
  const f = locations.seedFields({ name: "Juniper Hair Studio", address: "4 Juniper Road" });
  assert.equal(f.phone, "");
  assert.equal(f.categories, "");
  assert.equal(f.title, "Juniper Hair Studio");
  assert.equal(locations.seedFields({ name: "X", address: null, phone: "+44 20 0000 0000" }).phone, "+44 20 0000 0000");
});

Deno.test("the mock getGoogleUpdated names the fields Google shows differently from the business's own values", () => {
  const same = updates.googleUpdatedFromFields(L, { title: "Harbour Lane Coffee", merchant: { title: "Harbour Lane Coffee" } });
  assert.deepEqual(same, { location: { name: L } });
  const moved = updates.googleUpdatedFromFields(L, {
    title: "Harbour Lane", hours: "Mon to Sun 09:00 to 17:00", open_status: "CLOSED_PERMANENTLY", map_pin: "33.1, 35.2",
    merchant: { title: "Harbour Lane Coffee", hours: "Mon to Sun 09:00 to 17:00", open_status: "OPEN" },
  });
  // map_pin has no value of the business's own (made before the merchant values existed): not Google's update.
  assert.equal(moved.diffMask, "title,openInfo");
  assert.deepEqual(moved.location.openInfo, { status: "CLOSED_PERMANENTLY" });
  assert.deepEqual(moved.location.latlng, { latitude: 33.1, longitude: 35.2 });
});

Deno.test("mock performance values are zero, never invented", async () => {
  const d = await performance.dailyMetrics(L, ["CALL_CLICKS"], { year: 2026, month: 9, day: 30 }, { year: 2026, month: 10, day: 1 });
  const values = d.multiDailyMetricTimeSeries![0].dailyMetricTimeSeries![0].timeSeries!.datedValues!;
  assert.equal(values.length, 2);
  assert.ok(values.every((v) => v.value === "0"));
});

Deno.test("special hours read back match whatever the key order of the stored dates (P0.1-13b)", async () => {
  const { showsSpecialHours } = await import("./index.ts");
  // As the database returns a stored period: keys in its own order.
  const stored = [{ closed: true, endDate: { day: 25, year: 2026, month: 12 }, startDate: { day: 25, year: 2026, month: 12 } }];
  assert.equal(showsSpecialHours(stored, { startDate: "2026-12-25", endDate: "2026-12-25", closed: true }), true);
  assert.equal(showsSpecialHours(stored, { startDate: "2026-12-24", endDate: "2026-12-24", closed: true }), false);
  const open = [{ startDate: { year: 2026, month: 12, day: 24 }, openTime: { hours: 9 }, closeTime: { minutes: 30, hours: 13 } }];
  assert.equal(showsSpecialHours(open, { startDate: "2026-12-24", endDate: "2026-12-24", closed: false, openTime: "09:00", closeTime: "13:30" }), true);
  assert.equal(showsSpecialHours(open, { startDate: "2026-12-24", endDate: "2026-12-24", closed: true }), false);
});
