// whatsapp: Kabsi's WhatsApp agent (P0.8-03, session 13b part 1). verify_jwt is off because Kapso calls it.
//   POST /whatsapp          the Kapso webhook. Every request must carry Kapso's X-Webhook-Signature over the raw body (the
//                           secret is in Supabase Vault, or KAPSO_WEBHOOK_SECRET); a forged one is refused before anything
//                           is read. Each message is stored once and answered in the background, so Kapso gets its 200
//                           at once and the owner sees the reply within seconds.
//   POST /whatsapp/tick     internal (x-cron-secret, pg_cron every minute when something is due): the one sender's queue,
//                           messages whose first try did not finish, and the "Google needs action" messages (18.2).
//   POST /whatsapp/staff/*  internal, staff only: setup (the webhook, its secret into Vault), templates, health (hourly),
//                           automations. KAPSO_API_KEY is read here and never leaves Supabase secrets.
// Nothing is sent live unless WHATSAPP_LIVE is true, and until launch only to Kabsi's own test phones and the staff phone.
import { admin, captureError, fail, isInternal, json } from "../_shared/kabsi.ts";
import { notify as notifyEmail } from "../_shared/notify.ts";
import { parseWebhook, verifySignature } from "../_shared/whatsapp/channel.ts";
import { agentDeps, whatsappCtx } from "../_shared/whatsapp/db.ts";
import { handle, receive } from "../_shared/whatsapp/agent.ts";
import type { Inbound } from "../_shared/whatsapp/channel.ts";
import { flush, notify } from "../_shared/whatsapp/outbox.ts";
import { caseOf, needsActionBody } from "../_shared/whatsapp/google-action.ts";
import { SAY } from "../_shared/whatsapp/say.ts";
import { ref } from "../_shared/whatsapp/templates.ts";
import { checkAutomations, type KapsoEnv, readHealth, setupWebhook, submitTemplates } from "../_shared/whatsapp/kapso-admin.ts";

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const MAX_BODY = 256 * 1024;
const FN_URL = "https://ynjdqjlmdwjgbfezevxy.supabase.co/functions/v1/whatsapp";

let vaultSecret: string | null = null;
async function webhookSecret(): Promise<string> {
  const env = Deno.env.get("KAPSO_WEBHOOK_SECRET") ?? "";
  if (env) return env;
  if (!vaultSecret) {
    const { data } = await admin().rpc("internal_secret", { p_name: "kapso_webhook_secret" });
    vaultSecret = (data as string | null) ?? null;
  }
  return vaultSecret ?? "";
}

const background = (p: Promise<unknown>) => {
  const safe = p.catch((e) => captureError("whatsapp", e, { step: "background" }));
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) EdgeRuntime.waitUntil(safe);
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  if (path.endsWith("/tick")) return (await isInternal(req)) ? json(await tick()) : fail("forbidden", "Forbidden.", 403);
  const staff = /\/staff\/([a-z]+)$/.exec(path);
  if (staff) return (await isInternal(req)) ? json(await staffAction(staff[1])) : fail("forbidden", "Forbidden.", 403);
  return await webhook(req);
});

async function webhook(req: Request): Promise<Response> {
  const secret = await webhookSecret();
  if (!secret) return fail("not_configured", "WhatsApp is not set up.", 503);
  const raw = new Uint8Array(await req.arrayBuffer());
  if (raw.length > MAX_BODY) return fail("too_large", "Too large.", 413);
  if (!(await verifySignature(secret, raw, req.headers.get("x-webhook-signature")))) {
    // A secret rotated by setup: read Vault again once before refusing.
    vaultSecret = null;
    const again = await webhookSecret();
    if (!again || again === secret || !(await verifySignature(again, raw, req.headers.get("x-webhook-signature")))) return fail("forbidden", "Bad signature.", 401);
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return fail("bad_json", "Bad JSON.", 400);
  }
  const { messages, statuses } = parseWebhook(req.headers.get("x-webhook-event"), body);
  const ctx = await whatsappCtx();
  for (const s of statuses) {
    try {
      await ctx.db.statusUpdate(s.messageId, s.status, s.error);
      await admin().from("whatsapp_outbox").update({ state: s.status === "failed" ? "failed" : "sent", error: s.error })
        .eq("provider_id", s.messageId).in("state", ["sent", "held"]).then(() => {}, () => {});
    } catch (e) {
      await captureError("whatsapp", e, { step: "status" });
    }
  }
  if (!ctx.on) return json({ ok: true, handled: 0, off: true });
  const deps = await agentDeps();
  const done: string[] = [];
  for (const m of messages) {
    try {
      done.push(await receive(deps, m, background));
    } catch (e) {
      // No message content goes to Sentry, only the step (K-113).
      await captureError("whatsapp", e, { step: "inbound", type: m.type });
      done.push("error");
    }
  }
  // Always 200 after a valid signature, so Kapso does not retry what was already stored once.
  return json({ ok: true, handled: done.length, statuses: statuses.length });
}

