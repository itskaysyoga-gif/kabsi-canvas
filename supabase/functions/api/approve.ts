// approve: dashboard actions on a review. Signed-in members only.
//   POST { review_id, do: "post", text }            → publishes exactly `text` (D202)
//   POST { review_id, do: "redraft", instruction }  → new AI version following the owner's instruction
import { admin, captureError, CORS, currentUser, fail, json, rateLimit } from "../_shared/kabsi.ts";
import { draftReview, publishReply } from "../_shared/reviews.ts";

export async function approve(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const user = await currentUser(req);
  if (!user) return fail("not_signed_in", "Please log in.", 401);

  const b = await req.json().catch(() => ({})) as { review_id?: string; do?: string; text?: string; instruction?: string };
  if (!b.review_id) return fail("bad_input", "Missing review.");
  const db = admin();
  const { data: rv } = await db.from("reviews").select("id, location_id, state").eq("id", b.review_id).maybeSingle();
  if (!rv) return fail("not_found", "Review not found.", 404);
  const { data: member } = await db.from("location_members").select("user_id").eq("location_id", rv.location_id).eq("user_id", user.id).maybeSingle();
  if (!member) return fail("forbidden", "You don't have access to this business.", 403);

  try {
    if (b.do === "post") {
      const result = await publishReply({ reviewId: rv.id, text: b.text ?? "", approvedBy: user.id, channel: "dashboard" });
      return json({ ok: true, state: result.state });
    }
    if (b.do === "redraft") {
      const instruction = (b.instruction ?? "").trim().slice(0, 500);
      if (!instruction) return fail("bad_input", "Tell Kabsi what to change.");
      if (!(await rateLimit(`redraft:${rv.id}`, 3, 86400))) return fail("rate_limited", "Three new versions a day per review. Edit the text yourself instead.", 429);
      const d = await draftReview(rv.id, instruction);
      return json({ ok: true, draft: d.ok ? d.body : null, issues: d.issues });
    }
    return fail("bad_input", "Unknown action.");
  } catch (e) {
    const msg = String(e);
    if (msg.includes("already_posted")) return fail("already_posted", "A reply is already posted for this review.", 409);
    if (msg.includes("location_not_active")) return fail("not_active", "This business isn't active yet.", 409);
    if (msg.includes("bad_reply_text")) return fail("bad_text", "The reply is empty or too long.", 400);
    await captureError("approve", e);
    return fail("internal", "Something went wrong. Nothing was posted.", 500);
  }
}
