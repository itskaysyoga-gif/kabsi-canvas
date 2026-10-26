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

type Biz = { id: string; name: string; tz: string; country: string; pro: boolean; members: Record<string, "owner" | "manager" | "staff"> };
type User = { id: string; phone: string | null; optin: "active" | "stopped" | "none" };
type Action = { token: string; user: string; location: string; type: string; target: string; used: boolean; stale: boolean; risk?: string };
export type SentMsg = { to: string; kind: string; body: string; buttons: string[]; live: boolean; template?: string };

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
  billingSubs: Map<string, { plan: "essentials" | "pro"; period: "month" | "year"; state: string; periodEnd: string | null; cancelAtEnd: boolean; units: number }> | null = null;
  calls: string[] = [];
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
        return { ok: true };
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
      buttons: async (to, body, b: Button[]) => push({ to, kind: "buttons", body, buttons: b.map((x) => x.title) }),
      template: async (to, name) => push({ to, kind: "template", body: "", buttons: [], template: name }),
      media: async (id) => w.mediaBytes.get(id) ?? new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]),
      image: async (to, png, body, b: Button[]) => push({ to, kind: "image", body, buttons: b.map((x) => x.title) }),
    };
  }

  out(): Out {
    return { db: this.outDb(), live: this.sender(true), mock: this.sender(false), now: () => new Date(this.now),
      mapPng: async () => new Uint8Array([0x89, 0x50, 0x4e, 0x47]) };
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
      addLocation: async (loc) => (w.calls.push(`add_location:${loc}`), ++sub(loc).units),
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
      sleep: () => (w.onItFast ? Promise.resolve() : new Promise<void>(() => {})),
      onItMs: 2500,
      billing: w.billingSubs ? w.billingDeps() : undefined,
    };
  }
}

let seq = 0;
export function msg(w: World, from: string, o: { text?: string; button?: string; media?: Media; contacts?: Contact[]; referral?: Record<string, string>; id?: string; ts?: number; pnid?: string } = {}): Inbound {
  return {
    phoneNumberId: o.pnid ?? PNID, from, messageId: o.id ?? `wamid.in.${++seq}`, timestamp: o.ts ?? w.now / 1000, type: o.media ? o.media.kind : o.contacts ? "contacts" : o.button ? "interactive" : "text",
    text: o.text ?? null, buttonId: o.button ?? null, mediaId: o.media?.kind === "image" ? o.media.id : null, media: o.media ?? null, contacts: o.contacts ?? [],
    referral: o.referral ?? null,
  };
}
