// P0.5-01: the photo engine's file checks, processing and quality checks, on real files in tests/fixtures/photos.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { intakeRefusal, MAX_BYTES, sniff } from "./sniff.ts";
import { decodePhoto, jpegOrientation, orient, processPhoto } from "./process.ts";
import { hamming, ISSUE_TEXT, issuesOf, roleIssue } from "./quality.ts";

const fixture = (name: string) => Deno.readFile(new URL(`../../../../tests/fixtures/photos/${name}`, import.meta.url));
const has = (b: Uint8Array, text: string) => new TextDecoder("latin1").decode(b).includes(text);

Deno.test("a PDF renamed to .jpg is refused by its bytes, not its name", async () => {
  const s = sniff(await fixture("renamed-pdf.jpg"));
  assertEquals(s.kind, "unknown");
  assertEquals(intakeRefusal(s, 77), "This is not a photo Kabsi can use. Send a JPG, PNG, WebP or HEIC photo.");
});

Deno.test("signatures: JPEG, PNG, WebP, HEIC, MP4 and QuickTime; GIF is refused", () => {
  const ftyp = (brand: string, ...compat: string[]) =>
    new TextEncoder().encode(`\0\0\0${String.fromCharCode(16 + 4 * compat.length)}ftyp${brand}\0\0\0\0${compat.join("")}`);
  assertEquals(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])).kind, "photo");
  assertEquals(sniff(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), { kind: "photo", format: "webp", mime: "image/webp", animated: false });
  assertEquals(sniff(ftyp("heic", "mif1", "heic")), { kind: "photo", format: "heic", mime: "image/heic", animated: false });
  assertEquals(sniff(ftyp("isom", "isom", "mp42")), { kind: "video", format: "mp4", mime: "video/mp4" });
  assertEquals(sniff(ftyp("qt  ", "qt  ")), { kind: "video", format: "mov", mime: "video/quicktime" });
  assertEquals(sniff(new TextEncoder().encode("GIF89a......")).kind, "unknown");
});

Deno.test("animated PNG and WebP are refused; the 20 MB limit holds", () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 8, ...new TextEncoder().encode("acTL"), 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
  const s = sniff(png);
  assert(s.kind === "photo" && s.animated);
  assertEquals(intakeRefusal(s, 100), "This is a moving image. Google takes still photos only.");
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8X\x0a\0\0\0\x02\0\0\0\0\0\0\0\0\0");
  const w = sniff(webp);
  assert(w.kind === "photo" && w.animated);
  assertEquals(intakeRefusal({ kind: "photo", format: "jpeg", mime: "image/jpeg", animated: false }, MAX_BYTES + 1), "This file is over 20 MB. Send a smaller one.");
});

Deno.test("a JPEG with GPS comes out upright, resized and with no EXIF at all", async () => {
  const bytes = await fixture("gps.jpg");
  assert(has(bytes, "Exif") && has(bytes, "TestPhone"));
  assertEquals(jpegOrientation(bytes), 6);
  const s = sniff(bytes);
  assert(s.kind === "photo");
  const out = await processPhoto(bytes, s, decodePhoto);
  // Orientation 6: the 1000 by 760 file is a 760 by 1000 photo.
  assertEquals([out.takenWidth, out.takenHeight], [760, 1000]);
  assertEquals(sniff(out.jpeg).kind, "photo");
  assertEquals(jpegOrientation(out.jpeg), 1);
  assert(!has(out.jpeg, "Exif") && !has(out.jpeg, "GPS") && !has(out.jpeg, "TestPhone"), "no metadata in the new file");
});

Deno.test("a dark photo gets 'This photo is dark.'; a soft one is blurry; a small one is small", async () => {
  const dark = await fixture("dark.jpg");
  const d = await processPhoto(dark, sniff(dark) as never, decodePhoto);
  assert(d.issues.includes("dark"), `brightness ${d.metrics.brightness}`);
  assertEquals(ISSUE_TEXT.dark, "This photo is dark.");
  const soft = await fixture("blurry.jpg");
  const b = await processPhoto(soft, sniff(soft) as never, decodePhoto);
  assert(b.issues.includes("blurry") && !b.issues.includes("dark"), `sharpness ${b.metrics.sharpness}`);
  const small = await fixture("small.png");
  const p = await processPhoto(small, sniff(small) as never, decodePhoto);
  assert(p.issues.includes("small"));
  const sharp = await processPhoto(await fixture("gps.jpg"), { kind: "photo", format: "jpeg", mime: "image/jpeg", animated: false }, decodePhoto);
  assertEquals(sharp.issues, []);
});

