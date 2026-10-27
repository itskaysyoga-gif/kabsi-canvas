// Sec 1: the one stop switch for Google writes (app_settings.google_writes = 'paused'). gbp() in google/client.ts is
// the single path every live Business Profile request takes; these tests stub the switch, the gate and Google, and
// prove that every write method is refused before anything is sent, that reads still go, that an unreadable switch
// counts as paused, and that the refusal postpones the job instead of failing it.
// Run: deno test --no-check _shared/google/stop-switch.test.ts (scripts/deno-check.sh runs all of _shared/).
import assert from "node:assert/strict";
import { gbp, GoogleBusy, GoogleWritesPaused, io, WRITES_PAUSED_RETRY_MS } from "./client.ts";
import { RetryLater, runJob, type Job } from "../jobs.ts";
import { type Item, publishOne, type PublishDeps } from "../publish.ts";
import { runDisconnect, type DisconnectDeps } from "../disconnect.ts";
import * as accounts from "./accounts/live.ts";
import * as admins from "./admins/live.ts";
import * as attributes from "./attributes/live.ts";
import * as locations from "./locations/live.ts";
import * as media from "./media/live.ts";
import * as notifications from "./notifications/live.ts";
import * as performance from "./performance/live.ts";
import * as posts from "./posts/live.ts";
import * as reviews from "./reviews/live.ts";
import * as verifications from "./verifications/live.ts";

const real = { ...io };
const realFetch = globalThis.fetch;
const realMode = Deno.env.get("GOOGLE_MODE");

function world(paused: boolean | "error") {
  const seen = { requests: [] as string[], gates: 0, switchReads: 0 };
  io.writesPaused = () => {
    seen.switchReads++;
    return paused === "error" ? Promise.reject(new Error("db down")) : Promise.resolve(paused);
  };
  io.token = () => Promise.resolve("test-token");
  io.gate = () => {
    seen.gates++;
    return Promise.resolve({});
  };
  io.failure = () => Promise.resolve();
  io.sleep = () => Promise.resolve();
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

const ACCOUNT = "accounts/1", LOCATION = "locations/42";

// Every write the live modules can send. Special hours and attributes are location patches (updateMask), so they are
// listed as patchLocation calls with those masks.
const WRITES: [string, () => Promise<unknown>][] = [
  ["review reply", () => reviews.updateReply(`${ACCOUNT}/${LOCATION}/reviews/r1`, "Thank you")],
  ["new post", () => posts.createLocalPost(ACCOUNT, LOCATION, { summary: "Open late on Friday" })],
  ["post delete", () => posts.deleteLocalPost(`${ACCOUNT}/${LOCATION}/localPosts/p1`)],
  ["media create", () => media.createMedia(ACCOUNT, LOCATION, { mediaFormat: "PHOTO" })],
  ["media start upload", () => media.startUpload(ACCOUNT, LOCATION)],
  ["media bytes", () => media.uploadBytes({ resourceName: "ref-1" }, new Uint8Array([1, 2, 3]), "image/jpeg")],
  ["location patch", () => locations.patchLocation(LOCATION, "title", { title: "Harbour Lane Coffee" })],
  ["special hours", () => locations.patchLocation(LOCATION, "specialHours", { specialHours: { specialHourPeriods: [] } })],
  ["attributes", () => locations.patchLocation(LOCATION, "attributes", {} as never)],
  ["admin delete", () => admins.deleteLocationAdmin(`${LOCATION}/admins/a1`)],
  ["invitation accept", () => accounts.acceptInvitation(`${ACCOUNT}/invitations/i1`)],
  ["notification setting", () => notifications.updateNotificationSetting(ACCOUNT, "projects/p/topics/t", ["NEW_REVIEW"])],
];

const READS: [string, () => Promise<unknown>][] = [
  ["accounts", () => accounts.listAccounts()],
  ["reviews", () => reviews.listReviews(ACCOUNT, LOCATION)],
  ["review", () => reviews.getReview(`${ACCOUNT}/${LOCATION}/reviews/r1`)],
  ["posts", () => posts.listLocalPosts(ACCOUNT, LOCATION)],
  ["location", () => locations.getLocation(LOCATION, "title")],
  ["media", () => media.listMedia(ACCOUNT, LOCATION)],
  ["admins", () => admins.listLocationAdmins(LOCATION)],
  ["attributes", () => attributes.getAttributes(LOCATION)],
  ["notification setting", () => notifications.getNotificationSetting(ACCOUNT)],
  ["search terms", () => performance.searchKeywordsMonthly(LOCATION, { year: 2026, month: 9 }, { year: 2026, month: 9 })],
  ["verifications", () => verifications.listVerifications(LOCATION)],
];

Deno.test("stop switch on: every Google write is refused before the gate or Google is asked", async () => {
  for (const [name, write] of WRITES) {
    const seen = world(true);
    try {
      await assert.rejects(write(), (e) => {
        assert.ok(e instanceof GoogleWritesPaused, `${name}: ${e}`);
        assert.ok(e instanceof GoogleBusy && e instanceof RetryLater, `${name} must postpone the job, not fail it`);
        return true;
      });
      assert.deepEqual(seen.requests, [], `${name} reached Google`);
      assert.equal(seen.gates, 0, `${name} took a rate limit place`);
    } finally {
      restore();
    }
  }
});

Deno.test("stop switch on: reads still go to Google and never ask the switch", async () => {
  for (const [name, read] of READS) {
    const seen = world(true);
    try {
      await read();
      assert.equal(seen.switchReads, 0, `${name} asked the switch`);
    } finally {
      restore();
    }
  }
  const seen = world(true);
  try {
    await reviews.listReviews(ACCOUNT, LOCATION);
    assert.equal(seen.requests.length, 1);
    assert.match(seen.requests[0], /^GET /);
  } finally {
    restore();
  }
});

Deno.test("stop switch off: every write is sent once", async () => {
  for (const [name, write] of WRITES) {
    const seen = world(false);
    try {
      await write();
      assert.equal(seen.requests.length, 1, name);
      assert.doesNotMatch(seen.requests[0], /^GET /, name);
    } finally {
      restore();
    }
  }
});

Deno.test("a switch that cannot be read counts as paused (fails closed)", async () => {
  const seen = world("error");
  try {
    await assert.rejects(reviews.updateReply(`${ACCOUNT}/${LOCATION}/reviews/r1`, "Thank you"), GoogleWritesPaused);
    assert.deepEqual(seen.requests, []);
  } finally {
    restore();
  }
});

Deno.test("a pause during the retries of a write stops the next try", async () => {
  const seen = world(false);
  let calls = 0;
  io.writesPaused = () => Promise.resolve(++calls > 1);
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    seen.requests.push(`${init?.method ?? "GET"} ${String(input)}`);
    return Promise.resolve(new Response("{}", { status: 429 }));
  };
  try {
    await assert.rejects(locations.patchLocation(LOCATION, "title", { title: "x" }), GoogleWritesPaused);
    assert.equal(seen.requests.length, 1);
  } finally {
    restore();
  }
});

