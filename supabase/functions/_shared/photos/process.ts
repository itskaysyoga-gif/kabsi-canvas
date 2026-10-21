// The photo processing step (P0.5-01, K-78, K-81). Runs in the `photos` function, called by the process_photo job,
// never inside an upload request. It decodes the photo from its real format, turns it upright, scales it to fit
// Google's limits and writes a new JPEG from the pixels alone, so nothing of the original file comes along: no EXIF,
// no GPS position, no camera or phone details. Kabsi never draws on, generates or edits a photo; it only rotates and
// resizes it.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { issuesOf, measure, type Issue, type Metrics, type Pixels } from "./quality.ts";
import type { Sniffed } from "./sniff.ts";

// Google takes photos from 250 pixels to about 5 MB; Kabsi keeps the long side at most this size.
export const LONG_SIDE = 2400;
export const MAX_JPEG = 5 * 1024 * 1024;

export type Decode = (format: "jpeg" | "png" | "webp" | "heic", bytes: Uint8Array) => Promise<Pixels>;

// EXIF orientation of a JPEG (1 to 8), 1 when there is none. Read only to turn the photo upright; the EXIF block
// itself is never copied.
export function jpegOrientation(b: Uint8Array): number {
  let at = 2;
  while (at + 4 < b.length && b[at] === 0xff) {
    const marker = b[at + 1], len = (b[at + 2] << 8) | b[at + 3];
    if (marker === 0xda) break;
    if (marker === 0xe1 && String.fromCharCode(...b.subarray(at + 4, at + 8)) === "Exif") {
      const t = at + 10, le = b[t] === 0x49;
      const r16 = (o: number) => (le ? b[t + o] | (b[t + o + 1] << 8) : (b[t + o] << 8) | b[t + o + 1]);
      const r32 = (o: number) => (le ? r16(o) | (r16(o + 2) << 16) : (r16(o) << 16) | r16(o + 2)) >>> 0;
      const ifd = r32(4), n = r16(ifd);
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12;
        if (t + e + 10 > b.length) break;
        if (r16(e) === 0x0112) {
          const v = r16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    at += 2 + len;
  }
  return 1;
}

// Turn the pixels upright for an EXIF orientation (2 to 8 mirror and/or rotate).
export function orient(p: Pixels, o: number): Pixels {
  if (o <= 1 || o > 8) return p;
  const swap = o >= 5;
  const w = swap ? p.height : p.width, h = swap ? p.width : p.height;
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < p.height; y++) {
    for (let x = 0; x < p.width; x++) {
      let nx: number, ny: number;
      switch (o) {
        case 2: nx = p.width - 1 - x; ny = y; break;
        case 3: nx = p.width - 1 - x; ny = p.height - 1 - y; break;
        case 4: nx = x; ny = p.height - 1 - y; break;
        case 5: nx = y; ny = x; break;
        case 6: nx = p.height - 1 - y; ny = x; break;
        case 7: nx = p.height - 1 - y; ny = p.width - 1 - x; break;
        default: nx = y; ny = p.width - 1 - x; break;
      }
      const s = (y * p.width + x) * 4, d = (ny * w + nx) * 4;
      out[d] = p.data[s]; out[d + 1] = p.data[s + 1]; out[d + 2] = p.data[s + 2]; out[d + 3] = 255;
    }
  }
  return { width: w, height: h, data: out };
}

// The pixels as an ImageScript image scaled so the long side is at most LONG_SIDE. Transparent PNG or WebP areas
// become white, as Google would show them.
export function scaled(p: Pixels): Image {
  const img = new Image(p.width, p.height);
  img.bitmap.set(p.data);
  for (let i = 3; i < img.bitmap.length; i += 4) {
    const a = img.bitmap[i];
    if (a === 255) continue;
    const k = a / 255;
    img.bitmap[i - 3] = Math.round(img.bitmap[i - 3] * k + 255 * (1 - k));
    img.bitmap[i - 2] = Math.round(img.bitmap[i - 2] * k + 255 * (1 - k));
    img.bitmap[i - 1] = Math.round(img.bitmap[i - 1] * k + 255 * (1 - k));
    img.bitmap[i] = 255;
  }
  if (Math.max(img.width, img.height) > LONG_SIDE) {
    if (img.width >= img.height) img.resize(LONG_SIDE, Image.RESIZE_AUTO);
    else img.resize(Image.RESIZE_AUTO, LONG_SIDE);
  }
  return img;
}

// A new JPEG from the pixels only, at most MAX_JPEG.
export async function encodeJpeg(p: Pixels): Promise<Uint8Array> {
  const img = new Image(p.width, p.height);
  img.bitmap.set(p.data);
  for (const q of [85, 75, 65, 55]) {
    const jpeg = await img.encodeJPEG(q);
    if (jpeg.length <= MAX_JPEG) return jpeg;
  }
  throw new Error("photo_too_large");
}

export type Processed = {
  jpeg: Uint8Array; width: number; height: number; takenWidth: number; takenHeight: number;
  metrics: Metrics; issues: Issue[];
};

// One photo: decode, scale down, turn upright, measure, re-encode. `others` are the hashes of the business's other
// photos. The size check uses the photo as taken; the rest works on the scaled copy, which keeps the work small.
export async function processPhoto(bytes: Uint8Array, s: Extract<Sniffed, { kind: "photo" }>, decode: Decode, others: string[] = []): Promise<Processed> {
  const raw = await decode(s.format, bytes);
  const o = s.format === "jpeg" ? jpegOrientation(bytes) : 1;
  const [takenWidth, takenHeight] = o >= 5 ? [raw.height, raw.width] : [raw.width, raw.height];
  const img = scaled(raw);
  const upright = orient({ width: img.width, height: img.height, data: img.bitmap }, o);
  const metrics = measure(upright);
  const issues = issuesOf(metrics, takenWidth, takenHeight, others);
  const jpeg = await encodeJpeg(upright);
  return { jpeg, width: upright.width, height: upright.height, takenWidth, takenHeight, metrics, issues };
}

// The decoders used in production: mozjpeg (jsquash) for JPEG, ImageScript for PNG, the WebP decoder from jsquash, and
// libheif for HEIC (it applies the HEIC rotation itself). Each codec loads the first time such a photo arrives.
const WASM = "https://cdn.jsdelivr.net/npm/@jsquash";
const codecs: Record<string, Promise<void>> = {};
async function ready(name: string, url: string, init: (m: WebAssembly.Module) => Promise<unknown>) {
  codecs[name] ??= (async () => void await init(await WebAssembly.compile(await (await fetch(url)).arrayBuffer())))();
  await codecs[name];
}

export const decodePhoto: Decode = async (format, bytes) => {
  if (format === "jpeg") {
    const jpeg = await import("npm:@jsquash/jpeg@1.6.0/decode.js");
    await ready("jpeg", `${WASM}/jpeg@1.6.0/codec/dec/mozjpeg_dec.wasm`, jpeg.init);
    const d = await jpeg.default(bytes.slice().buffer);
    return { width: d.width, height: d.height, data: d.data as Uint8ClampedArray };
  }
  if (format === "png") {
    const img = await Image.decode(bytes);
    return { width: img.width, height: img.height, data: img.bitmap };
  }
  if (format === "webp") {
    const webp = await import("npm:@jsquash/webp@1.4.0/decode.js");
    await ready("webp", `${WASM}/webp@1.4.0/codec/dec/webp_dec.wasm`, webp.init);
    const d = await webp.default(bytes.slice().buffer);
    return { width: d.width, height: d.height, data: d.data as Uint8ClampedArray };
  }
  const heif = (await import("npm:libheif-js@1.19.8/wasm-bundle.js")).default;
  const images = new heif.HeifDecoder().decode(bytes);
  if (!images?.length) throw new Error("heic_unreadable");
  const im = images[0], width = im.get_width(), height = im.get_height();
  const data = new Uint8ClampedArray(width * height * 4);
  await new Promise<void>((ok, bad) => im.display({ data, width, height }, (r: unknown) => (r ? ok() : bad(new Error("heic_unreadable")))));
  return { width, height, data };
};
