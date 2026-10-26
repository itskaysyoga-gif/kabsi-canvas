// The 20-note voice test, run server-side (V4 item 0, master plan 28.3). V3 built scripts/voice-eval.mjs, but the key lives
// only in Supabase secrets and Rashid does not run node with it, so the same test runs inside the whatsapp function as a
// staff-only op (POST /whatsapp/staff/voice-eval, x-cron-secret). Each note is spoken with ElevenLabs text to speech
// (synthetic voices, never a real customer's), read back with Scribe through the same `scribe()` owners use, and scored with
// the same word error rate. It stops before the character or seconds ceiling, so one run stays well inside 1 US dollar.
//
// The pass mark (decided in V4, V3 left none on record): every language's mean word error rate at most 20 percent and no single
// note above 50 percent. Voice notes are switched on for business phones only when every language passes.
import { scribe, wer } from "./transcribe.ts";

export type Note = { id: string; lang: string; text: string };
export type Row = { id: string; lang: string; wer?: number; detected?: string | null; error?: string };
export type LangResult = { lang: string; notes: number; failed: number; mean: number; worst: number; pass: boolean };
export type EvalResult = { rows: Row[]; langs: LangResult[]; pass: boolean; chars: number; seconds: number; stopped: string | null };

export const PASS_MEAN = 0.2;
export const PASS_WORST = 0.5;
export const MAX_CHARS = 3500;
export const MAX_SECONDS = 600;
const TTS_MODEL = "eleven_flash_v2_5";
// Text to speech is told the language where there is one, so an Arabic note is not read with an English accent. Mixed notes
// are left to the model.
const TTS_LANG: Record<string, string> = { en: "en", "ar-gulf": "ar", "ar-levant": "ar", es: "es" };

export function summarise(rows: Row[]): { langs: LangResult[]; pass: boolean } {
  const by = new Map<string, Row[]>();
  for (const r of rows) by.set(r.lang, [...(by.get(r.lang) ?? []), r]);
  const langs = [...by.entries()].map(([lang, rs]) => {
    const ok = rs.filter((r) => typeof r.wer === "number");
    const mean = ok.length ? ok.reduce((s, r) => s + r.wer!, 0) / ok.length : 1;
    const worst = ok.length ? Math.max(...ok.map((r) => r.wer!)) : 1;
    // A note that failed to speak or transcribe counts against the language: an untested language never passes.
    const failed = rs.length - ok.length;
    return { lang, notes: rs.length, failed, mean, worst, pass: failed === 0 && mean <= PASS_MEAN && worst <= PASS_WORST };
  });
  return { langs, pass: langs.length > 0 && langs.every((l) => l.pass) };
}

/** The accuracy table, one line per language, for the report and the staff page. */
export function table(r: EvalResult): string {
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const lines = ["language | notes | mean WER | worst | pass"];
  for (const l of r.langs) lines.push(`${l.lang} | ${l.notes}${l.failed ? ` (${l.failed} failed)` : ""} | ${pct(l.mean)} | ${pct(l.worst)} | ${l.pass ? "yes" : "no"}`);
  return lines.join("\n");
}

export async function runVoiceEval(key: string, notes: Note[], o: { fetcher?: typeof fetch; voices?: string[] } = {}): Promise<EvalResult> {
  const f = o.fetcher ?? fetch;
  const chars = notes.reduce((n, x) => n + x.text.length, 0);
  if (chars > MAX_CHARS) return { rows: [], langs: [], pass: false, chars, seconds: 0, stopped: "over_char_limit" };
  const api = (path: string, init: RequestInit = {}) =>
    f(`https://api.elevenlabs.io${path}`, { ...init, headers: { "xi-api-key": key, ...(init.headers ?? {}) } });
  let voices = o.voices ?? [];
  if (!voices.length) {
    const res = await api("/v1/voices");
    const body = res.ok ? ((await res.json()) as { voices?: { voice_id: string }[] }) : null;
    voices = (body?.voices ?? []).slice(0, 5).map((v) => v.voice_id);
  }
  if (!voices.length) return { rows: [], langs: [], pass: false, chars, seconds: 0, stopped: "no_voices" };
  const stt = scribe(key, { fetcher: f });
  let seconds = 0;
  let stopped: string | null = null;
  const rows: Row[] = [];
  for (const [i, n] of notes.entries()) {
    const tts = await api(`/v1/text-to-speech/${voices[i % voices.length]}?output_format=mp3_44100_64`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: n.text, model_id: TTS_MODEL, ...(TTS_LANG[n.lang] ? { language_code: TTS_LANG[n.lang] } : {}) }),
    });
    if (!tts.ok) {
      await tts.body?.cancel();
      rows.push({ id: n.id, lang: n.lang, error: `tts ${tts.status}` });
      continue;
    }
    const audio = new Uint8Array(await tts.arrayBuffer());
    seconds += audio.length / 8000; // mp3 at 64 kbit/s
    if (seconds > MAX_SECONDS) {
      stopped = "over_seconds_limit";
      break;
    }
    const t = await stt.transcribe(audio, "audio/mpeg");
    rows.push(t.ok ? { id: n.id, lang: n.lang, wer: wer(n.text, t.text), detected: t.language } : { id: n.id, lang: n.lang, error: `stt ${t.reason}` });
  }
  const s = summarise(rows);
  return { rows, ...s, pass: s.pass && !stopped && rows.length === notes.length, chars, seconds: Math.round(seconds), stopped };
}
