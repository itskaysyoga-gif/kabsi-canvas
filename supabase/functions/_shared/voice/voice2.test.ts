// Voice 2 (R-158 item 3): every guard and limit of voice notes, on fakes. No key, no network, no database, no cost.
import { assertEquals, assertMatch, assertNotMatch } from "jsr:@std/assert@1";
import { BUSINESS_NOTES_PER_DAY, DAY_SECONDS, heardLine, isUnclear, limitsFor, placeHeard, secondsOf, UNKNOWN_NOTES_ALL_PER_DAY, UNKNOWN_NOTES_PER_DAY, withinLimits } from "./guard.ts";
import { type Outcome, transcribeNote, type VoiceDeps } from "./service.ts";
import { DEFAULT_SCRIBE_MODEL, pickTranscriber, scribe, type Transcriber, type Transcript } from "./transcribe.ts";

// ─── The quote line.
Deno.test("the quote line is '> I heard: ' and the words, on one line", () => {
  assertEquals(heardLine("We are closed on Friday"), "> I heard: We are closed on Friday");
  assertEquals(heardLine("line one\n\nline two\t three"), "> I heard: line one line two three");
});
Deno.test("the quote line cuts the words at a word, to 300 characters, and never ends on a cut word", () => {
  const long = Array.from({ length: 200 }, (_, i) => `word${i}`).join(" ");
  const line = heardLine(long);
  const words = line.slice("> I heard: ".length);
  assertEquals(words.length <= 300, true, `${words.length}`);
  assertEquals(words.length > 280, true, "fills the room");
  assertMatch(words, /word\d+$/);
  assertEquals(long.startsWith(words) && long[words.length] === " ", true, "cut at a space, a whole word kept or dropped");
  // exactly 300 fits whole
  const exact = "a".repeat(100) + " " + "b".repeat(100) + " " + "c".repeat(98);
  assertEquals(exact.length, 300);
  assertEquals(heardLine(exact), `> I heard: ${exact}`);
  // a text with no spaces to cut at (Chinese, Japanese, Thai) is cut at the character, never dropped and never inside a character
  assertEquals(heardLine("x".repeat(400)), `> I heard: ${"x".repeat(300)}`);
  const cjk = "\u4eca\u5929\u6211\u4eec\u5173\u95e8".repeat(80);
  assertEquals(heardLine(cjk), `> I heard: ${Array.from(cjk).slice(0, 300).join("")}`);
  // a character outside the basic plane (two UTF-16 units) is never split
  const astral = "\u{20BB7}".repeat(400);
  assertEquals(Array.from(heardLine(astral).slice("> I heard: ".length)).length, 300);
  assertEquals(isUnclear("\u{1F600}\u{1F600}"), true, "emoji alone are nothing readable");
});
Deno.test("the quote line never takes the reply over WhatsApp's limit: shortened to fit, or sent first on its own", () => {
  const line = heardLine(Array.from({ length: 60 }, (_, i) => `word${i}`).join(" "));
  // room to spare: in front, whole
  assertEquals(placeHeard(line, "short", 1024), { body: `${line}\n\nshort` });
  // a near full button body: the transcript is shortened to what is left, still whole words, and the total is within the limit
  const body = "b".repeat(1024 - 150);
  const fit = placeHeard(line, body, 1024);
  assertEquals(fit.before, undefined);
  assertEquals(fit.body.length <= 1024, true, `${fit.body.length}`);
  assertEquals(fit.body.endsWith(`\n\n${body}`), true);
  assertMatch(fit.body.split("\n\n")[0], /^> I heard: word0 word1 .*word\d+$/);
  // no useful room: the quote goes first as its own message and the reply is untouched
  const full = "c".repeat(1024 - 20);
  assertEquals(placeHeard(line, full, 1024), { body: full, before: line });
  // a body that is already at the limit is never made longer
  const exact = "d".repeat(1024);
  assertEquals(placeHeard(line, exact, 1024), { body: exact, before: line });
  // plain text has the larger room
  assertEquals(placeHeard(line, "e".repeat(1024 - 20), 4096).before, undefined);
});
Deno.test("the quote line carries no dash, exclamation mark or WhatsApp formatting, and no Arabic is changed", () => {
  const line = heardLine("Closed Friday — reopen Saturday! *Bold* _it_ ~no~ `x` – ok");
  assertNotMatch(line, /[–—!*_~`]/);
  assertEquals(line, "> I heard: Closed Friday reopen Saturday Bold it no x ok");
  assertEquals(heardLine("مرحبا we are closed"), "> I heard: مرحبا we are closed");
});
Deno.test("nothing readable is unclear: dots, marks, an empty string; any letter or digit in any script is readable", () => {
  for (const t of ["", "   ", "...", "! ?", "♪", "(laughter)".replace(/[a-z]/g, "")]) assertEquals(isUnclear(t), true, JSON.stringify(t));
  for (const t of ["yes", "5", "ok.", "مرحبا", "señor"]) assertEquals(isUnclear(t), false, t);
  assertEquals(heardLine("..."), "");
});

// ─── The seconds.
Deno.test("seconds: what the provider says, else the Ogg length, else the bytes at 64 kbit/s; never below 1, always whole", () => {
  const ogg = (seconds: number) => {
    const page = new Uint8Array(40);
    page.set([0x4f, 0x67, 0x67, 0x53, 0, 4]);
    let g = BigInt(Math.round(seconds * 48_000));
    for (let j = 0; j < 8; j++) { page[6 + j] = Number(g & 0xffn); g >>= 8n; }
    return page;
  };
  assertEquals(secondsOf(ogg(30), 12.2), 13);
  assertEquals(secondsOf(ogg(30), null), 30);
  assertEquals(secondsOf(new Uint8Array(80_000), undefined), 10);
  assertEquals(secondsOf(new Uint8Array(10), 0), 1);
});

// ─── The limits: 30 a business a day, 5 a day for a phone Kabsi does not know.
const known = { known: true, locationId: "loc-1", phoneKey: "p1" };
const stranger = (n: string) => ({ known: false, locationId: null, phoneKey: n });
const counter = () => {
  const counts = new Map<string, number>();
  const windows = new Set<number>();
  const hit = async (key: string, max: number, windowSeconds: number) => {
    windows.add(windowSeconds);
    const n = (counts.get(key) ?? 0) + 1;
    counts.set(key, n);
    return n <= max;
  };
  return { counts, windows, hit };
};

Deno.test("the limits are 30 a business, 5 a phone Kabsi does not know, a day", () => {
  assertEquals([BUSINESS_NOTES_PER_DAY, UNKNOWN_NOTES_PER_DAY, DAY_SECONDS], [30, 5, 86_400]);
  assertEquals(limitsFor(known), [{ key: "wa_voice_biz:loc-1", max: 30 }]);
  assertEquals(limitsFor(stranger("s1")).map((l) => l.max), [5, UNKNOWN_NOTES_ALL_PER_DAY]);
  // a known phone with no business (the staff phone) counts against itself
  assertEquals(limitsFor({ known: true, locationId: null, phoneKey: "staff1" }), [{ key: "wa_voice_biz:staff1", max: 30 }]);
});
Deno.test("a business gets 30 notes a day, the 31st is over, and every phone of the business counts together", async () => {
  const c = counter();
  const phoneA = { ...known, phoneKey: "a" }, phoneB = { ...known, phoneKey: "b" };
  for (let i = 0; i < 30; i++) assertEquals(await withinLimits(i % 2 ? phoneA : phoneB, c.hit), true, `note ${i + 1}`);
  assertEquals(await withinLimits(phoneA, c.hit), false, "the 31st");
  assertEquals(await withinLimits(phoneB, c.hit), false, "from any phone of the business");
  assertEquals([...c.windows], [86_400], "a day");
  // another business is not affected
  assertEquals(await withinLimits({ known: true, locationId: "loc-2", phoneKey: "z" }, c.hit), true);
});
Deno.test("a phone Kabsi does not know gets 5 notes a day, the 6th is over, and another stranger is not affected", async () => {
  const c = counter();
  for (let i = 0; i < 5; i++) assertEquals(await withinLimits(stranger("s1"), c.hit), true, `note ${i + 1}`);
  assertEquals(await withinLimits(stranger("s1"), c.hit), false, "the 6th");
  assertEquals(await withinLimits(stranger("s2"), c.hit), true);
});
Deno.test("strangers together are capped, so they can never use what owners need", async () => {
  const c = counter();
  let ok = 0;
  for (let i = 0; i < 300; i++) if (await withinLimits(stranger(`s${i}`), c.hit)) ok++;
  assertEquals(ok, UNKNOWN_NOTES_ALL_PER_DAY);
  assertEquals(await withinLimits(known, c.hit), true, "an owner is still heard");
});

// ─── The service: switch, limits, provider, record.
const heard = (text: string, seconds: number | null = 20): Transcript => ({ ok: true, text, language: "en", seconds });
function deps(o: { on?: boolean; result?: Transcript | "throw"; hit?: VoiceDeps["hit"]; recordThrows?: boolean } = {}) {
  const log = { asked: 0, recorded: [] as [number, Outcome][], hits: 0 };
  const d: VoiceDeps = {
    enabled: async () => o.on ?? true,
    hit: async (k, m, w) => (log.hits++, o.hit ? o.hit(k, m, w) : true),
    provider: () => ({ name: "elevenlabs", transcribe: async () => (log.asked++, o.result === "throw" ? (() => { throw new Error("boom"); })() : o.result ?? heard("stats")) } as Transcriber),
    record: async (s, out) => { if (o.recordThrows) throw new Error("db down"); log.recorded.push([s, out]); },
  };
  return { d, log };
}
const audio = new Uint8Array(160_000);

Deno.test("switch off: not configured, no limit counted, no provider call, nothing recorded", async () => {
  const { d, log } = deps({ on: false });
  assertEquals(await transcribeNote(audio, "audio/ogg", known, d), { ok: false, reason: "not_configured" });
  assertEquals([log.hits, log.asked, log.recorded.length], [0, 0, 0]);
});
Deno.test("over the day limit: 'limit', and the audio never reaches the provider", async () => {
  const { d, log } = deps({ hit: async () => false });
  assertEquals(await transcribeNote(audio, "audio/ogg", known, d), { ok: false, reason: "limit" });
  assertEquals([log.asked, log.recorded.length], [0, 0]);
});
Deno.test("a heard note is returned and its seconds and outcome are recorded", async () => {
  const { d, log } = deps({ result: heard("closed tomorrow", 12.4) });
  assertEquals(await transcribeNote(audio, "audio/ogg", known, d), heard("closed tomorrow", 12.4));
  assertEquals(log.recorded, [[13, "ok"]]);
});
Deno.test("a silent note is empty and its seconds are still counted (the provider bills silence)", async () => {
  const { d, log } = deps({ result: { ok: false, reason: "empty" } });
  assertEquals(await transcribeNote(audio, "audio/ogg", known, d), { ok: false, reason: "empty" });
  assertEquals(log.recorded, [[20, "empty"]], "160000 bytes at 8000 a second");
});
Deno.test("a transcript with nothing readable becomes an empty one", async () => {
  const { d, log } = deps({ result: heard("... !", 8) });
  assertEquals(await transcribeNote(audio, "audio/ogg", known, d), { ok: false, reason: "empty" });
  assertEquals(log.recorded, [[8, "empty"]]);
});
Deno.test("a failure, and a provider that throws, are failures: no seconds, recorded as failed", async () => {
  for (const result of [{ ok: false, reason: "failed" } as Transcript, "throw" as const]) {
    const { d, log } = deps({ result });
    assertEquals(await transcribeNote(audio, "audio/ogg", known, d), { ok: false, reason: "failed" });
    assertEquals(log.recorded, [[0, "failed"]]);
  }
});
Deno.test("the mock (no key) and the size check are not provider failures: nothing recorded", async () => {
  for (const reason of ["not_configured", "too_big"] as const) {
    const { d, log } = deps({ result: { ok: false, reason } });
    assertEquals(await transcribeNote(audio, "audio/ogg", known, d), { ok: false, reason });
    assertEquals(log.recorded.length, 0, reason);
  }
});
Deno.test("a record that fails never takes the note down", async () => {
  const { d } = deps({ result: heard("stats"), recordThrows: true });
  assertEquals((await transcribeNote(audio, "audio/ogg", known, d)).ok, true);
});

// ─── Scribe: the current model, automatic language detection, the duration it reports, and no audio kept.
Deno.test("Scribe is asked for the current model (scribe_v3) with no language set, so it detects it, and the duration is read back", async () => {
  let form!: FormData;
  let headers!: Headers;
  const fetcher: typeof fetch = async (_u, init) => {
    form = init!.body as FormData;
    headers = new Headers(init!.headers);
    return Response.json({ text: "مرحبا we are closed", language_code: "ara", audio_duration_secs: 7.5, words: [] });
  };
  const t = await scribe("KEY", { fetcher }).transcribe(new Uint8Array(1000), "audio/ogg");
  assertEquals(DEFAULT_SCRIBE_MODEL, "scribe_v3");
  assertEquals(form.get("model_id"), "scribe_v3");
  assertEquals(form.has("language_code"), false, "automatic language detection");
  assertEquals([form.get("diarize"), form.get("tag_audio_events")], ["false", "false"]);
  assertEquals(headers.get("xi-api-key"), "KEY");
  assertEquals(t, { ok: true, text: "مرحبا we are closed", language: "ara", seconds: 7.5 });
});
Deno.test("Scribe: a failed request, a thrown one and an empty body are failures; no text is empty; the model can be named without a deploy", async () => {
  const run = (fetcher: typeof fetch) => scribe("KEY", { fetcher }).transcribe(new Uint8Array(10), null);
  assertEquals(await run(async () => new Response("nope", { status: 500 })), { ok: false, reason: "failed" });
  assertEquals(await run(async () => { throw new Error("offline"); }), { ok: false, reason: "failed" });
  assertEquals(await run(async () => new Response("not json")), { ok: false, reason: "failed" });
  assertEquals(await run(async () => Response.json({ text: "  ", language_code: "eng" })), { ok: false, reason: "empty" });
  let model = "";
  await pickTranscriber({ key: "K", model: "scribe_v2" }, async (_u, init) => (model = String((init!.body as FormData).get("model_id")), Response.json({ text: "x" }))).transcribe(new Uint8Array(1), null);
  assertEquals(model, "scribe_v2");
  assertEquals(pickTranscriber({ key: null }).name, "mock", "no key, no provider");
});
Deno.test("audio over 10 MB never leaves Kabsi", async () => {
  let called = false;
  const t = await scribe("KEY", { fetcher: async () => (called = true, Response.json({ text: "x" })) }).transcribe(new Uint8Array(10 * 1024 * 1024 + 1), null);
  assertEquals([t, called], [{ ok: false, reason: "too_big" }, false]);
});
