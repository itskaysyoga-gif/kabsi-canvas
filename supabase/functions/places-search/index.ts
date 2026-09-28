// places-search: onboarding step "Find your business". Signed-in users only.
// POST { query } → { places: [{ place_id, name, address, country }] }  (max 5)
// The Places API key never reaches the browser.
import { captureError, CORS, currentUser, fail, json, rateLimit } from "../_shared/kabsi.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);

  const user = await currentUser(req);
  if (!user) return fail("not_signed_in", "Please log in first.", 401);
  // D266: paid Google Places lookup — fail closed if the limiter breaks instead of removing the cap.
  if (!(await rateLimit(`places:${user.id}`, 30, 600, { failClosed: true }))) return fail("rate_limited", "Too many searches. Try again in a few minutes.", 429);

  const key = Deno.env.get("PLACES_API_KEY");
  if (!key) return fail("not_configured", "Business search isn't set up yet.", 503);

  const { query } = await req.json().catch(() => ({})) as { query?: string };
  const q = (query ?? "").trim();
  if (q.length < 2 || q.length > 120) return fail("bad_query", "Type your business name and area.");

  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": key,
        "x-goog-fieldmask": "places.id,places.displayName,places.formattedAddress,places.addressComponents",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 5 }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`places ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
    type Comp = { shortText?: string; types?: string[] };
    const places = (data.places ?? []).map((p: { id: string; displayName?: { text?: string }; formattedAddress?: string; addressComponents?: Comp[] }) => ({
      place_id: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      country: p.addressComponents?.find((c) => c.types?.includes("country"))?.shortText ?? null,
    }));
    return json({ places });
  } catch (e) {
    await captureError("places-search", e);
    return fail("search_failed", "Search didn't work. Try again.", 502);
  }
});
