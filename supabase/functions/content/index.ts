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
//   POST { do: "hours_regular", location_id, week: { MONDAY: [{ open, close }], ... } }  → the weekly opening hours (P0.5-03)
//   POST { do: "holiday_answer", prompt_id, answer: "normal" | "closed" | "custom", open?, close?, from?, to? }  → the holiday question
//   POST { do: "photo_publish", photo_id, category } · { do: "photos_approve_all", location_id } · { do: "photo_skip", photo_id }
//   (P0.5-01: uploads are checked by the process_photo job and the `photos` function, never here)
//   POST { do: "shield_decide", change_id, decision: "revert" | "keep" }                  → Google Protection (D218)
import { CONCIERGE_COPY } from "../_shared/concierge.ts";
import { parseWeek, regularHoursDisplay, validateWeek, weekToRaw } from "../_shared/hours.ts";
import { admin, captureError, CORS, currentUser, fail, json, rateLimit } from "../_shared/kabsi.ts";
import { decideChange, decisionRefusal } from "../_shared/protection.ts";
import { auditedAdmin, auditHeaders } from "../_shared/audit.ts";
import { CTAS, POST_LOC_COLUMNS, type PostLoc, suggestKeywords, withFacts, writePost } from "../_shared/posts.ts";
import { AI_BUDGET_MESSAGE, AiBudgetError } from "../_shared/ai-budget.ts";

// Google's photo categories (P0.5-01). COVER and LOGO are the owner's preferred cover photo and logo: Google decides
// what it shows, so the screen calls them "preferred".
const PHOTO_CATEGORIES = ["EXTERIOR", "INTERIOR", "PRODUCT", "AT_WORK", "TEAMS", "FOOD_AND_DRINK", "MENU", "COMMON_AREA", "ROOMS", "ADDITIONAL", "COVER", "LOGO"];

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

