// The WhatsApp owner channel (P0.8-03, K-129): the pure parts. Kapso's signature, the Kapso v2 webhook payload, what an
// inbound message means, and the wording Kabsi sends. No database, network or environment access here: the `whatsapp`
// Edge Function wires these to the database and to Kapso, and the tests wire them to fakes.
//
// Rules this file carries:
//   - A webhook counts only with a valid X-Webhook-Signature (HMAC-SHA256 of the raw body with the webhook secret,
//     hex), for Kabsi's own phone number id, and with a message time inside the replay window.
//   - STOP and its variants stop every send at once (K-129 point 7).
//   - What a review alert says is set under K-113 as amended on 21 Oct 2026: the business, the star rating, the
//     reviewer's first name, the review text up to 300 characters and the draft. Nothing else of a review.
//   - Approve is offered only where WhatsApp may approve (low and medium risk replies and weekly posts; K-129 point 2);
//     everything else gets "Edit in app".

export const REPLAY_WINDOW_SECONDS = 600;
export const REVIEW_EXCERPT_MAX = 300;
// Button ids carry the action and the one-time token: a:<token> approve, u:<token> undo, e:<token> edit in the app.
export const BUTTON_ID = /^([aue]):([A-Za-z0-9_-]{16,64})$/;
// STOP and the usual variants (Meta's opt-out words and the common ones in English, French and Arabic).
const STOP_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit", "optout", "opt out", "arret", "arrêt", "توقف", "الغاء", "إلغاء"]);
// The Connect code: "KABSI 123456", "Kabsi code 123456" or the six digits on their own.
const CODE_RE = /^(?:kabsi\s*(?:code)?\s*:?\s*)?(\d{6})$/i;

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

export type Inbound = {
  phoneNumberId: string;
  from: string; // E.164 with the plus sign
  messageId: string;
  timestamp: number; // seconds
  type: string;
  text: string | null;
  buttonId: string | null;
  mediaId: string | null;
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
      const button = str(obj(interactive.button_reply).id) ?? str(obj(m.button).payload);
      const from = str(conv.phone_number) ?? (str(m.from) ? `+${String(m.from).replace(/\D/g, "")}` : null);
      if (!from) continue;
      messages.push({
        phoneNumberId: str(p.phone_number_id) ?? str(conv.phone_number_id) ?? "",
        from: from.startsWith("+") ? from : `+${from.replace(/\D/g, "")}`,
        messageId: id,
        timestamp: Number(m.timestamp ?? 0),
        type: str(m.type) ?? "unknown",
        text: str(obj(m.text).body),
        buttonId: button,
        mediaId: str(obj(m.image).id),
      });
    } else if (["sent", "delivered", "read", "failed"].includes(String(k.status))) {
      const errs = (Array.isArray(k.statuses) ? (k.statuses as unknown[]) : []).flatMap((s) => (Array.isArray(obj(s).errors) ? (obj(s).errors as unknown[]) : []));
      statuses.push({ messageId: id, status: k.status as StatusEvent["status"], error: errs.length ? String(obj(errs[0]).title ?? obj(errs[0]).message ?? "failed") : null });
    }
  }
  return { messages, statuses };
}

/** Inside the replay window: a message older than 10 minutes (or from the future) is refused. */
export function fresh(timestampSeconds: number, nowMs: number): boolean {
  if (!Number.isFinite(timestampSeconds) || timestampSeconds <= 0) return false;
  const age = nowMs / 1000 - timestampSeconds;
  return age <= REPLAY_WINDOW_SECONDS && age >= -60;
}

export type Intent =
  | { kind: "stop" }
  | { kind: "code"; code: string }
  | { kind: "approve" | "undo" | "edit"; token: string }
  | { kind: "photo"; mediaId: string }
  | { kind: "other" };

/** What one inbound message asks for. */
export function intentOf(m: Inbound): Intent {
  if (m.buttonId) {
    const b = BUTTON_ID.exec(m.buttonId);
    if (b) return { kind: b[1] === "a" ? "approve" : b[1] === "u" ? "undo" : "edit", token: b[2] };
    return { kind: "other" };
  }
  if (m.type === "image" && m.mediaId) return { kind: "photo", mediaId: m.mediaId };
  const t = (m.text ?? "").trim();
  if (STOP_WORDS.has(t.toLowerCase().replace(/[.!]+$/, "").trim())) return { kind: "stop" };
  const c = CODE_RE.exec(t);
  if (c) return { kind: "code", code: c[1] };
  return { kind: "other" };
}

