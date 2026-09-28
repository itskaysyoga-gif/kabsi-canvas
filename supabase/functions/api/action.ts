// action: the email links (/a/:token). Public: the token is the credential.
//   GET  ?t=TOKEN         → what the link does + the review and draft to show (never performs anything)
//   POST { t, do, text? } → performs it once. do: "post" | "skip" | "handle_myself"
// "post" publishes exactly the text shown (and possibly edited) on the confirm page (D202).
import { admin, captureError, CORS, fail, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { publishReply } from "../_shared/reviews.ts";
import { decideChange } from "../_shared/shield.ts";

type Token = { id: string; location_id: string; user_id: string | null; action: string; target_type: string; target_id: string; expires_at: string; used_at: string | null };

async function loadToken(t: string | null | undefined) {
  if (!t || t.length < 40 || t.length > 64) return null;
  const { data } = await admin().from("action_tokens").select("id, location_id, user_id, action, target_type, target_id, expires_at, used_at")
    .eq("token_hash", await sha256Hex(t)).maybeSingle();
  return (data as Token | null) ?? null;
}

async function view(tok: Token) {
  const db = admin();
  if (tok.target_type === "listing_change") {
    const { data: ch } = await db.from("listing_changes").select("id, field, old_value, new_value, state, locations(name)").eq("id", tok.target_id).single();
    return {
      action: tok.action, business: (ch?.locations as unknown as { name: string } | null)?.name ?? "",
      change: ch && { id: ch.id, field: ch.field, before: (ch.old_value as { display?: string })?.display ?? "", after: (ch.new_value as { display?: string })?.display ?? "", state: ch.state },
    };
  }
  const { data: rv } = await db.from("reviews").select("id, reviewer_name, star_rating, comment, state, urgency, existing_reply, locations(name)").eq("id", tok.target_id).single();
  const { data: draft } = await db.from("reply_drafts").select("body, safety_ok").eq("review_id", tok.target_id).order("version", { ascending: false }).limit(1).maybeSingle();
  return {
    action: tok.action, business: (rv?.locations as unknown as { name: string } | null)?.name ?? "",
    review: rv && { id: rv.id, reviewer: rv.reviewer_name, rating: rv.star_rating, comment: rv.comment, state: rv.state, urgent: rv.urgency === "urgent", reply: rv.existing_reply },
    draft: draft?.safety_ok ? draft.body : null,
  };
}

export async function action(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  // D266: this is the token-guessing surface (public, unauthenticated GET/POST) — fail closed if the limiter breaks.
  if (!(await rateLimit(`action:${await sha256Hex(ip + new Date().toISOString().slice(0, 10))}`, 60, 600, { failClosed: true }))) return fail("rate_limited", "Too many tries.", 429);

  try {
    if (req.method === "GET") {
      const tok = await loadToken(new URL(req.url).searchParams.get("t"));
      if (!tok) return json({ status: "invalid" }, 404);
      if (tok.used_at) return json({ status: "used", ...(await view(tok)) });
      if (Date.parse(tok.expires_at) < Date.now()) return json({ status: "expired" });
      return json({ status: "ok", ...(await view(tok)) });
    }
    if (req.method !== "POST") return fail("method_not_allowed", "Use GET or POST.", 405);

    const body = await req.json().catch(() => ({})) as { t?: string; do?: string; text?: string };
    const tok = await loadToken(body.t);
    if (!tok) return fail("invalid", "This link isn't valid.", 404);
    if (Date.parse(tok.expires_at) < Date.now()) return fail("expired", "This link has expired. Open your Kabsi inbox instead.", 410);
    const allowed: Record<string, string[]> = { post: ["post", "skip"], see_draft: ["post", "handle_myself"], skip: ["skip"], handle_myself: ["handle_myself"], edit: ["post", "skip"], open: [], revert: ["revert", "keep"], keep: ["keep", "revert"] };
    if (!body.do || !(allowed[tok.action] ?? []).includes(body.do)) return fail("not_allowed", "This link can't do that.", 400);
    if (!tok.user_id) return fail("not_allowed", "Open Kabsi to do this.", 400);

    // Single use: claim the token first; a second click finds used_at set.
    const { data: claimed } = await admin().from("action_tokens").update({ used_at: new Date().toISOString() })
      .eq("id", tok.id).is("used_at", null).select("id").maybeSingle();
    if (!claimed) return fail("used", "This link was already used.", 409);

    if (tok.target_type === "listing_change") {
      const r = await decideChange(tok.target_id, body.do as "revert" | "keep", tok.user_id, "email_link");
      return json({ ok: true, done: r.state });
    }
    if (body.do === "post") {
      const result = await publishReply({ reviewId: tok.target_id, text: body.text ?? "", approvedBy: tok.user_id, channel: "email_link" });
      return json({ ok: true, done: "posted", state: result.state });
    }
    const newState = body.do === "skip" ? "skipped" : "handled_offline";
    await admin().from("reviews").update({ state: newState }).eq("id", tok.target_id).in("state", ["new", "drafted", "blocked"]);
    return json({ ok: true, done: newState });
  } catch (e) {
    const msg = String(e);
    if (msg.includes("already_decided")) return fail("already_decided", "This change was already handled.", 409);
    if (msg.includes("already_posted")) return fail("already_posted", "A reply is already posted for this review.", 409);
    if (msg.includes("bad_reply_text")) return fail("bad_text", "The reply is empty or too long.", 400);
    await captureError("action", e);
    return fail("internal", "Something went wrong. Nothing was posted. Try again from your Kabsi inbox.", 500);
  }
}
