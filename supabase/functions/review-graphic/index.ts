// review-graphic: a square or story image for one 4 or 5 star review (P0.8-07, K-134), Pro only. The logic and its
// checks are in _shared/review-graphic/handler.ts; this file wires it to the database. Nothing is stored.
import { admin, captureError, CORS, currentUser, log, rateLimit } from "../_shared/kabsi.ts";
import { makeHandler } from "../_shared/review-graphic/handler.ts";
import { renderGraphic } from "../_shared/review-graphic/render.ts";

Deno.serve(makeHandler({
  getUser: async (req) => {
    const user = await currentUser(req);
    return user ? { id: user.id } : null;
  },
  loadReview: async (id) => {
    const { data } = await admin().from("reviews").select("location_id, star_rating, comment, reviewer_name, locations(name)")
      .eq("id", id).maybeSingle();
    if (!data) return null;
    const loc = data.locations as { name?: string } | { name?: string }[] | null;
    const name = (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "";
    return {
      location_id: data.location_id as string,
      location_name: name,
      star_rating: data.star_rating as number,
      comment: data.comment as string | null,
      reviewer_name: data.reviewer_name as string | null,
    };
  },
  memberRole: async (locationId, userId) => {
    const { data } = await admin().from("location_members").select("role").eq("location_id", locationId).eq("user_id", userId).maybeSingle();
    return (data?.role as string | undefined) ?? null;
  },
  featureAccess: async (locationId) => {
    const { data, error } = await admin().rpc("feature_access", { p_location: locationId });
    return error ? null : (data as { pro: boolean });
  },
  rateLimit: (key, max, seconds) => rateLimit(key, max, seconds, { failClosed: true }),
  render: renderGraphic,
  log: (fields) => log("review-graphic", fields),
  captureError: (e) => captureError("review-graphic", e),
  cors: CORS,
}));
