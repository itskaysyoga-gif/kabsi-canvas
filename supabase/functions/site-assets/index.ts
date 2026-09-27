// site-assets: internal only (x-cron-secret). Imports one marketing image into the public `site`
// Storage bucket as WebP at web sizes, and runs a vision review so nothing with readable text, logos,
// faces or AI artifacts reaches the site (D255, D256).
//   POST { name: "hero-home", url: "https://…png", widths: [1600, 800], quality?: 72, brief?: "…" }
//   → { name, files: [{ path, width, height, bytes }], check: { text, logos, faces, artifacts, ok, description, composition } }
// Self-contained on purpose (no _shared import), so this one-off tool deploys as a single file.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import encodeWebp, { init as initWebp } from "npm:@jsquash/webp@1.4.0/encode.js";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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

const CHECK_MODEL = "claude-sonnet-5";
const BUCKET = "site";
const WEBP_WASM = "https://cdn.jsdelivr.net/npm/@jsquash/webp@1.4.0/codec/enc/webp_enc.wasm";
let webpReady: Promise<void> | null = null;
function ensureWebp() {
  webpReady ??= (async () => {
    const mod = await WebAssembly.compile(await (await fetch(WEBP_WASM)).arrayBuffer());
    await initWebp(mod);
  })();
  return webpReady;
}

function b64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function visionCheck(jpeg: Uint8Array, brief: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  if (!key) return { ok: false, description: "anthropic_not_configured" };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: CHECK_MODEL,
      max_tokens: 600,
      system: `You are a strict art director reviewing a photo for a small-business website. Look closely. Reply with JSON only:
{"text": bool, "logos": bool, "faces": bool, "artifacts": bool, "matches_brief": bool, "description": "<what is shown, two sentences>", "composition": "<where the main subject sits (left/centre/right), where the empty or dark space is, overall brightness>", "problems": "<anything odd, or empty>"}
text: any readable letters, words or numbers, including garbled pseudo-text on signs, labels, screens or paper. logos: any brand mark. faces: any human face (hands alone are fine). artifacts: warped objects, extra fingers, melted shapes, impossible geometry or other obvious AI errors. matches_brief: the photo fits the brief.`,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64(jpeg) } },
        { type: "text", text: `Brief: ${brief || "a plain photo of a local business, no people"}\nReview this photo.` },
      ] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) return { ok: false, description: `anthropic ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };
  const t = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1));
  return { ...j, ok: !j.text && !j.logos && !j.faces && !j.artifacts && j.matches_brief !== false };
}

Deno.serve(async (req) => {
  if (!(await isInternal(req))) return fail("forbidden", "Internal only.", 403);
  const body = await req.json().catch(() => ({})) as {
    name?: string; url?: string; widths?: number[]; quality?: number; brief?: string; skip_check?: boolean;
  };
  const name = String(body.name ?? "");
  if (!/^[a-z0-9-]{2,40}$/.test(name) || !body.url?.startsWith("https://")) return fail("bad_request", "name and https url required");
  const src = await fetch(body.url);
  if (!src.ok) return fail("fetch_failed", `source ${src.status}`, 502);
  const original = await Image.decode(new Uint8Array(await src.arrayBuffer()));
  const widths = (body.widths ?? [1600, 800]).filter((w) => w >= 200 && w <= 2400);
  const quality = Math.min(90, Math.max(50, body.quality ?? 72));
  await ensureWebp();
  const files = [];
  let checkJpeg: Uint8Array | null = null;
  for (const w of widths) {
    const img = original.clone().resize(Math.min(w, original.width), Image.RESIZE_AUTO);
    const rgba = { data: new Uint8ClampedArray(img.bitmap), width: img.width, height: img.height, colorSpace: "srgb" } as ImageData;
    const webp = new Uint8Array(await encodeWebp(rgba, { quality, method: 4 }));
    const path = `v2/${name}-${w}.webp`;
    const { error } = await admin().storage.from(BUCKET).upload(path, webp, {
      contentType: "image/webp", cacheControl: "31536000", upsert: true,
    });
    if (error) return fail("upload_failed", error.message, 500);
    files.push({ path, width: img.width, height: img.height, bytes: webp.length });
    if (!checkJpeg && w <= 1000) checkJpeg = await img.encodeJPEG(80);
  }
  const check = body.skip_check || !checkJpeg ? null : await visionCheck(checkJpeg, body.brief ?? "");
  return json({ name, files, check });
});
