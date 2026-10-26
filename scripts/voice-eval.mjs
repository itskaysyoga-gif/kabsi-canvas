// The 20-note voice test (master plan 28.3, V3): speak each note in tests/fixtures/voice/notes.json with ElevenLabs text to
// speech (synthetic voices, never a real customer's), read it back with Scribe, and report the word error rate per language.
// Cost is small (about 2,500 characters of speech with the flash model, and about 5 minutes of transcription) and the script
// stops before spending more than the limits below. Never run in CI. The key is read from the environment only:
//   ELEVENLABS_API_KEY=... node scripts/voice-eval.mjs            (needs the key; prints a table; writes nothing to the repo)
//   node scripts/voice-eval.mjs --dry                            (no network: checks the notes and prints the estimate)
import { readFileSync } from "node:fs";

const NOTES = JSON.parse(readFileSync(new URL("../tests/fixtures/voice/notes.json", import.meta.url), "utf8")).notes;
const MAX_CHARS = 3500; // speech: well inside US$1 on any ElevenLabs plan
const MAX_SECONDS = 600; // transcription: 10 minutes at most
const TTS_MODEL = "eleven_flash_v2_5";
const STT_MODEL = "scribe_v2";
const dry = process.argv.includes("--dry");

// The same word error rate as supabase/functions/_shared/voice/transcribe.ts.
function wer(spoken, heard) {
  const norm = (s) => s.toLowerCase().normalize("NFKC").replace(/[ً-ٰٟـ]/g, "").replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const a = norm(spoken), b = norm(heard);
  if (!a.length) return b.length ? 1 : 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] / a.length;
}

const chars = NOTES.reduce((n, x) => n + x.text.length, 0);
console.log(`${NOTES.length} notes, ${chars} characters of speech (limit ${MAX_CHARS}).`);
if (chars > MAX_CHARS) throw new Error("over the speech limit");
if (dry) process.exit(0);
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is not set");

const api = (path, init = {}) => fetch(`https://api.elevenlabs.io${path}`, { ...init, headers: { "xi-api-key": key, ...(init.headers ?? {}) } });
const voices = ((await (await api("/v1/voices")).json()).voices ?? []).slice(0, 5).map((v) => v.voice_id);
if (!voices.length) throw new Error("no voices on this account");

let seconds = 0;
const rows = [];
for (const [i, n] of NOTES.entries()) {
  const tts = await api(`/v1/text-to-speech/${voices[i % voices.length]}?output_format=mp3_44100_64`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: n.text, model_id: TTS_MODEL }),
  });
  if (!tts.ok) { rows.push({ ...n, error: `tts ${tts.status}` }); continue; }
  const audio = new Uint8Array(await tts.arrayBuffer());
  seconds += audio.length / 8000; // mp3 at 64 kbit/s
  if (seconds > MAX_SECONDS) throw new Error("over the transcription limit");
  const form = new FormData();
  form.set("model_id", STT_MODEL);
  form.set("tag_audio_events", "false");
  form.set("diarize", "false");
  form.set("file", new Blob([audio], { type: "audio/mpeg" }), `${n.id}.mp3`);
  const stt = await api("/v1/speech-to-text", { method: "POST", body: form });
  if (!stt.ok) { rows.push({ ...n, error: `stt ${stt.status}` }); continue; }
  const body = await stt.json();
  rows.push({ ...n, heard: body.text ?? "", wer: wer(n.text, body.text ?? ""), detected: body.language_code });
}

const by = {};
for (const r of rows) (by[r.lang] ??= []).push(r);
console.log("\nlanguage        notes  mean WER  worst");
for (const [lang, rs] of Object.entries(by)) {
  const ok = rs.filter((r) => r.wer !== undefined);
  const mean = ok.reduce((s, r) => s + r.wer, 0) / (ok.length || 1);
  console.log(`${lang.padEnd(15)} ${String(rs.length).padStart(5)}  ${(mean * 100).toFixed(1).padStart(7)}%  ${(Math.max(0, ...ok.map((r) => r.wer)) * 100).toFixed(0)}%${ok.length < rs.length ? `  (${rs.length - ok.length} failed)` : ""}`);
}
const all = rows.filter((r) => r.wer !== undefined);
console.log(`all             ${String(rows.length).padStart(5)}  ${((all.reduce((s, r) => s + r.wer, 0) / (all.length || 1)) * 100).toFixed(1).padStart(7)}%`);
console.log(`\nspeech: ${chars} characters; transcription about ${Math.round(seconds)} seconds.`);