Deno.test("every write in the live modules is covered by this test", async () => {
  // A new write added to a live module must be added to WRITES above. Places (a paid read by POST) and Gemini are
  // not Business Profile writes and do not use gbp().
  let found = 0;
  for await (const dir of Deno.readDir(new URL("../google/", import.meta.url))) {
    if (!dir.isDirectory || dir.name === "places" || dir.name === "gemini") continue;
    const file = new URL(`../google/${dir.name}/live.ts`, import.meta.url);
    const text = await Deno.readTextFile(file).catch(() => "");
    found += (text.match(/method:\s*"(POST|PUT|PATCH|DELETE)"/g) ?? []).length;
  }
  // 10 distinct write calls; WRITES lists 12 rows because special hours and attributes reuse the location patch.
  assert.equal(found, 10);
  assert.equal(WRITES.length, 12);
});

Deno.test("the publish job keeps the approved item and is postponed while writes are paused", async () => {
  const until = new Date(Date.now() + WRITES_PAUSED_RETRY_MS);
  const records: { state: string }[] = [];
  const item: Item = {
    publication_id: "pub-1", target_type: "review_reply", text: "Thank you", payload: {}, google_account_id: ACCOUNT,
    google_location_id: LOCATION, google_review_id: "r1",
  };
  const deps: PublishDeps = {
    claim: () => Promise.resolve({ result: "claimed", ...item }),
    claimCheck: () => Promise.resolve({ result: "not_checking" }),
    record: (_id, o) => (records.push({ state: o.state }), Promise.resolve(o.state)),
    send: () => Promise.reject(new GoogleWritesPaused("google writes paused by staff", until)),
    read: () => Promise.resolve("shown"),
  };
  await assert.rejects(publishOne("pub-1", deps), GoogleWritesPaused);
  assert.deepEqual(records, [{ state: "approved" }]);

  // The job queue postpones it to the retry time and does not count the try or report an error.
  const done: string[] = [];
  const job = { id: 1, kind: "publish", location_id: null, dedupe_key: null } as unknown as Job;
  await runJob(job, { publish: () => publishOne("pub-1", deps).then(() => {}) }, {
    finish: (_j, ok) => (done.push(ok ? "finished" : "failed"), Promise.resolve(null)),
    postpone: (_j, at) => (done.push(`postponed ${at.toISOString()}`), Promise.resolve(null)),
    report: () => (done.push("reported"), Promise.resolve()),
  });
  assert.deepEqual(done, [`postponed ${until.toISOString()}`]);
});

Deno.test("the disconnect job waits while writes are paused: no failure recorded, no notice, postponed", async () => {
  const calls = { records: 0, notices: 0 };
  const deps: DisconnectDeps = {
    load: () => Promise.resolve({
      locationId: "loc-1", name: "QA Bakery", googleLocationId: LOCATION, concierge: false,
      requestedAt: "2026-10-27T10:00:00.000Z", removedAt: null, followupDueAt: null,
    }),
    remove: () => Promise.reject(new GoogleWritesPaused("google writes paused by staff", new Date(Date.now() + WRITES_PAUSED_RETRY_MS))),
    record: () => (calls.records++, Promise.resolve({ removedAt: null, dueAt: null })),
    notify: () => (calls.notices++, Promise.resolve()),
  };
  await assert.rejects(runDisconnect("loc-1", deps), RetryLater);
  assert.deepEqual(calls, { records: 0, notices: 0 });
});

Deno.test("gbp itself: a write is refused, a read goes", async () => {
  const seen = world(true);
  try {
    await assert.rejects(gbp("https://mybusiness.googleapis.com/v4/accounts/1/locations/42/localPosts/p1", { method: "DELETE" }), GoogleWritesPaused);
    await gbp("https://mybusiness.googleapis.com/v4/accounts/1/locations/42/localPosts/p1");
    assert.equal(seen.requests.length, 1);
    assert.match(seen.requests[0], /^GET /);
  } finally {
    restore();
  }
});
