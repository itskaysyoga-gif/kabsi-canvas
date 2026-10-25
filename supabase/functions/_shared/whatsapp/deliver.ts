// The WhatsApp owner channel (P0.8-03, K-129): sending and answering. Every function here takes its database calls and
// its sender as deps, so the tests drive it with fakes and nothing reaches Kapso or Meta from a test.
//
// Sending rules (K-129 points 1, 4 and 7, K-146):
//   - nothing goes out while Kabsi has no WhatsApp number (the one setting, whatsapp-setting.ts);
//   - nothing goes to anyone without an active opt-in, and nothing after STOP;
//   - inside the 24-hour window a normal message with buttons; outside it only an approved template, and without one
//     the message is held (recorded, not sent);
//   - the sender is a mock unless the live switch is on (no live send until Rashid says so).
// Session 13b part 1: with the agent's one sender in the context (ctx.out), every alert is queued there instead and
// follows its rules (6 a day, quiet hours, batching, digests, the window). Answers to inbound messages are the agent's.
import { alertButtons, type Button, postAlertBody, type ReviewAlert, reviewAlertBody } from "./channel.ts";
import { notify, type Out } from "./outbox.ts";
import { ref, type TemplateRef } from "./templates.ts";

export type Sent = { id: string };
export interface Sender {
  readonly live: boolean;
  text(to: string, body: string): Promise<Sent>;
  buttons(to: string, body: string, buttons: Button[]): Promise<Sent>;
  template(to: string, name: string, params: Record<string, string> | string[]): Promise<Sent>;
  media(mediaId: string): Promise<Uint8Array>;
}

export type MaySend =
  | { ok: false; reason: "no_optin" | "stopped" | "not_verified" }
  | { ok: true; phone: string; in_window: boolean; review_alerts: boolean; digest: boolean };

export type Db = {
  maySend(userId: string): Promise<MaySend>;
  record(r: { userId: string | null; locationId: string | null; kind: string; state: string; providerId?: string | null; template?: string | null; error?: string | null; dedupe?: string | null }): Promise<string | null>;
  inbound(phone: string, providerId: string, kind: string): Promise<{ duplicate: boolean; known?: boolean; user_id?: string | null; state?: string | null }>;
  verify(phone: string, code: string): Promise<{ result: string; user_id?: string }>;
  stop(phone: string): Promise<{ result: string }>;
  actionCreate(userId: string, targetType: string, targetId: string): Promise<{ ok: boolean; token?: string; reason?: string }>;
  approve(token: string, phone: string): Promise<{ result: string; reason?: string; repeat?: boolean; target_type?: string }>;
  undo(token: string, phone: string): Promise<{ result: string }>;
  photoTarget(userId: string): Promise<{ ok: boolean; location_id?: string; reason?: string }>;
  acceptPhoto(locationId: string, userId: string, bytes: Uint8Array): Promise<{ ok: boolean; reason?: string }>;
  statusUpdate(providerId: string, state: string, error: string | null): Promise<void>;
};

export type Ctx = {
  db: Db; sender: Sender; on: boolean; phoneNumberId: string; appUrl: string; now?: () => number;
  /** The agent's one sender; when present every alert goes through it. */
  out?: Out;
  /** Remembers the review an alert was about, so "make it shorter" or "reply: ..." knows which one (9.3). */
  remember?: (userId: string, reviewId: string, locationId: string) => Promise<void>;
};

type Outgoing = { userId: string; locationId: string | null; kind: string; dedupe?: string; body: string; buttons?: Button[]; template?: TemplateRef | null; alert?: "review" | "digest"; urgent?: boolean };

/** One message to one person, under the sending rules above. Returns what happened. */
export async function deliver(ctx: Ctx, o: Outgoing): Promise<string> {
  const rec = (state: string, extra: { providerId?: string; template?: string | null; error?: string } = {}) =>
    ctx.db.record({ userId: o.userId, locationId: o.locationId, kind: o.kind, state, dedupe: o.dedupe ?? null, ...extra }).then(() => state);
  if (!ctx.on) return "off";
  const may = await ctx.db.maySend(o.userId);
  if (!may.ok) return rec("refused", { error: may.reason });
  if (o.alert === "review" && !may.review_alerts) return "off_for_alerts";
  if (o.alert === "digest" && !may.digest) return "off_for_digest";
  if (ctx.out) {
    return await notify(ctx.out, { phone: may.phone, userId: o.userId, locationId: o.locationId, kind: o.kind, body: o.body,
      buttons: o.buttons, template: o.template ?? null, urgent: o.urgent, dedupe: o.dedupe ?? null });
  }
  const done = ctx.sender.live ? "sent" : "mock_sent";
  try {
    if (may.in_window) {
      const s = o.buttons?.length ? await ctx.sender.buttons(may.phone, o.body, o.buttons) : await ctx.sender.text(may.phone, o.body);
      return rec(done, { providerId: s.id });
    }
    if (o.template?.name) {
      const s = await ctx.sender.template(may.phone, o.template.name, o.template.params);
      return rec(done, { providerId: s.id, template: o.template.name });
    }
    return rec("held", { error: "outside_24h_window_no_template" });
  } catch (e) {
    return rec("failed", { error: String((e as Error)?.message ?? e).slice(0, 300) });
  }
}

