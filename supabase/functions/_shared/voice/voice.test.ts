// The voice fixtures (V3, 28.3): the 20 real-style notes of the transcription test run through the mock provider, so the
// harness and the provider interface are proven without a key and without any cost. The real accuracy run is
// scripts/voice-eval.mjs, which needs ELEVENLABS_API_KEY.
import { assertEquals } from "jsr:@std/assert@1";
import { MOCK_MARKER, mockTranscriber, wer } from "./transcribe.ts";

const notes = JSON.parse(Deno.readTextFileSync(new URL("../../../../tests/fixtures/voice/notes.json", import.meta.url))).notes as { id: string; lang: string; text: string }[];

Deno.test("there are 20 notes: English, Gulf and Levantine Arabic, mixed, and Spanish, four each", () => {
  assertEquals(notes.length, 20);
  const by = new Map<string, number>();
  for (const n of notes) by.set(n.lang, (by.get(n.lang) ?? 0) + 1);
  assertEquals([...by.entries()].sort(), [["ar-gulf", 4], ["ar-levant", 4], ["en", 4], ["es", 4], ["mixed", 4]]);
  assertEquals(new Set(notes.map((n) => n.id)).size, 20);
});
Deno.test("every note goes through the mock provider word for word", async () => {
  const t = mockTranscriber();
  for (const n of notes) {
    const r = await t.transcribe(new TextEncoder().encode(MOCK_MARKER + n.text), "audio/ogg");
    assertEquals(r.ok && wer(n.text, r.text), 0, n.id);
  }
});
Deno.test("each note is short enough to be a voice note: under 200 characters, so well under 3 minutes", () => {
  for (const n of notes) assertEquals(n.text.length < 200, true, n.id);
});

Deno.test("audio whose length cannot be read is refused when it is too big for 3 minutes, and a short one passes", async () => {
  const { voiceCheck } = await import("../whatsapp/media.ts");
  assertEquals(voiceCheck(2_000_000, new Uint8Array(2_000_000)), { ok: false, why: "too_long" });
  assertEquals(voiceCheck(100_000, new Uint8Array(100_000)), { ok: true });
});

// V4: the server-side run of the same test, with a fake ElevenLabs (no network, no cost).
Deno.test("the server copy of the notes is the same as the fixture file", async () => {
  const { VOICE_NOTES } = await import("./notes.ts");
  assertEquals(VOICE_NOTES, notes);
});
Deno.test("the voice test passes only when every language is under the mark, and an untested language fails", async () => {
  const { runVoiceEval, summarise, table } = await import("./eval.ts");
  const heard = new Map<string, string>();
  const fake: typeof fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/v1/voices")) return Response.json({ voices: [{ voice_id: "v1" }] });
    if (url.includes("/v1/text-to-speech/")) {
      const body = JSON.parse(String(init?.body)) as { text: string };
      return new Response(new TextEncoder().encode(body.text));
    }
    // Scribe: the "audio" is the note's text; Spanish notes come back with every other word missing.
    const file = (init?.body as FormData).get("file") as Blob;
    const text = new TextDecoder().decode(new Uint8Array(await file.arrayBuffer()));
    const n = notes.find((x) => x.text === text)!;
    const out = n.lang === "es" ? text.split(" ").filter((_, i) => i % 2 === 0).join(" ") : text;
    heard.set(n.id, out);
    return Response.json({ text: out, language_code: n.lang });
  };
  const r = await runVoiceEval("k", notes, { fetcher: fake });
  assertEquals(r.rows.length, 20);
  assertEquals(r.pass, false);
  assertEquals(r.langs.find((l) => l.lang === "es")!.pass, false);
  assertEquals(r.langs.filter((l) => l.pass).length, 4);
  assertEquals(table(r).split("\n").length, 6);
  assertEquals(summarise([{ id: "x", lang: "en", error: "tts 500" }]).pass, false);
  assertEquals(summarise([{ id: "x", lang: "en", wer: 0.1 }]).pass, true);
});
Deno.test("the voice test stops before it spends past the character limit", async () => {
  const { runVoiceEval } = await import("./eval.ts");
  let calls = 0;
  const r = await runVoiceEval("k", [{ id: "big", lang: "en", text: "a".repeat(4000) }], { fetcher: async () => (calls++, new Response("")) });
  assertEquals([r.stopped, r.pass, calls], ["over_char_limit", false, 0]);
});
