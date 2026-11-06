// Launch 2 part A (30.36 item 4): the server copy of Lead and FreeScanCompleted: consent given, consent missing, the
// event id matching the browser's, and only the fields EVENTS.md allows.
import assert from "node:assert/strict";
import { loggable, readWebEvent, sendWebCapi, storedAdsYes, webCapiEvent } from "./meta-capi-web.ts";

const body = {
  visitor_id: "4F8A2C1E-0B6D-4E2A-9C3B-7D1E5F6A8B90",
  event_name: "Lead",
  event_id: "0b9d6c1e-6f62-4c0a-9a43-2b8f6c7d1e11",
  event_source_url: "https://kabsi.co/scan?utm_source=meta&fbclid=X",
  fbp: "fb.1.1730000000000.123",
  fbc: "fb.1.1730000000000.QA123",
  content_name: "free_check_report",
  email: "owner@example.com",
};
const now = Date.parse("2026-11-06T10:00:00Z");
const yes = async () => ({ advertising: true, created_at: "2026-11-01T00:00:00Z" });
const env = (k: string) => ({ META_PIXEL_ID: "123", META_CAPI_TOKEN: "t" } as Record<string, string>)[k];

Deno.test("reads only Lead and FreeScanCompleted, a uuid event id and a kabsi.co page, and drops the query", () => {
  const ev = readWebEvent(body);
  assert.ok(!("error" in ev));
  if ("error" in ev) return;
  assert.equal(ev.sourceUrl, "https://kabsi.co/scan");
  assert.equal(ev.visitorId, body.visitor_id.toLowerCase());
  assert.deepEqual(readWebEvent({ ...body, event_name: "Purchase" }), { error: "bad_event" });
  assert.deepEqual(readWebEvent({ ...body, event_id: "1" }), { error: "bad_event_id" });
  assert.deepEqual(readWebEvent({ ...body, event_source_url: "https://kabsi.co.evil.example/x" }), { error: "bad_url" });
  assert.deepEqual(readWebEvent({ ...body, visitor_id: "x" }), { error: "bad_visitor" });
  const scan = readWebEvent({ ...body, event_name: "FreeScanCompleted" });
  assert.ok(!("error" in scan) && scan.contentName === null);
});

Deno.test("the event keeps the browser's id and name; the only person field is the hashed visitor id", async () => {
  const ev = readWebEvent(body);
  if ("error" in ev) throw new Error(ev.error);
  const out = await webCapiEvent(ev, now);
  assert.equal(out.event_id, body.event_id);
  assert.equal(out.event_name, "Lead");
  assert.equal(out.action_source, "website");
  assert.equal(out.event_source_url, "https://kabsi.co/scan");
  assert.equal(out.event_time, Math.floor(now / 1000));
  const u = out.user_data as Record<string, unknown>;
  assert.deepEqual(Object.keys(u).sort(), ["external_id", "fbc", "fbp"]);
  assert.match((u.external_id as string[])[0], /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(out).includes("owner@example.com"));
  assert.ok(!JSON.stringify(out).includes(body.visitor_id.toLowerCase()));
  const shown = loggable(out);
  assert.deepEqual(shown.user_data_fields, ["external_id", "fbc", "fbp"]);
  assert.ok(!JSON.stringify(shown).includes((u.external_id as string[])[0]));
});

Deno.test("consent given: sent once to Meta with the same event id", async () => {
  const ev = readWebEvent(body);
  if ("error" in ev) throw new Error(ev.error);
  const sent: Record<string, unknown>[] = [];
  const fetchImpl = (async (_u: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body)));
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;
  assert.equal(await sendWebCapi(ev, yes, env, fetchImpl), "sent");
  assert.equal(sent.length, 1);
  assert.equal((sent[0].data as Record<string, unknown>[])[0].event_id, body.event_id);
  assert.equal(sent[0].test_event_code, undefined);
});

Deno.test("consent missing, refused or older than 12 months: nothing is sent", async () => {
  const ev = readWebEvent(body);
  if ("error" in ev) throw new Error(ev.error);
  let calls = 0;
  const fetchImpl = (async () => {
    calls++;
    return new Response("{}");
  }) as unknown as typeof fetch;
  assert.equal(await sendWebCapi(ev, async () => null, env, fetchImpl), "skipped_no_consent");
  assert.equal(
    await sendWebCapi(ev, async () => ({ advertising: false, created_at: "2026-11-05T00:00:00Z" }), env, fetchImpl),
    "skipped_no_consent",
  );
  assert.equal(storedAdsYes({ advertising: true, created_at: "2025-10-01T00:00:00Z" }, now), false);
  assert.equal(storedAdsYes({ advertising: true, created_at: "2026-10-01T00:00:00Z" }, now), true);
  assert.equal(calls, 0);
});

Deno.test("mock without Meta's secrets: nothing is sent; a test event code goes with the request when set", async () => {
  const ev = readWebEvent(body);
  if ("error" in ev) throw new Error(ev.error);
  let calls = 0;
  const fetchImpl = (async (_u: string, init: RequestInit) => {
    calls++;
    assert.equal(JSON.parse(String(init.body)).test_event_code, "TEST123");
    return new Response("{}");
  }) as unknown as typeof fetch;
  assert.equal(await sendWebCapi(ev, yes, () => undefined, fetchImpl), "skipped_mock");
  assert.equal(calls, 0);
  const withTest = (k: string) => (k === "META_TEST_EVENT_CODE" ? "TEST123" : env(k));
  assert.equal(await sendWebCapi(ev, yes, withTest, fetchImpl), "sent");
  assert.equal(calls, 1);
});
