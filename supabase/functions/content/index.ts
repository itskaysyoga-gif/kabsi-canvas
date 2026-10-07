// content: Posts, photos, special hours and Google Protection decisions (Phase 6). Signed-in members only. Nothing
// here calls Google: posting a post or a photo, setting special hours and putting a Protection field back are the
// owner's approval of the exact text, photo, hours or value shown (D202), through approve_publication; the publish
// job sends it after the 10 second undo window (P0.1-13b, the one publication pipeline).
//   POST { do: "post_draft", location_id, owner_input, keywords?, cta_type?, cta_url? } → new draft
//   POST { do: "post_redraft", post_id, instruction }                                  → new version
//   POST { do: "post_publish", post_id, body }                                          → approves exactly `body`
//   POST { do: "post_skip", post_id }
//   POST { do: "keyword_suggest", location_id }                                       → search phrases for posts
//   POST { do: "hours_publish", location_id, start_date, end_date, closed, open_time?, close_time?, reason? }
//   POST { do: "photo_check", photo_id } · { do: "photo_publish", photo_id, category } · { do: "photo_skip", photo_id }
//   POST { do: "shield_decide", change_id, decision: "revert" | "keep" }                  → Google Protection (D218)
import { MODELS } from "../_shared/models.ts";
import { CONCIERGE_COPY } from "../_shared/concierge.ts";
import { admin, captureError, CORS, currentUser, fail, json, rateLimit } from "../_shared/kabsi.ts";
import { decideChange } from "../_shared/shield.ts";
import { auditedAdmin, auditHeaders } from "../_shared/audit.ts";
import { CTAS, POST_LOC_COLUMNS, type PostLoc, suggestKeywords, writePost } from "../_shared/posts.ts";
import { AI_BUDGET_MESSAGE, AiBudgetError } from "../_shared/ai-budget.ts";

const CHECK_MODEL = MODELS.check;
const PHOTO_CATEGORIES = ["EXTERIOR", "INTERIOR", "PRODUCT", "FOOD_AND_DRINK", "TEAMS", "ADDITIONAL"];