// K-16 (P0.3-06): staff add photos (the add_photo RPC) and share the review link; everything here is for owners and
// managers.
// Approvals (post_publish, photo_publish, hours_publish, shield_decide) are decided again in the database by the policy.
async function member(req: Request, locationId: string) {
  const user = await currentUser(req);
  if (!user) return { error: fail("not_signed_in", "Please log in.", 401) };
  const db = admin();
  const { data: m } = await db.from("location_members").select("role").eq("location_id", locationId).eq("user_id", user.id).maybeSingle();
  if (!m) return { error: fail("forbidden", "You don't have access to this business.", 403) };
  if (m.role === "staff") {
    return { error: fail("forbidden", "Staff can add photos and share the review link. The owner does the rest.", 403) };
  }
  const { data: loc } = await db.from("locations").select(POST_LOC_COLUMNS).eq("id", locationId).single();
  return { user, loc: await withFacts(db, loc as unknown as Loc) };
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
    if (typeof b.prompt_id === "string") {
      const { data } = await db.from("holiday_prompts").select("location_id").eq("id", b.prompt_id).maybeSingle();
      if (!data) return fail("not_found", "Question not found.", 404);
      locationId = data.location_id;
    }
    if (typeof b.change_id === "string") {
      const { data } = await db.from("profile_changes").select("location_id").eq("id", b.change_id).maybeSingle();
      if (!data) return fail("not_found", "Change not found.", 404);
      locationId = data.location_id;
    }
    if (!locationId) return fail("bad_input", "Missing business.");
    const ctx = await member(req, locationId);
    if ("error" in ctx) return ctx.error!;
    const { user, loc } = ctx;
    // Early access (D267): a person handles replies by hand; profile work starts once Kabsi connects to Google.
    if (loc.concierge && /^(post_|photos?_|hours_|holiday_|keyword_|shield_)/.test(String(b.do))) {
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
      case "hours_regular": {
        // The owner's own weekly hours (P0.5-03, K-21): the approval of exactly this week. The database makes it the
        // approved fact Google Protection compares and sends it through the one pipeline after the undo window.
        if (loc.status !== "active" || !loc.google_location_id) return fail("not_active", "This business isn't active yet.", 409);
        const week = parseWeek(b.week);
        const problem = week ? validateWeek(week) : "Check the hours.";
        if (!week || problem) return fail("bad_input", problem ?? "Check the hours.");
        if (!(await rateLimit(`hours_regular:${loc.id}`, 20, 86400, { failClosed: true }))) return fail("rate_limited", "That is enough changes for today. Try again tomorrow.", 429);
        const raw = weekToRaw(week);
        const { data, error } = await auditedAdmin(auditHeaders(req, user.id)).rpc("apply_regular_hours", {
          p_location: loc.id, p_user: user.id, p_channel: "dashboard", p_display: regularHoursDisplay(raw), p_raw: raw,
        });
        if (error) throw new Error(error.message);
        const r = data as { state: string; publication_id?: string; publish_after?: string | null; created?: boolean };
        if (r.state === "unchanged") return json({ ok: true, state: "unchanged" });
        return json({ ok: true, state: r.state, publication: r.publication_id ?? null, publish_after: r.publish_after ?? null, created: r.created ?? true });
      }
      case "holiday_answer": {
        // The owner's answer to a holiday question (P0.5-03, K-131): the approval. "normal" sends nothing; "closed" and
        // "custom" make one special hours period and approve it through the pipeline. The database decides.
        const answer = b.answer === "normal" || b.answer === "closed" || b.answer === "custom" ? b.answer : null;
        if (!answer || typeof b.prompt_id !== "string") return fail("bad_input", "Choose normal hours, closed or custom hours.");
        const okTime = (v: unknown) => (typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : null);
        const okDate = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
        if (!(await rateLimit(`holiday_answer:${loc.id}`, 40, 86400, { failClosed: true }))) return fail("rate_limited", "That is enough changes for today. Try again tomorrow.", 429);
        const { data, error } = await auditedAdmin(auditHeaders(req, user.id)).rpc("answer_holiday_as", {
          p_prompt: b.prompt_id, p_user: user.id, p_answer: answer, p_open: okTime(b.open), p_close: okTime(b.close), p_from: okDate(b.from), p_to: okDate(b.to),
        });
        if (error) throw new Error(error.message);
        const r = data as { state: string; answer: string; publication_id?: string; publish_after?: string | null; repeat?: boolean };
        return json({ ok: true, state: r.state, answer: r.answer, publication: r.publication_id ?? null, publish_after: r.publish_after ?? null, repeat: r.repeat === true });
      }
      case "photo_skip": {
        if (!photo) return fail("bad_input", "Missing photo.");
        await db.from("photos").update({ state: "skipped" }).eq("id", photo.id).in("state", ["checking", "draft", "held", "refused"]);
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
      case "photos_approve_all": {
        // The batch card (K-23): each checked photo is its own approval and its own publication, so each goes to
        // Google once, after its own undo window. Photos Kabsi has doubts about are left for one by one.
        if (loc.status !== "active" || !loc.google_location_id) return fail("not_active", "This business isn't active yet.", 409);
        const { data: drafts, error } = await db.from("photos").select("id, category, suitable")
          .eq("location_id", loc.id).eq("state", "draft").eq("kind", "photo").eq("suitable", true).limit(20);
        if (error) throw error;
        const results = [];
        for (const d of drafts ?? []) {
          results.push({ photo_id: d.id, ...(await approveChange(req, user.id, "photo", d.id, { category: d.category ?? "ADDITIONAL" })) });
        }
        return json({ ok: true, approved: results.length, results });
      }
      case "shield_decide": {
        // "accept" is "Google is right", "reject" is "Keep my information" (K-19). The older names still work.
        const decision = b.decision === "accept" || b.decision === "keep" ? "accept"
          : b.decision === "reject" || b.decision === "revert" ? "reject" : null;
        if (!decision) return fail("bad_input", "Choose Google is right or Keep my information.");
        try {
          const r = await decideChange(String(b.change_id), decision, user.id, "dashboard", auditHeaders(req, user.id));
          return json({ ok: true, ...r });
        } catch (e) {
          const refusal = decisionRefusal(String(e));
          if (refusal) return fail(refusal.code, refusal.text, refusal.status);
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
    if (msg.includes("bad_hours")) return fail("bad_input", "Check the hours.");
    if (msg.includes("bad_times")) return fail("bad_input", "Closing time must be after opening time. To close at midnight, use 00:00.");
    if (msg.includes("bad_dates")) return fail("bad_input", "Check the dates. They can move a few days, never into the past.");
    if (msg.includes("holiday_passed")) return fail("bad_input", "This holiday has passed, so there is nothing to change.", 410);
    if (msg.includes("already_saved")) return fail("already_saved", "You already saved special hours for these dates. Choose different dates, or change them under Hours.", 409);
    if (msg.includes("bad_answer")) return fail("bad_input", "That answer does not fit this holiday.");
    if (msg.includes("already_handled")) return fail("bad_input", "This was already handled.", 409);
    if (msg.includes("not_allowed_to_approve") || msg.includes("owner_only")) {
      return fail("owner_approves", "The owner approves this one. They can let managers approve it in Settings, Team.", 403);
    }
    if (msg.includes("location_not_active")) return fail("not_active", "This business isn't active yet.", 409);
    if (msg.includes("concierge_profile")) return fail("early_access", CONCIERGE_COPY.profile, 409);
    if (msg.includes("bad_post_text")) return fail("bad_text", "Posts must be between 10 and 1,500 characters.");
    if (msg.includes("video_later")) return fail("video_later", "Sending videos to Google comes later. Kabsi keeps this video for 30 days.", 409);
    if (msg.includes("bad_category")) return fail("bad_input", "Choose a category for this photo.");
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
