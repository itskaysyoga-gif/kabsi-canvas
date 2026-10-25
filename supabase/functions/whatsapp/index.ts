// whatsapp: Kabsi's WhatsApp agent (P0.8-03, session 13b part 1). verify_jwt is off because Kapso calls it.
//   POST /whatsapp          the Kapso webhook. Every request must carry Kapso's X-Webhook-Signature over the raw body (the
//                           secret is in Supabase Vault, or KAPSO_WEBHOOK_SECRET); a forged one is refused before anything
//                           is read. Each message is stored once and answered in the background, so Kapso gets its 200
//                           at once and the owner sees the reply within seconds.
//   POST /whatsapp/tick     internal (x-cron-secret, pg_cron every minute when something is due): the one sender's queue,
//                           messages whose first try did not finish, and the "Google needs action" messages (18.2).
//   POST /whatsapp/staff/*  internal, staff only: setup (the webhook, its secret into Vault), templates, health (hourly),
//                           automations, digest (the morning staff digest, 08:00 Beirut). KAPSO_API_KEY is read here and
//                           never leaves Supabase secrets.
// Staff alerts (9.9, R-64): the tick takes each new ops_events row once and sends the urgent ones to the staff phone.
// Nothing is sent live unless WHATSAPP_LIVE is true, and until launch only to Kabsi's own test phones and the staff phone.
import { admin, captureError, fail, isInternal, json, timingSafeEqual } from "../_shared/kabsi.ts";
import { notify as notifyEmail } from "../_shared/notify.ts";
import { parseWebhook, verifySignature } from "../_shared/whatsapp/channel.ts";
import { agentDeps, whatsappCtx } from "../_shared/whatsapp/db.ts";
import { handle, receive } from "../_shared/whatsapp/agent.ts";
import type { Inbound } from "../_shared/whatsapp/channel.ts";
import { flush, notify } from "../_shared/whatsapp/outbox.ts";
import { caseOf, needsActionBody } from "../_shared/whatsapp/google-action.ts";
import { SAY } from "../_shared/whatsapp/say.ts";
import { ref } from "../_shared/whatsapp/templates.ts";
import { checkAutomations, healthAlertText, type KapsoEnv, listWebhooks, readHealth, setupWebhook, submitTemplates } from "../_shared/whatsapp/kapso-admin.ts";
import { SCENARIO_NAMES, sign } from "../_shared/whatsapp/replay.ts";
import { replayMedia } from "../_shared/whatsapp/replay-media.ts";
import { replayIo } from "../_shared/whatsapp/replay-db.ts";
import { runScenario } from "../_shared/whatsapp/replay-run.ts";
import { alertHour, alertSummary } from "../_shared/whatsapp/smoke-alert.ts";
import { alertText, digestDue, morningDigest, type OpsEvent, routeOf, type Summary } from "../_shared/whatsapp/staff-alerts.ts";

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
  // QA 1 (master plan 30.12): staff-only replay of a named scenario from fictional phones through the normal inbound path.
  if (path.endsWith("/staff/replay")) return (await isInternal(req)) ? await replay(req) : fail("forbidden", "Forbidden.", 403);
  // QA 1: the nightly smoke test (GitHub Actions) tells the staff phones when it fails. Its own token, nothing else.
  if (path.endsWith("/qa/alert")) return await smokeAlert(req);
  const staff = /\/staff\/([a-z]+)$/.exec(path);
  if (staff) return (await isInternal(req)) ? json(await staffAction(staff[1])) : fail("forbidden", "Forbidden.", 403);
  return await webhook(req);
});

