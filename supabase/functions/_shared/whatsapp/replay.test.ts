// The replay harness (QA 1): the payload it signs is read by the real parser, the signature is the one the webhook
// checks, the guards refuse real phones and real businesses, and every scenario passes on the fake world that the
// 141-case suite uses (so a scenario that asks for the wrong words fails here, before it runs against production).
import assert from "node:assert/strict";
import { receive } from "./agent.ts";
import { parseWebhook, verifySignature } from "./channel.ts";
import { check, kapsoPayload, type Observed, PHONES, phoneProblem, REPLAY_PHONE, SCENARIOS, sign, tapId } from "./replay.ts";
import { oggNote, replayMedia } from "./replay-media.ts";
import { oggSeconds } from "./media.ts";
import { runScenario, type ReplayIo } from "./replay-run.ts";
import { BIZ, PHONES as WORLD_PHONES, PNID, USERS, World } from "./world.test-helpers.ts";

const NOW = Math.floor(Date.UTC(2026, 9, 26, 15, 0, 0) / 1000);

Deno.test("a payload built by the harness is read by the real parser as the same message", () => {
  const text = kapsoPayload({ phoneNumberId: PNID, from: PHONES.owner, id: "replay.a.1", nowSeconds: NOW }, { text: "stats" });
  const t = parseWebhook(text.event, text.body).messages[0];
  assert.deepEqual([t.from, t.messageId, t.type, t.text, t.phoneNumberId, t.timestamp], [PHONES.owner, "replay.a.1", "text", "stats", PNID, NOW]);
  const tap = kapsoPayload({ phoneNumberId: PNID, from: PHONES.two, id: "replay.a.2", nowSeconds: NOW }, { buttonId: "r:business" });
  assert.equal(parseWebhook(tap.event, tap.body).messages[0].buttonId, "r:business");
  const voice = kapsoPayload({ phoneNumberId: PNID, from: PHONES.owner, id: "replay.a.3", nowSeconds: NOW },
    { media: { kind: "audio", id: "replay-voice-5s", mime: "audio/ogg; codecs=opus", size: 20_000, voice: true } });
  const v = parseWebhook(voice.event, voice.body).messages[0];
  assert.deepEqual([v.media?.kind, v.media?.voice, v.media?.size, v.media?.id], ["audio", true, 20_000, "replay-voice-5s"]);
  const photo = kapsoPayload({ phoneNumberId: PNID, from: PHONES.owner, id: "replay.a.4", nowSeconds: NOW },
    { media: { kind: "image", id: "replay-photo", mime: "image/jpeg", size: 7000 } });
  assert.equal(parseWebhook(photo.event, photo.body).messages[0].mediaId, "replay-photo");
});

Deno.test("the signature is the one the webhook checks, and only that secret makes it", async () => {
  const raw = new TextEncoder().encode(JSON.stringify({ a: 1 }));
  const sig = await sign("a-secret", raw);
  assert.ok(await verifySignature("a-secret", raw, sig));
  assert.ok(!(await verifySignature("another-secret", raw, sig)));
  assert.match(sig, /^[0-9a-f]{64}$/);
});

Deno.test("only fictional phones bound to demo businesses may run", () => {
  assert.equal(phoneProblem([PHONES.owner], [{ phone: PHONES.owner, location_id: "l1", is_demo: true }]), null);
  assert.equal(phoneProblem([PHONES.unknown], []), null);
  assert.match(phoneProblem(["+447700900123"], []) ?? "", /not a fictional/);
  assert.match(phoneProblem(["+12125551234"], []) ?? "", /not a fictional/);
  assert.match(phoneProblem([PHONES.owner], [{ phone: PHONES.owner, location_id: "l2", is_demo: false }]) ?? "", /not a demo business/);
  assert.match(phoneProblem([PHONES.owner], [{ phone: PHONES.owner, location_id: "l2", is_demo: false, billing_test: false }]) ?? "", /not a demo business/);
  // The QA test account's business is allowed only because staff marked its organisation billing_test.
  assert.equal(phoneProblem([PHONES.billing], [{ phone: PHONES.billing, location_id: "l3", is_demo: false, billing_test: true }]), null);
  assert.match(phoneProblem([PHONES.owner], [{ phone: "+447700900123", location_id: null, is_demo: null }]) ?? "", /not a fictional/);
  for (const p of Object.values(PHONES)) assert.match(p, REPLAY_PHONE);
});

