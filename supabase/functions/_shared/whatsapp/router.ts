// The first step for every inbound message (master plan 9.1): what it asks for, with no AI call. Button taps resolve by
// the id inside the button; codes, STOP, the scan and partner codes, the usual words in English, Spanish and Arabic, the
// staff commands and media are read here. Only what is left ("free") goes to the intent router (intent.ts).
// Pure: no database, network or environment access.
import type { Contact, Inbound, Media } from "./channel.ts";

export type Command =
  | { k: "stop" } | { k: "start" }
  | { k: "bind"; code: string }
  | { k: "button"; action: "approve" | "undo" | "edit"; token: string }
  | { k: "role_pick"; to: "business" | "partner" | "staff" }
  | { k: "business_pick"; locationId: string }
  | { k: "scan_code"; code: string; rest: string }
  | { k: "partner_code"; code: string }
  | { k: "yes" } | { k: "no" } | { k: "number"; n: number }
  | { k: "tool"; tool: string; arg?: string }
  | { k: "photo"; media: Media } | { k: "voice"; media: Media } | { k: "video"; media: Media } | { k: "file"; media: Media }
  | { k: "contact"; contacts: Contact[] }
  | { k: "map"; action: "show" | "later"; scanId: string | null }
  | { k: "keyword"; action: "yes" | "change"; locationId: string }
  | { k: "photo_edit"; photoId: string } | { k: "photo_skip"; token: string }
  | { k: "free"; text: string }
  | { k: "empty" };

// Meta's opt-out words and the usual ones in English, Spanish, French and Arabic. "cancel" is not here: in 9.3 it is the
// billing question ("cancel my plan"), answered with the billing line.
const STOP = new Set(["stop", "stopall", "unsubscribe", "end", "quit", "optout", "opt out", "opt-out", "baja", "parar", "detener",
  "arret", "arrêt", "توقف", "ايقاف", "إيقاف", "الغاء الاشتراك", "إلغاء الاشتراك"]);
const START = new Set(["start", "unstop", "resume", "empezar", "reanudar", "ابدأ", "ابدا"]);
const YES = new Set(["yes", "y", "yep", "yeah", "ok", "okay", "approve", "confirm", "sure", "si", "sí", "vale", "نعم", "ايوه", "أيوه", "اي", "موافق", "تمام"]);
const NO = new Set(["no", "nope", "not now", "skip", "cancel that", "لا", "nah"]);
// "KABSI 123456", "Kabsi code 123456" or the six digits alone; "STAFF ABCD2345".
const OWNER_CODE = /^(?:kabsi\s*(?:code)?\s*:?\s*)?(\d{6})$/i;
const STAFF_CODE = /^staff\s*:?\s*([A-Za-z0-9]{8})$/i;
// 24.8: "Hi Kabsi, my scan code is KAB-7Q4M2X9P". 29.4: "Code P-NAME".
const SCAN_CODE = /\bKAB-([A-Z0-9]{8,12})\b/i;
const PARTNER_CODE = /\bcode\s+(P-[A-Z0-9]{3,20})\b/i;

const WORDS: [RegExp, string, string?][] = [
  [/^(help|menu|options|\?|ayuda|مساعدة|مساعده)$/, "help"],
  [/^(hi|hello|hey|hi kabsi|hello kabsi|hola|good (morning|afternoon|evening)|مرحبا|السلام عليكم|اهلا|أهلا)$/, "greet"],
  [/^(show me)$/, "show"],
  [/^(switch|change business|cambiar|تغيير)$/, "switch"],
  [/^(stats|statistics|numbers|how did we do( this week)?|estadísticas|estadisticas|إحصائيات|احصائيات)$/, "stats", "7"],
  [/^(this month|month|stats month|este mes|هذا الشهر)$/, "stats", "30"],
  [/^(review link|link|my link|enlace|رابط|رابط التقييم)$/, "review_link"],
  [/^(qr|qr code|qr card|código qr)$/, "qr"],
  // V3 (30.15 section 3.5): a ready message with the review link, to forward after a real visit. Never a customer's number.
  [/^(ask a customer|ask customers?|ask for a review|ask for reviews|request a review|review request|send review link|send the review link|pedir una reseña)$/, "ask_customer"],
  [/^(talk to a person|person|human|agent|support|hablar con una persona|persona|التحدث مع شخص|شخص)$/, "person"],
  // Session 10 (10.2.10): the owner's billing words; the word itself goes to the billing tool.
  [/^(upgrade|downgrade|add a location|my card changed|card|update my card|invoice|receipt|cancel|cancel my plan|keep my plan|billing|plan|factura|فاتورة)$/, "billing"],
  [/^(prices?|pricing|cost|how much( is it)?|precios?|الأسعار|الاسعار|السعر|كم السعر)$/, "prices"],
  [/^(start free|free trial|trial|sign ?up|get started|empezar gratis)$/, "trial"],
  [/^(partner|partners|partner program|kabsi partners|socio)$/, "partner_program"],
  [/^(send the full map to my whatsapp|send the full map|full map|send my map|map)$/, "send_map"],
  // Partner tools (29.2), stubs until PA2.
  [/^(how am i doing|kit|payout|payouts|rules|leave the program|change my line)$/, "partner_tool"],
  // staff_admin (9.9, 29.7).
  [/^status$/, "staff_status"],
  [/^waiting$/, "staff_waiting"],
  [/^today$/, "staff_today"],
  [/^pause\s+(.{2,80})$/, "staff_pause"],
  [/^resume\s+(.{2,80})$/, "staff_resume"],
  [/^partners? approvals?$|^applications$/, "staff_partners"],
  [/^payout list$|^approve payouts$/, "staff_payouts"],
  [/^(hours|close early|closed|closing|opening hours)\b.*$/, "hours"],
  [/^(post|new post)\b.*$/, "post"],
];

