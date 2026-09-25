// content — Posts and special hours (Phase 6). Signed-in members only; every Google write needs the
// owner's click on the exact text or hours shown (D202) and goes through a `publications` row.
//   POST { do: "post_draft", location_id, owner_input, keywords?, cta_type?, cta_url? } → new draft
//   POST { do: "post_redraft", post_id, instruction }                                  → new version
//   POST { do: "post_publish", post_id, body }                                          → posts exactly `body`
//   POST { do: "post_skip", post_id }
//   POST { do: "hours_publish", location_id, start_date, end_date, closed, open_time?, close_time?, reason? }
//   POST { do: "shield_decide", change_id, decision: "revert" | "keep" }                  → Listing Shield (D218)
import { admin, captureError, CORS, currentUser, fail, json, rateLimit } from "../_shared/kabsi.ts";
import { addSpecialHours, createLocalPost } from "../_shared/google.ts";
import { decideChange } from "../_shared/shield.ts";

const DRAFT_MODEL = "claude-sonnet-5";
const CTAS = ["CALL", "BOOK", "ORDER", "LEARN_MORE", "GET_DIRECTIONS"];

async function claude(system: string, user: string) {
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  if (!key) throw new Error("anthropic_not_configured");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: DRAFT_MODEL, max_tokens: 700, system, messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
  if (!text) throw new Error("anthropic empty reply");
  return text;
}

type Loc = { id: string; name: string; status: string; google_account_id: string | null; google_location_id: string | null; knowledge_card: Record<string, unknown> };

