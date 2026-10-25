// The database side of the WhatsApp owner channel (P0.8-03): the service-role RPCs of
// 20261022034000_whatsapp_owner_channel.sql, the photo engine's intake for the photo drop, and the context the
// `whatsapp` function and the review alerts share. The number and the Kapso phone number id come from settings, never
// from code: WHATSAPP_NUMBER (whatsapp-setting.ts) and the KAPSO_PHONE_NUMBER_ID secret.
import { admin, APP_URL, internalSecret, log, rateLimit } from "../kabsi.ts";
import { message, MODELS, newMeter, task } from "../ai.ts";
import { recordAiUsage } from "../ai-budget.ts";
import { type Nora, noraUser, noraWhatsAppSystem } from "./nora.ts";
import { acceptUpload } from "../photos/intake.ts";
import { WHATSAPP_ON } from "../whatsapp-setting.ts";
import type { AgentDb, AgentDeps, BillingDeps } from "./agent.ts";
import { addLocation, cancelAtEnd, changePlan, currentSub, keepPlan, portal } from "../billing.ts";
import { type Ctx, type Db, type MaySend, mockSender, type Sender } from "./deliver.ts";
import type { Ai } from "./intent.ts";
import { pickSender } from "./kapso.ts";
import { flush, type Out, type OutDb, type OutRow } from "./outbox.ts";
import type { SendState } from "./policy.ts";
import type { Who } from "./roles.ts";
import { suggestKeyword } from "./map.ts";

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
    image: async (to, png, body, b) => {
      const s = (await ok(to)) ? live : mock;
      return s.image ? s.image(to, png, body, b) : s.buttons(to, body, b);
    },
  };
}