async function tick() {
  const ctx = await whatsappCtx();
  if (!ctx.on) return { ok: true, off: true };
  const deps = await agentDeps();
  const out: Record<string, unknown> = {};
  // 18.2: Google needs action, at once (urgent: quiet hours and the cap do not apply), and the staff phone at the same time.
  try {
    const { data } = await admin().rpc("whatsapp_google_action_due");
    const due = (data ?? []) as { task_id: string; location_id: string; business: string; cleared: boolean; evidence: Record<string, unknown>; title: string; phone: string; user_id: string }[];
    const staffPhones = due.length ? await staffAdminPhones() : [];
    for (const g of due) {
      const body = g.cleared ? SAY.googleCleared(g.business) : needsActionBody(g.business, caseOf(g.evidence, g.title));
      await notify(deps.out, { phone: g.phone, userId: g.user_id, locationId: g.location_id, kind: g.cleared ? "google_cleared" : "google_needs_action",
        body, template: ref("google_action", { business: g.business }), urgent: !g.cleared,
        dedupe: `gna:${g.task_id}:${g.cleared ? "cleared" : "open"}:${g.user_id}` });
      for (const p of staffPhones) {
        await notify(deps.out, { phone: p, userId: null, locationId: g.location_id, kind: "staff_alert", urgent: true,
          body: `Google ${g.cleared ? "cleared" : "needs action on"} ${g.business}. The owner has been told on WhatsApp.`,
          template: ref("staff_alert", { summary: `Google ${g.cleared ? "cleared" : "needs action on"} ${g.business}` }),
          dedupe: `gna_staff:${g.task_id}:${g.cleared ? "cleared" : "open"}:${p}` });
      }
    }
    out.google_action = due.length;
  } catch (e) {
    await captureError("whatsapp", e, { step: "google_action" });
  }
  // Messages whose background step did not finish: tried once more.
  try {
    const { data } = await admin().rpc("whatsapp_inbound_retry", { p_limit: 20 });
    let n = 0;
    for (const r of (data ?? []) as { id: string; payload: Inbound }[]) {
      const result = await handle(deps, r.payload).catch(() => "error");
      await deps.db.done(r.id, `retry:${result}`);
      n++;
    }
    out.retried = n;
  } catch (e) {
    await captureError("whatsapp", e, { step: "retry" });
  }
  out.sent = await flush(deps.out).catch(async (e) => (await captureError("whatsapp", e, { step: "flush" }), {}));
  return { ok: true, ...out };
}

async function staffAdminPhones(): Promise<string[]> {
  const { data } = await admin().from("phone_roles").select("phone").eq("role", "staff_admin").is("revoked_at", null);
  return [...new Set((data ?? []).map((r) => r.phone as string))];
}

function kapsoEnv(): KapsoEnv | null {
  const apiKey = Deno.env.get("KAPSO_API_KEY") ?? "";
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID") ?? "";
  if (!apiKey || !phoneNumberId) return null;
  return { apiKey, phoneNumberId };
}

// Staff actions. Answers hold ids, names and statuses only: never the key, the webhook secret or message content.
async function staffAction(action: string) {
  const env = kapsoEnv();
  if (!env) return { ok: false, error: "kapso_not_configured" };
  try {
    switch (action) {
      case "setup": {
        const have = !!(Deno.env.get("KAPSO_WEBHOOK_SECRET") || (await admin().rpc("internal_secret", { p_name: "kapso_webhook_secret" })).data);
        const w = await setupWebhook(env, FN_URL, {
          haveSecret: have,
          storeSecret: async (s) => {
            const { error } = await admin().rpc("whatsapp_set_webhook_secret", { p_secret: s });
            if (error) throw new Error("vault_store_failed");
            vaultSecret = null;
          },
        });
        return { ok: true, webhook_id: w.id, created: w.created, secret_in_vault: true, automations: await checkAutomations(env) };
      }
      case "templates":
        return { ok: true, templates: await submitTemplates(env) };
      case "automations":
        return { ok: true, ...(await checkAutomations(env)) };
      case "health": {
        const h = await readHealth(env);
        const { data } = await admin().rpc("whatsapp_health_record", { p_status: h.status, p_quality: h.quality, p_messaging: h.messaging, p_tier: h.tier, p_detail: h.detail });
        const r = (data ?? {}) as { bad?: boolean; changed?: boolean };
        // 9.9: anything about the number itself goes by email to hello@kabsi.co only, because the number may be what fails.
        if (r.bad && r.changed) {
          const text = `Kabsi's WhatsApp number: status ${h.status}, quality ${h.quality ?? "unknown"}, messaging ${h.messaging ?? "unknown"}. While quality is Medium or worse Kabsi sends digests only. Check the number in Kapso.`;
          await notifyEmail({ category: "direct", kind: "whatsapp_number_alert", key: `whatsapp_number_alert:${new Date().toISOString().slice(0, 13)}`,
            to: [{ email: "hello@kabsi.co", userId: null }],
            content: { subject: "Kabsi WhatsApp number health changed", preheader: "Check the number in Kapso.", title: "WhatsApp number health",
              bodyHtml: `<p>${text}</p>`, text, why: "This notice is for the Kabsi team only." } }).catch(() => {});
        }
        return { ok: true, status: h.status, quality: h.quality, messaging: h.messaging, tier: h.tier, alerted: !!(r.bad && r.changed) };
      }
      default:
        return { ok: false, error: "unknown_action" };
    }
  } catch (e) {
    await captureError("whatsapp", e, { step: `staff_${action}` });
    return { ok: false, error: String((e as Error)?.message ?? e).replace(/[A-Za-z0-9_-]{32,}/g, "[redacted]").slice(0, 200) };
  }
}
