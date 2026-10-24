// google-events (P0.7-03, K-37): the Pub/Sub push endpoint for Google Business Profile notifications. Google sends no
// Supabase JWT (verify_jwt off); every request must carry Google's OIDC token for Kabsi's push service account and
// audience (GOOGLE_PUBSUB_SERVICE_ACCOUNT and GOOGLE_PUBSUB_AUDIENCE). A forged or replayed push changes nothing. A
// notification only offers jobs (a review sync, a Protection check, the Google state read); it never writes data.
import { admin, captureError, json, log } from "../_shared/kabsi.ts";
import { googleKeys, jobsFor, parsePush, pushTokenProblem } from "../_shared/google/events.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const audience = Deno.env.get("GOOGLE_PUBSUB_AUDIENCE") ?? "";
  const serviceAccount = Deno.env.get("GOOGLE_PUBSUB_SERVICE_ACCOUNT") ?? "";
  if (!audience || !serviceAccount) return json({ error: "not_configured" }, 503);
  const problem = await pushTokenProblem(req.headers.get("authorization"), { audience, serviceAccount, keys: googleKeys })
    .catch((e) => `check_failed: ${String(e).slice(0, 100)}`);
  if (problem) {
    log("google-events", { ok: false, refused: problem });
    return json({ error: "unauthorized" }, 401);
  }
  const n = parsePush(await req.json().catch(() => null));
  // A body Pub/Sub cannot fix by retrying is acknowledged, so it is not sent again and again.
  if (!n) return json({ ok: true, ignored: "unreadable" });
  try {
    const db = admin();
    const { data: loc } = n.location
      ? await db.from("locations").select("id").eq("google_location_id", n.location).eq("status", "active").maybeSingle()
      : { data: null };
    const { data: row, error } = await db.from("google_events").insert({
      message_id: n.messageId, type: n.type, google_location_id: n.location, location_id: loc?.id ?? null, published_at: n.publishedAt,
    }).select("message_id").maybeSingle();
    if (error?.code === "23505") return json({ ok: true, duplicate: true });
    if (error) throw error;
    let offered = 0;
    if (loc && row) {
      for (const kind of jobsFor(n.type)) {
        const { data: id, error: je } = await db.rpc("enqueue_job", { p_kind: kind, p_location: loc.id, p_dedupe_key: `${kind}:${loc.id}`, p_payload: { source: "pubsub" } });
        if (je) throw je;
        if (id) offered++;
      }
      await db.from("google_events").update({ jobs: offered }).eq("message_id", n.messageId);
    }
    log("google-events", { ok: true, type: n.type, known: !!loc, offered });
    return json({ ok: true, offered });
  } catch (e) {
    await captureError("google-events", e, { type: n.type });
    // Pub/Sub retries a failed push; the message id keeps the retry from counting twice.
    return json({ error: "failed" }, 500);
  }
});
