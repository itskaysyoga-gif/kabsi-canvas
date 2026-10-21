// The photo screen's data (P0.5-01, K-23). Uploads go to the business's private folder and are registered with
// add_photo; Kabsi's photo engine (the `photos` function) checks each one in the background. Approvals go through the
// one pipeline (the content function). The staff upload link is made and turned off with the photo_link RPCs and used
// on the public /u/<token> page.
import { anonHeaders, supabase, supabaseUrl } from "@/lib/supabase";

export type Photo = {
  id: string;
  storage_path: string;
  kind: "photo" | "video";
  category: string | null;
  suitable: boolean | null;
  suitability_note: string | null;
  issues: string[];
  width: number | null;
  height: number | null;
  state: "checking" | "draft" | "publishing" | "posted" | "skipped" | "failed" | "refused" | "held";
  source: "app" | "staff_link" | "whatsapp";
  created_at: string;
};

// Google's categories in plain words. COVER and LOGO are the owner's preferred cover photo and logo.
export const CATEGORIES: Record<string, string> = {
  EXTERIOR: "Outside",
  INTERIOR: "Inside",
  TEAMS: "Team",
  AT_WORK: "At work",
  PRODUCT: "Product",
  FOOD_AND_DRINK: "Food and drink",
  MENU: "Menu",
  ADDITIONAL: "Other",
  COVER: "Preferred cover photo",
  LOGO: "Logo",
};

export const MAX_FILES = 20;
export const MAX_BYTES = 20 * 1024 * 1024;
export const ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
};
const TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

/** The type of a chosen file: what the browser says, or the name's ending (some browsers leave HEIC blank). */
export function fileType(file: { type: string; name: string }): string | null {
  const t = file.type || TYPE_BY_EXT[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
  return EXT_BY_TYPE[t] ? t : null;
}

/** The same checks as the server's roleIssue (supabase/functions/_shared/photos/quality.ts), as advice. */
export function roleIssue(role: "COVER" | "LOGO", width: number, height: number): string | null {
  const ratio = width / height;
  if (role === "COVER") {
    if (ratio < 1.5 || ratio > 2.1)
      return "A cover photo works best wide, about 16 by 9. This one is not.";
    if (width < 1080) return "A cover photo works best at least 1080 pixels across.";
    return null;
  }
  if (ratio < 0.9 || ratio > 1.1) return "A logo works best square. This one is not.";
  if (Math.min(width, height) < 250) return "A logo needs at least 250 by 250 pixels.";
  return null;
}

export async function loadPhotos(locationId: string) {
  const { data, error } = await supabase
    .from("photos")
    .select(
      "id, storage_path, kind, category, suitable, suitability_note, issues, width, height, state, source, created_at",
    )
    .eq("location_id", locationId)
    .neq("state", "skipped")
    .is("file_deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(80);
  if (error) throw new Error(error.message);
  const photos = (data ?? []) as Photo[];
  // Only processed photos have a JPEG every browser can show; an upload still being checked may be HEIC or a video.
  const shown = photos.filter(
    (p) => p.kind === "photo" && !["checking", "refused"].includes(p.state),
  );
  const urls: Record<string, string> = {};
  if (shown.length) {
    // 5-minute signed links, for members only (Storage policy owner_photos_select).
    const { data: signed } = await supabase.storage.from("owner-photos").createSignedUrls(
      shown.map((p) => p.storage_path),
      300,
    );
    for (const s of signed ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
  }
  return { photos, urls };
}

/** Upload chosen files one by one. Returns how many went in and the last problem in plain words. */
export async function uploadFiles(locationId: string, files: File[]) {
  let added = 0;
  let note = "";
  if (files.length > MAX_FILES) note = `Kabsi took the first ${MAX_FILES}. Add the rest next.`;
  for (const file of files.slice(0, MAX_FILES)) {
    const type = fileType(file);
    if (!type) {
      note = "Use JPG, PNG, WebP or HEIC photos.";
      continue;
    }
    if (file.size > MAX_BYTES) {
      note = "A file over 20 MB was left out.";
      continue;
    }
    const path = `${locationId}/${crypto.randomUUID()}.${EXT_BY_TYPE[type]}`;
    const up = await supabase.storage
      .from("owner-photos")
      .upload(path, file, { contentType: type });
    if (up.error) {
      note = "An upload failed. Try that one again.";
      continue;
    }
    const { error } = await supabase.rpc("add_photo", { p_location: locationId, p_path: path });
    if (error) {
      note = error.message.includes("too_many_photos")
        ? "That is enough photos for today."
        : "An upload failed. Try that one again.";
      continue;
    }
    added++;
  }
  return { added, note };
}

export type LinkStatus = {
  active: boolean;
  created_at?: string;
  uploads?: number;
  last_used_at?: string | null;
};

export async function linkStatus(locationId: string): Promise<LinkStatus> {
  const { data, error } = await supabase.rpc("photo_link_status", { p_location: locationId });
  if (error) throw new Error(error.message);
  return data as LinkStatus;
}
export async function createLink(locationId: string): Promise<string> {
  const { data, error } = await supabase.rpc("photo_link_create", { p_location: locationId });
  if (error) throw new Error("Couldn't make the link. Try again.");
  return `${window.location.origin}/u/${(data as { token: string }).token}`;
}
export async function revokeLink(locationId: string) {
  const { error } = await supabase.rpc("photo_link_revoke", { p_location: locationId });
  if (error) throw new Error("Couldn't turn the link off. Try again.");
}

// The public staff page (/u/<token>): no account, the anon JWT only.
const photosFn = `${supabaseUrl}/functions/v1/photos`;

export async function linkBusiness(
  token: string,
): Promise<{ ok: true; name: string } | { ok: false; message: string }> {
  const res = await fetch(photosFn, {
    method: "POST",
    headers: { "content-type": "application/json", ...anonHeaders },
    body: JSON.stringify({ do: "link", token }),
  });
  const body = (await res.json().catch(() => ({}))) as { name?: string; message?: string };
  return res.ok && body.name
    ? { ok: true, name: body.name }
    : { ok: false, message: body.message ?? "This link does not work." };
}

export async function staffUpload(token: string, file: File): Promise<string | null> {
  const form = new FormData();
  form.set("token", token);
  form.set("file", file);
  const res = await fetch(photosFn, { method: "POST", headers: { ...anonHeaders }, body: form });
  if (res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  return body.message ?? "That upload failed. Try again.";
}
