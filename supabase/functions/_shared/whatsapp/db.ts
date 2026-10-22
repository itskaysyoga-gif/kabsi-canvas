// The database side of the WhatsApp owner channel (P0.8-03): the service-role RPCs of
// 20261022034000_whatsapp_owner_channel.sql, the photo engine's intake for the photo drop, and the context the
// `whatsapp` function and the review alerts share. The number and the Kapso phone number id come from settings, never
// from code: WHATSAPP_NUMBER (whatsapp-setting.ts) and the KAPSO_PHONE_NUMBER_ID secret.
import { admin, APP_URL } from "../kabsi.ts";
import { acceptUpload } from "../photos/intake.ts";
import { WHATSAPP_ON } from "../whatsapp-setting.ts";
import type { Ctx, Db, MaySend } from "./deliver.ts";
import { pickSender } from "./kapso.ts";

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

let ctx: Ctx | null = null;
export async function whatsappCtx(): Promise<Ctx> {
  if (ctx) return ctx;
  const phoneNumberId = Deno.env.get("KAPSO_PHONE_NUMBER_ID") ?? "";
  ctx = {
    db, on: WHATSAPP_ON, phoneNumberId, appUrl: APP_URL,
    sender: await pickSender({ live: Deno.env.get("WHATSAPP_LIVE"), apiKey: Deno.env.get("KAPSO_API_KEY"), phoneNumberId, numberOn: WHATSAPP_ON }),
    templates: { review: Deno.env.get("KAPSO_TEMPLATE_REVIEW_ALERT") || null, post: Deno.env.get("KAPSO_TEMPLATE_POST_READY") || null },
  };
  return ctx;
}

/** P0.8-03: a new review to everyone at the business who opted in to WhatsApp alerts, with the latest draft. */
export async function whatsappReviewAlert(loc: { id: string; name: string }, r: { id: string; reviewer_name: string | null; star_rating: number; comment: string | null; risk: string }) {
  if (!WHATSAPP_ON) return {};
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
