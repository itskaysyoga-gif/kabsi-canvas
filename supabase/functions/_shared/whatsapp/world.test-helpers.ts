// The fake world for the WhatsApp conversation suite (session 13b part 1): the database (phone roles, conversations,
// opt-ins, buttons, the outbox) in memory, both senders, a stub model and a clock. It follows the SQL functions of
// 20261025100000_whatsapp_agent.sql closely enough that the agent cannot tell the difference; the SQL itself is tested
// against the real database when the migration is applied (see the session's evidence file).
import type { AgentDb, AgentDeps, BillingDeps } from "./agent.ts";
import type { Button, Contact, Inbound, Media } from "./channel.ts";
import type { Sender } from "./deliver.ts";
import type { Out, OutDb, OutRow } from "./outbox.ts";
import type { SendState } from "./policy.ts";
import type { Conversation, Role, Who } from "./roles.ts";
import type { BookDb } from "./book.ts";

/** RB-E: the request book in memory, close to the RB-C1 and PR B functions (the gate, the proposals, create, get, find). */
type Intake = { id: string; location: string; raw: string; evidence: Record<string, unknown>; state: string; provider: string | null; by: string; expires: number };
type Req = { id: string; location: string; number: number; kind: string; status: string; summary: string; customer_name: string | null; phones: string[];
  requested_window_text: string | null; starts_at: string | null; intake_id: string | null; by: string; created_at: string;
  // RB-F: what PR B's writes change.
  outcome?: string | null; version?: number; details?: Record<string, unknown>; staff_confirmed_at?: string | null; customer_confirmed_at?: string | null;
  customer_id?: string; converted_from?: string | null };
/** RB-F: one activity of a request, as request_activities holds it (ids, codes and the values a correction changed). */
type Activity = { id: string; location: string; request: string; type: string; from: string | null; to: string | null; fromOutcome: string | null;
  toOutcome: string | null; flags: string[]; actor: string; role: string; at: number; undoOf: string | null; related: string | null;
  values: { field: string; before: unknown; after: unknown }[] };

export const PNID = "1310486382156171";
// Monday 26 Oct 2026, 15:00 UTC: 11:00 in New York, 15:00 in London, 17:00 in Beirut, 19:00 in Dubai.
export const NOW0 = Date.UTC(2026, 9, 26, 15, 0, 0);

export const PHONES = {
  owner: "+12125550143", // Harbour Lane Coffee, New York, Pro
  manager: "+12125550144",
  staff: "+12125550145",
  plain: "+12125550146", // owner of Corner Deli, Essentials (no Pro)
  multi: "+12125550149", // Smile Dental and Bright Smile Kids, London
  rashid: "+12125550148", // staff_admin, owner of Yawmiyati
  partner: "+12125550150", // partner only
  both: "+12125550151", // partner and owner of Al Noor Salon
  unknown: "+12125550152",
  unknown2: "+12125550153",
  unknown3: "+12125550154",
  newStaff: "+12125550147",
} as const;

type Biz = { id: string; name: string; tz: string; country: string; pro: boolean; members: Record<string, "owner" | "manager" | "staff">; demo?: boolean };
type User = { id: string; phone: string | null; optin: "active" | "stopped" | "none" };
// Fix 2: a post's Approve is bound to what was shown: its text, its photo and that photo's file (private.whatsapp_item).
type Seen = { text: string; photo: string; file: string };
type Action = { token: string; user: string; location: string; type: string; target: string; used: boolean; stale: boolean; risk?: string; seen?: Seen };
/** Look 2: footer is the footer of a message with buttons or a list; rows are a list message's rows ("title · description"). */
export type SentMsg = { to: string; kind: string; body: string; buttons: string[]; live: boolean; template?: string; footer?: string; rows?: string[]; rowIds?: string[] };

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const BIZ = { harbour: uuid(1), deli: uuid(2), smile: uuid(3), bright: uuid(4), yawmiyati: uuid(5), alnoor: uuid(6), foreign: uuid(9) };
export const USERS = { owner: uuid(101), manager: uuid(102), staff: uuid(103), plain: uuid(104), multi: uuid(105), rashid: uuid(106), both: uuid(107), newStaff: uuid(108) };

export class World {
  now = NOW0;
  biz: Biz[] = [
    { id: BIZ.harbour, name: "Harbour Lane Coffee", tz: "America/New_York", country: "US", pro: true,
      members: { [USERS.owner]: "owner", [USERS.manager]: "manager", [USERS.staff]: "staff" } },
    { id: BIZ.deli, name: "Corner Deli", tz: "America/New_York", country: "US", pro: false, members: { [USERS.plain]: "owner" } },
    { id: BIZ.smile, name: "Smile Dental", tz: "Europe/London", country: "GB", pro: true, members: { [USERS.multi]: "owner" } },
    { id: BIZ.bright, name: "Bright Smile Kids", tz: "Europe/London", country: "GB", pro: true, members: { [USERS.multi]: "owner" } },
    { id: BIZ.yawmiyati, name: "Yawmiyati", tz: "Asia/Beirut", country: "LB", pro: true, members: { [USERS.rashid]: "owner" } },
    { id: BIZ.alnoor, name: "Al Noor Salon", tz: "Asia/Dubai", country: "AE", pro: true, members: { [USERS.both]: "owner" } },
    { id: BIZ.foreign, name: "Northside Auto Repair", tz: "America/Chicago", country: "US", pro: true, members: {} },
  ];
  users: User[] = [
    { id: USERS.owner, phone: PHONES.owner, optin: "active" },
    { id: USERS.manager, phone: PHONES.manager, optin: "active" },
    { id: USERS.staff, phone: PHONES.staff, optin: "active" },
    { id: USERS.plain, phone: PHONES.plain, optin: "active" },
    { id: USERS.multi, phone: PHONES.multi, optin: "active" },
    { id: USERS.rashid, phone: PHONES.rashid, optin: "active" },
    { id: USERS.both, phone: PHONES.both, optin: "active" },
    { id: USERS.newStaff, phone: null, optin: "none" },
  ];
  staffUsers = new Set([USERS.rashid, USERS.newStaff]);
  staffAdmin = new Map<string, string>([[PHONES.rashid, USERS.rashid]]);
  partners = new Map<string, string>([[PHONES.partner, uuid(201)], [PHONES.both, uuid(202)]]);
  prospects = new Set<string>();
  conv = new Map<string, Conversation & Record<string, unknown>>();
  ownerCodes = new Map<string, string>([["123456", USERS.owner]]);
  staffCodes = new Map<string, string>([["ABCD2345", USERS.newStaff]]);
  actions = new Map<string, Action>();
  reviews = new Map<string, { location: string; state: string; risk: string }>([
    ["r-harbour-1", { location: BIZ.harbour, state: "drafted", risk: "low" }],
    ["r-harbour-high", { location: BIZ.harbour, state: "drafted", risk: "high" }],
  ]);
  stored = new Set<string>();
  storedPayloads: unknown[] = [];
  storedPhones = new Set<string>();
  noraCalls: string[] = [];
  noraAnswer: string | null = null;
  done = new Map<string, string>();
  outbox: (OutRow & { dedupe: string | null; sent_at: number | null; error: string | null; provider: string | null })[] = [];
  sent: SentMsg[] = [];
  livePhones = new Set<string>();
  quality: string | null = null;
  tooLate = false;
  failSends = 0;
  /** Session 10: a fake Creem subscription by business; billing stays the old stub line while this is null. */
  billingSubs: Map<string, { plan: "essentials" | "pro"; period: "month" | "year"; state: string; periodEnd: string | null; cancelAtEnd: boolean; units: number; family: "founding" | "list" }> | null = null;
  calls: string[] = [];
  // RB-E: the request book. Off, as in production, until a test switches it on and gives a business a pack in test.
  bookSetting = "off";
  packs = new Map<string, { pack: string; version: number; state: "off" | "test" }>();
  intakes = new Map<string, Intake>();
  requests: Req[] = [];
  /** RB-F: every request activity, in order. */
  activities: Activity[] = [];
  toolKeys = new Map<string, { hash: string; result: Record<string, unknown> }>();
  /** Every request book call, as "function:location:actor". */
  bookCalls: string[] = [];
  /** The extraction model's answer for an owner message (the text inside the fence), as JSON with quotes. */
  extractMap: Record<string, string> = {};
  extractCalls: string[] = [];
  /** How long each "On it" timer was set for. */
  sleeps: number[] = [];
  handoffs: string[] = [];
  photos: string[] = [];
  voices: string[] = [];
  /** V3: processed photos waiting for a yes, by id. */
  photoDrafts = new Map<string, { location: string; state: string; category: string }>();
  /** V3: what the transcriber answers for a voice note (tests set it); null means "not configured". */
  transcript: { ok: true; text: string; language: string | null } | { ok: false; reason: "not_configured" | "empty" | "too_big" | "failed" } | null = null;
  transcribed: number[] = [];
  firstMaps: string[] = [];
  /** What the first map step answers after a code binds an owner (28.5). */
  firstMapAnswer: { state: "started" | "waiting" | "ask" | "none"; keyword?: string | null } = { state: "none" };
  keywordAnswer: { ok: boolean; reason?: string } = { ok: true };
  scans = new Map<string, { location: string; keyword: string }>();
  aiCalls = 0;
  aiMap: Record<string, string> = {};
  aiSlow = false;
  onItFast = false;
  mediaBytes = new Map<string, Uint8Array>();
  /** Photo Post 1: WhatsApp photos by id (held when they came with words), photo posts by id, posts left per business. */
  waPhotos = new Map<string, { location: string; user: string; state: string; hold: boolean; asked: boolean; file?: string }>();
  posts = new Map<string, { location: string; text: string; caption: string; photo: string; state: string }>();
  postsLeft = new Map<string, number>();
  /** Photo Post 1: Kabsi's draft when AI drafting is on (undefined: off; null: the draft failed). */
  photoDraft: string | null | undefined = undefined;
  photoDraftCalls: string[] = [];
  private n = 0;

