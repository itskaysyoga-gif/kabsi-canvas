// Fix 3: the name guard in gbp(). Sentry KABSI-EDGE-J: the Coach's weekly read sent Kabsi's own business id where
// Google's location name belongs, 5,796 times. These tests stub the gate, the token and Google, and prove that a live
// call whose path is not a Google resource name is refused before the network (no fetch, no gate, no token), is never
// retried, is reported at most once a day, and that every documented form the live modules use still goes through.
// Run: deno test --no-check _shared/google/name-guard.test.ts (scripts/deno-check.sh runs all of _shared/).
import assert from "node:assert/strict";
import { gbp, GoogleNameRefused, googlePathOk, io } from "./client.ts";
import { PermanentJobError } from "../jobs.ts";
import * as google from "./index.ts";
import * as accounts from "./accounts/live.ts";
import * as admins from "./admins/live.ts";
import * as attributes from "./attributes/live.ts";
import * as categories from "./categories/live.ts";
import * as locations from "./locations/live.ts";
import * as media from "./media/live.ts";
import * as notifications from "./notifications/live.ts";
import * as performance from "./performance/live.ts";
import * as posts from "./posts/live.ts";
import * as reviews from "./reviews/live.ts";
import * as updates from "./updates/live.ts";
import * as verifications from "./verifications/live.ts";

const real = { ...io };
const realFetch = globalThis.fetch;
const realMode = Deno.env.get("GOOGLE_MODE");
const BI = "https://mybusinessbusinessinformation.googleapis.com/v1";
const KABSI_ID = "9803ee99-fee8-4c6a-abb4-1a830fcbb438";
const ACC = "accounts/113746201522792609010", LOC = "locations/4825254240697973899";

function world(due: boolean[] = [true]) {
  const seen = { requests: [] as string[], gates: 0, tokens: 0, reports: [] as string[] };
  io.writesPaused = () => Promise.resolve(false);
  io.token = () => (seen.tokens++, Promise.resolve("test-token"));
  io.gate = () => (seen.gates++, Promise.resolve({}));
  io.failure = () => Promise.resolve();
  io.sleep = () => Promise.resolve();
  io.refusalDue = () => Promise.resolve(due.shift() ?? false);
  io.reportRefusal = (url) => (seen.reports.push(url), Promise.resolve());
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    seen.requests.push(`${init?.method ?? "GET"} ${String(input)}`);
    return Promise.resolve(new Response(JSON.stringify({ name: "ok" }), { status: 200 }));
  };
  Deno.env.set("GOOGLE_MODE", "live");
  return seen;
}
function restore() {
  Object.assign(io, real);
  globalThis.fetch = realFetch;
  if (realMode === undefined) Deno.env.delete("GOOGLE_MODE");
  else Deno.env.set("GOOGLE_MODE", realMode);
}
async function refused(f: () => Promise<unknown>) {
  try {
    await f();
  } catch (e) {
    return e;
  }
  throw new Error("expected a refusal");
}

Deno.test("Fix 3: Kabsi's own id is refused before the network, with no retry", async () => {
  const seen = world();
  try {
    const e = await refused(() => gbp(`${BI}/${KABSI_ID}?readMask=profile,categories`));
    assert.ok(e instanceof GoogleNameRefused);
    assert.ok(e instanceof PermanentJobError, "a job meeting it fails for good instead of retrying");
    assert.deepEqual(seen.requests, []);
    assert.equal(seen.gates, 0);
    assert.equal(seen.tokens, 0);
  } finally {
    restore();
  }
});

Deno.test("Fix 3: the exact KABSI-EDGE-J calls are refused (location and attributes, real business and test personas)", async () => {
  const seen = world([false, false, false, false]);
  try {
    for (const id of [KABSI_ID, "de300000-0000-4000-8000-000000000001", "de300000-0000-4000-8000-000000000002"]) {
      assert.ok((await refused(() => locations.getLocation(id, "profile,categories"))) instanceof GoogleNameRefused);
      assert.ok((await refused(() => attributes.getAttributes(id))) instanceof GoogleNameRefused);
    }
    assert.deepEqual(seen.requests, []);
  } finally {
    restore();
  }
});

