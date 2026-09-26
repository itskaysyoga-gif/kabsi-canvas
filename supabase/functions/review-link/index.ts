// review-link: the free "Google review link and QR code" tool on /google-review-link (public, no sign-in).
// POST { query } → up to 5 businesses with their Google review link. The Places key never reaches the browser.
// Abuse limits: 20 searches per visitor per hour (keyed by a salted hash of the IP, kept 1 hour, never the IP
// itself) and 400 searches a day in total, so the Places bill stays inside the free monthly credit.
import { captureError, CORS, fail, json, rateLimit, sha256Hex } from "../_shared/kabsi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const visitor = (await sha256Hex(`${Deno.env.get("SUPABASE_URL")}:${day}:${ip}`)).slice(0, 24);
  if (!(await rateLimit(`review-link:${visitor}`, 20, 3600))) {
    return fail("rate_limited", "That's a lot of searches. Try again in an hour.", 429);
  }
  if (!(await rateLimit("review-link:all", 400, 86400))) {
    return fail("busy", "The tool is busy today. Please try again tomorrow.", 429);
  }

  const key = Deno.env.get("PLACES_API_KEY");
  if (!key) return fail("not_configured", "Search isn't available right now.", 503);
  const { query } = (await req.json().catch(() => ({}))) as { query?: string };
  const q = (query ?? "").trim();
  if (q.length < 2 || q.length > 120) return fail("bad_query", "Type your business name and city.");

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
        "x-goog-fieldmask": "places.id,places.displayName,places.formattedAddress",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 5 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`places ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    type P = { id: string; displayName?: { text?: string }; formattedAddress?: string };
    const places = ((data.places ?? []) as P[]).map((p) => ({
      place_id: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      review_url: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(p.id)}`,
    }));
    return json({ places });
  } catch (e) {
    await captureError("review-link", e);
    return fail("search_failed", "Search didn't work. Try again.", 502);
  }
});