  userByPhone = (phone: string) => this.users.find((u) => u.phone === phone && u.optin === "active") ?? null;
  conversation(phone: string) {
    let c = this.conv.get(phone);
    if (!c) {
      c = { phone, active_role: null, active_location_id: null, open_question: null, language: null, last_task: null, window_expires_at: null,
        stopped_at: null, handoff_at: null, abuse_notice_at: null, scan_code: null, partner_code: null };
      this.conv.set(phone, c);
    }
    return c;
  }
  /** An Approve button sent to a person for an item (as the review alert does), so typed "yes" can find it. */
  alert(userPhone: string, location: string, kind = "review_alert", target = "r-harbour-1"): string {
    const user = this.userByPhone(userPhone);
    const token = `tok${String(++this.n).padStart(20, "0")}`;
    this.actions.set(token, { token, user: user?.id ?? "nobody", location, type: kind.includes("post") ? "local_post" : "review_reply", target, used: false, stale: false });
    // Recorded like the reply that carried the button (not counted against the daily cap).
    this.outbox.push({ id: this.outbox.length + 1, phone: userPhone, user_id: user?.id ?? null, location_id: location, kind: "reply", state: "mock_sent",
      body: `${this.biz.find((b) => b.id === location)!.name}: new 5-star review.`, buttons: [{ id: `a:${token}`, title: "Approve" }], template: null,
      urgent: false, due_at: new Date(this.now).toISOString(), attempts: 0, dedupe: null, sent_at: this.now - 3600_000, error: null, provider: null });
    return token;
  }
  /** Names of businesses a phone is not bound to: none of them may ever appear in a reply to it (9.2). */
  foreignNames(phone: string): string[] {
    // The staff phone may name any business (pause, alerts); everyone else only their own.
    if (this.staffAdmin.has(phone)) return [];
    const u = this.userByPhone(phone);
    return this.biz.filter((b) => !u || !b.members[u.id]).map((b) => b.name);
  }
  repliesTo(phone: string) {
    return this.sent.filter((s) => s.to === phone);
  }

  // ─── The database, as the agent sees it.
  roles(phone: string): Role[] {
    const out: Role[] = [];
    const u = this.userByPhone(phone);
    if (u) {
      for (const b of this.biz) {
        const role = b.members[u.id];
        if (role) out.push({ kind: "business", role, user_id: u.id, location_id: b.id, business: b.name, time_zone: b.tz, country: b.country, status: "active", pro: b.pro });
      }
    }
    // whatsapp_resolve orders business roles by name.
    out.sort((a, b) => (a.kind === "business" && b.kind === "business" ? a.business.localeCompare(b.business) : 0));
    const sa = this.staffAdmin.get(phone);
    if (sa && this.staffUsers.has(sa)) out.push({ kind: "staff_admin", role: "staff_admin", user_id: sa });
    const p = this.partners.get(phone);
    if (p) out.push({ kind: "partner", role: "partner", partner_id: p });
    if (this.prospects.has(phone)) out.push({ kind: "prospect", role: "prospect" });
    return out;
  }

