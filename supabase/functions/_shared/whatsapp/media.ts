// Media that arrives on WhatsApp (master plan 18.3, 28.3), pure parts.
//   - Photos: a photo sent as an image arrives as JPEG; photos sent as documents arrive as HEIC, PNG, WebP or JPEG. Each
//     goes through the photo engine's own checks (photos/sniff.ts) and ends as a clean JPEG (photos/process.ts); a file
//     that is not a photo Kabsi can read is answered with "Please send it as a photo".
//   - Voice notes: refused over 10 MB or 3 minutes with a kind line; the rest are kept until V3 transcribes them.
import { intakeRefusal, sniff } from "../photos/sniff.ts";

export const VOICE_MAX_BYTES = 10 * 1024 * 1024;
export const VOICE_MAX_SECONDS = 180;
/** About 3 minutes at 64 kbit/s: above this, audio whose length cannot be read is treated as too long. */
export const UNKNOWN_LENGTH_MAX_BYTES = 1_500_000;

/** Can the photo engine take these bytes? Returns null when it can, or the reason it cannot. */
export function photoRefusal(bytes: Uint8Array): "not_photo" | "video" | string | null {
  const s = sniff(bytes);
  if (s.kind === "video") return "video";
  if (s.kind !== "photo") return "not_photo";
  return intakeRefusal(s, bytes.length, bytes);
}

/** The length of an Ogg Opus voice note (what WhatsApp records), from the last page's granule position at 48 kHz.
 *  Null when the bytes are not Ogg; the size limit still applies then. */
export function oggSeconds(b: Uint8Array): number | null {
  if (b.length < 27 || b[0] !== 0x4f || b[1] !== 0x67 || b[2] !== 0x67 || b[3] !== 0x53) return null;
  for (let i = b.length - 27; i >= 0; i--) {
    if (b[i] === 0x4f && b[i + 1] === 0x67 && b[i + 2] === 0x67 && b[i + 3] === 0x53 && b[i + 4] === 0) {
      let g = 0n;
      for (let j = 7; j >= 0; j--) g = (g << 8n) | BigInt(b[i + 6 + j]);
      if (g === 0xffffffffffffffffn) continue;
      return Number(g) / 48_000;
    }
  }
  return null;
}

export type VoiceCheck = { ok: true } | { ok: false; why: "too_big" | "too_long" };

/** Before download (the size WhatsApp reports) and after (the real bytes and length). */
export function voiceCheck(size: number | null, bytes?: Uint8Array): VoiceCheck {
  if ((size ?? 0) > VOICE_MAX_BYTES || (bytes && bytes.length > VOICE_MAX_BYTES)) return { ok: false, why: "too_big" };
  if (bytes) {
    const secs = oggSeconds(bytes);
    if (secs !== null && secs > VOICE_MAX_SECONDS) return { ok: false, why: "too_long" };
    // Not Ogg (what WhatsApp records): the length cannot be read, so a file too big for 3 minutes of ordinary audio is refused.
    if (secs === null && bytes.length > UNKNOWN_LENGTH_MAX_BYTES) return { ok: false, why: "too_long" };
  }
  return { ok: true };
}
