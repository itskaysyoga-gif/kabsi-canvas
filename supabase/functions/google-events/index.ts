// google-events (P0.7-03, K-37): the Pub/Sub push endpoint for Google Business Profile notifications. Google sends no
// Supabase JWT (verify_jwt off); every request must carry Google's OIDC token for Kabsi's push service account and
// audience (GOOGLE_PUBSUB_SERVICE_ACCOUNT and GOOGLE_PUBSUB_AUDIENCE). A forged or replayed push changes nothing. A
// notification only offers jobs (a review sync, a Protection check, the Google state read); it never writes data.
// Staff also call it with x-cron-secret and {"op":"register"} to point every account Kabsi manages through at the topic.
import { admin, captureError, isInternal, json, log } from "../_shared/kabsi.ts";
import { googleKeys, KABSI_PUBSUB_TOPIC } from "../_shared/google/events.ts";
import { googlePush } from "../_shared/google/events-route.ts";
import { registerNotifications } from "../_shared/google/index.ts";

async function register() {
  const { data, error } = await admin().from("locations").select("google_account_id")
    .eq("status", "active").eq("concierge", false).not("google_account_id", "is", null);
  if (error) throw error;
  const accounts = (data ?? []).map((r) => String(r.google_account_id)).filter((a) => a !== "accounts/demo");
  return await registerNotifications(accounts, KABSI_PUBSUB_TOPIC);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (req.headers.has("x-cron-secret")) {
    if (!(await isInternal(req))) return json({ error: "forbidden" }, 403);
    const body = await req.json().catch(() => ({})) as { op?: string };
    if (body.op !== "register") return json({ error: "unknown op" }, 400);
    try {
      const accounts = await register();
      log("google-events", { ok: true, op: "register", accounts: accounts.length });
      return json({ ok: true, accounts });
    } catch (e) {
      return json({ error: String((e as Error).message ?? e).slice(0, 300) }, 500);
    }
  }
  const audience = Deno.env.get("GOOGLE_PUBSUB_AUDIENCE") ?? "";
  const serviceAccount = Deno.env.get("GOOGLE_PUBSUB_SERVICE_ACCOUNT") ?? "";
  if (!audience || !serviceAccount) return json({ error: "not_configured" }, 503);
  // The decision is in _shared/google/events-route.ts (Sec 1: tested with a stub database); here it is wired to the database.
  return await googlePush(req, {
    auth: { audience, serviceAccount, keys: googleKeys },
    db: admin(),
    log: (fields) => log("google-events", fields),
    captureError: (e, extra) => captureError("google-events", e, extra),
    json,
  });
});
