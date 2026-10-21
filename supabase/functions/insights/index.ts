// insights: this month's Google figures against last month's, and the search terms on Pro (P0.5-05, K-26, K-138). The
// logic and its checks are in _shared/insights/handler.ts; this file wires it to the database and the Google layer.
// Google's figures are read when the screen opens and are not stored; there is no write to the database in here.
import { admin, captureError, CORS, currentUser, log, rateLimit } from "../_shared/kabsi.ts";
import { dailyFigures, performanceSource, searchTermsFor } from "../_shared/google/index.ts";
import { makeHandler } from "../_shared/insights/handler.ts";

// The business's Google location id, read once per request (the handler asks three times).
const googleIds = new Map<string, string | null>();
async function googleId(locationId: string): Promise<string | null> {
  if (googleIds.has(locationId)) return googleIds.get(locationId)!;
  const { data } = await admin().from("locations").select("google_location_id").eq("id", locationId).maybeSingle();
  const id = (data?.google_location_id as string | null | undefined) ?? null;
  googleIds.set(locationId, id);
  return id;
}

Deno.serve((req) => {
  googleIds.clear();
  return makeHandler({
    getUser: async (r) => {
      const user = await currentUser(r);
      return user ? { id: user.id } : null;
    },
    memberRole: async (locationId, userId) => {
      const { data } = await admin().from("location_members").select("role").eq("location_id", locationId).eq("user_id", userId).maybeSingle();
      return (data?.role as string | undefined) ?? null;
    },
    source: async (locationId) => performanceSource(await googleId(locationId)),
    featureAccess: async (locationId) => {
      const { data, error } = await admin().rpc("feature_access", { p_location: locationId });
      return error ? null : (data as { pro: boolean });
    },
    loadDaily: async (locationId, metrics, start, end) => dailyFigures((await googleId(locationId))!, metrics, start, end),
    loadTerms: async (locationId, month) => searchTermsFor((await googleId(locationId))!, month),
    rateLimit: (key, max, seconds) => rateLimit(key, max, seconds, { failClosed: true }),
    now: () => new Date(),
    log: (fields) => log("insights", fields),
    captureError: (e) => captureError("insights", e),
    cors: CORS,
  })(req);
});
