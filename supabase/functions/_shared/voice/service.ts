// Voice 2: one voice note to text, with the switch, the daily limits and the cost and health record around the provider. The
// whatsapp function (db.ts) builds the dependencies; tests give fakes, so no key, network or database is needed.
//
//   1. The switch (app_settings voice_notes) is off: "not_configured", and nothing is counted or sent anywhere.
//   2. A daily limit is passed (guard.ts): "limit", and the audio goes nowhere.
//   3. The provider turns the audio into text. The audio lives only in this call's memory.
//   4. The seconds transcribed and the outcome are recorded (public.voice_record): the day's minutes for the staff digest and the
//      60 minute alert, and the streak of failures for the alert after 3 in a row. Never the audio, never the words.
//   5. A transcript with nothing readable in it is an empty one.
import { isUnclear, secondsOf, type Who, withinLimits } from "./guard.ts";
import type { Transcriber, Transcript } from "./transcribe.ts";

export type Outcome = "ok" | "empty" | "failed";
export type VoiceDeps = {
  enabled(): Promise<boolean>;
  /** Counts a note against a day limit; false when it is over. Fails open (a broken counter must not silence owners). */
  hit(key: string, max: number, windowSeconds: number): Promise<boolean>;
  provider(): Transcriber;
  /** The cost and health record. Never throws into the note: a failed record is logged by the caller and the note goes on. */
  record(seconds: number, outcome: Outcome): Promise<void>;
};

export async function transcribeNote(audio: Uint8Array, mime: string | null, who: Who, d: VoiceDeps): Promise<Transcript> {
  if (!(await d.enabled())) return { ok: false, reason: "not_configured" };
  if (!(await withinLimits(who, d.hit))) return { ok: false, reason: "limit" };
  const provider = d.provider();
  let t: Transcript;
  try {
    t = await provider.transcribe(audio, mime);
  } catch {
    t = { ok: false, reason: "failed" };
  }
  // The mock (no key) and the size check are not the provider failing: nothing to record.
  if (!t.ok && (t.reason === "not_configured" || t.reason === "too_big")) return t;
  const reported = t.ok ? t.seconds : null;
  if (t.ok && isUnclear(t.text)) t = { ok: false, reason: "empty" };
  const outcome: Outcome = t.ok ? "ok" : t.reason === "empty" ? "empty" : "failed";
  // A failed request is not billed; an answered one is, silence included.
  const seconds = outcome === "failed" ? 0 : secondsOf(audio, reported);
  try {
    await d.record(seconds, outcome);
  } catch {
    // The record is for staff. The owner still gets an answer.
  }
  return t;
}