function postSystem(loc: Loc, keywords: string[]) {
  const card = loc.knowledge_card ?? {};
  return `You write a Google Business Profile update ("post") for "${loc.name}". The owner reads it and approves it before it is posted.
Rules:
- Write in the same language as the owner's note. Plain, friendly, specific. 40 to 120 words, 2 short paragraphs at most. No hashtags, no emojis, no ALL CAPS, no filler.
- Lead with what's new. Use ONLY what the owner wrote and these business facts, exactly as given (don't add "every day" or anything else they didn't say): ${JSON.stringify({ hours: card.hours_note, extra: card.mention })}. Mention hours only if it helps. Never invent prices, dates, offers, awards or claims.
- Never mention Google rankings, SEO, "best in town" or reviews. Never ask for reviews.
${keywords.length ? `- If they fit as normal speech, use these phrases naturally (e.g. 'our bakery in Hamra'), never as a list or a name; skip any that don't fit: ${keywords.join(", ")}.\n` : ""}- No phone numbers or links in the text (the button handles that).
Output only the post text.`;
}

async function member(req: Request, locationId: string) {
  const user = await currentUser(req);
  if (!user) return { error: fail("not_signed_in", "Please log in.", 401) };
  const db = admin();
  const { data: m } = await db.from("location_members").select("user_id").eq("location_id", locationId).eq("user_id", user.id).maybeSingle();
  if (!m) return { error: fail("forbidden", "You don't have access to this business.", 403) };
  const { data: loc } = await db.from("locations").select("id, name, status, google_account_id, google_location_id, knowledge_card").eq("id", locationId).single();
  return { user, loc: loc as Loc };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const b = await req.json().catch(() => ({})) as Record<string, unknown>;
  const db = admin();
  try {
    // Resolve the location from the post when the call is about an existing post.
    let locationId = typeof b.location_id === "string" ? b.location_id : "";
    let post: { id: string; location_id: string; owner_input: string; body: string | null; cta_type: string | null; cta_url: string | null; state: string } | null = null;
    if (typeof b.post_id === "string") {
      const { data } = await db.from("gbp_posts").select("id, location_id, owner_input, body, cta_type, cta_url, state").eq("id", b.post_id).maybeSingle();
      if (!data) return fail("not_found", "Post not found.", 404);
      post = data;
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

    switch (b.do) {
      case "post_draft": {
        const input = String(b.owner_input ?? "").trim().slice(0, 1000);
        if (input.length < 5) return fail("bad_input", "Tell us what's new first.");
        if (!(await rateLimit(`post_draft:${loc.id}`, 15, 86400))) return fail("rate_limited", "That's enough drafts for today. Try again tomorrow.", 429);
        const keywords = (Array.isArray(b.keywords) ? b.keywords : []).map(String).map((k) => k.trim()).filter(Boolean).slice(0, 5);
        const cta = CTAS.includes(String(b.cta_type)) ? String(b.cta_type) : null;
        const ctaUrl = cta && cta !== "CALL" ? String(b.cta_url ?? "").trim() : null;
        if (cta && cta !== "CALL" && !/^https:\/\/[^\s]+\.[^\s]+/.test(ctaUrl ?? "")) return fail("bad_input", "The button needs a link that starts with https://");
        const body = (await claude(postSystem(loc, keywords), `Owner's note:\n${input}`)).slice(0, 1500);
        const { data, error } = await db.from("gbp_posts").insert({ location_id: loc.id, owner_input: input, body, cta_type: cta, cta_url: ctaUrl }).select("id, body").single();
        if (error) throw error;
        return json({ ok: true, post: data });
      }
      case "post_redraft": {
        if (!post || post.state !== "draft") return fail("bad_input", "This post can't be changed.");
        const instruction = String(b.instruction ?? "").trim().slice(0, 300);
        if (!instruction) return fail("bad_input", "Tell Kabsi what to change.");
        if (!(await rateLimit(`post_draft:${loc.id}`, 15, 86400))) return fail("rate_limited", "That's enough drafts for today.", 429);
        const body = (await claude(postSystem(loc, []), `Owner's note:\n${post.owner_input}\n\nCurrent post:\n${post.body}\n\nOwner's instruction for the new version: ${instruction}`)).slice(0, 1500);
        await db.from("gbp_posts").update({ body }).eq("id", post.id);
        return json({ ok: true, post: { id: post.id, body } });
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
        const payload = { summary: text, cta_type: post.cta_type, cta_url: post.cta_url };
        const { data: pub, error } = await db.from("publications").insert({
          location_id: loc.id, target_type: "local_post", target_id: post.id, payload, approved_by: user.id, channel: "dashboard", status: "queued",
        }).select("id").single();
        if (error) throw error;
        try {
          const r = await createLocalPost(loc.google_account_id!, loc.google_location_id, { summary: text, languageCode: "en", ctaType: post.cta_type, ctaUrl: post.cta_url });
          await db.from("publications").update({ status: r.state, google_response: r.response }).eq("id", pub.id);
          await db.from("gbp_posts").update({ body: text, state: r.state === "rejected" ? "failed" : "posted" }).eq("id", post.id);
          return json({ ok: true, state: r.state });
        } catch (e) {
          await db.from("publications").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", pub.id);
          await db.from("gbp_posts").update({ state: "failed" }).eq("id", post.id);
          throw e;
        }
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
        if (error) throw error;
        const payload = { start_date: s, end_date: e, closed, open_time: open, close_time: close };
        const { data: pub, error: pe } = await db.from("publications").insert({
          location_id: loc.id, target_type: "special_hours", target_id: row.id, payload, approved_by: user.id, channel: "dashboard", status: "queued",
        }).select("id").single();
        if (pe) throw pe;
        try {
          const r = await addSpecialHours(loc.google_location_id, { startDate: s, endDate: e, closed, openTime: open, closeTime: close });
          await db.from("publications").update({ status: r.state, google_response: r.response }).eq("id", pub.id);
          await db.from("special_hours").update({ state: "posted" }).eq("id", row.id);
          return json({ ok: true, state: r.state });
        } catch (err) {
          await db.from("publications").update({ status: "failed", error: String(err).slice(0, 500) }).eq("id", pub.id);
          await db.from("special_hours").update({ state: "failed" }).eq("id", row.id);
          throw err;
        }
      }
      case "shield_decide": {
        const decision = b.decision === "revert" ? "revert" : b.decision === "keep" ? "keep" : null;
        if (!decision) return fail("bad_input", "Choose revert or keep.");
        try {
          const r = await decideChange(String(b.change_id), decision, user.id, "dashboard");
          return json({ ok: true, state: r.state });
        } catch (e) {
          if (String(e).includes("already_decided")) return fail("already_decided", "This change was already handled.", 409);
          throw e;
        }
      }
      default:
        return fail("bad_input", "Unknown action.");
    }
  } catch (e) {
    await captureError("content", e);
    return fail("internal", "Something went wrong. Nothing was posted.", 500);
  }
});
