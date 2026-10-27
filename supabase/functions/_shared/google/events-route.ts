// The Pub/Sub push, the decision (P0.7-03, Sec 1), out of google-events/index.ts so it is tested with a stub database.
// The OIDC token is checked before the body is read; the body is read with a size cap; a body Pub/Sub cannot fix by
// retrying is acknowledged and dropped; each message id is stored once (the primary key of public.google_events); a repeat
// push offers the jobs again, which their dedupe keys keep from doubling (Sec 2). A notification never writes business data: it only offers jobs, each with a dedupe key, and
// every job reads Google's current state, so a late or out-of-order message cannot put back an older state.
import { jobsFor, parsePush, pushTokenProblem, type PushAuth } from "./events.ts";
import { MAX_WEBHOOK_BODY, readCapped, textOf } from "../webhook-body.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export type GooglePushDeps = {
  auth: PushAuth;
  /** The service-role client (admin()); the tests pass one pointed at an in-memory database. */
  db: SupabaseClient;
  log: (fields: Record<string, unknown>) => void;
  captureError: (e: unknown, extra: Record<string, unknown>) => Promise<unknown>;
  json: (body: unknown, status?: number) => Response;
};

export async function googlePush(req: Request, d: GooglePushDeps): Promise<Response> {
  const problem = await pushTokenProblem(req.headers.get("authorization"), d.auth).catch((e) => `check_failed: ${String(e).slice(0, 100)}`);
  if (problem) {
    d.log({ ok: false, refused: problem });
    return d.json({ error: "unauthorized" }, 401);
  }
  const bytes = await readCapped(req, MAX_WEBHOOK_BODY);
  if (!bytes) return d.json({ error: "too_large" }, 413);
  let body: unknown = null;
  try {
    body = JSON.parse(textOf(bytes));
  } catch {
    body = null;
  }
  const n = parsePush(body);
  // A body Pub/Sub cannot fix by retrying is acknowledged, so it is not sent again and again.
  if (!n) return d.json({ ok: true, ignored: "unreadable" });
  try {
    const db = d.db;
    const { data: loc } = n.location
      ? await db.from("locations").select("id").eq("google_location_id", n.location).eq("status", "active").maybeSingle()
      : { data: null };
    const { data: row, error } = await db.from("google_events").insert({
      message_id: n.messageId, type: n.type, google_location_id: n.location, location_id: loc?.id ?? null, published_at: n.publishedAt,
    }).select("message_id").maybeSingle();
    const duplicate = error?.code === "23505";
    if (error && !duplicate) throw error;
    // Sec 2: a repeat of a stored message offers its jobs again. If the first delivery stored the row and then failed
    // to offer (Pub/Sub retries a 500), the retry is a duplicate, and without this its jobs were never offered. Every
    // job has a dedupe key, so an offer that already waits is not added twice.
    if (duplicate && !loc) return d.json({ ok: true, duplicate: true });
    let offered = 0;
    if (loc && (row || duplicate)) {
      for (const kind of jobsFor(n.type)) {
        const { data: id, error: je } = await db.rpc("enqueue_job", { p_kind: kind, p_location: loc.id, p_dedupe_key: `${kind}:${loc.id}`, p_payload: { source: "pubsub" } });
        if (je) throw je;
        if (id) offered++;
      }
      // A repeat that queued nothing new keeps the first delivery's count.
      if (!duplicate || offered > 0) await db.from("google_events").update({ jobs: offered }).eq("message_id", n.messageId);
    }
    d.log({ ok: true, type: n.type, known: !!loc, offered, duplicate });
    return d.json(duplicate ? { ok: true, duplicate: true, offered } : { ok: true, offered });
  } catch (e) {
    await d.captureError(e, { type: n.type });
    // Pub/Sub retries a failed push; the message id keeps the retry from counting twice.
    return d.json({ error: "failed" }, 500);
  }
}