const norm = (t: string) => t.trim().toLowerCase().replace(/[.!¡¿,]+$/g, "").replace(/\s+/g, " ").trim();

/** What one inbound message asks for. */
export function parse(m: Inbound): Command {
  if (m.buttonId) {
    const b = parseButton(m.buttonId);
    // A template's quick reply ("Show me") carries no Kabsi id: read its text instead.
    if (b.k !== "empty" || !m.text) return b;
  }
  const media = m.media ?? (m.mediaId ? { kind: "image" as const, id: m.mediaId, mime: "image/jpeg", filename: null, size: null, voice: false } : null);
  if (media) {
    if (media.kind === "image" || media.kind === "sticker") return { k: "photo", media };
    if (media.kind === "audio") return { k: "voice", media };
    if (media.kind === "video") return { k: "video", media };
    // 18.3: a photo sent as a document (HEIC, PNG, WebP, JPEG) goes the photo path; anything else is refused there.
    return /^image\//.test(media.mime ?? "") || /\.(heic|heif|png|webp|jpe?g)$/i.test(media.filename ?? "") ? { k: "photo", media } : { k: "file", media };
  }
  if (m.contacts?.length) return { k: "contact", contacts: m.contacts };
  const raw = (m.text ?? "").trim();
  if (!raw) return { k: "empty" };
  const t = norm(raw);
  if (STOP.has(t)) return { k: "stop" };
  if (START.has(t)) return { k: "start" };
  const staff = STAFF_CODE.exec(raw);
  if (staff) return { k: "bind", code: `STAFF ${staff[1].toUpperCase()}` };
  const owner = OWNER_CODE.exec(raw);
  if (owner) return { k: "bind", code: owner[1] };
  const scan = SCAN_CODE.exec(raw);
  if (scan) return { k: "scan_code", code: `KAB-${scan[1].toUpperCase()}`, rest: raw.replace(scan[0], "").trim() };
  const partner = PARTNER_CODE.exec(raw);
  if (partner) return { k: "partner_code", code: partner[1].toUpperCase() };
  if (YES.has(t)) return { k: "yes" };
  if (NO.has(t)) return { k: "no" };
  if (/^\d{1,2}$/.test(t)) return { k: "number", n: Number(t) };
  // "reply: <exact text>" sets the exact reply to the last review (9.3).
  const exact = /^(?:reply|respuesta|رد)\s*:\s*([\s\S]{2,4000})$/i.exec(raw);
  if (exact) return { k: "tool", tool: "exact_reply", arg: exact[1].trim() };
  for (const [re, tool, arg] of WORDS) {
    const hit = re.exec(t);
    if (hit) return { k: "tool", tool, arg: arg ?? (tool === "billing" ? t : hit[1] && tool.startsWith("staff_") ? raw.trim().split(/\s+/).slice(1).join(" ") : undefined) };
  }
  return { k: "free", text: raw.slice(0, 2000) };
}

// a:<token> approve, u:<token> undo, e:<token> edit, w:<token> the pick from "Which one?" (an approve), r:<domain> the
// role, b:<uuid> the business, k:<action> the owner's Confirm on a billing change (session 10; the owner is checked again).
export function parseButton(id: string): Command {
  const tok = /^([auew]):([A-Za-z0-9_-]{16,64})$/.exec(id);
  if (tok) return { k: "button", action: tok[1] === "u" ? "undo" : tok[1] === "e" ? "edit" : "approve", token: tok[2] };
  // V3: a photo's Edit (p e, by photo id) and Skip (p s, by approval token), and the sensitive review's "Talk to a person".
  const pe = /^pe:([0-9a-f-]{36})$/.exec(id);
  if (pe) return { k: "photo_edit", photoId: pe[1] };
  const ps = /^ps:([A-Za-z0-9_-]{16,64})$/.exec(id);
  if (ps) return { k: "photo_skip", token: ps[1] };
  if (id === "t:person") return { k: "tool", tool: "person" };
  const role = /^r:(business|partner|staff)$/.exec(id);
  if (role) return { k: "role_pick", to: role[1] as "business" | "partner" | "staff" };
  const bill = /^k:(cancel|keep|upgrade|downgrade|add_location)$/.exec(id);
  if (bill) return { k: "tool", tool: "billing", arg: `confirm:${bill[1]}` };
  // 13b part 2: the map's "Show me" and "Later" (m:s:<scan>, m:l), the owner's keyword confirm (v:y:<business>, v:c:<business>).
  // The morning digest's one-tap buttons (staff_admin only; the router checks the role).
  const st = /^s:(status|waiting|today)$/.exec(id);
  if (st) return { k: "tool", tool: `staff_${st[1]}` };
  const map = /^m:(s|l)(?::([0-9a-f-]{36}))?$/.exec(id);
  if (map) return { k: "map", action: map[1] === "s" ? "show" : "later", scanId: map[2] ?? null };
  const kw = /^v:(y|c):([0-9a-f-]{36})$/.exec(id);
  if (kw) return { k: "keyword", action: kw[1] === "y" ? "yes" : "change", locationId: kw[2] };
  const biz = /^b:([0-9a-f-]{36})$/.exec(id);
  if (biz) return { k: "business_pick", locationId: biz[1] };
  return { k: "empty" };
}

// A few words that are never answered (9.3 "abuse: one notice, then no reply").
const ABUSE = /\b(fuck|f\*ck|shit|bitch|cunt|asshole|idiot|stupid bot)\b/i;
export const isAbuse = (text: string | null | undefined) => ABUSE.test(text ?? "");
