// The WhatsApp owner channel (P0.8-03, K-129): the pure parts. Kapso's signature, the Kapso v2 webhook payload, what an
// inbound message means, and the wording Kabsi sends. No database, network or environment access here: the `whatsapp`
// Edge Function wires these to the database and to Kapso, and the tests wire them to fakes.
//
// Rules this file carries:
//   - A webhook counts only with a valid X-Webhook-Signature (HMAC-SHA256 of the raw body with the webhook secret,
//     hex), for Kabsi's own phone number id, and with a message time inside the replay window.
//   - STOP and its variants stop every send at once (K-129 point 7); the words are read in router.ts.
//   - What a review alert says is set under K-113 as amended on 21 Oct 2026: the business, the star rating, the
//     reviewer's first name, the review text up to 300 characters and the draft. Nothing else of a review.
//   - Approve is offered only where WhatsApp may approve (low and medium risk replies and weekly posts; K-129 point 2);
//     everything else gets "Edit in app".
// Session 13b part 1: what a message asks for is read by router.ts and answered by agent.ts (say.ts holds the words).

export const REPLAY_WINDOW_SECONDS = 600;

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

/** Constant-time check of Kapso's X-Webhook-Signature against the raw request bytes. */
export async function verifySignature(secret: string, raw: Uint8Array<ArrayBuffer>, header: string | null): Promise<boolean> {
  if (!secret || !header || !/^[0-9a-f]{64}$/i.test(header.trim())) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const want = hex(await crypto.subtle.sign("HMAC", key, raw));
  const got = header.trim().toLowerCase();
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export type Media = { kind: "image" | "document" | "audio" | "video" | "sticker"; id: string; mime: string | null; filename: string | null; size: number | null; voice: boolean };
export type Contact = { name: string | null; phones: string[] };
export type Inbound = {
  phoneNumberId: string;
  from: string; // E.164 with the plus sign
  messageId: string;
  timestamp: number; // seconds
  type: string;
  text: string | null;
  buttonId: string | null;
  mediaId: string | null;
  // Session 13b part 1: every kind of media, shared contacts, and the Click-to-WhatsApp referral (20.3).
  media?: Media | null;
  contacts?: Contact[];
  referral?: Record<string, string> | null;
};
export type StatusEvent = { messageId: string; status: "sent" | "delivered" | "read" | "failed"; error: string | null };

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown): string | null => (typeof v === "string" && v.length ? v : null);

/** Normalises a Kapso v2 phone-number webhook (one event, or a batch under `data`) into messages and receipts. */
export function parseWebhook(event: string | null, body: unknown): { messages: Inbound[]; statuses: StatusEvent[] } {
  const b = obj(body);
  const items = Array.isArray(b.data) ? (b.data as unknown[]) : [b];
  const messages: Inbound[] = [];
  const statuses: StatusEvent[] = [];
  for (const it of items) {
    const p = obj(it);
    const m = obj(p.message);
    const conv = obj(p.conversation);
    const k = obj(m.kapso);
    const id = str(m.id);
    if (!id) continue;
    const kind = str(obj(it).event) ?? event ?? "";
    if (kind === "whatsapp.message.received" || k.direction === "inbound") {
      const interactive = obj(m.interactive);
      const button = str(obj(interactive.button_reply).id) ?? str(obj(interactive.list_reply).id) ?? str(obj(m.button).payload);
      const from = str(conv.phone_number) ?? (str(m.from) ? `+${String(m.from).replace(/\D/g, "")}` : null);
      if (!from) continue;
      messages.push({
        phoneNumberId: str(p.phone_number_id) ?? str(conv.phone_number_id) ?? "",
        from: from.startsWith("+") ? from : `+${from.replace(/\D/g, "")}`,
        messageId: id,
        timestamp: Number(m.timestamp ?? 0),
        type: str(m.type) ?? "unknown",
        text: str(obj(m.text).body) ?? str(obj(m.button).text) ?? caption(m),
        buttonId: button,
        mediaId: str(obj(m.image).id),
        media: mediaOf(m, k),
        contacts: contactsOf(m),
        referral: referralOf(m),
      });
    } else if (["sent", "delivered", "read", "failed"].includes(String(k.status))) {
      const errs = (Array.isArray(k.statuses) ? (k.statuses as unknown[]) : []).flatMap((s) => (Array.isArray(obj(s).errors) ? (obj(s).errors as unknown[]) : []));
      statuses.push({ messageId: id, status: k.status as StatusEvent["status"], error: errs.length ? String(obj(errs[0]).title ?? obj(errs[0]).message ?? "failed") : null });
    }
  }
  return { messages, statuses };
}

const MEDIA_KINDS = ["image", "document", "audio", "video", "sticker"] as const;
const caption = (m: Obj): string | null => {
  for (const k of MEDIA_KINDS) { const c = str(obj(m[k]).caption); if (c) return c; }
  return null;
};
function mediaOf(m: Obj, k: Obj): Media | null {
  for (const kind of MEDIA_KINDS) {
    const x = obj(m[kind]);
    const id = str(x.id);
    if (!id) continue;
    const md = obj(k.media_data);
    const size = Number(x.file_size ?? md.byte_size ?? NaN);
    return { kind, id, mime: str(x.mime_type) ?? str(md.content_type), filename: str(x.filename) ?? str(md.filename),
      size: Number.isFinite(size) ? size : null, voice: x.voice === true };
  }
  return null;
}
function contactsOf(m: Obj): Contact[] {
  if (!Array.isArray(m.contacts)) return [];
  return (m.contacts as unknown[]).slice(0, 5).map((c) => ({
    name: str(obj(obj(c).name).formatted_name) ?? str(obj(obj(c).name).first_name),
    phones: (Array.isArray(obj(c).phones) ? (obj(c).phones as unknown[]) : []).map((p) => str(obj(p).wa_id) ?? str(obj(p).phone) ?? "").filter(Boolean).slice(0, 3),
  }));
}
// 20.3: the ad a Click-to-WhatsApp chat came from. Only ids and the click id are kept, never the ad's text or media.
function referralOf(m: Obj): Record<string, string> | null {
  const r = obj(m.referral);
  const out: Record<string, string> = {};
  for (const key of ["ctwa_clid", "source_id", "source_type", "source_url", "ad_id", "adset_id", "campaign_id"]) {
    const v = r[key];
    if (typeof v === "string" && v.length && v.length <= 500) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}

/** Inside the replay window: a message older than 10 minutes (or from the future) is refused. */
export function fresh(timestampSeconds: number, nowMs: number): boolean {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return false;
  const age = nowMs / 1000 - timestampSeconds;
  return age <= REPLAY_WINDOW_SECONDS && age >= -60;
}

// The wording of the review alert, the post alert and the buttons is in alert-text.ts, so the public website can draw the
// same message in its mockups without loading this file. Re-exported here for the function and its tests.
export { REVIEW_EXCERPT_MAX, alertButtons, excerpt, firstName, postAlertBody, reviewAlertBody, undoButton } from "./alert-text.ts";
export type { Button, ReviewAlert } from "./alert-text.ts";
