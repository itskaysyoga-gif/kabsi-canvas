// site-assets: internal only (x-cron-secret). Imports one marketing photo into the public `site`
// Storage bucket at a web size, and runs a Haiku vision check so nothing with readable text, logos
// or people reaches the site (KABSI-BRAND "Imagery": plain places, no people, no real brands).
//   POST { name: "cafe-counter", url: "https://…png", widths: [1600, 800] }
//   → { name, files: [{ path, width, height, bytes }], check: { text, logos, people, artifacts, ok, description } }
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// Self-contained on purpose (no _shared import), so this one-off tool deploys as a single file.
const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { "content-type": "application/json" } });
const fail = (code: string, message: string, status = 400) => json({ error: code, message }, status);
async function isInternal(req: Request) {
  const given = req.headers.get("x-cron-secret");
  if (!given) return false;
  const { data } = await admin().rpc("internal_secret", { p_name: "cron_secret" });
  const secret = (data as string | null) ?? "";
  if (!secret || given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

const CHECK_MODEL = "claude-haiku-4-5-20251001";
const BUCKET = "site";

async function visionCheck(jpeg: Uint8Array) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  if (!key) return { ok: false, description: "anthropic_not_configured" };
  let bin = "";
  for (let i = 0; i < jpeg.length; i += 0x8000) bin += String.fromCharCode(...jpeg.subarray(i, i + 0x8000));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: CHECK_MODEL,
      max_tokens: 400,
      system: `You review a photo for a website. Look closely. Reply with JSON only:
{"text": true|false, "logos": true|false, "people": true|false, "artifacts": true|false, "description": "<two sentences: what is shown, and anything odd>"}
text: any readable letters, words or numbers, including garbled pseudo-text. logos: any brand mark. people: any person, face, hand or body part. artifacts: warped objects, melted shapes, impossible geometry or other obvious AI errors.`,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: btoa(bin) } },
        { type: "text", text: "Review this photo." },
      ] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, description: `anthropic ${res.status}` };
  const t = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  return { ...j, ok: !j.text && !j.logos && !j.people && !j.artifacts };
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return fail("forbidden", "Internal only.", 403);
  const body = await req.json().catch(() => ({})) as { name?: string; url?: string; widths?: number[] };
  const name = String(body.name ?? "");
  if (!/^[a-z0-9-]{2,40}$/.test(name) || !body.url?.startsWith("https://")) return fail("bad_request", "name and https url required");
  const src = await fetch(body.url);
  if (!src.ok) return fail("fetch_failed", `source ${src.status}`, 502);
  const original = await Image.decode(new Uint8Array(await src.arrayBuffer()));
  const widths = (body.widths ?? [1600, 800]).filter((w) => w >= 200 && w <= 2400);
  const files = [];
  let checkJpeg: Uint8Array | null = null;
  for (const w of widths) {
    const img = original.clone().resize(Math.min(w, original.width), Image.RESIZE_AUTO);
    const jpeg = await img.encodeJPEG(78);
    const path = `photos/${name}-${w}.jpg`;
    const { error } = await admin().storage.from(BUCKET).upload(path, jpeg, {
      contentType: "image/jpeg", cacheControl: "31536000", upsert: true,
    });
    if (error) return fail("upload_failed", error.message, 500);
    files.push({ path, width: img.width, height: img.height, bytes: jpeg.length });
    if (w <= 1000) checkJpeg = jpeg;
  }
  const check = checkJpeg ? await visionCheck(checkJpeg) : null;
  return json({ name, files, check });
});