  db(): AgentDb {
    const w = this;
    return {
      async store(phone, id, _kind, payload, referral) {
        if (w.stored.has(id)) return { duplicate: true };
        w.stored.add(id);
        w.storedPayloads.push(payload);
        const first = !w.storedPhones.has(phone);
        w.storedPhones.add(phone);
        const c = w.conversation(phone);
        c.window_expires_at = new Date(w.now + 86_400_000).toISOString();
        if (referral) {
          c.referral_first ??= referral;
          c.referral_last = referral;
        }
        return { duplicate: false, id: `in-${id}`, first };
      },
      async done(id, r) {
        w.done.set(id, r);
      },
      async resolve(phone): Promise<Who> {
        return { phone, roles: w.roles(phone), conversation: w.conv.has(phone) ? structuredClone(w.conversation(phone)) : null };
      },
      async setConv(phone, patch) {
        const c = w.conversation(phone);
        for (const [k, v] of Object.entries(patch)) {
          if (k === "stopped") c.stopped_at = v ? new Date(w.now).toISOString() : null;
          else if (k === "handoff") c.handoff_at = v ? new Date(w.now).toISOString() : null;
          else if (k === "abuse_notice") c.abuse_notice_at = new Date(w.now).toISOString();
          else (c as Record<string, unknown>)[k] = v;
        }
      },
      async attachCode(phone, scan, partner) {
        const c = w.conversation(phone);
        if (scan) c.scan_code = scan;
        if (partner) c.partner_code = partner;
        w.prospects.add(phone);
      },
      async bind(phone, code) {
        const staff = /^STAFF ([A-Z0-9]{8})$/.exec(code);
        if (staff) {
          const user = w.staffCodes.get(staff[1]);
          if (!user || !w.staffUsers.has(user)) return { result: "unknown_code" };
          w.staffCodes.delete(staff[1]);
          w.staffAdmin.set(phone, user);
          // A fresh staff code is a new opt-in: the conversation is no longer stopped (whatsapp_bind).
          w.conversation(phone).stopped_at = null;
          return { result: "staff_admin", user_id: user };
        }
        const user = w.ownerCodes.get(code);
        if (!user) return { result: "unknown_code" };
        if (w.users.some((u) => u.phone === phone && u.id !== user && u.optin === "active")) return { result: "phone_in_use" };
        w.ownerCodes.delete(code);
        const u = w.users.find((x) => x.id === user)!;
        u.phone = phone;
        u.optin = "active";
        return { result: "verified", user_id: user, first_owner_locations: w.biz.filter((b) => b.members[user] === "owner").map((b) => b.id) };
      },
      async stopOptin(phone) {
        const u = w.users.find((x) => x.phone === phone);
        if (u) u.optin = "stopped";
      },
      async start(phone) {
        // whatsapp_start: every stopped opt-in of this phone is active again, and the conversation is not stopped.
        const back = w.users.filter((x) => x.phone === phone && x.optin === "stopped");
        for (const u of back) u.optin = "active";
        w.conversation(phone).stopped_at = null;
        return back.length;
      },
      async tokenOwner(token, phone) {
        const a = w.actions.get(token);
        if (!a) return "unknown";
        const u = w.users.find((x) => x.id === a.user);
        const member = w.biz.find((b) => b.id === a.location)?.members[a.user];
        return u?.phone === phone && u.optin === "active" && member ? "mine" : "not_yours";
      },
      async approve(token, phone) {
        w.calls.push(`approve:${token}`);
        const a = w.actions.get(token);
        const u = a && w.users.find((x) => x.id === a.user);
        if (!a || u?.phone !== phone) return { result: "unknown" };
        if (a.used) return { result: "approved", repeat: true, location_id: a.location };
        if (a.stale) return { result: "refused", reason: "not_draft", location_id: a.location };
        if (!w.biz.find((b) => b.id === a.location)?.members[a.user]) return { result: "refused", reason: "approver_not_member", location_id: a.location };
        const po = a.type === "local_post" ? w.posts.get(a.target) : undefined;
        if (po && po.state !== "draft") return { result: "refused", reason: "not_draft", location_id: a.location, target_type: a.type };
        if (po && a.seen && (a.seen.text !== po.text || a.seen.photo !== po.photo || a.seen.file !== (w.waPhotos.get(po.photo)?.file ?? ""))) {
          return { result: "refused", reason: "changed", location_id: a.location, target_type: a.type };
        }
        if (po && w.waPhotos.get(po.photo)?.state === "checking") return { result: "refused", reason: "approve_publication: post_photo_missing", location_id: a.location, target_type: a.type };
        if (po) po.state = "publishing";
        a.used = true;
        return { result: "approved", location_id: a.location, target_type: a.type };
      },
      async undo(token) {
        w.calls.push(`undo:${token}`);
        const a = w.actions.get(token);
        if (!a?.used) return { result: "nothing_to_undo" };
        return { result: w.tooLate ? "too_late" : "cancelled" };
      },
      async openItems(phone) {
        const u = w.userByPhone(phone);
        return [...w.actions.values()].filter((a) => a.user === u?.id && !a.used && !a.stale)
          .map((a) => ({ token: a.token, kind: a.type === "local_post" ? "post_alert" : "review_alert", business: w.biz.find((b) => b.id === a.location)!.name, location_id: a.location, target_type: a.type }));
      },
      async hoursPrepare(loc, user, c) {
        const role = w.biz.find((b) => b.id === loc)?.members[user];
        if (role !== "owner" && role !== "manager") return { ok: false, reason: "not_allowed_to_approve" };
        w.calls.push(`hours:${loc}:${c.from}:${c.to}:${c.closed ? "closed" : `${c.open}-${c.close}`}`);
        const token = `hrs${String(++w.n).padStart(20, "0")}`;
        w.actions.set(token, { token, user, location: loc, type: "special_hours", target: `sh-${w.n}`, used: false, stale: false });
        return { ok: true, token };
      },
      async postPrepare(loc, user, text) {
        const role = w.biz.find((b) => b.id === loc)?.members[user];
        if (role !== "owner" && role !== "manager") return { ok: false, reason: "not_allowed_to_approve" };
        w.calls.push(`post:${loc}:${text}`);
        const token = `pst${String(++w.n).padStart(20, "0")}`;
        w.actions.set(token, { token, user, location: loc, type: "local_post", target: `po-${w.n}`, used: false, stale: false });
        return { ok: true, token, text };
      },
      async ownerDraft(user, review, text) {
        w.calls.push(`owner_draft:${review}:${text.length}`);
        const r = w.reviews.get(review);
        if (!r) return { ok: false, reason: "unknown_target" };
        const role = w.biz.find((b) => b.id === r.location)?.members[user];
        if (role !== "owner" && role !== "manager") return { ok: false, reason: "not_member" };
        return r.state === "drafted" ? { ok: true } : { ok: false, reason: "not_draft" };
      },
      async actionCreate(user, type, target) {
        if (type === "local_post" && w.posts.has(target)) {
          const po = w.posts.get(target)!;
          if (po.state !== "draft") return { ok: false, reason: "not_draft" };
          if (!w.biz.find((b) => b.id === po.location)?.members[user]) return { ok: false, reason: "not_member" };
          const token = `ppo${String(++w.n).padStart(20, "0")}`;
          const seen = { text: po.text, photo: po.photo, file: w.waPhotos.get(po.photo)?.file ?? "" };
          w.actions.set(token, { token, user, location: po.location, type, target, used: false, stale: false, seen });
          return { ok: true, token, text: po.text };
        }
        if (type === "photo") {
          const p = w.photoDrafts.get(target);
          if (!p || p.state !== "draft") return { ok: false, reason: "not_draft" };
          if (!w.biz.find((b) => b.id === p.location)?.members[user]) return { ok: false, reason: "not_member" };
          const token = `pho${String(++w.n).padStart(20, "0")}`;
          w.actions.set(token, { token, user, location: p.location, type, target, used: false, stale: false });
          return { ok: true, token, text: p.category };
        }
        const r = w.reviews.get(target);
        if (r?.risk === "high") return { ok: false, reason: "high_risk" };
        const token = `new${String(++w.n).padStart(20, "0")}`;
        w.actions.set(token, { token, user, location: r?.location ?? "", type, target, used: false, stale: false });
        return { ok: true, token, text: "Thank you for the kind words, we hope to see you again soon." };
      },
      async stats() {
        return { new_reviews: 3, answered: 2, waiting: 1, average: 4.7 };
      },
      async reviewLink(l) {
        return l === BIZ.harbour || l === BIZ.smile ? "ABC234" : null;
      },
      async acceptPhoto(l, u, bytes) {
        w.photos.push(`${l}:${u}:${bytes.length}`);
        const id = uuid(500 + w.photos.length);
        // The file as sent is stored at once (its hash does not change when the photo check finishes).
        w.waPhotos.set(id, { location: l, user: u, state: "checking", hold: false, asked: false, file: `etag-${id}` });
        return { ok: true, photo_id: id };
      },
      async photoHold(photo, user) {
        const p = w.waPhotos.get(photo);
        if (!p || p.user !== user) return false;
        p.hold = true;
        return true;
      },
      async photoPostPrepare(l, u, photo, caption, text) {
        const biz = w.biz.find((b) => b.id === l);
        const role = biz?.members[u];
        if (!role) return { ok: false, reason: "not_member" };
        const p = w.waPhotos.get(photo);
        if (!p || p.location !== l || p.user !== u) return { ok: false, reason: "photo_not_usable" };
        if (text.length < 10 || /[–—!]/.test(text)) return { ok: false, reason: "house_style" };
        p.hold = true;
        const left = w.postsLeft.get(l);
        if (left !== undefined && left <= 0) return { ok: false, reason: "posts_used_up" };
        if (left !== undefined) w.postsLeft.set(l, left - 1);
        const id = uuid(700 + w.posts.size);
        w.posts.set(id, { location: l, text, caption, photo, state: "draft" });
        w.calls.push(`photo_post:${l}:${text}`);
        const self = role === "owner" || role === "manager";
        const to = self ? [{ user_id: u }] : Object.entries(biz!.members).filter(([, r]) => r !== "staff")
          .map(([id]) => w.users.find((x) => x.id === id)!).filter((x) => x.optin === "active" && x.phone).map((x) => ({ user_id: x.id, phone: x.phone! }));
        return { ok: true, post_id: id, self, to };
      },
      async postContext(l, ownerText) {
        const b = w.biz.find((x) => x.id === l)!;
        return { allowedText: ownerText, website: null, category: "cafe", categoryLabel: "Coffee shop", city: "New York", businessName: b.name, country: b.country,
          recent: [...w.posts.values()].filter((x) => x.location === l && x.state !== "skipped").map((x) => x.text) };
      },
      async postSkip(token, phone) {
        const a = w.actions.get(token);
        const u = a && w.users.find((x) => x.id === a.user);
        if (!a || a.type !== "local_post" || u?.phone !== phone) return { result: "unknown" };
        if (a.used) return { result: "already", location_id: a.location };
        a.used = true;
        const po = w.posts.get(a.target);
        if (!po || po.state !== "draft") return { result: "already", location_id: a.location };
        po.state = "skipped";
        const ph = w.waPhotos.get(po.photo);
        if (ph?.hold) ph.state = "skipped";
        for (const x of w.actions.values()) if (x.target === a.target) x.stale = true;
        return { result: "skipped", location_id: a.location };
      },
      async heldPhoto(phone, photo, action) {
        const u = w.userByPhone(phone);
        const p = w.waPhotos.get(photo);
        if (!u || !p) return { result: "unknown" };
        const role = w.biz.find((b) => b.id === p.location)?.members[u.id];
        if (role !== "owner" && role !== "manager" && !(action === "skip" && p.user === u.id)) return { result: "not_yours" };
        if (!p.hold || !["checking", "draft"].includes(p.state)) return { result: "already", location_id: p.location };
        for (const po of w.posts.values()) if (po.photo === photo && po.state === "draft") po.state = "skipped";
        if (action === "skip") {
          p.state = "skipped";
          return { result: "skipped", location_id: p.location };
        }
        p.hold = false;
        return { result: "photo", location_id: p.location };
      },
      async growth(_l, days) {
        return { days, newReviews: 3, opens: { message: 5, qr: 2, tag: 1 } };
      },
      async photoCategory(user, photo, category) {
        const p = w.photoDrafts.get(photo);
        if (!p) return { ok: false, reason: "unknown_target" };
        const role = w.biz.find((b) => b.id === p.location)?.members[user];
        if (role !== "owner" && role !== "manager") return { ok: false, reason: "not_member" };
        if (p.state !== "draft") return { ok: false, reason: "not_draft" };
        p.category = category;
        // The hash of the item changes with the category: tokens made before it are refused ("changed").
        for (const a of w.actions.values()) if (a.type === "photo" && a.target === photo) a.stale = true;
        return { ok: true, location_id: p.location };
      },
      async photoSkip(token, phone) {
        const a = w.actions.get(token);
        const u = a && w.users.find((x) => x.id === a.user);
        if (!a || a.type !== "photo" || u?.phone !== phone) return { result: "unknown" };
        if (a.used) return { result: "already", location_id: a.location };
        a.used = true;
        const p = w.photoDrafts.get(a.target);
        if (p) p.state = "skipped";
        return { result: "skipped", location_id: a.location };
      },
      async monthlyAnswered(l) {
        w.calls.push(`monthly_answered:${l}`);
      },
      async staffNumbers() {
        return { jobs_failed_1h: 0, jobs_waiting: 0, publications_stuck: 0, handoffs: w.handoffs.length, outbox_held: 0, signups_today: 2,
          reviews_answered_today: 5, number_quality: "GREEN", number_checked_at: null };
      },
      async staffSummary() {
        return { signups: 2, trials_started: 1, paid_new: 1, paid_total: 3, cancellations: 0, reviews_answered: 5, replies_waiting: 4, handoffs_waiting: w.handoffs.length,
          publications_stuck: 0, jobs_failed: 2, errors_by_job: [{ job: "sync", n: 2 }], ai_cost_micros: 1_230_000, places_today: 4, places_cap: 20,
          dataforseo_micros: 900_000, dataforseo_cap_usd: 10, number_quality: "GREEN", number_messaging: "LIMITED", alerts_24h: 7 };
      },
      async staffPause(name, pause) {
        const m = w.biz.filter((b) => b.name.toLowerCase().includes(name.toLowerCase()));
        if (m.length !== 1) return { ok: false, matches: m.map((b) => b.name) };
        w.calls.push(`${pause ? "pause" : "resume"}:${m[0].id}`);
        return { ok: true, business: m[0].name };
      },
      // RB-F3: request_reset_test's rules: a staff phone only; open requests this phone's own users made at demo businesses.
      async resetTest(phone, confirm) {
        w.calls.push(`reset_test:${confirm}`);
        if (!w.staffAdmin.has(phone)) return { ok: false, reason: "forbidden" };
        const mine = new Set(w.users.filter((u) => u.phone === phone).map((u) => u.id));
        const hits = w.requests.filter((x) => x.status !== "closed" && mine.has(x.by) && w.biz.find((b) => b.id === x.location)?.demo === true
          && w.biz.find((b) => b.id === x.location)?.members[x.by] !== undefined);
        if (!confirm) return { ok: true, open: hits.length, businesses: new Set(hits.map((x) => x.location)).size };
        for (const x of hits) {
          x.status = "closed";
          x.outcome = "voided";
          x.version = (x.version ?? 1) + 1;
        }
        return { ok: true, voided: hits.length };
      },
      async handoff(phone, summary) {
        w.handoffs.push(`${phone}:${summary}`);
      },
      async mapDetails(scanId) {
        const sc = w.scans.get(scanId);
        if (!sc) return null;
        return { location_id: sc.location, business: w.biz.find((b) => b.id === sc.location)!.name, keyword: sc.keyword, points: 49, top3: 18, ranked: 40,
          average: 6.4, competitors: ["Harbor Bakes", "Oven Street", "Bean There"] };
      },
      async outboxGet(phone, ids) {
        return w.outbox.filter((r) => r.phone === phone && ids.includes(r.id)).map((r) => ({ id: r.id, body: r.body, buttons: r.buttons, location_id: r.location_id }));
      },
      async releaseHeld(phone) {
        let n = 0;
        for (const r of w.outbox) {
          if (r.phone === phone && r.state === "held" && r.error === "outside_window") {
            r.due_at = new Date(w.now).toISOString();
            n++;
          }
        }
        return n;
      },
    };
  }