// Photo check (Haiku vision): is it a real, clear photo of the business that fits Google's photo rules?
async function checkPhoto(bytes: Uint8Array, mime: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  if (!key) throw new Error("anthropic_not_configured");
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: CHECK_MODEL, max_tokens: 300,
      system: `You check a photo a business owner wants to add to their Google Business Profile. Reply with JSON only:
{"suitable": true|false, "note": "<one short sentence for the owner>", "category": "EXTERIOR"|"INTERIOR"|"PRODUCT"|"FOOD_AND_DRINK"|"TEAMS"|"ADDITIONAL"}
Not suitable: blurry or very dark; a screenshot, flyer, poster or mostly text; a stock-looking or AI-generated image; a logo alone; people's faces as the main subject; anything offensive. Suitable: a real, clear photo of the place, products, food, drinks or team at work.`,
      messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: mime, data: btoa(bin) } }, { type: "text", text: "Check this photo." }] }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`anthropic ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("");
  const j = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { suitable?: boolean; note?: string; category?: string };
  return { suitable: j.suitable === true, note: String(j.note ?? "").slice(0, 200), category: PHOTO_CATEGORIES.includes(String(j.category)) ? String(j.category) : "ADDITIONAL" };
}
type Loc = PostLoc;

// The owner's approval of one post, photo or special hours period (the one approval path, K-38, P0.1-13b). The
// publish job sends it to Google after the 10 second undo window; a second click gets the same publication back.
async function approveChange(req: Request, userId: string, targetType: "local_post" | "photo" | "special_hours", targetId: string, payload: Record<string, unknown>) {
  const { data, error } = await auditedAdmin(auditHeaders(req, userId)).rpc("approve_publication", {
    p_target_type: targetType, p_target_id: targetId, p_payload: payload, p_approved_by: userId, p_channel: "dashboard",
  });
  if (error) throw new Error(error.message);
  const r = data as { publication_id: string; state: string; publish_after: string | null; created: boolean };
  return { state: r.state, publication: r.publication_id, publish_after: r.publish_after, created: r.created };
}

async function member(req: Request, locationId: string) {
  const user = await currentUser(req);
  if (!user) return { error: fail("not_signed_in", "Please log in.", 401) };
  const db = admin();
  const { data: m } = await db.from("location_members").select("user_id").eq("location_id", locationId).eq("user_id", user.id).maybeSingle();
  if (!m) return { error: fail("forbidden", "You don't have access to this business.", 403) };
  const { data: loc } = await db.from("locations").select(POST_LOC_COLUMNS).eq("id", locationId).single();
  return { user, loc: loc as unknown as Loc };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const db = admin();
  try {
    // Resolve the location from the post when the call is about an existing post.
    let locationId = typeof b.location_id === "string" ? b.location_id : "";
    let post: { id: string; location_id: string; owner_input: string; body: string | null; cta_type: string | null; cta_url: string | null; state: string; keywords: string[] } | null = null;
    if (typeof b.post_id === "string") {
      const { data } = await db.from("gbp_posts").select("id, location_id, owner_input, body, cta_type, cta_url, state, keywords").eq("id", b.post_id).maybeSingle();
      if (!data) return fail("not_found", "Post not found.", 404);
      post = data;
      locationId = data.location_id;
    }
    let photo: { id: string; location_id: string; storage_path: string; state: string; category: string | null } | null = null;
    if (typeof b.photo_id === "string") {
      const { data } = await db.from("photos").select("id, location_id, storage_path, state, category").eq("id", b.photo_id).maybeSingle();
      if (!data) return fail("not_found", "Photo not found.", 404);
      photo = data;
      locationId = data.location_id;
    }
    if (typeof b.change_id === "string") {
      const { data } = await db.from("listing_changes").select("location_id").eq("id", b.change_id).maybeSingle();
      if (!data) return fail("not_found", "Change not found.", 404);
      locationId = data.location_id;
    }
    if (!locationId) return fail("bad_input", "Missing business.");
    const ctx = await member(req, locationId);
    if ("error" in ctx) return ctx.error!;
    const { user, loc } = ctx;
    // Early access (D267): a person handles replies by hand; profile work starts once Kabsi connects to Google.
    if (loc.concierge && /^(post_|photo_|hours_|keyword_|shield_)/.test(String(b.do))) {
      return fail("early_access", CONCIERGE_COPY.profile, 409);
    }

    switch (b.do) {
      case "post_draft": {
        if (loc.status !== "active") return fail("not_active", "Posts, photos and hours work while a free trial or a Pro plan is active. Choose a plan to continue.", 409);
        const input = String(b.owner_input ?? "").trim().slice(0, 1000);
        if (input.length < 5) return fail("bad_input", "Tell us what's new first.");
        if (!(await rateLimit(`post_draft:${loc.id}`, 15, 86400, { failClosed: true }))) return fail("rate_limited", "That's enough drafts for today. Try again tomorrow.", 429);
        const keywords = (Array.isArray(b.keywords) ? b.keywords : []).map(String).map((k) => k.trim()).filter(Boolean).slice(0, 5);
        const cta = CTAS.includes(String(b.cta_type)) ? String(b.cta_type) : null;
        const ctaUrl = cta && cta !== "CALL" ? String(b.cta_url ?? "").trim() : null;
        if (cta && cta !== "CALL" && !/^https:\/\/[^\s]+\.[^\s]+/.test(ctaUrl ?? "")) return fail("bad_input", "The button needs a link that starts with https://");
        const { text: body, ok: grounded, issues } = await writePost(loc, keywords, `Owner's note:\n${input}`);
        const { data, error } = await db.from("gbp_posts").insert({ location_id: loc.id, owner_input: input, body, cta_type: cta, cta_url: ctaUrl, keywords, source: "owner" }).select("id, body").single();
        if (error) throw error;
        return json({ ok: true, post: data, grounded, issues });
      }
      case "post_redraft": {
        if (loc.status !== "active") return fail("not_active", "Posts, photos and hours work while a free trial or a Pro plan is active. Choose a plan to continue.", 409);
        if (!post || post.state !== "draft") return fail("bad_input", "This post can't be changed.");
        const instruction = String(b.instruction ?? "").trim().slice(0, 300);
        if (!instruction) return fail("bad_input", "Tell Kabsi what to change.");
        if (!(await rateLimit(`post_draft:${loc.id}`, 15, 86400, { failClosed: true }))) return fail("rate_limited", "That's enough drafts for today.", 429);
        const { text: body, ok: grounded, issues } = await writePost(loc, post.keywords ?? [], `Owner's note:\n${post.owner_input}\n\nCurrent post:\n${post.body}\n\nOwner's instruction for the new version: ${instruction}`);
        await db.from("gbp_posts").update({ body }).eq("id", post.id);
        return json({ ok: true, post: { id: post.id, body }, grounded, issues });
      }
      case "keyword_suggest": {
        if (!(await rateLimit(`keyword_suggest:${loc.id}`, 10, 86400, { failClosed: true }))) return fail("rate_limited", "Try again tomorrow.", 429);
        const r = await suggestKeywords(db, loc);
        return json({ ok: true, keywords: r.keywords, category: r.loc.category_label, area: r.loc.area });
      }
      case "post_skip": {
        if (!post) return fail("bad_input", "Missing post.");
        await db.from("gbp_posts").update({ state: "skipped" }).eq("id", post.id).eq("state", "draft");
        return json({ ok: true });
      }
      case "post_publish": {
        if (!post || post.state !== "draft") return fail("bad_input", "This post was already handled.");
        const text = String(b.body ?? "").trim();
        if (text.length < 10 || text.length > 1500) return fail("bad_text", "Posts must be between 10 and 1,500 characters.");
        if (loc.status !== "active" || !loc.google_location_id) return fail("not_active", "This business isn't active yet.", 409);
        // One approval (K-38): a double click or two tabs get the same publication back, never a second post.
        const r = await approveChange(req, user.id, "local_post", post.id, { summary: text, language: postLanguage(text) });
        return json({ ok: true, ...r });
      }
      case "hours_publish": {
        const s = String(b.start_date ?? ""), e = String(b.end_date ?? s);
        const closed = b.closed === true;
        const open = closed ? null : String(b.open_time ?? ""), close = closed ? null : String(b.close_time ?? "");
        const dateRe = /^\d{4}-\d{2}-\d{2}$/, timeRe = /^\d{2}:\d{2}$/;
        if (!dateRe.test(s) || !dateRe.test(e) || e < s) return fail("bad_input", "Check the dates.");
        if (!closed && (!timeRe.test(open!) || !timeRe.test(close!))) return fail("bad_input", "Add opening and closing times.");
        const today = new Date().toISOString().slice(0, 10);
        if (e < today) return fail("bad_input", "These dates are in the past.");
        if (loc.status !== "active" || !loc.google_location_id) return fail("not_active", "This business isn't active yet.", 409);
        const reason = String(b.reason ?? "").trim().slice(0, 120) || null;
        const { data: row, error } = await db.from("special_hours").insert({ location_id: loc.id, start_date: s, end_date: e, closed, open_time: open, close_time: close, reason }).select("id").single();
        // 23505: the unique index on (location, dates) caught a double click or a repeat of dates already saved.
        if (error?.code === "23505") return fail("already_saved", "You already saved special hours for these dates. Choose different dates, or change them on Google.", 409);
        if (error) throw error;
        try {
          const r = await approveChange(req, user.id, "special_hours", row.id, {});
          return json({ ok: true, ...r });
        } catch (err) {
          // Not approved: the saved dates must not block a new try.
          await db.from("special_hours").update({ state: "skipped" }).eq("id", row.id).eq("state", "draft");
          throw err;
        }
      }
      case "photo_check": {
        if (!photo || photo.state !== "checking") return fail("bad_input", "This photo was already checked.");
        if (!(await rateLimit(`photo_check:${loc.id}`, 30, 86400, { failClosed: true }))) return fail("rate_limited", "That's enough photos for today.", 429);
        const { data: file, error } = await db.storage.from("owner-photos").download(photo.storage_path);
        if (error || !file) throw error ?? new Error("download_failed");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
        const r = await checkPhoto(bytes, mime);
        await db.from("photos").update({ suitable: r.suitable, suitability_note: r.note, category: r.category, state: "draft" }).eq("id", photo.id);
        return json({ ok: true, ...r });
      }
      case "photo_skip": {
        if (!photo) return fail("bad_input", "Missing photo.");
        await db.from("photos").update({ state: "skipped" }).eq("id", photo.id).in("state", ["checking", "draft"]);
        return json({ ok: true });
      }
      case "photo_publish": {
        if (!photo || photo.state !== "draft") return fail("bad_input", "This photo was already handled.");
        const category = PHOTO_CATEGORIES.includes(String(b.category)) ? String(b.category) : (photo.category ?? "ADDITIONAL");
        if (loc.status !== "active" || !loc.google_location_id) return fail("not_active", "This business isn't active yet.", 409);
        // One approval (K-38): the publish job signs a fresh link to the photo when it sends it.
        const r = await approveChange(req, user.id, "photo", photo.id, { category });
        return json({ ok: true, ...r });
      }
      case "shield_decide": {
        const decision = b.decision === "revert" ? "revert" : b.decision === "keep" ? "keep" : null;
        if (!decision) return fail("bad_input", "Choose revert or keep.");
        try {
          const r = await decideChange(String(b.change_id), decision, user.id, "dashboard", auditHeaders(req, user.id));
          return json({ ok: true, ...r });
        } catch (e) {
          if (String(e).includes("already_decided")) return fail("already_decided", "This change was already handled.", 409);
          throw e;
        }
      }
      default:
        return fail("bad_input", "Unknown action.");
    }
  } catch (e) {
    // The daily AI budget is used up (K-100): a clear message, not an error report.
    if (e instanceof AiBudgetError) return fail("ai_budget", AI_BUDGET_MESSAGE[e.scope], 429);
    const msg = String(e);
    if (msg.includes("already_handled")) return fail("bad_input", "This was already handled.", 409);
    if (msg.includes("location_not_active")) return fail("not_active", "This business isn't active yet.", 409);
    if (msg.includes("concierge_profile")) return fail("early_access", CONCIERGE_COPY.profile, 409);
    if (msg.includes("bad_post_text")) return fail("bad_text", "Posts must be between 10 and 1,500 characters.");
    await captureError("content", e);
    return fail("internal", "Something went wrong. Nothing was posted.", 500);
  }
});

// Google wants the post's language: a light guess from the text (Arabic script, then common Spanish or French
// words), English otherwise.
function postLanguage(text: string) {
  if (/[\u0600-\u06FF]/.test(text)) return "ar";
  if (/[ñ¿¡]|\b(el|los|las|nuestro|nuestra|para|con)\b/i.test(text)) return "es";
  if (/[àâçéèêëîïôûùœ]|\b(le|les|des|notre|nos|pour|avec)\b/i.test(text)) return "fr";
  return "en";
}
