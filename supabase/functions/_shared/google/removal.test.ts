// P0.7-05: removing a post Kabsi published. One DELETE to the post's own name, nothing else; a post Google no longer
// has counts as removed; any other refusal is Google's and goes back to the owner; after the removal Kabsi reads the
// business's post list (Google answers a deleted post's own name with 500 INTERNAL, not 404). Run with: scripts/deno-check.sh.
import assert from "node:assert/strict";
import { io } from "./client.ts";
import * as google from "./index.ts";

const LOC = "locations/4825254240697973899";
const POST = `accounts/113746201522792609010/${LOC}/localPosts/129998751652000497`;

async function withGoogle<T>(answer: { status: number; body: unknown }, run: () => Promise<T>, mode = "live") {
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
    return Promise.resolve(new Response(JSON.stringify(answer.body), { status: answer.status, headers: { "content-type": "application/json" } }));
  }) as typeof fetch;
  try {
    return { out: await run(), calls };
  } finally {
    globalThis.fetch = was.fetch;
    Object.assign(io, { writesPaused: was.writesPaused, token: was.token, gate: was.gate, failure: was.failure, sleep: was.sleep });
    if (was.mode === undefined) Deno.env.delete("GOOGLE_MODE"); else Deno.env.set("GOOGLE_MODE", was.mode);
  }
}

Deno.test("removal: one DELETE to the post's own name, and nothing else", async () => {
  const { out, calls } = await withGoogle({ status: 200, body: {} }, () => google.removeLocalPost(LOC, POST));
  assert.deepEqual(calls, [`DELETE https://mybusiness.googleapis.com/v4/${POST}`]);
  assert.equal(out.alreadyGone, false);
});

Deno.test("removal: a post Google no longer has (404) is already removed", async () => {
  const { out, calls } = await withGoogle({ status: 404, body: { error: { code: 404, status: "NOT_FOUND" } } }, () => google.removeLocalPost(LOC, POST));
  assert.equal(calls.length, 1);
  assert.equal(out.alreadyGone, true);
});

Deno.test("removal: any other refusal is Google's, thrown for the pipeline to give back to the owner", async () => {
  await assert.rejects(
    () => withGoogle({ status: 403, body: { error: { code: 403, message: "The caller does not have permission" } } }, () => google.removeLocalPost(LOC, POST)),
    /^Error: google 403 /,
  );
});

Deno.test("removal: gone means not in the post list; Google's 500 on the deleted post's own name is never asked", async () => {
  const ACC = "accounts/113746201522792609010";
  const other = { name: `${ACC}/${LOC}/localPosts/454698435052947827`, state: "LIVE" };
  const gone = await withGoogle({ status: 200, body: { localPosts: [other] } }, () => google.localPostGone(ACC, LOC, POST));
  assert.equal(gone.out, true);
  assert.deepEqual(gone.calls, [`GET https://mybusiness.googleapis.com/v4/${ACC}/${LOC}/localPosts?pageSize=100`]);
  const still = await withGoogle({ status: 200, body: { localPosts: [other, { name: POST, state: "LIVE" }] } }, () => google.localPostGone(ACC, LOC, POST));
  assert.equal(still.out, false);
  // More pages than one read: not proof either way.
  const unsure = await withGoogle({ status: 200, body: { localPosts: [other], nextPageToken: "t" } }, () => google.localPostGone(ACC, LOC, POST));
  assert.equal(unsure.out, null);
});

Deno.test("removal: a demo business never reaches Google (R-17)", async () => {
  const { out, calls } = await withGoogle({ status: 500, body: {} }, () => google.removeLocalPost("locations/demo-harbour-lane-coffee", "accounts/x/locations/demo-harbour-lane-coffee/localPosts/1"));
  assert.deepEqual(calls, []);
  assert.equal(out.alreadyGone, false);
});
