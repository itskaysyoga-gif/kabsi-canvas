// review-page: the data behind kabsi.co/review/{CODE}, the page a review link opens when the owner switched that
// link to "Show the page" (P0.8-05, K-132). POST { code } -> { name, review_url, whatsapp } or 404.
// Public (browser calls send the anon JWT). The same answer goes to every visitor: no rating, no answer, no routing.
// The business's WhatsApp number is a Business Knowledge fact the owner saved for exactly this line; it is returned
// as digits for wa.me and is not used anywhere else. No visitor data is stored or read.
import { clientIp } from "../_shared/client-ip.ts";
import { admin, captureError, CORS, fail, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";
import { pageData } from "../_shared/review-page.ts";
import { BODY_LIMITS, capBody } from "../_shared/body-cap.ts";

const CODE_RE = /^[2-9A-HJKMNP-Z]{6}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  // Sec 2: the body is capped before anything reads it (413 past BODY_LIMITS.small).
  const capped = await capBody(req, BODY_LIMITS.small, CORS);
  if (capped instanceof Response) return capped;
  req = capped;
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

  const ip = clientIp(req);
  const day = new Date().toISOString().slice(0, 10);
  const visitor = (await sha256Hex(`${Deno.env.get("SUPABASE_URL")}:${day}:${ip}`)).slice(0, 24);
  if (!(await rateLimit(`review-page:${visitor}`, 120, 3600, { failClosed: true })))
    return fail("rate_limited", "Try again in a little while.", 429);

  const { code: raw } = (await req.json().catch(() => ({}))) as { code?: string };
  const code = String(raw ?? "").toUpperCase();
  if (!CODE_RE.test(code)) return fail("not_found", "This link is not active.", 404);

  try {
    const db = admin();
    const { data: card } = await db
      .from("cards")
      .select("status, destination, page_mode, kind, location_id")
      .eq("code", code)
      .maybeSingle();
    if (!card?.location_id) return fail("not_found", "This link is not active.", 404);
    const [{ data: loc }, { data: fact }] = await Promise.all([
      db.from("locations").select("name").eq("id", card.location_id).maybeSingle(),
      db
        .from("knowledge_facts")
        .select("value")
        .eq("location_id", card.location_id)
        .eq("slot", "card.manager_whatsapp")
        .eq("status", "verified")
        .is("superseded_by", null)
        .maybeSingle(),
    ]);
    const data = pageData(
      card,
      (loc?.name as string | undefined) ?? null,
      (fact?.value as { text?: string } | null)?.text,
    );
    if (!data) return fail("not_found", "This link is not active.", 404);
    return json(data, 200, { "cache-control": "no-store" });
  } catch (e) {
    await captureError("review-page", e);
    return fail("internal", "Something went wrong. Try again.", 500);
  }
});