  outDb(): OutDb {
    const w = this;
    return {
      async state(phone): Promise<SendState> {
        const c = w.conv.get(phone);
        const roles = w.roles(phone);
        const b = roles.find((r) => r.kind === "business" && (!c?.active_location_id || r.location_id === c.active_location_id));
        const tz = b && b.kind === "business" ? b.time_zone! : roles.some((r) => r.kind === "staff_admin") ? "Asia/Beirut" : "UTC";
        const day = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(t));
        const sent = w.outbox.filter((r) => r.phone === phone && ["sent", "mock_sent"].includes(r.state) && r.kind !== "reply" && r.sent_at !== null);
        return {
          time_zone: tz,
          sent_today: sent.filter((r) => day(r.sent_at!) === day(w.now)).length,
          last_sent_at: sent.length ? new Date(Math.max(...sent.map((r) => r.sent_at!))).toISOString() : null,
          window_expires_at: c?.window_expires_at ?? null,
          stopped: !!c?.stopped_at,
          live_ok: w.livePhones.has(phone) || w.staffAdmin.has(phone),
          digest_only: ["YELLOW", "MEDIUM"].includes(w.quality ?? ""),
        };
      },
      async add(r) {
        if (r.dedupe && w.outbox.some((x) => x.dedupe === r.dedupe)) return null;
        const id = w.outbox.length + 1;
        w.outbox.push({ id, phone: r.phone, user_id: r.userId, location_id: r.locationId, kind: r.kind, body: r.body, buttons: r.buttons ?? [],
          template: r.template ?? null, urgent: !!r.urgent, state: "queued", due_at: (r.dueAt ?? new Date(w.now)).toISOString(), attempts: 0,
          dedupe: r.dedupe ?? null, sent_at: null, error: null, provider: null });
        return id;
      },
      async mark(ids, state, o = {}) {
        for (const r of w.outbox.filter((x) => ids.includes(x.id))) {
          r.state = state;
          if (o.providerId) r.provider = o.providerId;
          r.error = o.error ?? null;
          if (o.dueAt) r.due_at = o.dueAt.toISOString();
          if (state === "failed" || (o.error ?? "").startsWith("send:")) r.attempts++;
          if (state === "sent" || state === "mock_sent") r.sent_at = w.now;
        }
      },
      async claim(limit) {
        const due = w.outbox.filter((r) => ["queued", "held"].includes(r.state) && Date.parse(r.due_at) <= w.now).slice(0, limit);
        const out = due.map((r) => ({ ...r }));
        for (const r of due) r.state = "sending";
        return out;
      },
      async get(phone, ids) {
        return w.outbox.filter((r) => r.phone === phone && ids.includes(r.id));
      },
      async release(phone) {
        return w.db().releaseHeld(phone);
      },
      async setQuestion(phone, q) {
        w.conversation(phone).open_question = q as Conversation["open_question"];
      },
    };
  }

  sender(live: boolean): Sender {
    const w = this;
    const push = (m: Omit<SentMsg, "live">) => {
      if (w.failSends > 0) {
        w.failSends--;
        throw new Error("kapso 503");
      }
      w.sent.push({ ...m, live });
      return { id: `wamid.${live ? "live" : "mock"}.${w.sent.length}` };
    };
    return {
      live,
      text: async (to, body) => push({ to, kind: "text", body, buttons: [] }),
      buttons: async (to, body, b: Button[], footer?: string) => push({ to, kind: "buttons", body, buttons: b.map((x) => x.title), ...(footer ? { footer } : {}) }),
      list: async (to, body, l, footer) => push({ to, kind: "list", body, buttons: [], ...(footer ? { footer } : {}),
        rows: l.sections.flatMap((x) => x.rows.map((r) => [r.title, r.description].filter(Boolean).join(" · "))),
        rowIds: l.sections.flatMap((x) => x.rows.map((r) => r.id)) }),
      template: async (to, name) => push({ to, kind: "template", body: "", buttons: [], template: name }),
      media: async (id) => w.mediaBytes.get(id) ?? new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]),
      image: async (to, png, body, b: Button[]) => push({ to, kind: "image", body, buttons: b.map((x) => x.title) }),
    };
  }

  out(): Out {
    return { db: this.outDb(), live: this.sender(true), mock: this.sender(false), now: () => new Date(this.now),
      mapPng: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };
  }

  bookDb(): BookDb {
    const w = this;
    const no = (reason: string, extra: Record<string, unknown> = {}) => ({ ok: false, reason, ...extra });
    const gate = (loc: string, actor: string) => {
      if (w.bookSetting !== "on" || w.packs.get(loc)?.state !== "test") return "disabled";
      return w.biz.find((b) => b.id === loc)?.members[actor] ? null : "not_member";
    };
    const replay = (loc: string, actor: string, key: string, tool: string, input: unknown) => {
      const hash = `${tool}:${actor}:${JSON.stringify(input)}`;
      const k = w.toolKeys.get(`${loc}:${key}`);
      return { hash, result: k ? (k.hash === hash ? { ...k.result, replay: true } : no("key_reused")) : null };
    };
    const finish = (loc: string, key: string, hash: string, result: Record<string, unknown>) => (w.toolKeys.set(`${loc}:${key}`, { hash, result }), result);
    const uid = () => `00000000-0000-4000-9000-${String(++w.n).padStart(12, "0")}`;
    const row = (q: Req) => ({ request_id: q.id, number: q.number, kind: q.kind, status: q.status, outcome: q.outcome ?? null, summary: q.summary,
      customer_id: q.customer_id ?? `c-${q.id}`, customer_name: q.customer_name, requested_window_text: q.requested_window_text, starts_at: q.starts_at,
      staff_confirmed: !!q.staff_confirmed_at, customer_confirmed: !!q.customer_confirmed_at, next_action: null, next_action_due_at: null, follow_up_user_id: null,
      created_at: q.created_at });
    const roleOf = (loc: string, actor: string) => w.biz.find((b) => b.id === loc)?.members[actor] ?? "staff";
    const act = (loc: string, q: Req, type: string, actor: string, from: string | null, to: string | null, fromOutcome: string | null, toOutcome: string | null,
      o: { flags?: string[]; undoOf?: string | null; related?: string | null; values?: Activity["values"] } = {}): Activity => {
      const a: Activity = { id: uid(), location: loc, request: q.id, type, from, to, fromOutcome, toOutcome, flags: o.flags ?? [], actor, role: roleOf(loc, actor),
        at: w.now + w.activities.length, undoOf: o.undoOf ?? null, related: o.related ?? null, values: o.values ?? [] };
      w.activities.push(a);
      return a;
    };
    const result = (q: Req, a: Activity, flags: string[] = []) => ({ ok: true, request_id: q.id, number: q.number, kind: q.kind, status: q.status,
      outcome: q.outcome ?? null, row_version: q.version ?? 1, activity_id: a.id, flags });
    // private.rb_rule, as policy.ts and the database have it.
    const rule = (kind: string, from: string, to: string, outcome: string | null, startsAt: string | null) => {
      const passed = !!startsAt && Date.parse(startsAt) <= w.now;
      const r = (reason: string | null, ack = false, owner = false, flags: string[] = []) => ({ reason, ack, owner, flags });
      if (to === from) return r("no_change");
      if (to === "closed") {
        if (!outcome) return r("outcome_required");
        if (outcome === "voided") return r("not_allowed");
        if (outcome === "converted") return r("use_convert");
        if (kind === "enquiry" && outcome === "lost") return r(null, true, true);
        if (outcome === "cancelled" && (kind === "appointment" || kind === "job")) return r(null, true, true);
        if (kind === "appointment" && outcome === "attended") return !startsAt ? r(null, true, false, ["attended_without_time"]) : !passed ? r(null, true, false, ["attended_before_time"]) : r(null);
        if (outcome === "no_show" && (kind === "appointment" || (kind === "job" && from === "waiting"))) return passed ? r(null) : r(null, true, false, ["no_show_before_time"]);
        if (kind === "job" && outcome === "completed") return from === "waiting" ? r(null, true, false, ["arrival_not_recorded"]) : r(null);
        return r("not_allowed");
      }
      if (outcome) return r("not_allowed");
      const k = `${kind}:${from}:${to}`;
      if (["enquiry:new:contacted", "job:waiting:active", "job:active:ready", "job:ready:active"].includes(k)) return r(null);
      if (k === "job:waiting:ready") return r(null, true, false, ["arrival_not_recorded"]);
      return r("not_allowed");
    };
    const latest = (req: string) => [...w.activities].reverse()
      .find((a) => a.request === req && a.type !== "undone" && !w.activities.some((u) => u.undoOf === a.id))?.id ?? null;
    const mine = (loc: string, id: string) => w.requests.find((x) => x.location === loc && x.id === id);
    const call = (fn: string, loc: string, actor: string) => w.bookCalls.push(`${fn}:${loc}:${actor}`);
    return {
      async on(ids) {
        w.bookCalls.push(`on:${ids.join(",")}`);
        if (w.bookSetting !== "on") return {};
        return Object.fromEntries(ids.filter((id) => w.packs.get(id)?.state === "test").map((id) => [id, { pack: w.packs.get(id)!.pack, version: w.packs.get(id)!.version }]));
      },
      async propose(loc, actor, key, raw, evidence, provider) {
        call("propose", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const r = replay(loc, actor, key, "propose", { raw, evidence, provider });
        if (r.result) return r.result;
        if (provider && [...w.intakes.values()].some((i) => i.location === loc && i.provider === provider)) return no("duplicate_message");
        const i: Intake = { id: uid(), location: loc, raw, evidence, state: "pending", provider, by: actor, expires: w.now + 30 * 86400_000 };
        w.intakes.set(i.id, i);
        return finish(loc, key, r.hash, { ok: true, intake_id: i.id, state: "pending" });
      },
      async revise(loc, actor, key, id, raw, evidence) {
        call("revise", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const r = replay(loc, actor, key, "revise", { id, raw, evidence });
        if (r.result) return r.result;
        const i = w.intakes.get(id);
        if (!i || i.location !== loc) return no("not_found");
        if (i.state !== "pending" || i.expires <= w.now) return no("intake_unavailable");
        i.raw = raw;
        i.evidence = evidence;
        return finish(loc, key, r.hash, { ok: true, intake_id: i.id, state: "pending" });
      },
      async discard(loc, actor, _key, id) {
        call("discard", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const i = w.intakes.get(id);
        if (!i || i.location !== loc) return no("not_found");
        if (i.state !== "pending") return no("intake_unavailable");
        i.state = "discarded";
        return { ok: true, intake_id: i.id, state: i.state };
      },
      async intake(loc, actor, id) {
        call("intake", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const i = w.intakes.get(id);
        if (!i || i.location !== loc) return no("not_found");
        const q = w.requests.find((x) => x.intake_id === i.id);
        return { ok: true, intake_id: i.id, source: "typed", raw_text: i.raw, field_evidence: i.evidence,
          state: i.state === "pending" && i.expires <= w.now ? "expired" : i.state, request_id: q?.id ?? null };
      },
      async create(loc, actor, key, input) {
        call("create", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const r = replay(loc, actor, key, "create", input);
        if (r.result) return r.result;
        const i = input.intake_id ? w.intakes.get(String(input.intake_id)) : null;
        if (input.intake_id && (!i || i.location !== loc || i.state !== "pending")) return no("intake_unavailable");
        const phones = ((input.identifiers ?? []) as { value: string }[]).map((x) => x.value);
        if (phones.some((p) => !/^\+\d+55501\d\d$/.test(p))) return no("real_data_refused");
        if (i) i.state = "confirmed";
        const number = w.requests.filter((x) => x.location === loc).length + 1;
        if (input.initial_status !== undefined && (input.kind !== "job" || !["waiting", "active"].includes(String(input.initial_status)))) return no("invalid_field");
        const q: Req = { id: uid(), location: loc, number, kind: String(input.kind),
          status: input.kind === "job" ? String(input.initial_status ?? "waiting") : input.kind === "enquiry" ? "new" : "requested",
          summary: String(input.summary), customer_name: (input.customer_name as string) ?? null, phones, requested_window_text: (input.requested_window_text as string) ?? null,
          starts_at: (input.starts_at as string) ?? null, intake_id: i?.id ?? null, by: actor, created_at: new Date(w.now).toISOString(),
          outcome: null, version: 1, details: (input.details as Record<string, unknown>) ?? {}, staff_confirmed_at: null, customer_confirmed_at: null,
          customer_id: `c-${uid()}`, converted_from: null };
        w.requests.push(q);
        const a = act(loc, q, "created", actor, null, q.status, null, null);
        return finish(loc, key, r.hash, { ok: true, request_id: q.id, number, kind: q.kind, status: q.status, outcome: null, row_version: 1, activity_id: a.id, flags: [] });
      },
      async get(loc, actor, ref) {
        call("get", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const n = Number(ref.replace("#", ""));
        const q = /^[0-9a-f-]{36}$/.test(ref) ? mine(loc, ref) : w.requests.find((x) => x.location === loc && x.number === n);
        if (!q) return no("not_found");
        const r = row(q);
        return { ok: true, request: { ...r, id: q.id, staff_confirmed_at: q.staff_confirmed_at ?? null, customer_confirmed_at: q.customer_confirmed_at ?? null,
          row_version: q.version ?? 1, details: q.details ?? {} }, customer_name: q.customer_name, customer_erased: false };
      },
      async find(loc, actor, query) {
        call("find", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        if (query.text !== undefined) {
          const words = String(query.text).toLowerCase().split(" ").filter(Boolean);
          if (!words.length) return no("invalid_field");
          const hits = w.requests.filter((x) => x.location === loc && words.every((wd) => x.summary.toLowerCase().includes(wd))).reverse();
          return { ok: true, rows: hits.slice(0, 15).map(row), more: Math.max(0, hits.length - 15) };
        }
        const name = String(query.name ?? "").toLowerCase();
        if (name.length < 2) return no("invalid_field");
        const hits = w.requests.filter((x) => x.location === loc && (x.customer_name ?? "").toLowerCase().includes(name))
          .sort((a, b) => Number(a.status === "closed") - Number(b.status === "closed") || b.number - a.number);
        return { ok: true, rows: hits.slice(0, 15).map(row), more: Math.max(0, hits.length - 15) };
      },
      // RB-F: PR B's writes, with the database's rules: the gate, the version, the move table, the owner-only moves, the ask
      // first, Undo's 10 minutes and latest-only, and a time change clearing the confirmations.
      async setStatus(loc, actor, key, id, version, to, outcome, ack) {
        call("set_status", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const rp = replay(loc, actor, key, "set_status", { id, version, to, outcome, ack });
        if (rp.result) return rp.result;
        const q = mine(loc, id);
        if (!q) return no("not_found");
        if (version !== (q.version ?? 1)) return no("version_conflict", { row_version: q.version ?? 1 });
        if (q.status === "closed") {
          // RB-T: reopening, as request_set_status has it: owner or manager, never a conversion or a void, only back to where
          // it was (the refusal names it), and always asked first.
          if (!["owner", "manager"].includes(roleOf(loc, actor))) return no("forbidden");
          if (q.outcome === "converted" || q.outcome === "voided") return no("not_reopenable");
          const prev = [...w.activities].reverse().find((a) => a.request === q.id && a.type === "status_changed" && a.to === "closed")?.from ?? null;
          if (!prev || to !== prev || outcome !== null) return no("not_allowed", { reopen_to: prev });
          if (!ack) return no("needs_confirmation", { flags: ["reopened"] });
          const fromOutcome = q.outcome ?? null;
          q.status = to;
          q.outcome = null;
          q.version = (q.version ?? 1) + 1;
          const a = act(loc, q, "status_changed", actor, "closed", to, fromOutcome, null, { flags: ["reopened"] });
          return finish(loc, key, rp.hash, result(q, a, ["reopened"]));
        }
        const ru = rule(q.kind, q.status, to, outcome, q.starts_at);
        if (ru.reason) return no(ru.reason);
        if (ru.owner && !["owner", "manager"].includes(roleOf(loc, actor))) return no("forbidden");
        if (ru.ack && !ack) return no("needs_confirmation", { flags: ru.flags });
        const from = q.status, fromOutcome = q.outcome ?? null;
        q.status = to;
        q.outcome = outcome;
        q.version = (q.version ?? 1) + 1;
        const a = act(loc, q, "status_changed", actor, from, to, fromOutcome, outcome, { flags: ru.flags });
        return finish(loc, key, rp.hash, result(q, a, ru.flags));
      },
      async setConfirmation(loc, actor, key, id, version, party, confirmed) {
        call("set_confirmation", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const rp = replay(loc, actor, key, "set_confirmation", { id, version, party, confirmed });
        if (rp.result) return rp.result;
        const q = mine(loc, id);
        if (!q) return no("not_found");
        if (version !== (q.version ?? 1)) return no("version_conflict");
        if (q.kind !== "appointment") return no("not_appointment");
        if (q.status === "closed") return no("closed");
        if (confirmed && !q.starts_at) return no("time_required");
        const field = party === "staff" ? "staff_confirmed_at" : "customer_confirmed_at";
        if (!!q[field] === confirmed) return no("no_change");
        const before = q[field] ?? null;
        q[field] = confirmed ? new Date(w.now).toISOString() : null;
        q.version = (q.version ?? 1) + 1;
        const flags = [`${party}_${confirmed ? "confirmed" : "unconfirmed"}`, ...(party === "customer" ? ["recorded_by_staff"] : [])];
        const a = act(loc, q, "confirmation_changed", actor, q.status, q.status, null, null, { flags, values: [{ field, before, after: q[field] }] });
        return finish(loc, key, rp.hash, result(q, a, flags));
      },
      async correct(loc, actor, key, id, version, changes) {
        call("correct", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        if (roleOf(loc, actor) === "staff") return no("forbidden");
        const rp = replay(loc, actor, key, "correct", { id, version, changes });
        if (rp.result) return rp.result;
        const q = mine(loc, id);
        if (!q) return no("not_found");
        if (version !== (q.version ?? 1)) return no("version_conflict");
        if (q.status === "closed") return no("closed");
        const values: Activity["values"] = [];
        const cur = q as unknown as Record<string, unknown>;
        for (const [f, v] of Object.entries(changes)) {
          if (JSON.stringify(cur[f] ?? null) === JSON.stringify(v)) continue;
          values.push({ field: f, before: cur[f] ?? null, after: v });
        }
        if (!values.length) return no("no_change");
        const flags: string[] = [];
        if (("starts_at" in changes) && (q.staff_confirmed_at || q.customer_confirmed_at)) {
          values.push({ field: "staff_confirmed_at", before: q.staff_confirmed_at ?? null, after: null },
            { field: "customer_confirmed_at", before: q.customer_confirmed_at ?? null, after: null });
          flags.push("confirmations_cleared");
        }
        for (const v of values) cur[v.field] = v.after;
        q.version = (q.version ?? 1) + 1;
        const a = act(loc, q, "corrected", actor, q.status, q.status, null, null, { flags, values });
        return finish(loc, key, rp.hash, result(q, a, flags));
      },
      async convert(loc, actor, key, id, version, input) {
        call("convert", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const rp = replay(loc, actor, key, "convert", { id, version, input });
        if (rp.result) return rp.result;
        const e = mine(loc, id);
        if (!e) return no("not_found");
        if (version !== (e.version ?? 1)) return no("version_conflict");
        if (e.kind !== "enquiry") return no("not_enquiry");
        if (e.status === "closed") return no("closed");
        const kind = String(input.kind ?? "appointment");
        const n: Req = { id: uid(), location: loc, number: w.requests.filter((x) => x.location === loc).length + 1, kind, status: kind === "job" ? "waiting" : "requested",
          summary: String(input.summary ?? e.summary), customer_name: e.customer_name, phones: e.phones, requested_window_text: (input.requested_window_text as string) ?? e.requested_window_text,
          starts_at: (input.starts_at as string) ?? null, intake_id: null, by: actor, created_at: new Date(w.now).toISOString(), outcome: null, version: 1, details: {},
          staff_confirmed_at: null, customer_confirmed_at: null, customer_id: e.customer_id, converted_from: e.id };
        w.requests.push(n);
        const from = e.status;
        e.status = "closed";
        e.outcome = "converted";
        e.version = (e.version ?? 1) + 1;
        const out = act(loc, e, "converted_out", actor, from, "closed", null, "converted", { related: n.id });
        const inn = act(loc, n, "converted_in", actor, null, n.status, null, null, { related: e.id });
        return finish(loc, key, rp.hash, { ...result(n, inn), enquiry_id: e.id, enquiry_activity_id: out.id });
      },
      async undo(loc, actor, key, activity) {
        call("undo", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const rp = replay(loc, actor, key, "undo", { activity });
        if (rp.result) return rp.result;
        const a = w.activities.find((x) => x.id === activity && x.location === loc);
        if (!a) return no("not_found");
        if (!["owner", "manager"].includes(roleOf(loc, actor)) && a.actor !== actor) return no("forbidden");
        if (a.type === "undone") return no("not_undoable");
        if (w.activities.some((u) => u.undoOf === a.id)) return no("already_undone");
        const pair = a.type.startsWith("converted") ? w.activities.find((x) => x.request === a.related && x.related === a.request && x.type.startsWith("converted")) : null;
        if (latest(a.request) !== a.id || (pair && latest(pair.request) !== pair.id)) return no("not_latest");
        if (w.now - a.at > 10 * 60_000) return no("window_passed");
        const q = mine(loc, a.request)!;
        let u: Activity;
        if (a.type === "created") {
          const from = q.status;
          q.status = "closed";
          q.outcome = "voided";
          if (q.intake_id) w.intakes.get(q.intake_id)!.state = "pending";
          u = act(loc, q, "undone", actor, from, "closed", null, "voided", { undoOf: a.id });
        } else if (a.type === "status_changed") {
          q.status = a.from!;
          q.outcome = a.fromOutcome;
          u = act(loc, q, "undone", actor, a.to, q.status, a.toOutcome, q.outcome, { undoOf: a.id });
        } else if (a.type === "corrected" || a.type === "confirmation_changed") {
          const cur = q as unknown as Record<string, unknown>;
          for (const v of a.values) cur[v.field] = v.before;
          u = act(loc, q, "undone", actor, q.status, q.status, null, null, { undoOf: a.id });
        } else {
          const enq = a.type === "converted_out" ? a : pair!;
          const neu = a.type === "converted_out" ? pair! : a;
          const e = mine(loc, enq.request)!, n = mine(loc, neu.request)!;
          e.status = enq.from!;
          e.outcome = null;
          n.status = "closed";
          n.outcome = "voided";
          e.version = (e.version ?? 1) + 1;
          n.version = (n.version ?? 1) + 1;
          u = act(loc, e, "undone", actor, "closed", e.status, "converted", null, { undoOf: enq.id, related: n.id });
          act(loc, n, "undone", actor, neu.to, "closed", null, "voided", { undoOf: neu.id, related: e.id });
          return finish(loc, key, rp.hash, result(e, u));
        }
        q.version = (q.version ?? 1) + 1;
        return finish(loc, key, rp.hash, result(q, u));
      },
      async listOpen(loc, actor, filter) {
        call("list_open", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const hits = w.requests.filter((x) => x.location === loc && x.status !== "closed"
          && (filter.status === undefined || x.status === filter.status)
          && (filter.unconfirmed === undefined || (x.kind === "appointment" && (!x.staff_confirmed_at || !x.customer_confirmed_at) === filter.unconfirmed)))
          .reverse();
        return { ok: true, rows: hits.slice(0, 15).map(row), more: Math.max(0, hits.length - 15) };
      },
      async recent(loc, actor, minutes) {
        call("recent", loc, actor);
        const g = gate(loc, actor);
        if (g) return no(g);
        const since = w.now - minutes * 60_000;
        const seen = new Map<string, number>();
        for (const a of w.activities) {
          if (a.location !== loc || a.actor !== actor || a.at <= since || a.type === "undone" || w.activities.some((u) => u.undoOf === a.id)) continue;
          seen.set(a.request, Math.max(seen.get(a.request) ?? 0, a.at));
        }
        const own = (id: string | null) => (id && w.activities.find((a) => a.id === id)?.actor === actor ? id : null);
        const rows = [...seen.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5)
          .map(([id, t]) => ({ request_id: id, number: mine(loc, id)!.number, kind: mine(loc, id)!.kind, touched_at: new Date(t).toISOString(), latest_activity_id: own(latest(id)) }));
        return { ok: true, rows };
      },
    };
  }

  billingDeps(): BillingDeps {
    const w = this;
    const sub = (loc: string) => {
      const s = w.billingSubs!.get(loc);
      if (!s) throw Object.assign(new Error("There is no paid plan to change."), { code: "no_plan" });
      return s;
    };
    return {
      status: async (loc) => w.billingSubs!.get(loc) ?? null,
      portal: async (loc) => (w.calls.push(`portal:${loc}`), "https://creem.io/my-orders/login/test"),
      cancel: async (loc) => (w.calls.push(`cancel:${loc}`), (sub(loc).cancelAtEnd = true), sub(loc).periodEnd),
      keep: async (loc) => (w.calls.push(`keep:${loc}`), (sub(loc).cancelAtEnd = false), sub(loc).periodEnd),
      change: async (loc, to) => {
        w.calls.push(`change:${loc}:${to}`);
        const s = sub(loc);
        const until = to === "essentials" ? s.periodEnd : null;
        s.plan = to;
        return { effective: to === "pro" ? "now" : "renewal", until };
      },
      // Billing 2: a second Creem checkout for the Extra location product; the webhook adds the unit once it is paid.
      addLocation: async (loc) => (w.calls.push(`add_location:${loc}`), sub(loc), "https://creem.io/test/checkout/prod_xm/ch_extra"),
    };
  }

  deps(): AgentDeps {
    const w = this;
    const out = this.out();
    return {
      db: this.db(), out, phoneNumberId: PNID, appUrl: "https://kabsi.co",
      media: (id) => out.live.media(id),
      ai: async (_system, user) => {
        w.aiCalls++;
        const text = user.replace(/<\/?message>/g, "").trim();
        if (w.aiSlow) for (let i = 0; i < 20; i++) await Promise.resolve();
        return w.aiMap[text] ?? '{"tool":"unclear","args":{"question":"Do you mean your review link or your stats?"},"lang":"en"}';
      },
      nora: async (question) => {
        w.noraCalls.push(question);
        if (w.noraAnswer === "throw") throw new Error("anthropic 529");
        return w.noraAnswer ?? "Nothing goes to Google without your yes. Every reply waits for you to approve it on WhatsApp or at [your Kabsi account](/app).";
      },
      draftPhotoPost: w.photoDraft === undefined ? undefined : async (loc, caption) => (w.photoDraftCalls.push(`${loc}:${caption}`), w.photoDraft ?? null),
      editDraft: async (review, instruction) => (w.calls.push(`edit:${review}:${instruction}`), { ok: true }),
      firstMap: async (loc) => (w.firstMaps.push(loc), w.firstMapAnswer),
      confirmKeyword: async (loc, k) => (w.calls.push(`keyword:${loc}:${k}`), w.keywordAnswer),
      mapImage: async () => null,
      transcribe: async (audio) => {
        w.transcribed.push(audio.length);
        return w.transcript ?? { ok: false, reason: "not_configured" };
      },
      flush: async () => {},
      now: () => w.now,
      // "On it" fires at once in a slow case, never in a fast one.
      sleep: (ms: number) => (w.sleeps.push(ms), w.onItFast ? Promise.resolve() : new Promise<void>(() => {})),
      onItMs: 2500,
      billing: w.billingSubs ? w.billingDeps() : undefined,
      // RB-E: always present, so every existing case also runs with the seam in place and the request book off.
      book: {
        db: w.bookDb(),
        ask: async (req) => {
          const text = req.user.replace(/<\/?owner_message>/g, "").trim();
          w.extractCalls.push(text);
          return w.extractMap[text] ?? '{"fields":{},"said":{}}';
        },
      },
    };
  }
}

let seq = 0;
export function msg(w: World, from: string, o: { text?: string; button?: string; media?: Media; contacts?: Contact[]; referral?: Record<string, string>; id?: string; ts?: number; pnid?: string; forwarded?: boolean } = {}): Inbound {
  return {
    phoneNumberId: o.pnid ?? PNID, from, messageId: o.id ?? `wamid.in.${++seq}`, timestamp: o.ts ?? w.now / 1000, type: o.media ? o.media.kind : o.contacts ? "contacts" : o.button ? "interactive" : "text",
    text: o.text ?? null, buttonId: o.button ?? null, mediaId: o.media?.kind === "image" ? o.media.id : null, media: o.media ?? null, contacts: o.contacts ?? [],
    referral: o.referral ?? null, forwarded: o.forwarded ?? false,
  };
}