async function webhook(req: Request, opts: { background?: (p: Promise<unknown>) => void; media?: (id: string) => Promise<Uint8Array> } = {}): Promise<Response> {
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
  const base = await agentDeps();
  const deps = opts.media ? { ...base, media: opts.media } : base;
  const done: string[] = [];
  for (const m of messages) {
    try {
      done.push(await receive(deps, m, opts.background ?? background));
    } catch (e) {
      // No message content goes to Sentry, only the step (K-113).
      await captureError("whatsapp", e, { step: "inbound", type: m.type });
      done.push("error");
    }
  }
  // Always 200 after a valid signature, so Kapso does not retry what was already stored once.
  return json({ ok: true, handled: done.length, statuses: statuses.length });
}

async function smokeAlert(req: Request): Promise<Response> {
  const given = req.headers.get("x-smoke-token") ?? "";
  const { data: token } = await admin().rpc("internal_secret", { p_name: "qa_smoke_token" });
  if (!given || typeof token !== "string" || !token || !timingSafeEqual(given, token)) return fail("forbidden", "Forbidden.", 403);
  const body = (await req.json().catch(() => ({}))) as { summary?: unknown; run?: unknown };
  const text = `Nightly smoke test failed: ${alertSummary(body.summary)}`;
  // The run's address goes in the full message only (a template carries no link); it must be a GitHub Actions address.
  const run = typeof body.run === "string" && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+$/.test(body.run) ? body.run : null;
  const hour = alertHour(new Date());
  await admin().rpc("ops_emit", { p_kind: "smoke_failed", p_channel: "alerts", p_title: "Nightly smoke test failed", p_body: text, p_dedupe: `smoke:${hour}` });
  const deps = await agentDeps();
  let told = 0;
  for (const phone of await staffAdminPhones()) {
    await notify(deps.out, { phone, userId: null, locationId: null, kind: "staff_alert", urgent: true, body: run ? `${text}. ${run}` : `${text}.`,
      template: ref("staff_alert", { summary: text }), dedupe: `smoke:${hour}:${phone}` });
    told++;
  }
  return json({ ok: true, told });
}

