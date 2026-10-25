// The database side of the WhatsApp owner channel (P0.8-03): the service-role RPCs of
// 20261022034000_whatsapp_owner_channel.sql, the photo engine's intake for the photo drop, and the context the
// `whatsapp` function and the review alerts share. The number and the Kapso phone number id come from settings, never
// from code: WHATSAPP_NUMBER (whatsapp-setting.ts) and the KAPSO_PHONE_NUMBER_ID secret.
import { admin, APP_URL, log, rateLimit } from "../kabsi.ts";
import { message, MODELS } from "../ai.ts";
import { acceptUpload } from "../photos/intake.ts";
import { WHATSAPP_ON } from "../whatsapp-setting.ts";
import type { AgentDb, AgentDeps } from "./agent.ts";
import { type Ctx, type Db, type MaySend, mockSender, type Sender } from "./deliver.ts";
import type { Ai } from "./intent.ts";
import { pickSender } from "./kapso.ts";
import { flush, type Out, type OutDb, type OutRow } from "./outbox.ts";
import type { SendState } from "./policy.ts";
import type { Who } from "./roles.ts";

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await admin().rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data as T;
}

export const db: Db = {
  maySend: (u) => rpc<MaySend>("whatsapp_may_send", { p_user: u }),
  record: (r) => rpc<string | null>("whatsapp_record", {
    p_user: r.userId, p_location: r.locationId, p_kind: r.kind, p_state: r.state, p_provider_id: r.providerId ?? null,
    p_template: r.template ?? null, p_error: r.error ?? null, p_dedupe: r.dedupe ?? null,
  }),
  inbound: (phone, id, kind) => rpc("whatsapp_inbound", { p_phone: phone, p_provider_id: id, p_kind: kind }),
  verify: (phone, code) => rpc("whatsapp_verify", { p_phone: phone, p_code: code }),
  stop: (phone) => rpc("whatsapp_stop", { p_phone: phone }),
  actionCreate: (u, t, id) => rpc("whatsapp_action_create", { p_user: u, p_target_type: t, p_target_id: id }),
  approve: (token, phone) => rpc("whatsapp_approve", { p_token: token, p_phone: phone }),
  undo: (token, phone) => rpc("whatsapp_undo", { p_token: token, p_phone: phone }),
  photoTarget: (u) => rpc("whatsapp_photo_target", { p_user: u }),
  async acceptPhoto(locationId, userId, bytes) {
    const r = await acceptUpload({ locationId, bytes, source: "whatsapp", userId }, {
      async put(path, b, mime) {
        const { error } = await admin().storage.from("owner-photos").upload(path, b, { contentType: mime });
        if (error) throw error;
      },
      register: (a) => rpc<string>("photo_upload", { p_location: a.locationId, p_path: a.path, p_source: a.source, p_user: a.userId, p_link_hash: null }),
    });
    return r.ok ? { ok: true } : { ok: false, reason: r.reason };
  },
  async statusUpdate(id, state, error) {
    await rpc("whatsapp_status_update", { p_provider_id: id, p_state: state, p_error: error });
  },
};

/** The members of a business who opted in to WhatsApp review alerts (active, not stopped). */
export const alertRecipients = (locationId: string) => rpc<string[] | null>("whatsapp_recipients", { p_location: locationId }).then((r) => r ?? []);

// Session 13b part 1: the agent runs once Kabsi's number is connected in Supabase secrets (KAPSO_PHONE_NUMBER_ID, set
// 23 Oct 2026), while the public site keeps its own setting (whatsapp-setting.ts) until the live test passes and the
// facts change. Live sends still need WHATSAPP_LIVE=true, and until launch go only to Kabsi's own test phones and the
// staff phone (whatsapp_send_state); everything else uses the mock sender.
export const AGENT_ON = WHATSAPP_ON || /^\d{6,}$/.test(Deno.env.get("KAPSO_PHONE_NUMBER_ID") ?? "");

/** The Kapso sender for anything outside the one sender (the free check): live only to an allowed phone. */
function guarded(live: Sender, mock: Sender): Sender {
  const ok = async (to: string) => {
    const phone = to.startsWith("+") ? to : `+${to}`;
    return live.live && ((await outDb.state(phone).catch(() => null))?.live_ok ?? false);
  };
  return {
    live: live.live,
    text: async (to, body) => ((await ok(to)) ? live : mock).text(to, body),
    buttons: async (to, body, b) => ((await ok(to)) ? live : mock).buttons(to, body, b),
    template: async (to, name, params) => ((await ok(to)) ? live : mock).template(to, name, params),
    media: (id) => live.media(id),
  };
}

