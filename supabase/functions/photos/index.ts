// photos: the photo engine's worker and the staff upload link (P0.5-01). Nothing here reaches Google: a checked photo
// waits for the owner's approval, and the publish job sends it (the one publication pipeline).
//   POST { do: "process", photo_id }  with x-cron-secret       → the process_photo job's work (one photo per call, so
//                                                                 a large photo has this function's time to itself)
//   POST { do: "link", token }                                  → the business name for the staff upload page, or 410
//   POST multipart/form-data: token, file                       → one upload through the staff link (no account)
import { admin, captureError, CORS, fail, isInternal, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { type EngineDeps, processUpload, type Result } from "../_shared/photos/engine.ts";
import { acceptUpload } from "../_shared/photos/intake.ts";
import { MAX_BYTES } from "../_shared/photos/sniff.ts";

const BUCKET = "owner-photos";

function engineDeps(): EngineDeps {
  const db = admin();
  return {
    async load(id) {
      const { data, error } = await db.from("photos").select("id, location_id, state, original_path, storage_path").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
    async download(path) {
      const { data, error } = await db.storage.from(BUCKET).download(path);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    async upload(path, bytes) {
      const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
    },
    async others(locationId, photoId) {
      const { data, error } = await db.from("photos").select("phash").eq("location_id", locationId).neq("id", photoId)
        .in("state", ["draft", "publishing", "posted"]).not("phash", "is", null).limit(500);
      if (error) throw error;
      return (data ?? []).map((r) => String(r.phash));
    },
    async record(id, r: Result) {
      const { data, error } = await db.rpc("photo_processed", { p_photo: id, p_result: r });
      if (error) throw error;
      return String(data);
    },
    // No vision model until the AI credit is on (K-146, R-43): the owner picks the category.
    classify: undefined,
  };
}

async function linkFor(token: unknown) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const hash = await sha256Hex(token);
  const { data, error } = await admin().rpc("photo_link_location", { p_hash: hash });
  if (error) throw error;
  const r = data as { location_id: string; name: string } | null;
  return r ? { ...r, hash } : null;
}

const GONE = "This upload link was turned off. Ask the owner for a new one.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  try {
    if ((req.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
      if (!(await rateLimit(`photo_link_ip:${ip}`, 120, 3600, { failClosed: true }))) return fail("rate_limited", "That is a lot of photos. Try again in an hour.", 429);
      const form = await req.formData().catch(() => null);
      const file = form?.get("file");
      if (!form || !(file instanceof File)) return fail("bad_input", "Choose a photo first.");
      if (file.size > MAX_BYTES) return fail("too_large", "This file is over 20 MB. Send a smaller one.", 413);
      const link = await linkFor(form.get("token"));
      if (!link) return fail("gone", GONE, 410);
      if (!(await rateLimit(`photo_link:${link.hash}`, 60, 86400, { failClosed: true }))) return fail("rate_limited", "That is enough photos for today through this link.", 429);
      const db = admin();
      const r = await acceptUpload({ locationId: link.location_id, bytes: new Uint8Array(await file.arrayBuffer()), source: "staff_link", linkHash: link.hash }, {
        async put(path, bytes, mime) {
          const { error } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mime });
          if (error) throw error;
        },
        async register(a) {
          const { data, error } = await db.rpc("photo_upload", {
            p_location: a.locationId, p_path: a.path, p_source: a.source, p_user: a.userId, p_link_hash: a.linkHash,
          });
          if (error) throw new Error(error.message);
          return String(data);
        },
      });
      if (!r.ok) return fail("not_a_photo", r.reason, 415);
      return json({ ok: true });
    }

    const b = await req.json().catch(() => ({})) as Record<string, unknown>;
    if (b.do === "process") {
      if (!(await isInternal(req))) return fail("forbidden", "Internal only.", 403);
      if (typeof b.photo_id !== "string") return fail("bad_input", "Missing photo.");
      return json({ ok: true, state: await processUpload(b.photo_id, engineDeps()) });
    }
    if (b.do === "link") {
      const link = await linkFor(b.token);
      if (!link) return fail("gone", GONE, 410);
      return json({ ok: true, name: link.name });
    }
    return fail("bad_input", "Unknown action.");
  } catch (e) {
    const msg = String(e);
    if (msg.includes("link_revoked")) return fail("gone", GONE, 410);
    if (msg.includes("too_many_photos")) return fail("rate_limited", "That is enough photos for today.", 429);
    if (msg.includes("concierge_profile")) return fail("gone", GONE, 410);
    await captureError("photos", e);
    return fail("internal", "Something went wrong. Try again.", 500);
  }
});