export const outDb: OutDb = {
  state: (phone) => rpc<SendState>("whatsapp_send_state", { p_phone: phone }),
  add: (r) => rpc<number | null>("whatsapp_outbox_add", {
    p_phone: r.phone, p_user: r.userId, p_location: r.locationId, p_kind: r.kind, p_body: r.body, p_buttons: r.buttons ?? [],
    p_template: r.template ?? null, p_urgent: !!r.urgent, p_dedupe: r.dedupe ?? null, p_due_at: (r.dueAt ?? new Date()).toISOString(),
    ...(r.media ? { p_media: r.media } : {}),
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

// ─── The map on WhatsApp (28.5): the visibility function owns the grid, the search and the image; WhatsApp asks it.
async function callVisibility(path: string, init: RequestInit = {}): Promise<Response> {
  const secret = await internalSecret();
  if (!secret) throw new Error("no_internal_secret");
  return await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/visibility/${path}`, {
    ...init, headers: { "x-cron-secret": secret, "content-type": "application/json", ...(init.headers ?? {}) },
  });
}
/** The map PNG of one finished grid, drawn by the visibility function (V1); null when it cannot be drawn. */
async function mapPng(scanId: string): Promise<Uint8Array | null> {
  const res = await callVisibility(`image?scan=${encodeURIComponent(scanId)}`, { method: "GET" });
  if (!res.ok) return null;
  const png = new Uint8Array(await res.arrayBuffer());
  return png.length > 100 ? png : null;
}
const runMaps = () => callVisibility("tick", { method: "POST", body: "{}" }).then((r) => r.body?.cancel(), () => {});

/** 28.5: with a confirmed search the first map runs now; without one Kabsi suggests a search for the owner to confirm. */
async function firstMap(locationId: string): Promise<{ state: "started" | "waiting" | "ask" | "none"; keyword?: string | null }> {
  const db = admin();
  const { data: k } = await db.from("visibility_keywords").select("id, keyword").eq("location_id", locationId).eq("active", true)
    .not("confirmed_at", "is", null).order("created_at").limit(1).maybeSingle();
  if (k) {
    const { count } = await db.from("visibility_scans").select("id", { count: "exact", head: true }).eq("location_id", locationId).in("state", ["queued", "done"]);
    if (count) return { state: "waiting", keyword: k.keyword as string };
    await db.from("visibility_keywords").update({ next_run_at: new Date().toISOString() }).eq("id", k.id);
    await runMaps();
    return { state: "started", keyword: k.keyword as string };
  }
  const { data: loc } = await db.from("locations").select("name, category_label, concierge").eq("id", locationId).maybeSingle();
  if (!loc) return { state: "none" };
  // The search terms report (Google's own, read only, never stored) when Google has one; the mock has none.
  let terms: { keyword: string; count: number }[] = [];
  if (!loc.concierge) {
    try {
      const { searchKeywords } = await import("../google/index.ts");
      terms = await searchKeywords(locationId);
    } catch (e) {
      log("whatsapp", { step: "search_terms", ok: false, error: String((e as Error)?.message ?? e).slice(0, 120) });
    }
  }
  return { state: "ask", keyword: suggestKeyword(terms, (loc.category_label as string | null) ?? null, loc.name as string) };
}

/** 27.3 item 1: the owner's yes to a search, through the visibility function (its plan limits and Maps lookup); then the map runs. */
async function confirmKeyword(locationId: string, keyword: string): Promise<{ ok: boolean; reason?: string }> {
  const res = await callVisibility("keyword", { method: "POST", body: JSON.stringify({ location_id: locationId, keyword }) });
  const body = await res.json().catch(() => ({})) as { ok?: boolean; error?: string };
  if (!res.ok || !body.ok) return { ok: false, reason: body.error ?? `http_${res.status}` };
  await runMaps();
  return { ok: true };
}

let ctx: Ctx | null = null;
export async function whatsappCtx(): Promise<Ctx> {
  if (ctx) return ctx;
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID") ?? "";
  const live = await pickSender({ live: Deno.env.get("WHATSAPP_LIVE"), apiKey: Deno.env.get("KAPSO_API_KEY"), phoneNumberId, numberOn: AGENT_ON });
  const mock = mockSender();
  const out: Out = { db: outDb, live, mock, now: () => new Date(), mapPng };
  ctx = {
    db, on: AGENT_ON, phoneNumberId, appUrl: APP_URL, sender: guarded(live, mock), out,
    remember: async (userId, reviewId, locationId) => {
      const { data } = await admin().from("whatsapp_optins").select("phone").eq("user_id", userId).eq("state", "active").maybeSingle();
      if (data?.phone) await rpc("whatsapp_conversation_set", { p_phone: data.phone, p_patch: { last_task: { type: "review", review_id: reviewId, location_id: locationId } } });
    },
  };
  return ctx;
}

// Nora's facts: the public knowledge file the website's Nora reads (knowledge/facts, built to llms-full.txt), refreshed every
// 15 minutes, the last good copy kept.
let factsCache: { text: string; at: number } | null = null;
async function publicFacts(): Promise<string> {
  if (factsCache && Date.now() - factsCache.at < 900_000) return factsCache.text;
  try {
    const res = await fetch(`${APP_URL}/llms-full.txt`, { headers: { accept: "text/plain" } });
    const text = await res.text();
    if (res.ok && text.includes("Kabsi") && text.length > 2000) factsCache = { text, at: Date.now() };
  } catch (e) {
    log("whatsapp", { step: "facts", ok: false, error: String((e as Error)?.message ?? e).slice(0, 120) });
  }
  return factsCache?.text ?? "";
}

/** Nora on WhatsApp: one call of Nora's chat model (Sonnet, 28.6) with the cached facts, counted per agent (25.8). */
function noraFor(key: string | undefined): Nora | null {
  if (!key) return null;
  const chat = task("nora", "chat");
  return async (question, o) => {
    // A ceiling for the whole number keeps the credit safe (R-45).
    if (!(await rateLimit("wa_nora", 300, 3600))) throw new Error("nora_rate_limited");
    const meter = newMeter("nora");
    const text = await message(chat.model, [{ text: noraWhatsAppSystem(await publicFacts()), cache: true }], noraUser(question, o),
      chat.maxTokens, meter, { effort: chat.effort });
    await recordAiUsage(null, meter);
    return text;
  };
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
    media: (id) => c.sender.media(id), ai, nora: noraFor(key),
    editDraft: async (reviewId, instruction) => {
      const { draftReview } = await import("../reviews.ts");
      try {
        await draftReview(reviewId, instruction);
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: String((e as Error)?.message ?? e).slice(0, 80) };
      }
    },
    firstMap,
    confirmKeyword,
    // 28.1 hook: V1 replaces this with the map image of the scan's queued 7 by 7 grid.
    mapImage: async () => null,
    flush: () => flush(c.out!),
    billing: billingDeps,
  };
}

// Session 10: the owner's billing actions on the real Creem code. The agent already checked the phone is the owner's
// (the role list); each call finds the business's organisation here.
async function orgOf(locationId: string): Promise<string> {
  const { data } = await admin().from("locations").select("organization_id").eq("id", locationId).maybeSingle();
  if (!data?.organization_id) throw new Error("no organisation");
  return data.organization_id as string;
}
const billingDeps: BillingDeps = {
  async status(locationId) {
    const s = await currentSub(await orgOf(locationId));
    if (!s) return null;
    return { plan: s.plan === "essentials" ? "essentials" : "pro", period: s.period === "year" ? "year" : "month", state: s.state,
      periodEnd: s.current_period_end, cancelAtEnd: !!s.cancel_at_period_end };
  },
  portal: async (locationId) => await portal(await orgOf(locationId)),
  cancel: async (locationId) => await cancelAtEnd(await orgOf(locationId)),
  keep: async (locationId) => await keepPlan(await orgOf(locationId)),
  change: async (locationId, to) => await changePlan(await orgOf(locationId), to),
  addLocation: async (locationId) => await addLocation(await orgOf(locationId)),
};

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
  start: (phone) => rpc<number>("whatsapp_start", { p_phone: phone }).then((n) => n ?? 0),
  tokenOwner: (token, phone) => rpc("whatsapp_token_owner", { p_token: token, p_phone: phone }),
  approve: (token, phone) => rpc("whatsapp_approve", { p_token: token, p_phone: phone }),
  undo: (token, phone) => rpc("whatsapp_undo", { p_token: token, p_phone: phone }),
  openItems: (phone) => rpc("whatsapp_open_items", { p_phone: phone }),
  // 30.10 point 7: the drafts come from session 19's pipeline functions; the Approve token from whatsapp_action_create.
  async hoursPrepare(locationId, userId, c) {
    try {
      const id = await rpc<string>("special_hours_prepare", { p_location: locationId, p_user: userId, p_from: c.from, p_to: c.to, p_closed: c.closed,
        p_open: c.open, p_close: c.close, p_reason: "Typed on WhatsApp" });
      return await rpc("whatsapp_action_create", { p_user: userId, p_target_type: "special_hours", p_target_id: id });
    } catch (e) {
      return { ok: false, reason: String((e as Error)?.message ?? e).replace(/^special_hours_prepare: /, "").slice(0, 80) };
    }
  },
  async postPrepare(locationId, userId, text) {
    try {
      const id = await rpc<string>("owner_post_prepare", { p_location: locationId, p_user: userId, p_text: text, p_channel: "whatsapp" });
      return await rpc("whatsapp_action_create", { p_user: userId, p_target_type: "local_post", p_target_id: id });
    } catch (e) {
      return { ok: false, reason: String((e as Error)?.message ?? e).replace(/^owner_post_prepare: /, "").slice(0, 80) };
    }
  },
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
  staffSummary: () => rpc("whatsapp_staff_summary", {}),
  staffPause: (name, pause) => rpc("whatsapp_staff_pause", { p_name: name, p_pause: pause }),
  handoff: async (phone, summary) => {
    await rpc("ops_emit", { p_kind: "whatsapp_handoff", p_channel: "customers", p_title: "WhatsApp: a person is asked for",
      p_body: `${summary}. Phone ending ${phone.slice(-4)}. Answer in the Kapso inbox.`, p_dedupe: `wa_handoff:${phone}:${new Date().toISOString().slice(0, 13)}` });
  },
  outboxGet: (phone, ids) => outDb.get(phone, ids),
  async mapDetails(scanId) {
    const { data } = await admin().from("visibility_scans").select("location_id, keyword, top3, ranked, average_rank, competitors, state, locations(name)")
      .eq("id", scanId).maybeSingle();
    if (!data || data.state !== "done") return null;
    const { count } = await admin().from("visibility_points").select("scan_id", { count: "exact", head: true }).eq("scan_id", scanId);
    const loc = (Array.isArray(data.locations) ? data.locations[0] : data.locations) as { name: string } | null;
    return {
      location_id: data.location_id as string, business: loc?.name ?? "", keyword: data.keyword as string, points: count ?? 49,
      top3: Number(data.top3 ?? 0), ranked: Number(data.ranked ?? 0), average: data.average_rank === null ? null : Number(data.average_rank),
      competitors: ((data.competitors ?? []) as { name: string }[]).map((c) => c.name).slice(0, 3),
    };
  },
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