export const outDb: OutDb = {
  state: (phone) => rpc<SendState>("whatsapp_send_state", { p_phone: phone }),
  add: (r) => rpc<number | null>("whatsapp_outbox_add", {
    p_phone: r.phone, p_user: r.userId, p_location: r.locationId, p_kind: r.kind, p_body: r.body, p_buttons: r.buttons ?? [],
    p_template: r.template ?? null, p_urgent: !!r.urgent, p_dedupe: r.dedupe ?? null, p_due_at: (r.dueAt ?? new Date()).toISOString(),
  }),
  mark: async (ids, state, o = {}) => {
    await rpc("whatsapp_outbox_mark", { p_ids: ids, p_state: state, p_provider_id: o.providerId ?? null, p_error: o.error ?? null,
      p_due_at: o.dueAt ? o.dueAt.toISOString() : null });
  },
  claim: (n) => rpc<OutRow[]>("whatsapp_outbox_claim", { p_limit: n }).then((r) => r ?? []),
  get: (phone, ids) => rpc<OutRow[]>("whatsapp_outbox_get", { p_phone: phone, p_ids: ids }).then((r) => r ?? []),
  release: (phone) => rpc<number>("whatsapp_outbox_release", { p_phone: phone }),
  setQuestion: async (phone, q) => {
    await rpc("whatsapp_conversation_set", { p_phone: phone, p_patch: { open_question: q } });
  },
};

let ctx: Ctx | null = null;
export async function whatsappCtx(): Promise<Ctx> {
  if (ctx) return ctx;
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID") ?? "";
  const live = await pickSender({ live: Deno.env.get("WHATSAPP_LIVE"), apiKey: Deno.env.get("KAPSO_API_KEY"), phoneNumberId, numberOn: AGENT_ON });
  const mock = mockSender();
  const out: Out = { db: outDb, live, mock, now: () => new Date() };
  ctx = {
    db, on: AGENT_ON, phoneNumberId, appUrl: APP_URL, sender: guarded(live, mock), out,
    remember: async (userId, reviewId, locationId) => {
      const { data } = await admin().from("whatsapp_optins").select("phone").eq("user_id", userId).eq("state", "active").maybeSingle();
      if (data?.phone) await rpc("whatsapp_conversation_set", { p_phone: data.phone, p_patch: { last_task: { type: "review", review_id: reviewId, location_id: locationId } } });
    },
  };
  return ctx;
}

/** The agent's dependencies on the real database, Kapso and the model (agent.ts). */
export async function agentDeps(): Promise<AgentDeps> {
  const c = await whatsappCtx();
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  const ai: Ai | null = key
    ? async (system, user) => {
      // One short Haiku call per typed message; a ceiling for the whole number keeps the credit safe (R-45).
      if (!(await rateLimit("wa_intent", 600, 3600))) throw new Error("intent_rate_limited");
      return await message(MODELS.check, system, user, 200);
    }
    : null;
  return {
    db: agentDb, out: c.out!, phoneNumberId: c.phoneNumberId, appUrl: APP_URL,
    media: (id) => c.sender.media(id), ai,
    editDraft: async (reviewId, instruction) => {
      const { draftReview } = await import("../reviews.ts");
      try {
        await draftReview(reviewId, instruction);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: String((e as Error)?.message ?? e).slice(0, 80) };
      }
    },
    // 28.5 hook: V1 replaces this with the Scout job for the first full map.
    firstMap: async (locationId) => (log("whatsapp", { step: "first_map_requested", stub: true, location: locationId }), "stub"),
    // 28.1 hook: V1 replaces this with the map image of the scan's queued 7 by 7 grid.
    mapImage: async () => null,
    flush: () => flush(c.out!),
  };
}

const sha = async (t: string) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)))]
  .map((b) => b.toString(16).padStart(2, "0")).join("");

