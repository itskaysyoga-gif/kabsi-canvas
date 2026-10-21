// What a file really is, from its first bytes, never from its name or the type the browser claimed (P0.5-01, K-78).
// Photos: JPEG, PNG, WebP and HEIC (iPhone). Videos: MP4 and QuickTime, kept out of the photo-only rules (K-136).
// Anything else (a PDF renamed to .jpg, a GIF, a document) is refused. Animated PNG and WebP are refused too: Google
// takes still photos only.

export type Sniffed =
  | { kind: "photo"; format: "jpeg" | "png" | "webp" | "heic"; mime: string; animated: boolean }
  | { kind: "video"; format: "mp4" | "mov"; mime: string }
  | { kind: "unknown" };

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));
const u32 = (b: Uint8Array, at: number) => ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;

const HEIC_BRANDS = new Set(["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"]);
const MOV_BRANDS = new Set(["qt  "]);
const MP4_BRANDS = new Set(["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "M4VP", "3gp4", "3gp5", "3g2a", "dash"]);

// An ISO base media file ("ftyp" box first): its major brand and compatible brands decide HEIC, MP4 or QuickTime.
// A HEIC whose major brand is an image sequence (msf1, hevc) is a moving image.
function ftyp(b: Uint8Array): Sniffed | null {
  if (b.length < 16 || ascii(b, 4, 4) !== "ftyp") return null;
  const size = Math.min(u32(b, 0), b.length);
  const brands = [ascii(b, 8, 4)];
  for (let at = 16; at + 4 <= size; at += 4) brands.push(ascii(b, at, 4));
  if (brands.some((x) => HEIC_BRANDS.has(x)) && !brands.some((x) => x === "avc1")) {
    return { kind: "photo", format: "heic", mime: "image/heic", animated: ["msf1", "hevc", "hevx"].includes(brands[0]) };
  }
  if (brands.some((x) => MOV_BRANDS.has(x))) return { kind: "video", format: "mov", mime: "video/quicktime" };
  if (brands.some((x) => MP4_BRANDS.has(x))) return { kind: "video", format: "mp4", mime: "video/mp4" };
  return null;
}

// APNG: an acTL chunk before the first IDAT.
function pngAnimated(b: Uint8Array) {
  for (let at = 8; at + 8 <= b.length;) {
    const len = u32(b, at), type = ascii(b, at + 4, 4);
    if (type === "acTL") return true;
    if (type === "IDAT" || type === "IEND") return false;
    at += 12 + len;
  }
  return false;
}

// WebP: the VP8X header's animation flag, or an ANIM chunk.
function webpAnimated(b: Uint8Array) {
  if (ascii(b, 12, 4) === "VP8X" && b.length > 20 && (b[20] & 0x02) !== 0) return true;
  for (let at = 12; at + 8 <= b.length;) {
    const type = ascii(b, at, 4), len = b[at + 4] | (b[at + 5] << 8) | (b[at + 6] << 16) | (b[at + 7] << 24);
    if (type === "ANIM" || type === "ANMF") return true;
    at += 8 + len + (len & 1);
    if (len < 0) break;
  }
  return false;
}

export function sniff(b: Uint8Array): Sniffed {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return { kind: "photo", format: "jpeg", mime: "image/jpeg", animated: false };
  }
  if (b.length >= 8 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { kind: "photo", format: "png", mime: "image/png", animated: pngAnimated(b) };
  }
  if (b.length >= 16 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    return { kind: "photo", format: "webp", mime: "image/webp", animated: webpAnimated(b) };
  }
  return ftyp(b) ?? { kind: "unknown" };
}

export const MAX_BYTES = 20 * 1024 * 1024;

// Why a file cannot go in, in plain words, or null when it can be processed.
export function intakeRefusal(s: Sniffed, bytes: number): string | null {
  if (bytes > MAX_BYTES) return "This file is over 20 MB. Send a smaller one.";
  if (s.kind === "unknown") return "This is not a photo Kabsi can use. Send a JPG, PNG, WebP or HEIC photo.";
  if (s.kind === "photo" && s.animated) return "This is a moving image. Google takes still photos only.";
  return null;
}
