// Voice 2 (lane R decision R-158 item 3, changing 30.50 item 11): voice notes are on for everyone, whatever the Arabic and mixed
// scores, with these guards. Pure: no database, network or environment access, so every rule below is tested without a key.
//   - Every reply to a voice note opens with a quote line "I heard: ..." (the transcript, cut at a word to 300 characters).
//   - An empty, failed or unclear transcript is never acted on; the owner is asked to send it again or type it.
//   - A voice note can never be the owner's yes, no, number or code (router.ts, agent.ts): nothing reaches Google without the usual yes.
//   - Limits per note (3 minutes, 10 MB, media.ts) and per day: 30 notes a business, 5 a phone Kabsi does not know.
//   - The audio is held in memory only while it is transcribed; only the text is used.
import { oggSeconds } from "../whatsapp/media.ts";

/** Notes a business may send in a day (all its phones together). */
export const BUSINESS_NOTES_PER_DAY = 30;
/** Notes one phone Kabsi does not know may send in a day. */
export const UNKNOWN_NOTES_PER_DAY = 5;
/** A backstop for all unknown phones together, so strangers can never use up what owners need or run up the cost. */
export const UNKNOWN_NOTES_ALL_PER_DAY = 100;
export const DAY_SECONDS = 86_400;
/** The staff alert fires when one day passes this many seconds of transcription (60 minutes). */
export const DAY_ALERT_SECONDS = 3600;
/** A transcription failure is a staff alert only after this many in a row. */
export const FAIL_ALERT_STREAK = 3;
/** The transcript in the quote line, cut at a word. */
export const HEARD_MAX = 300;

/** What the transcript says, cleaned for one WhatsApp quote line: dashes and exclamation marks (the house style) and WhatsApp's
 *  own formatting characters out, whitespace on one line. */
export function cleanHeard(text: string): string {
  return text.replace(/[–—!*_~`]/g, " ").replace(/\s+/g, " ").trim();
}

/** The most whole words of a text that fit in max characters: a word is never cut. */
function cutAtWord(text: string, max: number): string {
  const ws = text.split(" ").filter(Boolean);
  while (ws.length && ws.join(" ").length > max) ws.pop();
  return ws.join(" ").replace(/[\s,;:·-]+$/, "");
}

/** True when the transcript holds nothing a person can read: no letter or digit in any script (a sound tag, dots, a stray mark). */
export function isUnclear(text: string): boolean {
  return !/[\p{L}\p{N}]/u.test(text);
}

/** "> I heard: ..." (WhatsApp's quote line) for a transcript, the words cut at a word to `max` characters. Empty when nothing
 *  readable is left, which the caller treats as an unclear note. */
export function heardLine(text: string, max = HEARD_MAX): string {
  const clean = cleanHeard(text);
  const t = isUnclear(clean) ? "" : cutAtWord(clean, max);
  return t ? `> I heard: ${t}` : "";
}

/** The seconds of audio to count: what the provider reports, else the Ogg length, else the bytes at 64 kbit/s (as the eval counts). */
export function secondsOf(audio: Uint8Array, reported: number | null | undefined): number {
  const s = reported && reported > 0 ? reported : oggSeconds(audio) ?? audio.length / 8000;
  return Math.max(1, Math.ceil(s));
}

export type Who = { known: boolean; /** The business the phone belongs to, when it has one. */ locationId: string | null; /** A short hash of the phone, never the number. */ phoneKey: string };
export type Limit = { key: string; max: number };

/** The day counters a note is counted against, in the order they are checked. A known phone counts against its business (or, with
 *  no business, such as the staff phone, against itself); a phone Kabsi does not know counts against itself and against all of them. */
export function limitsFor(w: Who): Limit[] {
  if (w.known) return [{ key: `wa_voice_biz:${w.locationId ?? w.phoneKey}`, max: BUSINESS_NOTES_PER_DAY }];
  return [
    { key: `wa_voice_unk:${w.phoneKey}`, max: UNKNOWN_NOTES_PER_DAY },
    { key: "wa_voice_unk_all", max: UNKNOWN_NOTES_ALL_PER_DAY },
  ];
}

/** Every counter has room? `hit` counts the note and says whether it is within the limit (the database's hit_rate_limit). */
export async function withinLimits(w: Who, hit: (key: string, max: number, windowSeconds: number) => Promise<boolean>): Promise<boolean> {
  for (const l of limitsFor(w)) if (!(await hit(l.key, l.max, DAY_SECONDS))) return false;
  return true;
}
