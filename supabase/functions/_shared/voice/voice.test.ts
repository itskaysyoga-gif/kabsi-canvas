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
