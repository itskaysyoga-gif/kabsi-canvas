// review-cards: the print-ready counter card and table tent PDFs (V3, master plan 27.3 item 5). The logic and its checks are in
// _shared/review-growth/cards-handler.ts; this file wires it to the database. Nothing is stored.
import { admin, captureError, CORS, currentUser, log, rateLimit } from "../_shared/kabsi.ts";
import { makeHandler } from "../_shared/review-growth/cards-handler.ts";

Deno.serve(makeHandler({
  getUser: async (req) => {
    const user = await currentUser(req);
    return user ? { id: user.id } : null;
  },
  loadLink: async (code) => {
    const { data } = await admin().from("cards").select("location_id, locations(name)").eq("code", code).eq("kind", "link").eq("status", "active").maybeSingle();
    if (!data?.location_id) return null;
    const loc = data.locations as { name?: string } | { name?: string }[] | null;
    return { location_id: data.location_id as string, business: (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "" };
  },
  memberOf: async (locationId, userId) => {
    const { data } = await admin().from("location_members").select("role").eq("location_id", locationId).eq("user_id", userId).maybeSingle();
    return !!data;
  },
  rateLimit: (key, max, seconds) => rateLimit(key, max, seconds, { failClosed: true }),
  log: (fields) => log("review-cards", fields),
  captureError: (e) => captureError("review-cards", e),
  cors: CORS,
}));