Deno.test("the checks fail on what they should: a wrong word, a live send, a dash, a leak", () => {
  const ok: Observed = { stored: true, result: "stats", conv: null, replies: [{ id: 1, kind: "reply", state: "mock_sent", body: "Harbour Lane Coffee (owner)\n\nHello", buttons: [] }] };
  const step = (expect: Parameters<typeof check>[0]["expect"]) => ({ note: "x", phone: PHONES.owner, text: "x", expect });
  assert.deepEqual(check(step({ result: "stats", reply: /Hello/, head: "Harbour Lane Coffee (owner)", replies: 1 }), ok), []);
  assert.match(check(step({ result: "billing" }), ok).join(), /result "stats"/);
  assert.match(check(step({ reply: /Goodbye/ }), ok).join(), /no reply matches/);
  assert.match(check(step({ never: [/Hello/] }), ok).join(), /must never appear/);
  assert.match(check(step({ none: true }), ok).join(), /wanted none/);
  const live = { ...ok, replies: [{ ...ok.replies[0], state: "sent" }] };
  assert.match(check(step({}), live).join(), /wanted mock_sent/);
  const dash = { ...ok, replies: [{ ...ok.replies[0], body: "Done!" }] };
  assert.match(check(step({}), dash).join(), /exclamation/);
  assert.match(check(step({}), { ...ok, stored: false }).join(), /not stored/);
});

Deno.test("a tap finds its button by title on the last reply, or by id with the token", () => {
  const last = [{ id: "r:business", title: "My business" }, { id: "r:partner", title: "Partner tools" }];
  assert.equal(tapId({ title: "My business" }, last, null), "r:business");
  assert.equal(tapId({ title: "Nope" }, last, null), null);
  assert.equal(tapId({ id: "a:$token" }, [], "tok123"), "a:tok123");
  assert.equal(tapId({ id: "a:$token" }, [], null), null);
  assert.equal(tapId({ id: "a:fixedfixedfixedfixed" }, [], null), "a:fixedfixedfixedfixed");
});

Deno.test("the replay media is a real photo and voice notes of the length asked", () => {
  assert.equal(replayMedia("replay-photo")[0], 0xff);
  assert.equal(oggSeconds(replayMedia("replay-voice-5s")), 5);
  assert.equal(oggSeconds(replayMedia("replay-voice-200s")), 200);
  assert.equal(oggSeconds(oggNote(1)), 1);
  assert.throws(() => replayMedia("https://example.com/x"));
});

// ─── The fake io: the agent on the fake world, with the fictional phones standing in for the world's own.

// The fake sender keeps only button titles; the real outbox keeps the ids too, so the fake maps them back the way the agent made them.
const buttonId = (w: World, title: string) =>
  title === "My business" ? "r:business" : title === "Partner tools" ? "r:partner" : `b:${w.biz.find((b) => b.name.slice(0, 20) === title)?.id ?? "none"}`;

function fakeIo(w: World, o: { problem?: string | null } = {}): ReplayIo & { resets: string[][] } {
  for (const id of ["replay-voice-5s", "replay-voice-200s", "replay-voice-big"]) w.mediaBytes.set(id, replayMedia(id));
  w.mediaBytes.set("replay-photo", replayMedia("replay-photo"));
  const deps = w.deps();
  const resets: string[][] = [];
  let seen = 0;
  const inbound = new Map<string, string>();
  return {
    phoneNumberId: PNID,
    resets,
    nowMs: () => w.now,
    problem: async () => o.problem ?? null,
    reset: async (phones) => void resets.push(phones),
    lastOutbox: async () => (seen = w.sent.length),
    action: async (phone) => w.alert(phone, BIZ.harbour),
    async deliver(p) {
      for (const m of parseWebhook(p.event, p.body).messages) inbound.set(m.messageId, await receive(deps, m));
    },
    async observe(phone, id) {
      const c = w.conversation(phone);
      return {
        stored: inbound.has(id), result: inbound.get(id) ?? null,
        replies: w.sent.slice(seen).filter((s) => s.to === phone).map((s, i) => ({ id: i + 1, kind: "reply", state: s.live ? "sent" : "mock_sent", body: s.body, buttons: s.buttons.map((t) => ({ id: buttonId(w, t), title: t })) })),
        conv: { stopped_at: c.stopped_at, handoff_at: c.handoff_at, scan_code: c.scan_code, active_role: c.active_role, open_question: c.open_question as { type?: string } | null, language: c.language },
      };
    },
  };
}