export type ReviewForAlert = ReviewAlert & { reviewId: string; locationId: string; risk: string; safeDraft: boolean };

/** A review alert to each opted-in person: the draft and Approve (low and medium risk only) or the link to the app. */
export async function sendReviewAlert(ctx: Ctx, userIds: string[], r: ReviewForAlert): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const userId of userIds) {
    const canApprove = r.risk !== "high" && r.safeDraft && !!r.draft;
    const action = canApprove ? await ctx.db.actionCreate(userId, "review_reply", r.reviewId) : { ok: false };
    const body = `${reviewAlertBody({ ...r, draft: canApprove ? r.draft : null })}\n\nOpen in Kabsi: ${ctx.appUrl}/app/reviews?f=needs`;
    out[userId] = await deliver(ctx, {
      userId, locationId: r.locationId, kind: "review_alert", dedupe: `review_alert:${r.reviewId}:${userId}`, body, alert: "review",
      buttons: action.ok && action.token ? alertButtons(action.token, true) : undefined,
      template: ref("review_waiting", { business: r.business, stars: String(r.stars) }),
    });
    await ctx.remember?.(userId, r.reviewId, r.locationId).catch(() => {});
  }
  return out;
}

/** A prepared post to approve: the same Approve with a 10 second undo. */
export async function sendPostAlert(ctx: Ctx, userIds: string[], p: { postId: string; locationId: string; business: string; summary: string }) {
  const out: Record<string, string> = {};
  for (const userId of userIds) {
    const action = await ctx.db.actionCreate(userId, "local_post", p.postId);
    out[userId] = await deliver(ctx, {
      userId, locationId: p.locationId, kind: "post_alert", dedupe: `post_alert:${p.postId}:${userId}`, alert: "review",
      body: `${postAlertBody(p.business, p.summary)}\n\nOpen in Kabsi: ${ctx.appUrl}/app/posts`,
      buttons: action.ok && action.token ? alertButtons(action.token, true) : undefined,
      template: ref("post_ready", { business: p.business }),
    });
  }
  return out;
}

/** A Google Protection change (K-130 point 1): what Google shows and what the owner approved, with "Put it back" for the
 *  fields WhatsApp may approve. The identity fields get only the link to the app, where the owner signs in. Never says who
 *  made the edit beyond what Google says (K-130 point 4). */
export async function sendProtectionAlert(ctx: Ctx, userIds: string[], c: { changeId: string; locationId: string; business: string; label: string; before: string; after: string; identity: boolean }) {
  const out: Record<string, string> = {};
  for (const userId of userIds) {
    const action = c.identity ? { ok: false } : await ctx.db.actionCreate(userId, "listing_revert", c.changeId);
    const body = [`${c.business}: your ${c.label} changed on Google.`, `Google shows: ${c.after || "nothing"}`,
      `You approved: ${c.before || "nothing"}`, `Open in Kabsi: ${ctx.appUrl}/app/shield`].join("\n\n").slice(0, 1024);
    out[userId] = await deliver(ctx, {
      userId, locationId: c.locationId, kind: "protection_alert", dedupe: `protection_alert:${c.changeId}:${userId}`, body, alert: "review",
      buttons: action.ok && action.token ? [{ id: `a:${action.token}`, title: "Put it back" }] : undefined,
      template: ref("listing_change", { business: c.business, field: c.label }),
      // Identity-field changes go at once, quiet hours or not (9.5).
      urgent: c.identity,
    });
  }
  return out;
}

/** A mock sender: records nothing outside Kabsi and calls nobody. Used until the live switch is on. */
export function mockSender(log: { to: string; kind: string; body: string }[] = []): Sender {
  let n = 0;
  const id = () => `mock-${Date.now()}-${++n}`;
  return {
    live: false,
    text: async (to, body) => (log.push({ to, kind: "text", body }), { id: id() }),
    buttons: async (to, body, b) => (log.push({ to, kind: `buttons:${b.map((x) => x.title).join("|")}`, body }), { id: id() }),
    template: async (to, name) => (log.push({ to, kind: `template:${name}`, body: "" }), { id: id() }),
    media: async () => new Uint8Array(),
  };
}
