// The upload entry point for files that do not come from the app (P0.5-01): the staff upload link, and the WhatsApp
// photo drop (P0.8-03, Pro), whose handler calls acceptUpload with the bytes of a photo sent to the Kabsi number.
// The file is checked by its first bytes, stored in the business's private folder, registered with photo_upload,
// and the process_photo job does the rest. Nothing here reaches Google.
import { intakeRefusal, MAX_BYTES, sniff } from "./sniff.ts";

export type IntakeDeps = {
  put: (path: string, bytes: Uint8Array, mime: string) => Promise<void>;
  register: (args: { locationId: string; path: string; source: "staff_link" | "whatsapp"; userId: string | null; linkHash: string | null }) => Promise<string>;
  id?: () => string;
};
export type Upload = {
  locationId: string; bytes: Uint8Array; source: "staff_link" | "whatsapp"; userId?: string | null; linkHash?: string | null;
};
export type Accepted = { ok: true; photoId: string } | { ok: false; reason: string };

const EXT: Record<string, string> = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "video/mp4": "mp4", "video/quicktime": "mov",
};

export async function acceptUpload(u: Upload, deps: IntakeDeps): Promise<Accepted> {
  if (u.bytes.length > MAX_BYTES) return { ok: false, reason: "This file is over 20 MB. Send a smaller one." };
  const s = sniff(u.bytes);
  const refusal = intakeRefusal(s, u.bytes.length);
  if (refusal || s.kind === "unknown") return { ok: false, reason: refusal ?? "This is not a photo Kabsi can use." };
  const path = `${u.locationId}/${(deps.id ?? (() => crypto.randomUUID()))()}.${EXT[s.mime] ?? "bin"}`;
  await deps.put(path, u.bytes, s.mime);
  const photoId = await deps.register({ locationId: u.locationId, path, source: u.source, userId: u.userId ?? null, linkHash: u.linkHash ?? null });
  return { ok: true, photoId };
}