export const agentDb: AgentDb = {
  store: (phone, id, kind, payload, referral) => rpc("whatsapp_inbound_store", { p_phone: phone, p_provider_id: id, p_kind: kind, p_payload: payload, p_referral: referral }),
  done: async (id, result) => {
    await rpc("whatsapp_inbound_done", { p_id: id, p_result: result });
  },
  resolve: async (phone) => {
    const r = await rpc<{ roles: Who["roles"]; conversation: Who["conversation"] }>("whatsapp_resolve", { p_phone: phone });
    return { phone, roles: r?.roles ?? [], conversation: r?.conversation ?? null };
  },
  setConv: async (phone, patch) => {
    await rpc("whatsapp_conversation_set", { p_phone: phone, p_patch: patch });
  },
  attachCode: async (phone, scan, partner) => {
    await rpc("whatsapp_attach_code", { p_phone: phone, p_scan_code: scan, p_partner_code: partner });
  },
  bind: (phone, code) => rpc("whatsapp_bind", { p_phone: phone, p_code: code }),
  stopOptin: async (phone) => {
    await rpc("whatsapp_stop", { p_phone: phone });
  },
  tokenOwner: (token, phone) => rpc("whatsapp_token_owner", { p_token: token, p_phone: phone }),
  approve: (token, phone) => rpc("whatsapp_approve", { p_token: token, p_phone: phone }),
  undo: (token, phone) => rpc("whatsapp_undo", { p_token: token, p_phone: phone }),
  openItems: (phone) => rpc("whatsapp_open_items", { p_phone: phone }),
  ownerDraft: (u, r, t) => rpc("whatsapp_owner_draft", { p_user: u, p_review: r, p_text: t }),
  actionCreate: (u, t, id) => rpc("whatsapp_action_create", { p_user: u, p_target_type: t, p_target_id: id }),
  stats: (l, days) => rpc("whatsapp_stats", { p_location: l, p_days: days }),
  reviewLink: (l) => rpc("whatsapp_review_link", { p_location: l }),
  acceptPhoto: (l, u, bytes) => db.acceptPhoto(l, u, bytes),
  keepVoice: async (phone, messageId, bytes, mime) => {
    const path = `${(await sha(phone)).slice(0, 16)}/${messageId.replace(/[^A-Za-z0-9_.=-]/g, "_").slice(0, 120)}`;
    const { error } = await admin().storage.from("whatsapp-voice").upload(path, bytes, { contentType: mime ?? "audio/ogg", upsert: true });
    if (error) throw error;
  },
  staffNumbers: () => rpc("whatsapp_staff_numbers", {}),
  staffPause: (name, pause) => rpc("whatsapp_staff_pause", { p_name: name, p_pause: pause }),
  handoff: async (phone, summary) => {
    await rpc("ops_emit", { p_kind: "whatsapp_handoff", p_channel: "customers", p_title: "WhatsApp: a person is asked for",
      p_body: `${summary}. Phone ending ${phone.slice(-4)}. Answer in the Kapso inbox.`, p_dedupe: `wa_handoff:${phone}:${new Date().toISOString().slice(0, 13)}` });
  },
  outboxGet: (phone, ids) => outDb.get(phone, ids),
  releaseHeld: (phone) => outDb.release(phone),
};

/** P0.8-03: a new review to everyone at the business who opted in to WhatsApp alerts, with the latest draft. */
export async function whatsappReviewAlert(loc: { id: string; name: string }, r: { id: string; reviewer_name: string | null; star_rating: number; comment: string | null; risk: string }) {
  if (!AGENT_ON) return {};
  const users = await alertRecipients(loc.id);
  if (!users.length) return {};
  const { data: d } = await admin().from("reply_drafts").select("body, safety_ok").eq("review_id", r.id)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const { sendReviewAlert } = await import("./deliver.ts");
  return sendReviewAlert(await whatsappCtx(), users, {
    reviewId: r.id, locationId: loc.id, business: loc.name, stars: r.star_rating, reviewer: r.reviewer_name, text: r.comment,
    draft: d?.body ?? null, safeDraft: !!d?.safety_ok, risk: r.risk,
  });
}

/** P0.8-03: a post the care routine prepared, to everyone at the business who opted in, with Approve. */
export async function whatsappPostAlert(locationId: string, postId: string, summary: string) {
  if (!AGENT_ON) return {};
  const users = await alertRecipients(locationId);
  if (!users.length) return {};
  const { data: l } = await admin().from("locations").select("name").eq("id", locationId).maybeSingle();
  const { sendPostAlert } = await import("./deliver.ts");
  return sendPostAlert(await whatsappCtx(), users, { postId, locationId, business: (l?.name as string | undefined) ?? "Your business", summary });
}

/** P0.8-04: a Protection change on WhatsApp, with "Put it back" where WhatsApp may approve it. */
export async function whatsappProtectionAlert(loc: { id: string; name: string }, c: { id: string; field: string; label: string; before: string; after: string }) {
  if (!AGENT_ON) return {};
  const users = await alertRecipients(loc.id);
  if (!users.length) return {};
  const { sendProtectionAlert } = await import("./deliver.ts");
  const identity = ["name", "address", "main_category", "categories", "map_pin", "phone", "open_status"].includes(c.field);
  return sendProtectionAlert(await whatsappCtx(), users, { changeId: c.id, locationId: loc.id, business: loc.name, label: c.label, before: c.before, after: c.after, identity });
}