Deno.test("the same photo again is a near-duplicate; a different one is not", async () => {
  const bytes = await fixture("gps.jpg");
  const a = await processPhoto(bytes, sniff(bytes) as never, decodePhoto);
  const again = await processPhoto(bytes, sniff(bytes) as never, decodePhoto, [a.metrics.phash]);
  assert(again.issues.includes("duplicate"));
  const dark = await fixture("dark.jpg");
  const other = await processPhoto(dark, sniff(dark) as never, decodePhoto, [a.metrics.phash]);
  assert(!other.issues.includes("duplicate"));
  assertEquals(hamming("00ff", "00ff"), 0);
  assertEquals(hamming("00ff", "01ff"), 1);
});

Deno.test("orientation 8 turns the photo the other way", () => {
  const p = { width: 2, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]) };
  const o = orient(p, 8);
  assertEquals([o.width, o.height], [1, 2]);
  assertEquals([...o.data.slice(0, 3)], [0, 0, 255]);
});

Deno.test("cover and logo checks", () => {
  assertEquals(roleIssue("COVER", 1920, 1080), null);
  assertEquals(roleIssue("COVER", 1000, 1000), "A cover photo works best wide, about 16 by 9. This one is not.");
  assertEquals(roleIssue("LOGO", 720, 720), null);
  assertEquals(roleIssue("LOGO", 200, 200), "A logo needs at least 250 by 250 pixels.");
  assertEquals(issuesOf({ brightness: 120, sharpness: 300, phash: "0".repeat(16) }, 800, 800), []);
});

// The job's work end to end, with Storage and the database replaced by maps.
import { processUpload, type EngineDeps, type Result } from "./engine.ts";
import { acceptUpload } from "./intake.ts";
import { calls as mediaCalls } from "../google/media/mock.ts";
import * as media from "../google/media/mock.ts";

function memory(files: Record<string, Uint8Array>, state = "checking") {
  const recorded: Result[] = [];
  const stored: Record<string, Uint8Array> = {};
  const deps: EngineDeps = {
    load: (id) => Promise.resolve({ id, location_id: "loc1", state, original_path: "loc1/upload.jpg", storage_path: "loc1/upload.jpg" }),
    download: (p) => Promise.resolve(files[p] ?? null),
    upload: (p, b) => { stored[p] = b; return Promise.resolve(); },
    others: () => Promise.resolve([]),
    record: (_id, r) => { recorded.push(r); return Promise.resolve(r.outcome === "ready" ? "draft" : r.outcome); },
  };
  return { deps, recorded, stored };
}

Deno.test("the job refuses a renamed PDF and keeps nothing of it", async () => {
  const m = memory({ "loc1/upload.jpg": await fixture("renamed-pdf.jpg") });
  assertEquals(await processUpload("p1", m.deps), "refused");
  assertEquals(m.recorded[0], { outcome: "refused", reason: "This is not a photo Kabsi can use. Send a JPG, PNG, WebP or HEIC photo.", bytes: 77 });
  assertEquals(Object.keys(m.stored), []);
});

Deno.test("the job stores a clean JPEG under the photo's id and records the checks", async () => {
  const m = memory({ "loc1/upload.jpg": await fixture("dark.jpg") });
  assertEquals(await processUpload("p2", m.deps), "draft");
  const r = m.recorded[0];
  assert(r.outcome === "ready");
  assertEquals(r.path, "loc1/p2.jpg");
  assert(r.issues.includes("dark"));
  assert(r.note?.startsWith("This photo is dark."));
  assertEquals(r.category, null); // no vision model until the AI credit is on
  assert(!has(m.stored["loc1/p2.jpg"], "Exif"));
});

Deno.test("a video is kept out of the photo rules; a photo already handled is left alone", async () => {
  const mp4 = new TextEncoder().encode("\0\0\0\x18ftypisom\0\0\0\0isommp42" + "x".repeat(100));
  const m = memory({ "loc1/upload.jpg": mp4 });
  assertEquals(await processUpload("p3", m.deps), "video");
  assertEquals(m.recorded[0].outcome, "video");
  const done = memory({}, "posted");
  assertEquals(await processUpload("p4", done.deps), "posted");
  assertEquals(done.recorded, []);
});

Deno.test("intake (staff link and WhatsApp photo drop): refuses a non-photo before storing it", async () => {
  const put: string[] = [];
  const deps = {
    put: (p: string) => { put.push(p); return Promise.resolve(); },
    register: () => Promise.resolve("photo-1"),
    id: () => "fixed",
  };
  assertEquals(await acceptUpload({ locationId: "loc1", bytes: await fixture("renamed-pdf.jpg"), source: "staff_link" }, deps),
    { ok: false, reason: "This is not a photo Kabsi can use. Send a JPG, PNG, WebP or HEIC photo." });
  assertEquals(put, []);
  assertEquals(await acceptUpload({ locationId: "loc1", bytes: await fixture("gps.jpg"), source: "whatsapp" }, deps), { ok: true, photoId: "photo-1" });
  assertEquals(put, ["loc1/fixed.jpg"]);
});

