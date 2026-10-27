// The process_photo job's work (P0.5-01): one uploaded file in, one checked photo (or a plain refusal) out. Storage
// and the database are passed in, so the tests run on real files without either. The `photos` function wires them.
import { intakeRefusal, sniff, TOO_MANY_PIXELS } from "./sniff.ts";
import { type Decode, decodePhoto, processPhoto } from "./process.ts";
import { ISSUE_TEXT } from "./quality.ts";

// What the vision model would say (Google's photo category and the flags of K-78: children's faces, other people's
// screens, text-heavy flyers, screenshots, stock-looking or AI-generated images, other brands' logos). No model is
// called until the AI credit is on (K-146, R-43), so production passes none and the owner picks the category.
export type Flag = "children" | "screen" | "flyer" | "screenshot" | "stock_or_ai" | "brand_logo";
export type Classify = (jpeg: Uint8Array) => Promise<{ category: string | null; flags: Flag[] }>;

export const FLAG_TEXT: Record<Flag, string> = {
  children: "There seem to be children's faces in this photo.",
  screen: "This photo shows someone else's screen.",
  flyer: "This is mostly text, like a flyer. Kabsi suggests a photo of your real place or work instead.",
  screenshot: "This looks like a screenshot.",
  stock_or_ai: "This looks like a stock or computer-made image. Google asks for real photos of your business.",
  brand_logo: "Another brand's logo is in this photo.",
};

export type EnginePhoto = { id: string; location_id: string; state: string; original_path: string | null; storage_path: string };
export type Result =
  | { outcome: "refused"; reason: string; bytes?: number }
  | { outcome: "video"; bytes: number }
  | {
    outcome: "ready"; path: string; width: number; height: number; bytes: number; brightness: number; sharpness: number;
    phash: string; issues: string[]; flags: string[]; category: string | null; note: string | null;
  };

export type EngineDeps = {
  load: (id: string) => Promise<EnginePhoto | null>;
  download: (path: string) => Promise<Uint8Array | null>;
  upload: (path: string, bytes: Uint8Array) => Promise<void>;
  // Difference hashes of the business's other photos (waiting, sending or on Google).
  others: (locationId: string, photoId: string) => Promise<string[]>;
  record: (id: string, r: Result) => Promise<string>;
  decode?: Decode;
  classify?: Classify;
};

export const UNREADABLE = "Kabsi could not read this photo. Try sending it again, or another one.";

export async function processUpload(photoId: string, deps: EngineDeps): Promise<string> {
  const photo = await deps.load(photoId);
  if (!photo) return "missing";
  if (photo.state !== "checking") return photo.state;
  const bytes = await deps.download(photo.original_path ?? photo.storage_path);
  if (!bytes) return await deps.record(photoId, { outcome: "refused", reason: "The file did not arrive. Send it again." });
  const s = sniff(bytes);
  const refusal = intakeRefusal(s, bytes.length, bytes);
  if (refusal) return await deps.record(photoId, { outcome: "refused", reason: refusal, bytes: bytes.length });
  if (s.kind === "video") return await deps.record(photoId, { outcome: "video", bytes: bytes.length });
  if (s.kind !== "photo") return await deps.record(photoId, { outcome: "refused", reason: UNREADABLE, bytes: bytes.length });

  let out;
  try {
    out = await processPhoto(bytes, s, deps.decode ?? decodePhoto, await deps.others(photo.location_id, photoId));
  } catch (e) {
    if (String(e).includes("photo_too_many_pixels")) {
      return await deps.record(photoId, { outcome: "refused", reason: TOO_MANY_PIXELS, bytes: bytes.length });
    }
    if (String(e).includes("photo_too_large")) {
      return await deps.record(photoId, { outcome: "refused", reason: "This photo is too large for Google even after resizing.", bytes: bytes.length });
    }
    // A file with a photo's first bytes that does not decode: damaged or not really a photo.
    return await deps.record(photoId, { outcome: "refused", reason: UNREADABLE, bytes: bytes.length });
  }
  const seen = deps.classify ? await deps.classify(out.jpeg) : { category: null, flags: [] as Flag[] };
  const path = `${photo.location_id}/${photoId}.jpg`;
  await deps.upload(path, out.jpeg);
  const notes = [...out.issues.map((i) => ISSUE_TEXT[i]), ...seen.flags.map((f) => FLAG_TEXT[f])];
  return await deps.record(photoId, {
    outcome: "ready", path, width: out.width, height: out.height, bytes: out.jpeg.length,
    brightness: out.metrics.brightness, sharpness: out.metrics.sharpness, phash: out.metrics.phash,
    issues: out.issues, flags: seen.flags, category: seen.category, note: notes.length ? notes.join(" ") : null,
  });
}