Deno.test("Fix 3: other wrong names are refused too (demo, concierge, empty, under an account, a path trick)", async () => {
  const seen = world([]);
  try {
    for (const url of [
      `${BI}/locations/demo-harbour-lane-coffee?readMask=title`,
      `${BI}/locations/concierge-${KABSI_ID}?readMask=title`,
      `${BI}/?readMask=title`,
      `${BI}/locations/?readMask=title`,
      `https://mybusiness.googleapis.com/v4/accounts/demo/locations/demo-x/reviews`,
      `https://mybusiness.googleapis.com/v4/${ACC}/${KABSI_ID}/reviews`,
      `https://example.com/v1/${LOC}`,
      `${BI}/locations/${KABSI_ID}?readMask=title`,
      `${BI}/locations/${KABSI_ID}/attributes`,
    ]) {
      assert.ok((await refused(() => gbp(url))) instanceof GoogleNameRefused, url);
    }
    assert.deepEqual(seen.requests, []);
  } finally {
    restore();
  }
});

Deno.test("Fix 3: a refusal is reported to Sentry only when today's report is still due", async () => {
  const seen = world([true, false, false]);
  try {
    for (let i = 0; i < 3; i++) await refused(() => gbp(`${BI}/${KABSI_ID}?readMask=title`));
    assert.equal(seen.reports.length, 1);
    assert.ok(seen.reports[0].includes(KABSI_ID));
  } finally {
    restore();
  }
});

Deno.test("Fix 3: a broken report never hides the refusal", async () => {
  world();
  io.refusalDue = () => Promise.reject(new Error("db down"));
  try {
    assert.ok((await refused(() => gbp(`${BI}/${KABSI_ID}`))) instanceof GoogleNameRefused);
  } finally {
    restore();
  }
});

Deno.test("Fix 3: every documented form the live modules send still goes through", async () => {
  const seen = world();
  try {
    const calls: [string, () => Promise<unknown>][] = [
      ["accounts.list", () => accounts.listAccounts()],
      ["invitations", () => accounts.listInvitations(ACC)],
      ["accept", () => accounts.acceptInvitation(`${ACC}/invitations/abc123`)],
      ["location admins", () => admins.listLocationAdmins(LOC)],
      ["admin delete", () => admins.deleteLocationAdmin(`${LOC}/admins/xyz`)],
      ["attributes", () => attributes.getAttributes(LOC)],
      ["categories", () => categories.findCategory("LB", "Coffee shop")],
      ["locations.list", () => locations.listLocations(ACC, "title")],
      ["location", () => locations.getLocation(LOC, "title")],
      ["patch", () => locations.patchLocation(LOC, "websiteUri", { websiteUri: "https://example.com" })],
      ["google updated", () => updates.getGoogleUpdated(LOC, "title")],
      ["reviews", () => reviews.listReviews(ACC, LOC, 1, "")],
      ["reply", () => reviews.updateReply(`${ACC}/${LOC}/reviews/r1`, "Thank you")],
      ["posts", () => posts.listLocalPosts(ACC, LOC)],
      ["media list", () => media.listMedia(ACC, LOC)],
      ["notifications", () => notifications.getNotificationSetting(ACC)],
      ["keywords", () => performance.searchKeywordsMonthly(LOC, { year: 2026, month: 9 }, { year: 2026, month: 10 })],
      ["daily", () => performance.dailyMetrics(LOC, ["WEBSITE_CLICKS"], { year: 2026, month: 10, day: 1 }, { year: 2026, month: 10, day: 2 })],
      ["voice of merchant", () => verifications.getVoiceOfMerchantState(LOC)],
    ];
    for (const [what, call] of calls) {
      await call().catch((e) => {
        if (e instanceof GoogleNameRefused) throw new Error(`${what} was refused: ${e.message}`);
      });
    }
    assert.equal(seen.reports.length, 0);
    assert.ok(seen.requests.length >= calls.length);
    assert.ok(googlePathOk(`https://mybusiness.googleapis.com/upload/v1/media/${encodeURIComponent("AF1Qip-abc")}?upload_type=media`));
  } finally {
    restore();
  }
});

Deno.test("Fix 3: coachRead takes only Google's location name, and a demo business reads the mock", async () => {
  const seen = world([false]);
  try {
    await assert.rejects(() => google.coachRead(KABSI_ID), /coach_read_needs_google_location_name/);
    assert.equal((await google.coachRead("locations/demo-harbour-lane-coffee")).source, "mock");
    assert.equal((await google.coachRead(LOC, true)).source, "mock");
    assert.deepEqual(seen.requests, []);
  } finally {
    restore();
  }
});
