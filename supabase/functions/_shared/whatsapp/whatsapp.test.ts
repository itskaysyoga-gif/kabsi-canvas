// P0.8-03 WhatsApp owner channel: the Edge Function side with fakes. The database side (opt-in, STOP, the window,
// approve through the pipeline, undo, a second press, refusals) is in supabase/tests/whatsapp_channel.sql.
import assert from "node:assert/strict";
import {
  alertButtons, excerpt, firstName, fresh, type Inbound, intentOf, parseWebhook, refusal, reviewAlertBody, verifySignature,
} from "./channel.ts";
import { type Ctx, type Db, deliver, handleInbound, type MaySend, mockSender, sendProtectionAlert, sendReviewAlert } from "./deliver.ts";
import { senderMode } from "./kapso.ts";

const enc = (s: string) => new TextEncoder().encode(s);
async function sign(secret: string, body: string) {
  const key = await crypto.subtle.importKey("raw", enc(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", key, enc(body)))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("a forged or missing signature is refused; the right one passes", async () => {
  const body = '{"message":{"id":"wamid.1"}}';
  const good = await sign("s3cret", body);
  assert.equal(await verifySignature("s3cret", enc(body), good), true);
  assert.equal(await verifySignature("s3cret", enc(body), await sign("other", body)), false);
  assert.equal(await verifySignature("s3cret", enc(body + " "), good), false, "a changed body");
  assert.equal(await verifySignature("s3cret", enc(body), null), false);
  assert.equal(await verifySignature("s3cret", enc(body), "zz"), false);
  assert.equal(await verifySignature("", enc(body), good), false, "no secret set refuses everything");
});

Deno.test("the replay window: older than 10 minutes or from the future is refused", () => {
  const now = Date.UTC(2026, 9, 22, 4, 0, 0);
  assert.equal(fresh(now / 1000 - 30, now), true);
  assert.equal(fresh(now / 1000 - 601, now), false);
  assert.equal(fresh(now / 1000 + 120, now), false);
  assert.equal(fresh(0, now), false);
});

Deno.test("parses Kapso v2 messages, button replies, photos, batches and receipts", () => {
  const msg = (id: string, extra: Record<string, unknown>) => ({
    message: { id, timestamp: "1730092800", kapso: { direction: "inbound" }, ...extra },
    conversation: { phone_number: "+15551234567", phone_number_id: "PNID" }, phone_number_id: "PNID",
  });
  const one = parseWebhook("whatsapp.message.received", msg("w1", { type: "text", text: { body: "STOP" } }));
  assert.equal(one.messages[0].from, "+15551234567");
  assert.equal(one.messages[0].text, "STOP");
  const batch = parseWebhook("whatsapp.message.received", {
    data: [msg("w2", { type: "interactive", interactive: { button_reply: { id: "a:abcdefghijklmnopqrstuv" } } }), msg("w3", { type: "image", image: { id: "m1" } })],
  });
  assert.equal(batch.messages.length, 2);
  assert.equal(batch.messages[0].buttonId, "a:abcdefghijklmnopqrstuv");
  assert.equal(batch.messages[1].mediaId, "m1");
  const receipt = parseWebhook("whatsapp.message.failed", {
    message: { id: "out1", kapso: { direction: "outbound", status: "failed", statuses: [{ errors: [{ title: "Re-engagement message" }] }] } },
  });
  assert.deepEqual(receipt.statuses, [{ messageId: "out1", status: "failed", error: "Re-engagement message" }]);
});

const inbound = (o: Partial<Inbound>): Inbound => ({
  phoneNumberId: "PNID", from: "+15551234567", messageId: crypto.randomUUID(), timestamp: Date.now() / 1000, type: "text", text: null,
  buttonId: null, mediaId: null, ...o,
});

Deno.test("STOP and its variants, the code, buttons and photos", () => {
  for (const t of ["STOP", "stop", "Stop.", "UNSUBSCRIBE", "cancel", "توقف"]) assert.equal(intentOf(inbound({ text: t })).kind, "stop", t);
  assert.deepEqual(intentOf(inbound({ text: "KABSI 123456" })), { kind: "code", code: "123456" });
  assert.deepEqual(intentOf(inbound({ text: "123456" })), { kind: "code", code: "123456" });
  assert.equal(intentOf(inbound({ text: "please stop by tomorrow" })).kind, "other");
  assert.equal(intentOf(inbound({ buttonId: "u:abcdefghijklmnopqrstuv" })).kind, "undo");
  assert.equal(intentOf(inbound({ buttonId: "x:abcdefghijklmnopqrstuv" })).kind, "other");
  assert.equal(intentOf(inbound({ type: "image", mediaId: "m1" })).kind, "photo");
});

Deno.test("a review alert: business, stars, first name only, at most 300 characters of the review, the draft", () => {
  const long = "Great coffee. ".repeat(40);
  const body = reviewAlertBody({ business: "Harbour Lane Coffee", stars: 5, reviewer: "Maya Haddad", text: long, draft: "Thank you, Maya." });
  assert.match(body, /^Harbour Lane Coffee: new 5-star review from Maya\./);
  assert.doesNotMatch(body, /Haddad/);
  assert.equal(excerpt(long)!.length, 300);
  assert.match(body, /Kabsi's reply: Thank you, Maya\./);
  assert.equal(firstName("  "), null);
  assert.doesNotMatch(body, /[—–!]/);
  assert.deepEqual(alertButtons("tok", false).map((b) => b.title), ["Edit in app"]);
  for (const b of alertButtons("tok", true)) assert.ok(b.title.length <= 20);
});

Deno.test("refusals send the owner to the app in plain words, never an exclamation or a dash", () => {
  for (const r of ["high_risk", "identity_field", "changed", "not_draft", "expired", "stopped", "plan_required", "x"]) {
    assert.doesNotMatch(refusal(r), /[—–!]/);
  }
  assert.match(refusal("identity_field"), /name, address, categories, map pin, phone or opening status/);
});

Deno.test("the live sender is off unless the switch, the number, the key and the phone number id are all set", () => {
  const all = { live: "true", apiKey: "k", phoneNumberId: "p", numberOn: true };
  assert.equal(senderMode(all), "live");
  assert.equal(senderMode({ ...all, live: undefined }), "mock");
  assert.equal(senderMode({ ...all, numberOn: false }), "mock", "no number, no send");
  assert.equal(senderMode({ ...all, apiKey: undefined }), "mock");
  assert.equal(senderMode({ ...all, phoneNumberId: "" }), "mock");
});

// ─── The flow with a fake database.
type Row = { kind: string; state: string; error?: string | null; template?: string | null };
function fakeCtx(o: { may?: MaySend; on?: boolean; template?: string | null; approve?: Awaited<ReturnType<Db["approve"]>> } = {}) {
  const records: Row[] = [];
  const calls: string[] = [];
  const seen = new Set<string>();
  const log: { to: string; kind: string; body: string }[] = [];
  const db: Db = {
    maySend: async () => o.may ?? { ok: true, phone: "+15551234567", in_window: true, review_alerts: true, digest: false },
    record: async (r) => (records.push({ kind: r.kind, state: r.state, error: r.error, template: r.template }), "id"),
    inbound: async (phone, id) => {
      if (seen.has(id)) return { duplicate: true };
      seen.add(id);
      return phone === "+15551234567" ? { duplicate: false, known: true, user_id: "u1", state: "active" } : { duplicate: false, known: false, user_id: null };
    },
    verify: async (_p, code) => (calls.push(`verify:${code}`), code === "123456" ? { result: "verified", user_id: "u1" } : { result: "unknown_code" }),
    stop: async (p) => (calls.push(`stop:${p}`), { result: "stopped" }),
    actionCreate: async (_u, t, id) => (calls.push(`action:${t}:${id}`), { ok: true, token: "abcdefghijklmnopqrstuv" }),
    approve: async (t) => (calls.push(`approve:${t}`), o.approve ?? { result: "approved" }),
    undo: async (t) => (calls.push(`undo:${t}`), { result: "cancelled" }),
    photoTarget: async () => ({ ok: true, location_id: "loc1" }),
    acceptPhoto: async (l, u) => (calls.push(`photo:${l}:${u}`), { ok: true }),
    statusUpdate: async () => {},
  };
  const ctx: Ctx = { db, sender: mockSender(log), on: o.on ?? true, phoneNumberId: "PNID", appUrl: "https://kabsi.co", templates: { review: o.template ?? null, post: null } };
  return { ctx, records, calls, log };
}

Deno.test("unknown senders are ignored: no reply, nothing done", async () => {
  const f = fakeCtx();
  assert.equal(await handleInbound(f.ctx, inbound({ from: "+19995550000", text: "hello" })), "ignored");
  assert.equal(await handleInbound(f.ctx, inbound({ from: "+19995550000", buttonId: "a:abcdefghijklmnopqrstuv" })), "ignored");
  assert.equal(f.log.length, 0);
  assert.deepEqual(f.calls, []);
});

Deno.test("wrong phone number id, a stale message and a replayed message do nothing", async () => {
  const f = fakeCtx();
  assert.equal(await handleInbound(f.ctx, inbound({ phoneNumberId: "OTHER", text: "STOP" })), "wrong_number");
  assert.equal(await handleInbound(f.ctx, inbound({ timestamp: Date.now() / 1000 - 3600, text: "STOP" })), "stale");
  const m = inbound({ buttonId: "a:abcdefghijklmnopqrstuv" });
  assert.equal(await handleInbound(f.ctx, m), "approved");
  assert.equal(await handleInbound(f.ctx, m), "duplicate");
  assert.equal(f.calls.filter((c) => c.startsWith("approve")).length, 1, "the replay approved nothing");
});

Deno.test("the code verifies the number and says it is connected", async () => {
  const f = fakeCtx();
  assert.equal(await handleInbound(f.ctx, inbound({ from: "+15557778888", text: "KABSI 123456" })), "verified");
  assert.match(f.log[0].body, /Kabsi is connected/);
});

Deno.test("Approve answers with Undo; Undo cancels; a second Approve says nothing was sent twice", async () => {
  const f = fakeCtx();
  assert.equal(await handleInbound(f.ctx, inbound({ buttonId: "a:abcdefghijklmnopqrstuv" })), "approved");
  assert.equal(f.log.at(-1)!.kind, "buttons:Undo");
  assert.equal(await handleInbound(f.ctx, inbound({ buttonId: "u:abcdefghijklmnopqrstuv" })), "undone");
  const again = fakeCtx({ approve: { result: "approved", repeat: true } });
  assert.equal(await handleInbound(again.ctx, inbound({ buttonId: "a:abcdefghijklmnopqrstuv" })), "repeat");
  assert.match(again.log[0].body, /Nothing was sent twice/);
});

Deno.test("a refused approval (high risk, identity field) sends the app link and approves nothing", async () => {
  for (const reason of ["high_risk", "identity_field", "changed"]) {
    const f = fakeCtx({ approve: { result: "refused", reason } });
    assert.equal(await handleInbound(f.ctx, inbound({ buttonId: "a:abcdefghijklmnopqrstuv" })), `refused:${reason}`);
    assert.match(f.log[0].body, /https:\/\/kabsi\.co\/app/);
  }
});

Deno.test("STOP stops and confirms once; sends after it are refused", async () => {
  const f = fakeCtx();
  assert.equal(await handleInbound(f.ctx, inbound({ text: "STOP" })), "stopped");
  assert.deepEqual(f.calls, ["stop:+15551234567"]);
  assert.match(f.log[0].body, /no more WhatsApp messages/);
  const after = fakeCtx({ may: { ok: false, reason: "stopped" } });
  assert.equal(await deliver(after.ctx, { userId: "u1", locationId: null, kind: "review_alert", body: "x" }), "refused");
  assert.equal(after.log.length, 0);
});

Deno.test("a send without opt-in is refused; outside the 24-hour window a template goes, or the message is held", async () => {
  const none = fakeCtx({ may: { ok: false, reason: "no_optin" } });
  assert.equal(await deliver(none.ctx, { userId: "u1", locationId: null, kind: "k", body: "x" }), "refused");
  assert.equal(none.log.length, 0);
  const outside = { ok: true as const, phone: "+15551234567", in_window: false, review_alerts: true, digest: false };
  const held = fakeCtx({ may: outside });
  assert.equal(await deliver(held.ctx, { userId: "u1", locationId: null, kind: "k", body: "x", template: { name: null, params: [] } }), "held");
  assert.equal(held.log.length, 0, "nothing goes outside the window without an approved template");
  const tpl = fakeCtx({ may: outside });
  assert.equal(await deliver(tpl.ctx, { userId: "u1", locationId: null, kind: "k", body: "x", template: { name: "kabsi_review_alert", params: ["B", "5"] } }), "mock_sent");
  assert.equal(tpl.log[0].kind, "template:kabsi_review_alert");
});

Deno.test("nothing is sent while Kabsi has no WhatsApp number", async () => {
  const f = fakeCtx({ on: false });
  assert.equal(await deliver(f.ctx, { userId: "u1", locationId: null, kind: "k", body: "x" }), "off");
  assert.equal(await handleInbound(f.ctx, inbound({ text: "STOP" })), "off");
  assert.equal(f.log.length + f.records.length, 0);
});

Deno.test("review alerts: Approve only for a low or medium risk reply with a safe draft", async () => {
  const f = fakeCtx();
  const base = { reviewId: "r1", locationId: "loc1", business: "Harbour Lane Coffee", stars: 5, reviewer: "Maya Haddad", text: "Lovely", draft: "Thank you.", safeDraft: true };
  await sendReviewAlert(f.ctx, ["u1"], { ...base, risk: "low" });
  assert.equal(f.log[0].kind, "buttons:Approve|Edit in app");
  const high = fakeCtx();
  await sendReviewAlert(high.ctx, ["u1"], { ...base, risk: "high" });
  assert.equal(high.log[0].kind, "text", "a high-risk review gets no Approve button");
  assert.doesNotMatch(high.log[0].body, /Thank you\./, "and no draft");
  assert.deepEqual(high.calls, [], "no button token is even made");
  const unsafe = fakeCtx();
  await sendReviewAlert(unsafe.ctx, ["u1"], { ...base, risk: "medium", safeDraft: false });
  assert.equal(unsafe.log[0].kind, "text");
});

Deno.test("a photo from a Pro owner goes to the photo engine with source whatsapp", async () => {
  const f = fakeCtx();
  assert.equal(await handleInbound(f.ctx, inbound({ type: "image", mediaId: "m1" })), "photo");
  assert.deepEqual(f.calls, ["photo:loc1:u1"]);
});

Deno.test("P0.8-04: a Protection change offers Put it back on WhatsApp, never for an identity field", async () => {
  const base = { changeId: "c1", locationId: "loc1", business: "Harbour Lane Coffee", before: "Mon to Fri 07:00 to 18:00", after: "Mon to Fri 07:00 to 16:00" };
  const f = fakeCtx();
  await sendProtectionAlert(f.ctx, ["u1"], { ...base, label: "opening hours", identity: false });
  assert.equal(f.log[0].kind, "buttons:Put it back");
  assert.match(f.log[0].body, /Google shows: Mon to Fri 07:00 to 16:00/);
  assert.match(f.log[0].body, /You approved: Mon to Fri 07:00 to 18:00/);
  assert.doesNotMatch(f.log[0].body, /competitor|customer|[—–!]/i, "never says who made the edit");
  for (const label of ["business name", "address", "main category", "map pin", "phone number", "open status"]) {
    const id = fakeCtx();
    await sendProtectionAlert(id.ctx, ["u1"], { ...base, label, identity: true });
    assert.equal(id.log[0].kind, "text", `${label}: no button`);
    assert.deepEqual(id.calls, [], `${label}: no button token`);
  }
});
