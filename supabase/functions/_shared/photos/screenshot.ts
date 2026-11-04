// Photos 2 (4 Nov 2026): is this upload very likely a phone screenshot? A note for the owner, never a block. No AI: two
// signals read from the original file before Kabsi cleans it, each shown with test files in photos.test.ts.
//
// 1. Camera data. A photo from a camera or a phone's camera app carries EXIF with the maker or the model (Make 0x010F,
//    Model 0x0110). A screenshot never does. A photo with camera data is never called a screenshot.
// 2. The shape. With no camera data, a picture shaped like a phone screen (the long side 1.95 to 2.4 times the short
//    side: phone screens are 18 by 9 to 21 by 9, about 19.5 by 9 today) is a screenshot. Camera photos are 4 by 3,
//    3 by 2, 16 by 9 or square, all under 1.8. A PNG at the exact size of a common phone screen counts too, whatever
//    its shape (an older 16 by 9 phone, 1080 by 1920).
//
// Known limit: a photo sent through a messaging app loses its camera data, so a camera photo cropped to a phone screen's
// shape and sent that way gets the note too. The owner can still approve it.

const SCREEN_SIZES = new Set([
  // iPhone (portrait, pixels).
  "640x1136", "750x1334", "1080x1920", "1242x2208", "1125x2436", "828x1792", "1242x2688", "1080x2340", "1170x2532",
  "1284x2778", "1179x2556", "1290x2796", "1206x2622", "1320x2868",
  // Common Android screens.
  "720x1280", "720x1520", "720x1600", "1080x2160", "1080x2220", "1080x2280", "1080x2400", "1080x2408", "1080x2412",
  "1080x2460", "1440x2560", "1440x2960", "1440x3040", "1440x3088", "1440x3120", "1440x3200", "1220x2712", "1260x2800",
  "1344x2992",
]);

export const SHAPE_FROM = 1.95;
export const SHAPE_TO = 2.4;

const ascii = (b: Uint8Array, at: number, n: number) => String.fromCharCode(...b.subarray(at, at + n));

// The TIFF block that starts at `t`, if any: whether its first directory names a camera maker or model.
function tiffHasCamera(b: Uint8Array, t: number): boolean | null {
  if (t + 8 > b.length) return null;
  const le = b[t] === 0x49 && b[t + 1] === 0x49 && b[t + 2] === 0x2a && b[t + 3] === 0x00;
  const be = b[t] === 0x4d && b[t + 1] === 0x4d && b[t + 2] === 0x00 && b[t + 3] === 0x2a;
  if (!le && !be) return null;
  const r16 = (o: number) => (le ? b[t + o] | (b[t + o + 1] << 8) : (b[t + o] << 8) | b[t + o + 1]);
  const r32 = (o: number) => (le ? (r16(o) | (r16(o + 2) << 16)) : ((r16(o) << 16) | r16(o + 2))) >>> 0;
  const ifd = r32(4);
  if (t + ifd + 2 > b.length) return null;
  const n = r16(ifd);
  for (let i = 0; i < n && i < 512; i++) {
    const e = ifd + 2 + i * 12;
    if (t + e + 12 > b.length) break;
    const tag = r16(e), count = r32(e + 4);
    if ((tag === 0x010f || tag === 0x0110) && count > 1) return true;
  }
  return false;
}

/** Whether the original file carries camera data (EXIF with a maker or model), in any format Kabsi takes. */
export function hasCameraData(b: Uint8Array): boolean {
  // Every place an EXIF block can start: "Exif\0\0" (JPEG APP1, HEIC's Exif item), PNG's eXIf chunk, WebP's EXIF chunk.
  for (let at = 0; at + 8 < b.length; at++) {
    const c = b[at];
    if (c !== 0x45 && c !== 0x65) continue; // "E" or "e"
    let t = -1;
    if (b[at + 1] === 0x78 && b[at + 2] === 0x69 && b[at + 3] === 0x66 && b[at + 4] === 0 && b[at + 5] === 0) t = at + 6; // Exif\0\0
    else if (ascii(b, at, 4) === "eXIf") t = at + 4;
    else if (ascii(b, at, 4) === "EXIF") t = ascii(b, at + 8, 4) === "Exif" ? at + 14 : at + 8;
    if (t < 0) continue;
    if (tiffHasCamera(b, t)) return true;
  }
  return false;
}

/** A phone screenshot, very likely: no camera data, and a phone screen's shape or (PNG) a phone screen's exact size. */
export function screenshotLikely(o: { format: string; width: number; height: number; camera: boolean }): boolean {
  if (o.camera || o.width <= 0 || o.height <= 0) return false;
  const long = Math.max(o.width, o.height), short = Math.min(o.width, o.height);
  const ratio = long / short;
  if (ratio >= SHAPE_FROM && ratio <= SHAPE_TO) return true;
  return o.format === "png" && SCREEN_SIZES.has(`${short}x${long}`);
}