/** The fake world with the fictional phones in the places of its own, and the demo businesses' names. */
function demoWorld(): World {
  const w = new World();
  const user = (id: string) => w.users.find((u) => u.id === id)!;
  user(USERS.owner).phone = PHONES.owner;
  user(USERS.manager).phone = PHONES.manager;
  user(USERS.staff).phone = PHONES.staff;
  user(USERS.both).phone = PHONES.two;
  user(USERS.multi).phone = PHONES.multi;
  const juniper = w.biz.find((b) => b.id === BIZ.alnoor)!;
  juniper.name = "Juniper Hair Studio";
  w.biz.find((b) => b.id === BIZ.smile)!.members = {};
  w.biz.find((b) => b.id === BIZ.bright)!.members = {};
  w.biz.find((b) => b.id === BIZ.harbour)!.members[USERS.multi] = "owner";
  juniper.members[USERS.multi] = "owner";
  w.partners.delete(WORLD_PHONES.both);
  w.partners.set(PHONES.two, "00000000-0000-4000-8000-000000000201");
  return w;
}

// Scenarios that need the real database to answer (a stored photo, the Haiku router, an approval of a real review draft)
// are checked live; the rest must pass on the fake world.
const FAKE_WORLD = ["owner_stop", "two_roles", "two_businesses", "manager_staff", "unknown_phone", "voice_limits"];
for (const name of FAKE_WORLD) {
  Deno.test(`scenario ${name} passes on the fake world`, async () => {
    const w = demoWorld();
    w.onItFast = false;
    const io = fakeIo(w);
    const report = await runScenario(io, name, "t1");
    assert.deepEqual(report.steps.flatMap((s) => s.problems.map((p) => `${s.n} ${s.note}: ${p}`)), []);
    assert.equal(report.ok, true);
    assert.deepEqual(io.resets[0].sort(), [...new Set(SCENARIOS[name].steps.map((s) => s.phone).concat(SCENARIOS[name].phones))].sort());
  });
}

Deno.test("the runner refuses an unknown scenario and a phone the guard refuses, and sends nothing", async () => {
  const w = demoWorld();
  const a = await runScenario(fakeIo(w), "send_anything", "t2");
  assert.deepEqual([a.ok, a.refused], [false, "unknown scenario"]);
  const b = await runScenario(fakeIo(w, { problem: "+447700900123 is not a fictional +1 212 555 01xx number" }), "unknown_phone", "t3");
  assert.deepEqual([b.ok, b.steps.length], [false, 0]);
  assert.match(b.refused ?? "", /not a fictional/);
  assert.equal(w.sent.length, 0);
});

Deno.test("a scenario reports a problem when Kabsi says something else", async () => {
  const w = demoWorld();
  const io = fakeIo(w);
  const orig = io.observe;
  io.observe = async (...a) => ({ ...(await orig(...a)), replies: [] });
  const report = await runScenario(io, "unknown_phone", "t4");
  assert.equal(report.ok, false);
  assert.ok(report.steps[0].problems.length > 0);
});

Deno.test("every scenario asks only fictional phones, and the live model scenario is marked", () => {
  for (const s of Object.values(SCENARIOS)) for (const st of s.steps) assert.match(st.phone, REPLAY_PHONE, `${s.name}: ${st.note}`);
  assert.equal(SCENARIOS.nora_live.ai, true);
  assert.equal(SCENARIOS.nora_live.steps.length, 10);
  assert.ok(Object.values(SCENARIOS).filter((s) => s.name !== "nora_live").every((s) => !s.ai));
});

Deno.test("the smoke alert is one plain short line whatever the failing page printed", async () => {
  const { alertHour, alertSummary } = await import("./smoke-alert.ts");
  assert.equal(alertSummary("pricing page: expected 200 — got 500!"), "pricing page: expected 200 got 500");
  assert.equal(alertSummary(undefined), "a check failed");
  assert.equal(alertSummary("<script>alert(1)</script>\n\nline two"), "script alert(1) /script line two");
  assert.ok(alertSummary("x".repeat(500)).length <= 140);
  assert.equal(alertHour(new Date("2026-10-26T03:30:00Z")), "2026-10-26T03");
});
