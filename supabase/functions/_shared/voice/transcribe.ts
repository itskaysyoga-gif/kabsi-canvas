// Voice notes (master plan 27.3 item 7, 28.3, 30.5, V3). An owner sends a voice note on WhatsApp in any language; Kabsi turns
// it into text and treats the text like a typed message. The provider sits behind one interface so it can be changed without
// touching the agent: ElevenLabs Scribe (the key ELEVENLABS_API_KEY lives in Supabase secrets only) or a mock for tests and
// fixtures. Without the key Kabsi says plainly that voice notes are not switched on yet; it never pretends to have heard.
//
// Privacy (28.3): audio over 10 MB or 3 minutes is refused with a kind line before anything is sent (media.ts). The audio is
// held in memory only while it is transcribed and is never written anywhere; only the text is used. The transcript is never
// logged and never sent to Sentry, PostHog or any tool; it goes to the WhatsApp agent and nowhere else.
import { VOICE_MAX_BYTES } from "../whatsapp/media.ts";

export type Transcript = { ok: true; text: string; language: string | null } | { ok: false; reason: "not_configured" | "empty" | "too_big" | "failed" };

export interface Transcriber {
  readonly name: "elevenlabs" | "mock";
  transcribe(audio: Uint8Array, mime: string | null): Promise<Transcript>;
}

const SCRIBE_URL = "https://api.elevenlabs.io/v1/speech-to-text";
export const DEFAULT_SCRIBE_MODEL = "scribe_v2";

/** ElevenLabs Scribe. One request per note: the file and the model, language detected by the model, no speaker labels and no
 *  sound tags (so the text is just what was said). `fetcher` is a dep, so tests never reach the network. */
export function scribe(apiKey: string, o: { model?: string; fetcher?: typeof fetch } = {}): Transcriber {
  const f = o.fetcher ?? fetch;
  return {
    name: "elevenlabs",
    async transcribe(audio, mime) {
      if (audio.length > VOICE_MAX_BYTES) return { ok: false, reason: "too_big" };
      const form = new FormData();
      form.set("model_id", o.model ?? DEFAULT_SCRIBE_MODEL);
      form.set("tag_audio_events", "false");
      form.set("diarize", "false");
      form.set("file", new Blob([audio as Uint8Array<ArrayBuffer>], { type: mime ?? "audio/ogg" }), "note.ogg");
      let res: Response;
      try {
        res = await f(SCRIBE_URL, { method: "POST", headers: { "xi-api-key": apiKey }, body: form });
      } catch {
        return { ok: false, reason: "failed" };
      }
      if (!res.ok) {
        await res.body?.cancel();
        return { ok: false, reason: "failed" };
      }
      const body = (await res.json().catch(() => null)) as { text?: unknown; language_code?: unknown } | null;
      const text = typeof body?.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
      if (!text) return { ok: false, reason: "empty" };
      return { ok: true, text: text.slice(0, 4000), language: typeof body?.language_code === "string" ? body.language_code.slice(0, 8) : null };
    },
  };
}

/** The mock: reads only fixture notes, whose bytes are the marker followed by the words (tests/fixtures/voice). Any real audio
 *  gets "not_configured", exactly what an owner would see before the key is set. No network, no cost. */
export const MOCK_MARKER = "MOCKVOICE:";
export function mockTranscriber(): Transcriber {
  return {
    name: "mock",
    async transcribe(audio) {
      const head = new TextDecoder().decode(audio.slice(0, MOCK_MARKER.length));
      if (head !== MOCK_MARKER) return { ok: false, reason: "not_configured" };
      const text = new TextDecoder().decode(audio.slice(MOCK_MARKER.length)).trim();
      return text ? { ok: true, text, language: null } : { ok: false, reason: "empty" };
    },
  };
}

/** The provider for this environment: Scribe when the key is set (and VOICE_PROVIDER is not "mock"), else the mock. */
export function pickTranscriber(env: { key?: string | null; provider?: string | null; model?: string | null }, fetcher?: typeof fetch): Transcriber {
  if (env.provider === "mock" || !env.key) return mockTranscriber();
  return scribe(env.key, { model: env.model ?? undefined, fetcher });
}

/** Word error rate of a transcript against the words that were spoken, for the 20-note test (scripts/voice-eval.mjs keeps its own
 *  copy). Lower case, punctuation and the usual Arabic marks removed, words split on spaces. */
export function wer(spoken: string, heard: string): number {
  const norm = (s: string) => s.toLowerCase().normalize("NFKC").replace(/[ً-ٰٟـ]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const a = norm(spoken), b = norm(heard);
  if (!a.length) return b.length ? 1 : 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / a.length;
}
