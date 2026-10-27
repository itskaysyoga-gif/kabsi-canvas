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
// Sec 1 (decompression bombs): a small file can declare a huge picture, and decoding it would fill the function's memory.
// The size each format writes in its header is read before any decoder runs. 50 million pixels keeps a 48 megapixel phone
// photo; nothing larger is decoded.
export const MAX_PIXELS = 50_000_000;
export const MAX_SIDE = 20_000;
export const TOO_MANY_PIXELS = "This photo is too large to process. Send a smaller copy of it.";

const u16be = (b: Uint8Array, at: number) => (b[at] << 8) | b[at + 1];
const u16le = (b: Uint8Array, at: number) => b[at] | (b[at + 1] << 8);

/** The width and height the file's own header declares, or null when they cannot be read from it. */
export function declaredSize(b: Uint8Array, s: Sniffed): { width: number; height: number } | null {
  if (s.kind !== "photo") return null;
  if (s.format === "png") {
    // IHDR is always the first chunk: width and height at bytes 16 and 20.
    if (b.length < 24 || ascii(b, 12, 4) !== "IHDR") return null;
    return { width: u32(b, 16), height: u32(b, 20) };
  }
  if (s.format === "jpeg") {
    // Walk the markers to the first start of frame (SOF0 to SOF15, not DHT C4, JPG C8 or DAC CC).
    let at = 2;
    while (at + 9 < b.length) {
      // Stray bytes between segments are skipped, as decoders do (Sec 1 review).
      if (b[at] !== 0xff) { at++; continue; }
      const marker = b[at + 1];
      if (marker === 0xff) { at++; continue; }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { at += 2; continue; }
      if (marker === 0xd9 || marker === 0xda) return null;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: u16be(b, at + 7), height: u16be(b, at + 5) };
      }
      at += 2 + u16be(b, at + 2);
    }
    return null;
  }
  if (s.format === "webp") {
    const chunk = ascii(b, 12, 4);
    if (chunk === "VP8X" && b.length >= 30) {
      return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    }
    if (chunk === "VP8 " && b.length >= 30) return { width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    if (chunk === "VP8L" && b.length >= 25) {
      const v = (b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24)) >>> 0;
      return { width: (v & 0x3fff) + 1, height: ((v >>> 14) & 0x3fff) + 1 };
    }
    return null;
  }
  // HEIC: every image spatial extent ("ispe") box, the largest one counts. A real ispe box is 20 bytes long, so the
  // size before the name is checked too: four letters that happen to read "ispe" inside the picture data do not count.
  let best: { width: number; height: number } | null = null;
  for (let at = 4; at + 16 <= b.length; at++) {
    if (b[at] === 0x69 && b[at + 1] === 0x73 && b[at + 2] === 0x70 && b[at + 3] === 0x65 && u32(b, at - 4) === 20) {
      const width = u32(b, at + 8), height = u32(b, at + 12);
      if (!best || width * height > best.width * best.height) best = { width, height };
    }
  }
  return best;
}

/** Null when the declared picture is within the limits (or not declared at all: the decoder step checks again). */
export function pixelRefusal(b: Uint8Array, s: Sniffed): string | null {
  const d = declaredSize(b, s);
  if (!d) return null;
  return d.width > MAX_SIDE || d.height > MAX_SIDE || d.width * d.height > MAX_PIXELS ? TOO_MANY_PIXELS : null;
}

// Why a file cannot go in, in plain words, or null when it can be processed. With the bytes, the declared picture size is
// checked too (Sec 1).
export function intakeRefusal(s: Sniffed, bytes: number, b?: Uint8Array): string | null {
  if (bytes > MAX_BYTES) return "This file is over 20 MB. Send a smaller one.";
  if (s.kind === "unknown") return "This is not a photo Kabsi can use. Send a JPG, PNG, WebP or HEIC photo.";
  if (s.kind === "photo" && s.animated) return "This is a moving image. Google takes still photos only.";
  if (b) return pixelRefusal(b, s);
  return null;
}
