// profile-snapshot: the free Google Profile Check on /google-profile-check and onboarding steps 1 and 2 (P0.4-01).
// Public data only, through the Google layer's Places guard (field mask, daily cap; nothing from Places is stored but the place ID). The Places key
// never reaches the browser. The logic and its limits are in _shared/profile-snapshot.ts.
import { clientIp } from "../_shared/client-ip.ts";
import { getSnapshotPlace, searchText } from "../_shared/google/index.ts";
import { admin, APP_URL, captureError, CORS, esc, rateLimit, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { notify } from "../_shared/notify.ts";
import { makeHandler } from "../_shared/profile-snapshot.ts";
import { whatsappCtx } from "../_shared/whatsapp/db.ts";
import { WHATSAPP_ON } from "../_shared/whatsapp-setting.ts";

Deno.serve(makeHandler({
  env: (name) => Deno.env.get(name),
  ip: (req) => clientIp(req),
  today: () => new Date().toISOString().slice(0, 10),
  sha256Hex,
  rateLimit,
  giveBack: async (key) => {
    await admin().rpc("give_back_rate_limit", { p_key: key });
  },
  verifyTurnstile,
  searchText,
  getSnapshotPlace,
  saveEmail: async (row) => {
    const { error } = await admin().from("profile_check_emails").insert(row);
    if (error) throw error;
  },
  whatsappOn: WHATSAPP_ON,
  saveWhatsapp: async (row) => {
    const { data, error } = await admin().from("profile_check_whatsapp").insert(row).select("id").single();
    if (error) throw error;
    return data.id as string;
  },
  // One approved template message to the number the visitor typed. The mock sender (live switch off) and a missing
  // template never count as sent. Nothing is logged but the outcome: the number and the message stay out of Sentry.
  sendWhatsapp: async ({ to, params }) => {
    // KAPSO_TEMPLATE_PROFILE_CHECK: the Meta-approved template of the one message, set in the WhatsApp go-live session (13b).
    const template = Deno.env.get("KAPSO_TEMPLATE_PROFILE_CHECK");
    if (!template) return { state: "held", error: "no_template" };
    const ctx = await whatsappCtx();
    if (!ctx.on) return { state: "held", error: "no_number" };
    try {
      const s = await ctx.sender.template(to.replace(/^\+/, ""), template, params);
      return { state: ctx.sender.live ? "sent" : "mock_sent", id: s.id };
    } catch (e) {
      return { state: "failed", error: String((e as Error)?.message ?? e).slice(0, 300) };
    }
  },
  markWhatsapp: async (id, r) => {
    const { error } = await admin().from("profile_check_whatsapp")
      .update({ state: r.state, provider_id: r.id ?? null, error: r.error ?? null, sent_at: r.state === "sent" ? new Date().toISOString() : null }).eq("id", id);
    if (error) throw error;
  },
  // Sent because the visitor just asked for it: no choices and no quiet hours (category direct).
  sendEmail: (o) => notify({ category: "direct", kind: o.kind, key: o.dedupeKey, to: [{ email: o.to, userId: null }], content: o.content }),
  captureError,
  appUrl: APP_URL,
  cors: CORS,
  esc,
}));
