// Photos 2: removing a photo Kabsi put on Google. One DELETE to the media name Google gave Kabsi's upload, nothing else;
// a name under another location is refused before Google is called; a photo Google no longer has (the owner deleted it on
// Google) counts as removed; after the removal Kabsi reads Google until the photo is gone. Run with scripts/deno-check.sh.
import assert from "node:assert/strict";
import { io } from "./client.ts";
import * as google from "./index.ts";
import * as mediaMock from "./media/mock.ts";
import { type Item, publishOne, type PublishDeps, type Outcome } from "../publish.ts";

const ACC = "accounts/113746201522792609010";
const LOC = "locations/4825254240697973899";
const MEDIA = `${ACC}/${LOC}/media/CIABIhDyax6aYFobVMVTEKgGna3m`;

type Answer = { status: number; body: unknown };
// The answer for a request: a list answers by call order; a function answers by the request's address.
async function withGoogle<T>(answers: Answer[] | ((url: string) => Answer), run: () => Promise<T>, mode = "live") {
  const was = { fetch: globalThis.fetch, writesPaused: io.writesPaused, token: io.token, gate: io.gate, failure: io.failure, sleep: io.sleep, mode: Deno.env.get("GOOGLE_MODE") };
  const calls: string[] = [];
  Deno.env.set("GOOGLE_MODE", mode);
  io.writesPaused = () => Promise.resolve(false);
  io.token = () => Promise.resolve("test-token");
  io.gate = () => Promise.resolve({});
  io.failure = () => Promise.resolve();
  io.sleep = () => Promise.resolve();
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${String(input)}`);
    const a = typeof answers === "function" ? answers(String(input)) : answers[Math.min(calls.length - 1, answers.length - 1)];
    return Promise.resolve(new Response(JSON.stringify(a.body), { status: a.status, headers: { "content-type": "application/json" } }));
  }) as typeof fetch;
  try {
    return { out: await run(), calls };
  } finally {
    globalThis.fetch = was.fetch;
    Object.assign(io, { writesPaused: was.writesPaused, token: was.token, gate: was.gate, failure: was.failure, sleep: was.sleep });
    if (was.mode === undefined) Deno.env.delete("GOOGLE_MODE"); else Deno.env.set("GOOGLE_MODE", was.mode);
  }
}

Deno.test("photo removal: one DELETE to the media name Kabsi stored, and nothing else", async () => {
  const { out, calls } = await withGoogle([{ status: 200, body: {} }], () => google.removeMedia(LOC, MEDIA));
  assert.deepEqual(calls, [`DELETE https://mybusiness.googleapis.com/v4/${MEDIA}`]);
  assert.equal(out.alreadyGone, false);
});

Deno.test("photo removal: Google no longer has it (404, deleted on Google) counts as removed, not as an error", async () => {
  const { out, calls } = await withGoogle([{ status: 404, body: { error: { code: 404, status: "NOT_FOUND" } } }], () => google.removeMedia(LOC, MEDIA));
  assert.equal(calls.length, 1);
  assert.equal(out.alreadyGone, true);
});

Deno.test("photo removal: a name under another location, or not a media name, is refused before Google is called", async () => {
  for (const ref of [`${ACC}/locations/999/media/x`, `${ACC}/${LOC}/localPosts/1`, `${MEDIA}/../../media/y`, ""]) {
    const { calls } = await withGoogle([{ status: 200, body: {} }], () => google.removeMedia(LOC, ref).catch((e) => String(e)));
    assert.deepEqual(calls, [], ref);
  }
});

Deno.test("photo removal: any other refusal is Google's, thrown for the pipeline to give back to the owner", async () => {
  await assert.rejects(
    () => withGoogle([{ status: 403, body: { error: { code: 403, message: "The caller does not have permission" } } }], () => google.removeMedia(LOC, MEDIA)),
    /^Error: google 403 /,
  );
});

Deno.test("photo removal: gone is a 404 on its name; a 500 falls back to the photo list; more pages is not proof", async () => {
  const gone = await withGoogle([{ status: 404, body: {} }], () => google.mediaGone(ACC, LOC, MEDIA));
  assert.equal(gone.out, true);
  assert.deepEqual(gone.calls, [`GET https://mybusiness.googleapis.com/v4/${MEDIA}`]);
  const still = await withGoogle([{ status: 200, body: { name: MEDIA } }], () => google.mediaGone(ACC, LOC, MEDIA));
  assert.equal(still.out, false);
  // Google answers the item's own name with 500; the business's photo list decides.
  const by = (list: unknown) => (url: string): Answer => (url.includes("/media?") ? { status: 200, body: list } : { status: 500, body: {} });
  const listed = await withGoogle(by({ mediaItems: [{ name: MEDIA }] }), () => google.mediaGone(ACC, LOC, MEDIA));
  assert.equal(listed.out, false);
  assert.equal(listed.calls.at(-1), `GET https://mybusiness.googleapis.com/v4/${ACC}/${LOC}/media?pageSize=100`);
  const notListed = await withGoogle(by({ mediaItems: [{ name: `${ACC}/${LOC}/media/other` }] }), () => google.mediaGone(ACC, LOC, MEDIA));
  assert.equal(notListed.out, true);
  const unsure = await withGoogle(by({ mediaItems: [], nextPageToken: "t" }), () => google.mediaGone(ACC, LOC, MEDIA));
  assert.equal(unsure.out, null);
});

Deno.test("photo removal: a demo business never reaches Google (R-17), and the mock removes then reads it gone", async () => {
  const demo = "locations/demo-harbour-lane-coffee";
  const ref = `accounts/x/${demo}/media/m1`;
  const { out, calls } = await withGoogle([{ status: 500, body: {} }], async () => {
    const r = await google.removeMedia(demo, ref);
    return { r, gone: await google.mediaGone("accounts/x", demo, ref) };
  });
  assert.deepEqual(calls, []);
  assert.equal(out.r.alreadyGone, false);
  assert.equal(out.gone, true);
  assert.equal(mediaMock.removed.has(ref), true);
});

Deno.test("photo removal through the pipeline (mock mode): removed once Google no longer has it; already gone is removed too", async () => {
  const run = async (alreadyGone: boolean) => {
    const recorded: Outcome[] = [];
    const ref = `accounts/x/locations/mock-l/media/${crypto.randomUUID()}`;
    if (alreadyGone) mediaMock.removed.add(ref);
    const item: Item = {
      publication_id: "pub-1", target_type: "photo_removal", text: null, payload: { media_ref: ref },
      google_account_id: "accounts/x", google_location_id: "locations/mock-l", google_review_id: null,
    };
    const deps: PublishDeps = {
      claim: () => Promise.resolve({ result: "claimed", ...item }),
      claimCheck: () => Promise.resolve({ result: "not_checking" }),
      record: (_id, o) => { recorded.push(o); return Promise.resolve(o.state); },
      send: async (i) => {
        const r = await google.removeMedia(i.google_location_id, String(i.payload.media_ref));
        return { ref: String(i.payload.media_ref), response: r.response, seen: r.alreadyGone ? "shown" : undefined };
      },
      read: async (i) => ((await google.mediaGone("accounts/x", i.google_location_id, String(i.payload.media_ref))) ? "shown" : "pending"),
    };
    const out = await withGoogle([{ status: 500, body: {} }], () => publishOne("pub-1", deps), "mock");
    assert.deepEqual(out.calls, [], "mock mode sends nothing to Google");
    return recorded.map((o) => o.state);
  };
  assert.deepEqual(await run(false), ["published", "verified"]);
  assert.deepEqual(await run(true), ["published", "verified"]);
});