// The replay route: the scenario is chosen by name (no message text comes from the caller). Each message is signed here,
// with the webhook secret read from Vault, and goes through webhook() exactly as Kapso's own would; the background work
// is awaited so the answers can be read back. The secret is never returned or logged.
async function replay(req: Request): Promise<Response> {
  const { scenario } = (await req.json().catch(() => ({}))) as { scenario?: string };
  if (!scenario || !SCENARIO_NAMES.includes(scenario)) return fail("unknown_scenario", `Use one of: ${SCENARIO_NAMES.join(", ")}.`, 400);
  const ctx = await whatsappCtx();
  if (!ctx.on || !ctx.phoneNumberId) return fail("not_configured", "WhatsApp is not set up.", 503);
  const io = replayIo({
    phoneNumberId: ctx.phoneNumberId,
    async deliver(p) {
      const raw = new TextEncoder().encode(JSON.stringify(p.body));
      const signature = await sign(await webhookSecret(), raw);
      const pending: Promise<unknown>[] = [];
      const res = await webhook(
        new Request(FN_URL, { method: "POST", headers: { "x-webhook-signature": signature, "x-webhook-event": p.event }, body: raw }),
        { background: (x) => void pending.push(x), media: async (id) => replayMedia(id) },
      );
      await Promise.allSettled(pending);
      if (!res.ok) throw new Error(`the inbound path answered ${res.status}`);
    },
  });
  return json(await runScenario(io, scenario, crypto.randomUUID().slice(0, 8)));
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
        dedupe: `gna:${g.task_id}:${g.cleared ? "cleared" : String(g.evidence?.action ?? "open")}:${g.user_id}` });
      for (const p of staffPhones) {
        await notify(deps.out, { phone: p, userId: null, locationId: g.location_id, kind: "staff_alert", urgent: true,
          body: `Google ${g.cleared ? "cleared" : "needs action on"} ${g.business}. The owner has been told on WhatsApp.`,
          template: ref("staff_alert", { summary: `Google ${g.cleared ? "cleared" : "needs action on"} ${g.business}` }),
          dedupe: `gna_staff:${g.task_id}:${g.cleared ? "cleared" : String(g.evidence?.action ?? "open")}:${p}` });
      }
    }
    out.google_action = due.length;
  } catch (e) {
    await captureError("whatsapp", e, { step: "google_action" });
  }
  // 28.5: a finished map goes to the owners and managers who connected WhatsApp, the image with its line (COPY 20). The
  // first map is what the owner just asked for, so it goes at once; later maps follow the sending rules.
  try {
    const { data } = await admin().rpc("whatsapp_maps_due");
    const maps = (data ?? []) as { scan_id: string; location_id: string; business: string; first: boolean; message: { body?: string } | null; to: { user_id: string; phone: string }[] }[];
    for (const m of maps) {
      const line = m.message?.body;
      if (line) {
        for (const r of m.to) {
          await notify(deps.out, { phone: r.phone, userId: r.user_id, locationId: m.location_id, kind: m.first ? "first_map" : "map_ready",
            body: `${m.business}: ${line}`, buttons: [{ id: `m:s:${m.scan_id}`, title: "Show me" }, { id: "m:l", title: "Later" }],
            media: { map_scan: m.scan_id }, template: ref("map_ready", { business: m.business }), urgent: m.first, dedupe: `map:${m.scan_id}:${r.user_id}` });
        }
      }
      await admin().rpc("whatsapp_map_sent", { p_scan: m.scan_id });
    }
    out.maps = maps.length;
  } catch (e) {
    await captureError("whatsapp", e, { step: "maps" });
  }
  // 9.9: staff alerts. Each new ops_events row is taken once; urgent ones go to the staff phone at once (quiet hours and the
  // cap do not apply), the rest are counted in the morning digest. Nothing about the number itself goes here (email only).
  try {
    const { data } = await admin().rpc("whatsapp_ops_claim", { p_limit: 50 });
    const events = (data ?? []) as OpsEvent[];
    const urgent = events.filter((e) => routeOf(e) === "urgent");
    const phones = urgent.length ? await staffAdminPhones() : [];
    for (const e of urgent) {
      const a = alertText(e);
      for (const phone of phones) {
        await notify(deps.out, { phone, userId: null, locationId: null, kind: "staff_alert", urgent: true, body: a.body,
          template: ref("staff_alert", { summary: a.summary }), dedupe: `ops:${e.id}:${phone}` });
      }
    }
    out.alerts = { taken: events.length, urgent: urgent.length };
  } catch (e) {
    await captureError("whatsapp", e, { step: "staff_alerts" });
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
        // Read back from Kapso and from Vault: ids, URL, active flag, and whether the secret exists (never its value).
        const listed = await listWebhooks(env, FN_URL);
        const inVault = !!(Deno.env.get("KAPSO_WEBHOOK_SECRET") || (await admin().rpc("internal_secret", { p_name: "kapso_webhook_secret" })).data);
        return { ok: true, webhook_id: w.id, created: w.created, updated: w.updated, webhooks: listed, secret_in_vault: inVault, automations: await checkAutomations(env) };
      }
      case "templates":
        return { ok: true, templates: await submitTemplates(env) };
      // 9.9, 30.9 item 5: the one morning digest to the staff phone, 08:00 Beirut, once a day, with one-tap buttons.
      case "digest": {
        const due = digestDue(new Date());
        if (!due.due) return { ok: true, skipped: "not_08_beirut" };
        const ctx = await whatsappCtx();
        if (!ctx.on || !ctx.out) return { ok: false, error: "whatsapp_off" };
        const { data, error } = await admin().rpc("whatsapp_staff_summary");
        if (error) throw new Error(`summary: ${error.message}`);
        const d = morningDigest(data as Summary);
        let told = 0;
        for (const phone of await staffAdminPhones()) {
          await notify(ctx.out, { phone, userId: null, locationId: null, kind: "staff_digest", urgent: true, body: d.body, buttons: d.buttons,
            template: ref("staff_alert", { summary: "your morning digest is ready" }), dedupe: `staff_digest:${due.day}:${phone}` });
          told++;
        }
        return { ok: true, told };
      }
      case "automations":
        return { ok: true, ...(await checkAutomations(env)) };
      // QA 1 (30.12 item 3): one real utility template to Kabsi's own allow-listed phone (the staff phone), once an hour at most.
      // The delivered status then arrives from Kapso on the webhook and is read back with /staff/deliverystatus.
      case "delivery": {
        const ctx = await whatsappCtx();
        if (!ctx.out?.live.live) return { ok: false, error: "live_sender_off" };
        const since = new Date(Date.now() - 3600_000).toISOString();
        const { data: recent } = await admin().from("whatsapp_messages").select("provider_id, state").eq("kind", "qa_delivery_proof").gte("created_at", since).limit(1);
        if (recent?.length) return { ok: false, error: "already_sent_this_hour", provider_id: recent[0]?.provider_id, state: recent[0]?.state };
        const { data: roles } = await admin().from("phone_roles").select("phone, user_id").eq("role", "staff_admin").is("revoked_at", null).limit(1);
        const target = roles?.[0];
        if (!target?.phone) return { ok: false, error: "no_staff_phone" };
        const st = await ctx.out.db.state(target.phone as string);
        if (!st.live_ok) return { ok: false, error: "phone_not_allow_listed" };
        const t = ref("staff_alert", { summary: "QA 1 delivery check, no action needed" });
        let sent: { id: string };
        let via = "template";
        try {
          sent = await ctx.out.live.template(target.phone as string, t.name, t.params);
        } catch (e) {
          // Meta has not approved the template yet (25 Oct: all ten pending). Inside the 24 hour window the person's own last message
          // opened, one plain line to the same allow-listed phone proves the same loop: send, then Kapso's delivered receipt.
          const open = st.window_expires_at && Date.parse(st.window_expires_at) > Date.now();
          if (!open || !/132001|does not exist/i.test(String((e as Error)?.message ?? e))) throw e;
          sent = await ctx.out.live.text(target.phone as string, "Kabsi QA delivery check. No action needed.");
          via = "text_in_window";
        }
        await admin().rpc("whatsapp_record", { p_user: target.user_id, p_location: null, p_kind: "qa_delivery_proof", p_state: "sent", p_provider_id: sent.id, p_template: via === "template" ? t.name : null });
        return { ok: true, provider_id: sent.id, to_ending: (target.phone as string).slice(-4), via };
      }
      case "deliverystatus": {
        const { data } = await admin().from("whatsapp_messages").select("provider_id, state, template, error, created_at, updated_at").eq("kind", "qa_delivery_proof").order("created_at", { ascending: false }).limit(1);
        return { ok: true, message: data?.[0] ?? null };
      }
      case "health": {
        const h = await readHealth(env);
        const { data } = await admin().rpc("whatsapp_health_record", { p_status: h.status, p_quality: h.quality, p_messaging: h.messaging, p_tier: h.tier, p_detail: h.detail });
        const r = (data ?? {}) as { bad?: boolean; changed?: boolean };
        // 9.9: anything about the number itself goes by email to hello@kabsi.co only, because the number may be what fails.
        // Only YELLOW or RED quality, or BLOCKED messaging (public.whatsapp_health_record); LIMITED at tier 250 is normal.
        if (r.bad && r.changed) {
          const text = healthAlertText(h);
          await notifyEmail({ category: "internal", kind: "whatsapp_number_alert", key: `whatsapp_number_alert:${new Date().toISOString().slice(0, 13)}`,
            to: [{ email: "hello@kabsi.co", userId: null }],
            content: { subject: "Kabsi WhatsApp number health changed", preheader: "Check the number in Kapso.", title: "WhatsApp number health",
              bodyHtml: `<p>${text}</p>`, text } }).catch(() => {});
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
