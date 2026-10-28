// billing-creem (master plan section 10, R-67): Creem's webhook, the staff setup action and the owner's billing actions.
// Creem sends no Supabase JWT (verify_jwt off), so every route checks its own credential in code:
//   POST /billing-creem            the webhook: creem-signature over the raw body (CREEM_WEBHOOK_SECRET), constant time.
//                                  401 for a missing or wrong signature (logged; repeated failures alert staff); each
//                                  event id is stored once (a repeat answers 200 and does nothing); an event older than
//                                  3 days is refused; the work runs in the job queue (applyEvent, the one writer).
//   POST /billing-creem/setup      staff (x-cron-secret or a staff session): lists, reuses, renames and creates the products.
//   GET  /billing-creem/founding   public: the founding places left (10.2.4) for the pricing page, cached 5 minutes.
//   POST /billing-creem/owner      the signed-in owner of the business: checkout, portal, cancel, keep, upgrade, downgrade,
//                                  add_location (a checkout link for the Extra location product, Billing 2), remove_location.
//                                  The Plan screen calls it; WhatsApp calls the same code in _shared/billing.ts.
//   POST /billing-creem/test-run   Billing 2: staff only, Creem test mode only, an organisation marked billing_test only: the
//                                  same actions for one named organisation, so a session can run the test-mode script
//                                  (purchase, extra location, cancel the extra, cancel the plan) without an owner's login.
import { admin, captureError, CORS, currentUser, fail, isInternal, json, log, rateLimit } from "../_shared/kabsi.ts";
import { creemWebhook } from "../_shared/creem-webhook.ts";
import { counted } from "../_shared/webhook-rejections.ts";
import {
  addLocation, BillingError, cancelAtEnd, changePlan, CREEM_MODE, isCreemError, keepPlan, portal, removeLocation, setupProducts, staffAlert,
  startCheckout, storeEvent,
} from "../_shared/billing.ts";

// The decision is in _shared/creem-webhook.ts (Sec 1: tested with stubs); here it is wired to the database.
function webhook(req: Request): Promise<Response> {
  return creemWebhook(req, {
    secret: Deno.env.get("CREEM_WEBHOOK_SECRET") ?? "",
    store: (e) => storeEvent(e),
    refused: async (problem) => {
      log("billing-creem", { ok: false, refused: problem });
      // More than 5 refusals in an hour is somebody trying, or a secret that changed: staff hear about it once an hour.
      if (!(await rateLimit("creem_signature_failures", 5, 3600))) {
        await staffAlert("Creem webhook refused more than 5 calls with a bad signature in the last hour", `sig:${new Date().toISOString().slice(0, 13)}`)
          .catch((e) => captureError("billing-creem", e, { step: "sig_alert" }));
      }
    },
    log: (fields) => log("billing-creem", fields),
    captureError: (e, extra) => captureError("billing-creem", e, extra),
    json,
  });
}

async function isStaff(req: Request): Promise<boolean> {
  if (await isInternal(req)) return true;
  const user = await currentUser(req);
  if (!user) return false;
  // Sec 2: Kabsi admins only, not installers.
  const { data } = await admin().from("staff").select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return !!data;
}

async function setup(req: Request): Promise<Response> {
  if (!(await isStaff(req))) return json({ error: "forbidden" }, 403);
  try {
    const out = await setupProducts();
    log("billing-creem", { ok: true, op: "setup", mode: out.mode, created: out.created.length, unmatched: out.unmatched.length });
    return json({ ok: true, ...out });
  } catch (e) {
    await captureError("billing-creem", e, { step: "setup" });
    return json({ error: "setup_failed", message: String((e as Error).message ?? e).slice(0, 300) }, 502);
  }
}

