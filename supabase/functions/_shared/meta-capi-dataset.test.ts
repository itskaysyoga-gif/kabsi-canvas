// Launch 4 part E (6 Nov 2026): META_PIXEL_ID once held "ID 2179603053433551" and Meta answered "Object with ID 'ID
// 2179603053433551' does not exist". The id is read as digits only; an id with no digits, or Meta refusing the dataset,
// logs one clear line with no token, no event and nothing about a person.
import assert from "node:assert/strict";
import { datasetRefusal, metaDatasetId } from "./meta-capi.ts";
import { readWebEvent, sendWebCapi } from "./meta-capi-web.ts";

const ev = readWebEvent({
  visitor_id: "4f8a2c1e-0b6d-4e2a-9c3b-7d1e5f6a8b90",
  event_name: "FreeScanCompleted",
  event_id: "0b9d6c1e-6f62-4c0a-9a43-2b8f6c7d1e11",
  event_source_url: "https://kabsi.co/scan",
  fbp: "fb.1.1730000000000.123",
});
if ("error" in ev) throw new Error(ev.error);
const yes = async () => ({ advertising: true, created_at: new Date().toISOString() });
const TOKEN = "secret-capi-token-value";
const envWith = (pixel: string) => (k: string) =>
  ({ META_PIXEL_ID: pixel, META_CAPI_TOKEN: TOKEN } as Record<string, string>)[k];

/** Runs fn with console.log captured; returns the lines printed. */
async function captured(fn: () => Promise<unknown>): Promise<string[]> {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...a: unknown[]) => lines.push(a.map(String).join(" "));
  try {
    await fn().catch(() => {});
  } finally {
    console.log = orig;
  }
  return lines;
}

const REFUSED = JSON.stringify({
  error: {
    message:
      "Unsupported post request. Object with ID 'ID 2179603053433551' does not exist, cannot be loaded due to missing permissions, or does not support this operation.",
    type: "GraphMethodException",
    code: 100,
    error_subcode: 33,
    fbtrace_id: "AbC123",
  },
});

Deno.test("the dataset id keeps only its digits", () => {
  assert.equal(metaDatasetId("ID 2179603053433551"), "2179603053433551");
  assert.equal(metaDatasetId(" 2179603053433551\n"), "2179603053433551");
  assert.equal(metaDatasetId("ID"), "");
  assert.equal(metaDatasetId(undefined), "");
});

Deno.test("a labelled secret still sends to the right dataset", async () => {
  let url = "";
  const fetchImpl = (async (u: string) => {
    url = u;
    return new Response(JSON.stringify({ events_received: 1 }), { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await sendWebCapi(ev, yes, envWith("ID 2179603053433551"), fetchImpl), "sent");
  assert.equal(url, "https://graph.facebook.com/v21.0/2179603053433551/events");
});

Deno.test("a secret with no digits: nothing is sent and one clear line is logged", async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  let result = "";
  const lines = await captured(async () => {
    result = await sendWebCapi(ev, yes, envWith("ID "), fetchImpl);
  });
  assert.equal(result, "skipped_no_dataset");
  assert.equal(calls, 0);
  const errs = lines.filter((l) => l.includes("meta_dataset_missing"));
  assert.equal(errs.length, 1);
  assert.ok(!errs[0].includes(TOKEN));
});

Deno.test("Meta refuses the dataset: one clear line without the token, the event or Meta's message, then an error", async () => {
  const fetchImpl = (async () => new Response(REFUSED, { status: 400 })) as unknown as typeof fetch;
  let threw = false;
  const lines = await captured(async () => {
    try {
      await sendWebCapi(ev, yes, envWith("2179603053433551"), fetchImpl);
    } catch {
      threw = true;
    }
  });
  assert.ok(threw);
  const errs = lines.filter((l) => l.includes("meta_dataset_refused"));
  assert.equal(errs.length, 1);
  const line = JSON.parse(errs[0]);
  assert.equal(line.fn, "meta_capi_web");
  assert.equal(line.status, 400);
  assert.equal(line.meta_error, 100);
  assert.equal(line.meta_subcode, 33);
  for (const bad of [TOKEN, "4f8a2c1e", "0b9d6c1e", "fb.1.", "AbC123", "Unsupported"]) {
    assert.ok(!errs[0].includes(bad), bad);
  }
});

Deno.test("only a dataset refusal is called one; other failures are not", () => {
  assert.deepEqual(datasetRefusal(400, REFUSED), { graphError: 100, graphSubcode: 33 });
  assert.equal(datasetRefusal(200, REFUSED), null);
  assert.equal(datasetRefusal(400, JSON.stringify({ error: { code: 190, message: "Invalid OAuth access token" } })), null);
  assert.equal(datasetRefusal(500, "upstream error"), null);
  assert.deepEqual(datasetRefusal(400, "Object does not exist"), { graphError: null, graphSubcode: null });
});