// ─── What Kabsi says. Plain words, no em or en dashes, no exclamation marks (plan 2.2).

export const SAY = {
  connected: "Kabsi is connected. Review alerts for your business will come here. Reply STOP at any time to stop them.",
  badCode: "That code did not work. Open Kabsi, go to Settings, What Kabsi tells you, and press Connect WhatsApp again.",
  stopped: "You will get no more WhatsApp messages from Kabsi. To turn them on again, press Connect WhatsApp in Kabsi.",
  approved: "Approved. It goes to Google in 10 seconds. Press Undo to stop it.",
  undone: "Undone. Nothing was sent. The draft is waiting for you in Kabsi.",
  tooLate: "It has already gone to Google, so it cannot be undone here. Open Kabsi to see it.",
  already: "This was already approved. Nothing was sent twice.",
  photoTaken: "Thank you. Kabsi is checking the photo and will show it in Photos for you to approve.",
  photoPro: "Sending photos on WhatsApp comes with the Pro plan. You can add photos in Kabsi under Photos.",
  photoOneBusiness: "Kabsi could not tell which business this photo is for. Add it in Kabsi under Photos.",
  other: "Kabsi reads only the buttons and photos here. For anything else, write to hello@kabsi.co and a person replies.",
} as const;

/** Why WhatsApp sends the owner to the app instead of approving (K-129 point 2), in plain words. */
export function refusal(reason: string): string {
  switch (reason) {
    case "high_risk":
      return "This review needs a careful look, so it is approved only in Kabsi.";
    case "identity_field":
    case "not_on_whatsapp":
      return "Changes to your business name, address, categories, map pin, phone or opening status are approved only in Kabsi, signed in.";
    case "changed":
      return "The draft changed since this message. Open Kabsi to read the new one.";
    case "not_draft":
      return "This was already handled in Kabsi. Nothing was sent twice.";
    case "expired":
      return "This button has expired. Open Kabsi to approve.";
    case "stopped":
      return "WhatsApp is turned off for you. Press Connect WhatsApp in Kabsi to turn it on.";
    case "plan_required":
      return "Your plan has ended, so nothing can be published. Open Kabsi to choose a plan.";
    default:
      return "Kabsi could not approve this here. Open Kabsi to finish.";
  }
}

export type ReviewAlert = { business: string; stars: number; reviewer: string | null; text: string | null; draft: string | null };

/** The reviewer's first name only (K-113 as amended): never the full name. */
export function firstName(name: string | null): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  return first && first.length <= 40 ? first : null;
}

export function excerpt(text: string | null, max = REVIEW_EXCERPT_MAX): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length <= max ? t : `${t.slice(0, max - 3).trimEnd()}...`;
}

/** The body of a review alert: business, stars, first name, up to 300 characters of the review, and the draft. */
export function reviewAlertBody(a: ReviewAlert): string {
  const who = firstName(a.reviewer);
  const lines = [`${a.business}: new ${a.stars}-star review${who ? ` from ${who}` : ""}.`];
  const ex = excerpt(a.text);
  if (ex) lines.push(`"${ex}"`);
  if (a.draft) lines.push(`Kabsi's reply: ${a.draft}`);
  else lines.push("This review needs a careful look. Open Kabsi to reply.");
  return lines.join("\n\n").slice(0, 1024);
}

export function postAlertBody(business: string, summary: string): string {
  return `${business}: a post is ready for Google.\n\n${summary}`.slice(0, 1024);
}

export type Button = { id: string; title: string };
/** Approve only where WhatsApp may approve; Edit in app always. Titles are at most 20 characters (Meta's limit). */
export function alertButtons(token: string, mayApprove: boolean): Button[] {
  return [...(mayApprove ? [{ id: `a:${token}`, title: "Approve" }] : []), { id: `e:${token}`, title: "Edit in app" }];
}
export const undoButton = (token: string): Button => ({ id: `u:${token}`, title: "Undo" });