type OwnerBody = { op?: string; location_id?: string; plan?: string; period?: string };
async function owner(req: Request): Promise<Response> {
  const user = await currentUser(req);
  if (!user) return fail("unauthorized", "Please sign in again.", 401);
  const b = await req.json().catch(() => ({})) as OwnerBody;
  if (!b.location_id || !/^[0-9a-f-]{36}$/i.test(b.location_id)) return fail("bad_request", "Which business?");
  const { data: loc } = await admin().from("locations").select("organization_id").eq("id", b.location_id).maybeSingle();
  const org = loc?.organization_id as string | undefined;
  if (!org) return fail("not_found", "That business was not found.", 404);
  // Only the owner changes the plan and billing (9.3).
  const { data: m } = await admin().from("organization_members").select("role").eq("organization_id", org).eq("user_id", user.id).maybeSingle();
  if (m?.role !== "owner") return fail("owner_only", "Only the owner can change the plan and billing.", 403);
  if (!(await rateLimit(`billing_owner:${user.id}`, 20, 600, { failClosed: true }))) return fail("slow_down", "Please wait a minute and try again.", 429);
  const plan = b.plan === "essentials" || b.plan === "pro" ? b.plan : null;
  const period = b.period === "year" ? "year" : "month";
  try {
    switch (b.op) {
      case "checkout":
        if (!plan) return fail("bad_request", "Which plan?");
        return json({ ok: true, url: await startCheckout(org, user.id, user.email ?? null, plan, period) });
      case "portal":
        return json({ ok: true, url: await portal(org) });
      case "cancel":
        return json({ ok: true, ends_at: await cancelAtEnd(org) });
      case "keep":
        return json({ ok: true, ends_at: await keepPlan(org) });
      case "upgrade":
        return json({ ok: true, ...(await changePlan(org, "pro")) });
      case "downgrade":
        return json({ ok: true, ...(await changePlan(org, "essentials")) });
      case "add_location":
        return json({ ok: true, url: await addLocation(org, user.id) });
      case "remove_location":
        return json({ ok: true, ends_at: await removeLocation(org) });
      default:
        return fail("bad_request", "Unknown action.");
    }
  } catch (e) {
    if (e instanceof BillingError) return fail(e.code, e.message, e.code === "not_configured" ? 503 : 409);
    await captureError("billing-creem", e, { step: "owner", op: b.op, creem: isCreemError(e) ? e.status : null });
    return fail("try_again", "Something went wrong with the payment service. Please try again in a minute.", 502);
  }
}

// Billing 2: the test-mode script for one billing_test organisation, run by staff (x-cron-secret through call_internal).
// Never in live mode, never for any other organisation, and the same code as the owner's actions.
type TestBody = { op?: string; organization_id?: string; plan?: string; period?: string };
async function testRun(req: Request): Promise<Response> {
  if (!(await isStaff(req))) return json({ error: "forbidden" }, 403);
  if (CREEM_MODE !== "test") return json({ error: "test_mode_only" }, 403);
  const b = await req.json().catch(() => ({})) as TestBody;
  if (!b.organization_id || !/^[0-9a-f-]{36}$/i.test(b.organization_id)) return json({ error: "bad_request" }, 400);
  const org = b.organization_id.toLowerCase();
  const { data: o } = await admin().from("organizations").select("billing_test, is_demo").eq("id", org).maybeSingle();
  if (!o?.billing_test || o.is_demo) return json({ error: "not_a_test_account" }, 403);
  try {
    switch (b.op) {
      case "checkout":
        return json({ ok: true, url: await startCheckout(org, null, null, b.plan === "essentials" ? "essentials" : "pro", b.period === "year" ? "year" : "month") });
      case "add_location":
        return json({ ok: true, url: await addLocation(org, null) });
      case "remove_location":
        return json({ ok: true, ends_at: await removeLocation(org) });
      case "cancel":
        return json({ ok: true, ends_at: await cancelAtEnd(org) });
      case "keep":
        return json({ ok: true, ends_at: await keepPlan(org) });
      default:
        return json({ error: "bad_request" }, 400);
    }
  } catch (e) {
    if (e instanceof BillingError) return json({ error: e.code, message: e.message }, 409);
    await captureError("billing-creem", e, { step: "test_run", op: b.op, creem: isCreemError(e) ? e.status : null });
    return json({ error: "creem_failed", status: isCreemError(e) ? e.status : null }, 502);
  }
}

async function founding(): Promise<Response> {
  const { data, error } = await admin().rpc("founding_places_left");
  if (error || typeof data !== "number") return json({ error: "unavailable" }, 503);
  return json({ left: data }, 200, { "cache-control": "public, max-age=300" });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  if (req.method === "GET" && path.endsWith("/founding")) return await founding();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (path.endsWith("/setup")) return await setup(req);
  if (path.endsWith("/owner")) return await owner(req);
  if (path.endsWith("/test-run")) return await testRun(req);
  // Sec 2: refused calls are counted for the staff operations view.
  return await counted("creem", await webhook(req));
});