Deno.test("the mock media API counts one start, one upload and one create per photo", async () => {
  const before = { ...mediaCalls };
  const ref = await media.startUpload("accounts/a", "locations/l");
  await media.uploadBytes(ref, new Uint8Array([1]), "image/jpeg");
  await media.createMedia("accounts/a", "locations/l", { mediaFormat: "PHOTO", dataRef: ref });
  assertEquals([mediaCalls.startUpload - before.startUpload, mediaCalls.upload - before.upload, mediaCalls.create - before.create], [1, 1, 1]);
});

// Photos 2: the screenshot note. Two signals from the original file, no AI: no camera data (EXIF maker or model) and a
// phone screen's shape (1.95 to 2.4), or a PNG at a common phone screen's exact size.
import { hasCameraData, screenshotLikely } from "./screenshot.ts";
import { FLAG_TEXT } from "./engine.ts";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const SCREENSHOT_NOTE = "This looks like a screenshot. Google asks for photos of your business itself: the outside, inside, your team, your work.";

// A PNG of the given size with a little drawing on it (no metadata at all, like a phone's screenshot).
async function pngOf(width: number, height: number): Promise<Uint8Array> {
  const img = new Image(width, height);
  img.fill(0xf4f4f4ff);
  for (let y = 0; y < height; y += 40) img.drawBox(20, y, width - 40, 12, y % 80 ? 0x222222ff : 0x3366ccff);
  return await img.encode(1);
}

Deno.test("camera data: a camera JPEG has it; a PNG, a cleaned JPEG and the HEIC fixture have none", async () => {
  assert(hasCameraData(await fixture("gps.jpg")), "gps.jpg has Make TestPhone");
  assert(!hasCameraData(await fixture("document.png")));
  assert(!hasCameraData(await fixture("dark.jpg")));
  assert(!hasCameraData(await fixture("iphone.heic")));
  // A PNG eXIf chunk naming a maker counts, as in a JPEG.
  const tiff = [0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x0f, 0, 2, 0, 0, 0, 6, 0, 0, 0, 26, 0, 0, 0, 0, ...new TextEncoder().encode("Phone\0")];
  const exifPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, tiff.length, ...new TextEncoder().encode("eXIf"), ...tiff]);
  assert(hasCameraData(exifPng));
});

Deno.test("screenshot shapes: phone screens yes; camera photos, panoramas and camera data no", () => {
  const no = { format: "png", camera: false };
  for (const [w, h] of [[1170, 2532], [1080, 2400], [1440, 3200], [2400, 1080], [1103, 2400]]) {
    assert(screenshotLikely({ ...no, width: w, height: h }), `${w} by ${h}`);
  }
  assert(screenshotLikely({ ...no, width: 1080, height: 1920 }), "a PNG at an exact phone screen size");
  assert(!screenshotLikely({ format: "jpeg", camera: false, width: 1080, height: 1920 }), "a 16 by 9 JPEG is a camera shape");
  for (const [w, h] of [[4032, 3024], [3024, 4032], [6000, 4000], [3840, 2160], [2000, 2000], [8000, 2000]]) {
    assert(!screenshotLikely({ ...no, width: w, height: h }), `${w} by ${h}`);
  }
  assert(!screenshotLikely({ format: "jpeg", camera: true, width: 1080, height: 2400 }), "camera data is never a screenshot");
});

Deno.test("Rashid's photo of 4 Nov 2026 (its stored size, 1103 by 2400 PNG) gets the screenshot note, not a block", async () => {
  const row = JSON.parse(await Deno.readTextFile(new URL("../../../../tests/fixtures/photos/screenshot-2026-11-04.json", import.meta.url)));
  assertEquals([row.format, row.width, row.height], ["png", 1103, 2400]);
  const m = memory({ "loc1/upload.jpg": await pngOf(row.width, row.height) });
  assertEquals(await processUpload(row.id, m.deps), "draft", "a note, not a refusal");
  const r = m.recorded[0];
  assert(r.outcome === "ready");
  assertEquals(r.flags, ["screenshot"]);
  assertEquals(FLAG_TEXT.screenshot, SCREENSHOT_NOTE);
  assert(r.note?.includes(SCREENSHOT_NOTE));
  // The small copy for the list is stored beside the photo, 480 pixels on the long side, with no metadata.
  assertEquals(r.thumb, `loc1/${row.id}_s.jpg`);
  const small = await Image.decode(m.stored[`loc1/${row.id}_s.jpg`]);
  assertEquals(Math.max(small.width, small.height), 480);
  assert(m.stored[`loc1/${row.id}_s.jpg`].length < m.stored[`loc1/${row.id}.jpg`].length / 3, "the small copy is a fraction of the photo");
});

Deno.test("a camera photo (4 by 3, with camera data) and a 4 by 3 PNG get no screenshot note", async () => {
  for (const name of ["gps.jpg", "document.png"]) {
    const m = memory({ "loc1/upload.jpg": await fixture(name) });
    await processUpload("p5", m.deps);
    const r = m.recorded[0];
    assert(r.outcome === "ready");
    assert(!r.flags.includes("screenshot"), name);
  }
});
