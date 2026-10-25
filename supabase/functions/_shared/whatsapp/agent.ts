// The WhatsApp agent (session 13b part 1; master plan 9.1 to 9.7, 25.5, 29.7). One number, one router, one brain in
// Supabase. For each inbound message, after the webhook checked Kapso's signature:
//   1. store it once (a repeated WhatsApp message id does nothing) and answer Kapso at once; the work below runs in the
//      background and a crash leaves the message for the tick to try once more;
//   2. resolve the phone to its roles (phone_roles) and its conversation state;
//   3. read what it asks with no AI (buttons by task id, codes, STOP, the usual words, media);
//   4. only what is left goes to the intent router (one Haiku call), with "On it" first if that takes a moment;
//   5. every reply goes through the one sender, headed with the role and business it acts for.
// Every dependency (database, Kapso, the model, the clock) is passed in, so the 100-conversation suite runs on fakes.
import type { Button, Inbound } from "./channel.ts";
import { fresh } from "./channel.ts";
import { type Ai, route } from "./intent.ts";
import { photoRefusal, voiceCheck } from "./media.ts";
import { type Out, reply as sendReply } from "./outbox.ts";
import type { SendState } from "./policy.ts";
import { toE164 } from "./phone.ts";
import {
  type BusinessRole, businesses, type Domain, domainOf, domains, head, may, needsRoleChoice, type OpenQuestion, pickBusiness,
  roleFor, type RoleName, type Who,
} from "./roles.ts";
import { type Command, isAbuse, parse } from "./router.ts";
import { guessLang, headed, SAY, say } from "./say.ts";
import { CATALOGUE, extraKey, type Period, type Plan, planKey } from "../creem.ts";

export interface AgentDb {
  store(phone: string, providerId: string, kind: string, payload: unknown, referral: Record<string, string> | null): Promise<{ duplicate: boolean; id?: string }>;
  done(id: string, result: string): Promise<void>;
  resolve(phone: string): Promise<Who>;
  setConv(phone: string, patch: Record<string, unknown>): Promise<void>;
  attachCode(phone: string, scan: string | null, partner: string | null): Promise<void>;
  bind(phone: string, code: string): Promise<{ result: string; user_id?: string; first_owner_locations?: string[] }>;
  stopOptin(phone: string): Promise<void>;
  tokenOwner(token: string, phone: string): Promise<"mine" | "not_yours" | "unknown">;
  approve(token: string, phone: string): Promise<{ result: string; reason?: string; repeat?: boolean; location_id?: string; target_type?: string }>;
  undo(token: string, phone: string): Promise<{ result: string }>;
  openItems(phone: string): Promise<{ token: string; kind: string; business: string; location_id: string }[]>;
  ownerDraft(userId: string, reviewId: string, text: string): Promise<{ ok: boolean; reason?: string }>;
  actionCreate(userId: string, targetType: string, targetId: string): Promise<{ ok: boolean; token?: string; text?: string; reason?: string }>;
  stats(locationId: string, days: number): Promise<{ new_reviews: number; answered: number; waiting: number; average: number | null }>;
  reviewLink(locationId: string): Promise<string | null>;
  acceptPhoto(locationId: string, userId: string, bytes: Uint8Array): Promise<{ ok: boolean; reason?: string }>;
  keepVoice(phone: string, messageId: string, bytes: Uint8Array, mime: string | null): Promise<void>;
  staffNumbers(): Promise<Record<string, number | string | null>>;
  staffPause(name: string, pause: boolean): Promise<{ ok: boolean; business?: string; matches?: string[] }>;
  handoff(phone: string, summary: string): Promise<void>;
  outboxGet(phone: string, ids: number[]): Promise<{ id: number; body: string; buttons: Button[]; location_id: string | null }[]>;
  releaseHeld(phone: string): Promise<number>;
}

/** Session 10 (master plan 10.2.10): the owner's billing actions, by business. The server checks the owner again. */
export interface BillingDeps {
  status(locationId: string): Promise<{ plan: Plan; period: Period; state: string; periodEnd: string | null; cancelAtEnd: boolean } | null>;
  portal(locationId: string): Promise<string>;
  cancel(locationId: string): Promise<string | null>;
  keep(locationId: string): Promise<string | null>;
  change(locationId: string, to: Plan): Promise<{ effective: "now" | "renewal"; until: string | null }>;
  addLocation(locationId: string): Promise<number>;
}

export type AgentDeps = {
  db: AgentDb;
  /** Billing through Creem (session 10). Without it "billing" answers the old line. */
  billing?: BillingDeps;
  out: Out;
  phoneNumberId: string;
  appUrl: string;
  media(mediaId: string): Promise<Uint8Array>;
  ai: Ai | null;
  /** A new AI draft for a review with the owner's instruction (the existing reply pipeline). */
  editDraft(reviewId: string, instruction: string): Promise<{ ok: boolean; reason?: string }>;
  /** 28.5: ask Scout for the first map when WhatsApp connects. A stub until V1 merges. */
  firstMap(locationId: string): Promise<string>;
  /** 28.1: the full map image for a scan code, once V1's job has it. A stub (null) until V1 merges. */
  mapImage(scanCode: string): Promise<Uint8Array | null>;
  /** Wakes the sender after a message opened the window (held messages go out). */
  flush(): Promise<unknown>;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** "On it" goes first when the model takes longer than this (the owner sees an answer within 8 seconds). */
  onItMs?: number;
};

const ABUSE_QUIET_MS = 24 * 3600_000;
const HANDOFF_QUIET_MS = 24 * 3600_000;

/** One inbound message: stored once, then handled. Returns what was done (for the log and the suite). */
export async function receive(d: AgentDeps, m: Inbound, background?: (p: Promise<unknown>) => void): Promise<string> {
  if (m.phoneNumberId !== d.phoneNumberId) return "wrong_number";
  if (!fresh(m.timestamp, (d.now ?? Date.now)())) return "stale";
  const phone = toE164(m.from);
  if (!phone) return "bad_phone";
  const stored = await d.db.store(phone, m.messageId, m.media?.kind ?? m.type, m, m.referral ?? null);
  if (stored.duplicate || !stored.id) return "duplicate";
  const work = handle(d, { ...m, from: phone }).then(async (r) => (await d.db.done(stored.id!, r), r));
  if (background) {
    background(work.catch(() => "error"));
    return "accepted";
  }
  return await work;
}

/** The work for one stored message. Also run by the tick for a message whose first try did not finish. */
export async function handle(d: AgentDeps, m: Inbound): Promise<string> {
  const phone = m.from;
  const [who, s] = await Promise.all([d.db.resolve(phone), d.out.db.state(phone)]);
  // The message opened the 24-hour window: anything held for this phone goes now.
  if ((await d.db.releaseHeld(phone)) > 0) void d.flush().catch(() => {});
  const cmd = parse(m);
  const text = m.text ?? "";
  const lang = guessLang(text) ?? who.conversation?.language ?? "en";
  if (text && lang !== who.conversation?.language) await d.db.setConv(phone, { language: lang });
  const t: Turn = { d, s: { ...s, window_expires_at: new Date((d.now ?? Date.now)() + 86_400_000).toISOString() }, who, phone, lang, m };
  return await run(t, cmd);
}

type Turn = { d: AgentDeps; s: SendState; who: Who; phone: string; lang: string; m: Inbound; head?: string | null; business?: BusinessRole | null };

function say1(t: Turn, body: string, buttons?: Button[]) {
  return sendReply(t.d.out, t.s, t.phone, headed(t.head ?? null, body), buttons, { locationId: t.business?.location_id ?? null });
}
const answered = (t: Turn, body: string, result: string, buttons?: Button[]) => say1(t, body, buttons).then(() => result);

async function run(t: Turn, cmd: Command): Promise<string> {
  const { d, who, phone } = t;
  const conv = who.conversation;
  const now = (d.now ?? Date.now)();

  // STOP works at once, for everyone, in every language (9.5). One confirmation, then nothing.
  if (cmd.k === "stop") {
    await Promise.all([d.db.setConv(phone, { stopped: true, open_question: null }), d.db.stopOptin(phone)]);
    await sendReply(d.out, { ...t.s, stopped: false }, phone, say("stopped", t.lang));
    return "stopped";
  }
  if (cmd.k === "start") {
    await d.db.setConv(phone, { stopped: false });
    return answered(t, businesses(who).length || !conv?.stopped_at ? SAY.started : SAY.startedNeedsCode, "started");
  }
  // A code binds the phone (9.2), even after STOP: sending it is the new opt-in.
  if (cmd.k === "bind") return bind(t, cmd.code);
  if (conv?.stopped_at) return "stopped_ignored";

  // Abuse: one notice, then no reply for a day (9.3).
  if (isAbuse(t.m.text)) {
    if (conv?.abuse_notice_at && now - Date.parse(conv.abuse_notice_at) < ABUSE_QUIET_MS) return "abuse_ignored";
    await d.db.setConv(phone, { abuse_notice: true });
    return answered(t, SAY.abuseNotice, "abuse_notice");
  }
  if (cmd.k === "scan_code") {
    await d.db.attachCode(phone, cmd.code, null);
    return answered(t, SAY.scanPicked(cmd.code), "scan_code");
  }
  if (cmd.k === "partner_code") {
    await d.db.attachCode(phone, null, cmd.code);
    return answered(t, SAY.partnerCodeNoted, "partner_code");
  }

  // Answers to Kabsi's own questions: the role, the business, a digest number, "Which one?".
  if (cmd.k === "role_pick") {
    if (!domains(who).includes(cmd.to)) return answered(t, SAY.unclear, "role_refused");
    const q = conv?.open_question;
    await d.db.setConv(phone, { active_role: cmd.to, open_question: null });
    const next: Who = { ...who, conversation: conv ? { ...conv, active_role: cmd.to, open_question: null } : conv };
    if (q?.type === "role" && q.pending) return run({ ...t, who: next }, parse({ ...t.m, text: q.pending, buttonId: null, media: null }));
    return answered({ ...t, who: next }, SAY.switched(cmd.to === "business" ? "your business" : cmd.to === "partner" ? "your partner tools" : "Kabsi staff tools"), "role_set");
  }
  if (cmd.k === "business_pick") return pickedBusiness(t, cmd.locationId);
  if (cmd.k === "number" && conv?.open_question) {
    const q = conv.open_question;
    if (q.type === "business" && q.options[cmd.n - 1]) return pickedBusiness(t, q.options[cmd.n - 1].id);
    if (q.type === "digest" && q.ids[cmd.n - 1]) return openDigestItem(t, q.ids[cmd.n - 1]);
    if (q.type === "which" && q.options[cmd.n - 1]) return approveToken(t, q.options[cmd.n - 1].token);
  }

  // A person is answering in the Kapso inbox: free text waits for them; buttons and commands still work.
  if (cmd.k === "free" && conv?.handoff_at && now - Date.parse(conv.handoff_at) < HANDOFF_QUIET_MS) return "handoff_quiet";

  // Buttons resolve by the task id inside them, with no AI call (9.1 point 2).
  if (cmd.k === "button") return button(t, cmd.action, cmd.token);
  if (cmd.k === "yes") return yes(t);
  if (cmd.k === "no") {
    if (conv?.open_question) await d.db.setConv(phone, { open_question: null });
    return answered(t, SAY.noted, "no");
  }

  // Media.
  if (cmd.k === "photo") return withBusiness(t, "photo", null, (tb) => photo(tb, cmd.media.id));
  if (cmd.k === "voice") return voice(t, cmd.media);
  if (cmd.k === "video") return withBusiness(t, "photo", null, (tb) => answered(tb, SAY.videoKept, "video"));
  if (cmd.k === "file") return answered(t, SAY.photoUnreadable, "file_refused");
  if (cmd.k === "contact") {
    // "Ask a customer" (27.3 item 5): the number is checked and kept in E.164, local numbers read in the business's country.
    const c = cmd.contacts[0];
    return withBusiness(t, "contact", null, (tb) => {
      const ok = c?.phones.map((p) => toE164(p, tb.business?.country ?? null)).find(Boolean);
      return answered(tb, ok ? SAY.contactTaken(c.name ?? "your customer") : SAY.contactBad, ok ? "contact" : "contact_bad");
    });
  }
  if (cmd.k === "empty") return "empty";
  if (cmd.k === "number") return free(t, String(cmd.n));
  if (cmd.k === "free") return free(t, cmd.text);
  return tool(t, cmd.tool, cmd.arg, t.m.text ?? "");
}

// ─── Roles, business choice and the head line.

/** Runs a tool for the business the message is about: the only one, the active one, or "Which business?" first. */
async function withBusiness(t: Turn, toolName: string, pending: string | null, fn: (t: Turn) => Promise<string>): Promise<string> {
  const list = businesses(t.who);
  if (!list.length) return answered(t, domains(t.who).includes("partner") ? SAY.businessOnly : SAY.needsAccount, "needs_account");
  const b = pickBusiness(t.who);
  if (!b) {
    const options = list.map((x) => ({ id: x.location_id, name: x.business }));
    await t.d.db.setConv(t.phone, { open_question: { type: "business", pending, options } satisfies OpenQuestion });
    if (options.length <= 3) {
      return answered(t, SAY.whichBusiness, "which_business", options.map((o) => ({ id: `b:${o.id}`, title: o.name.slice(0, 20) })));
    }
    return answered(t, SAY.whichBusinessList(options.map((o) => o.name)), "which_business");
  }
  if (!may(b.role, toolName)) {
    const tb = { ...t, business: b, head: head(t.who, "business", b) };
    if (toolName === "billing") return answered(tb, SAY.billingOwnerOnly, "billing_owner_only");
    return answered(tb, SAY.roleNotAllowed(b.role), `not_for_${b.role}`);
  }
  return fn({ ...t, business: b, head: head(t.who, "business", b) });
}

async function pickedBusiness(t: Turn, locationId: string): Promise<string> {
  const b = businesses(t.who).find((x) => x.location_id === locationId);
  // A business this phone is not bound to is never acted on or named (9.2).
  if (!b) return answered(t, SAY.notYours, "business_refused");
  const q = t.who.conversation?.open_question;
  await t.d.db.setConv(t.phone, { active_location_id: b.location_id, active_role: "business", open_question: null });
  const conv = t.who.conversation ? { ...t.who.conversation, active_location_id: b.location_id, active_role: "business" as Domain, open_question: null } : null;
  const next: Turn = { ...t, who: { ...t.who, conversation: conv } };
  if (q?.type === "business" && q.pending) return run(next, parse({ ...t.m, text: q.pending, buttonId: null, media: null }));
  return answered({ ...next, business: b, head: head(next.who, "business", b) }, SAY.switched(b.business), "business_set");
}

// ─── Tools by name, each checked against the role's list (29.7).

async function tool(t: Turn, name: string, arg: string | undefined, text: string): Promise<string> {
  const { who } = t;
  // "my link" is the review link for a business and the partner link for a partner.
  if (name === "review_link" && /my link/i.test(text) && domains(who).includes("partner") && (who.conversation?.active_role === "partner" || !domains(who).includes("business"))) name = "partner_tool";
  const dom = domainOf(name);
  // "help" could mean either role: asked once, then remembered (29.7).
  const ask = name === "help" ? needsRoleChoice(who, null) : null;
  if (ask) return askRole(t, ask, text);

  if (dom === "staff") {
    if (!domains(who).includes("staff")) return free(t, text); // never revealed to anyone else
    return staff({ ...t, head: head(who, "staff", null) }, name, arg);
  }
  if (dom === "partner") {
    if (!domains(who).includes("partner")) return answered(t, SAY.partnerOnly, "partner_refused");
    return answered({ ...t, head: head(who, "partner", null) }, SAY.partnerSoon, "partner_stub");
  }
  if (dom === "business") {
    if (!domains(who).includes("business")) {
      if (domains(who).includes("partner")) return answered({ ...t, head: head(who, "partner", null) }, SAY.businessOnly, "business_refused");
      return answered(t, SAY.needsAccount, "needs_account");
    }
    return withBusiness(t, name, text, (tb) => businessTool(tb, name, arg));
  }
  // Shared tools.
  switch (name) {
    case "help": return help(t);
    // 24.8: a chat that arrives without the scan code is welcomed and asked for the business name or the code.
    case "greet": return !domains(who).length ? answered(t, say(t.who.conversation?.scan_code ? "unknownHelp" : "greeting", t.lang), "greeting") : help(t);
    // A template's "Show me": what was held is already on its way (the message opened the window).
    case "show": return "show";
    case "switch": return switchCmd(t);
    case "person": return person(t);
    case "prices": return answered(t, SAY.prices, "prices");
    case "trial": return answered(t, SAY.trial, "trial");
    case "partner_program": return answered(t, SAY.partnerProgram, "partner_program");
    case "scan": return answered(t, arg ? SAY.scanByName(arg) : say("greeting", t.lang), "scan_stub");
    case "send_map": return sendMap(t);
    default: return free(t, text);
  }
}

async function askRole(t: Turn, options: Domain[], pending: string): Promise<string> {
  await t.d.db.setConv(t.phone, { open_question: { type: "role", pending, options } satisfies OpenQuestion });
  const title = (x: Domain) => (x === "business" ? "My business" : x === "partner" ? "Partner tools" : "Staff tools");
  const q = options.includes("partner") ? SAY.whichRole : SAY.whichRoleStaff;
  return answered(t, q, "which_role", options.slice(0, 3).map((x) => ({ id: `r:${x}`, title: title(x) })));
}

function activeDomain(t: Turn): Domain | null {
  const d = domains(t.who);
  if (d.length === 1) return d[0];
  const a = t.who.conversation?.active_role;
  return a && d.includes(a) ? a : null;
}

async function help(t: Turn): Promise<string> {
  const dom = activeDomain(t);
  if (dom === "staff") return answered({ ...t, head: head(t.who, "staff", null) }, SAY.staffHelpText, "help");
  if (dom === "partner") return answered({ ...t, head: head(t.who, "partner", null) }, SAY.partnerSoon, "help");
  if (dom === "business") {
    const b = pickBusiness(t.who);
    const tb = { ...t, business: b, head: b ? head(t.who, "business", b) : null };
    return answered(tb, b?.role === "staff" ? SAY.staffHelp : SAY.ownerHelp, "help");
  }
  // A phone that is not a customer meets Nora as Kabsi's assistant (9.2).
  return answered(t, say("unknownHelp", t.lang), "help");
}

async function switchCmd(t: Turn): Promise<string> {
  const d = domains(t.who);
  if (d.length > 1) return askRole(t, d, "");
  const list = businesses(t.who);
  if (list.length < 2) return help(t);
  await t.d.db.setConv(t.phone, { active_location_id: null });
  return withBusiness({ ...t, who: { ...t.who, conversation: t.who.conversation ? { ...t.who.conversation, active_location_id: null } : null } }, "switch", null,
    (tb) => answered(tb, SAY.switched(tb.business!.business), "switched"));
}

async function person(t: Turn): Promise<string> {
  await t.d.db.setConv(t.phone, { handoff: true });
  const b = pickBusiness(t.who);
  await t.d.db.handoff(t.phone, b ? `${b.business} (${b.role}) asked for a person` : `A ${roleFor(t.who, activeDomain(t), b)} phone asked for a person`);
  return answered({ ...t, business: b, head: b ? head(t.who, "business", b) : t.head }, say("handoff", t.lang), "handoff");
}

async function sendMap(t: Turn): Promise<string> {
  const code = t.who.conversation?.scan_code;
  if (!code) return answered(t, say("greeting", t.lang), "map_no_code");
  // 28.1: the full map image as soon as V1's job has it. Until V1 merges, there is no image yet.
  const img = await t.d.mapImage(code);
  if (!img) return answered(t, SAY.mapComing, "map_pending");
  return answered(t, SAY.mapComing, "map_sent");
}

// ─── Owner, manager and staff tools (9.3), for one business.

// ─── Billing (session 10, master plan 10.2.10): owner only (the role list), each change after a Confirm.

const longDay = (d: string | null) =>
  d ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(d)) : null;
const priceText = (plan: Plan | "extra", period: Period) => {
  const cents = CATALOGUE[plan === "extra" ? extraKey(period) : planKey(plan, period)].price;
  return `$${cents / 100} ${period === "year" ? "a year" : "a month"}`;
};
const planName = (plan: Plan, period: Period) => CATALOGUE[planKey(plan, period)].name;
const CONFIRM = (op: string): Button[] => [{ id: `k:${op}`, title: "Confirm" }];
const KEEP: Button[] = [{ id: "k:keep", title: "Keep my plan" }];

async function billing(t: Turn, arg: string | undefined): Promise<string> {
  const bd = t.d.billing;
  if (!bd) return answered(t, SAY.billingSoon, "billing_stub");
  const b = t.business!;
  const w = (arg ?? "").trim().toLowerCase();
  try {
    if (/^(card|my card changed|update my card|invoice|receipt|factura|فاتورة)$/.test(w)) {
      return answered(t, SAY.billingPortal(b.business, await bd.portal(b.location_id)), "billing_portal");
    }
    const s = await bd.status(b.location_id);
    if (!s || !["active", "past_due"].includes(s.state)) return answered(t, SAY.billingNoPlan(b.business, `${t.d.appUrl}/app/plan`), "billing_no_plan");
    const end = longDay(s.periodEnd);
    if (w.startsWith("confirm:")) {
      switch (w.slice(8)) {
        case "cancel": return answered(t, SAY.billingCancelled(longDay(await bd.cancel(b.location_id))), "billing_cancelled", KEEP);
        case "keep": await bd.keep(b.location_id); return answered(t, SAY.billingKept, "billing_kept");
        case "upgrade":
          if (s.plan === "pro") return answered(t, SAY.billingSamePlan("Pro"), "billing_same_plan");
          await bd.change(b.location_id, "pro");
          return answered(t, SAY.billingUpgraded, "billing_upgraded");
        case "downgrade": {
          if (s.plan === "essentials") return answered(t, SAY.billingSamePlan("Essentials"), "billing_same_plan");
          const r = await bd.change(b.location_id, "essentials");
          return answered(t, SAY.billingDowngraded(longDay(r.until)), "billing_downgraded");
        }
        case "add_location": return answered(t, SAY.billingAdded(await bd.addLocation(b.location_id)), "billing_location_added");
      }
      return answered(t, SAY.unclear, "billing_unclear");
    }
    if (w === "keep my plan") {
      await bd.keep(b.location_id);
      return answered(t, SAY.billingKept, "billing_kept");
    }
    if (w.startsWith("cancel")) {
      if (s.cancelAtEnd) return answered(t, SAY.billingAlreadyEnds(end), "billing_already_ends", KEEP);
      return answered(t, SAY.billingCancelAsk(end), "billing_cancel_ask", CONFIRM("cancel"));
    }
    if (w === "upgrade") {
      if (s.plan === "pro") return answered(t, SAY.billingSamePlan("Pro"), "billing_same_plan");
      return answered(t, SAY.billingUpgradeAsk(priceText("pro", s.period)), "billing_upgrade_ask", CONFIRM("upgrade"));
    }
    if (w === "downgrade") {
      if (s.plan === "essentials") return answered(t, SAY.billingSamePlan("Essentials"), "billing_same_plan");
      return answered(t, SAY.billingDowngradeAsk(priceText("essentials", s.period), end), "billing_downgrade_ask", CONFIRM("downgrade"));
    }
    if (w === "add a location") return answered(t, SAY.billingAddAsk(priceText("extra", s.period)), "billing_add_ask", CONFIRM("add_location"));
    return answered(t, SAY.billingStatus(b.business, planName(s.plan, s.period), end, s.cancelAtEnd), "billing_status");
  } catch (e) {
    // A refusal the owner can act on ("There is no payment on record yet.") is shown; anything else is the retry line.
    const code = (e as { code?: string }).code;
    return answered(t, code ? String((e as Error).message) : SAY.billingTryLater, code ? `billing_${code}` : "billing_error");
  }
}

async function businessTool(t: Turn, name: string, arg: string | undefined): Promise<string> {
  const b = t.business!;
  const app = t.d.appUrl;
  switch (name) {
    case "stats": {
      const days = arg === "30" ? 30 : 7;
      return answered(t, SAY.stats(b.business, days, await t.d.db.stats(b.location_id, days)), "stats");
    }
    case "review_link":
    case "qr": {
      const code = await t.d.db.reviewLink(b.location_id);
      if (!code) return answered(t, SAY.noReviewLink(b.business), "no_review_link");
      const url = `${app}/review/${code}`;
      return answered(t, name === "qr" ? SAY.qr(b.business, url) : SAY.reviewLink(b.business, url), name);
    }
    case "billing": return billing(t, arg);
    case "hours": return answered(t, SAY.hoursInApp(b.business, `${app}/app/hours`), "hours_in_app");
    case "post": return answered(t, SAY.postInApp(b.business, `${app}/app/posts`), "post_in_app");
    case "exact_reply": return exactReply(t, arg ?? "");
    case "edit_draft": return editDraft(t, arg ?? "");
    case "switch": return answered(t, SAY.switched(b.business), "switched");
    default: return answered(t, SAY.unclear, "unclear");
  }
}

function lastReview(t: Turn): string | null {
  const lt = t.who.conversation?.last_task;
  return lt?.type === "review" && lt.location_id === t.business?.location_id ? lt.review_id : null;
}

async function exactReply(t: Turn, text: string): Promise<string> {
  const b = t.business!;
  const review = lastReview(t);
  if (!review) return answered(t, SAY.noRecentReview, "no_review");
  const r = await t.d.db.ownerDraft(b.user_id, review, text);
  if (!r.ok) return answered(t, r.reason === "not_draft" ? SAY.alreadyHandled : SAY.notYours, `exact_refused:${r.reason}`);
  return showForYes(t, review, text, SAY.exactShown(b.business, text.trim()));
}

async function editDraft(t: Turn, instruction: string): Promise<string> {
  const b = t.business!;
  const review = lastReview(t);
  if (!review || !instruction.trim()) return answered(t, SAY.noRecentReview, "no_review");
  await say1(t, SAY.editStarted);
  const r = await t.d.editDraft(review, instruction.slice(0, 500));
  if (!r.ok) return answered(t, SAY.alreadyHandled, `edit_refused:${r.reason}`);
  return showForYes(t, review, null, null);
}

/** Anything that will appear on Google is shown back with the business named and the exact text, for a Yes (9.1, 25.5). */
async function showForYes(t: Turn, reviewId: string, text: string | null, body: string | null): Promise<string> {
  const b = t.business!;
  const a = await t.d.db.actionCreate(b.user_id, "review_reply", reviewId);
  if (!a.ok || !a.token) {
    return answered(t, a.reason === "high_risk" ? "This review needs a careful look, so it is approved only in Kabsi." : SAY.alreadyHandled, `show_refused:${a.reason}`);
  }
  const shown = body ?? SAY.newDraft(b.business, (a.text ?? text ?? "").trim());
  return answered(t, shown, "shown_for_yes", [{ id: `a:${a.token}`, title: "Approve" }, { id: `e:${a.token}`, title: "Edit in app" }]);
}

async function photo(t: Turn, mediaId: string): Promise<string> {
  const b = t.business!;
  if (!b.pro) return answered(t, SAY.photoPro, "photo_pro");
  let bytes: Uint8Array;
  try {
    bytes = await t.d.media(mediaId);
  } catch {
    return answered(t, SAY.photoUnreadable, "photo_unreadable");
  }
  const refused = photoRefusal(bytes);
  if (refused === "video") return answered(t, SAY.videoKept, "video");
  if (refused) return answered(t, SAY.photoUnreadable, "photo_unreadable");
  const r = await t.d.db.acceptPhoto(b.location_id, b.user_id, bytes);
  return answered(t, r.ok ? SAY.photoTaken : SAY.photoUnreadable, r.ok ? "photo" : "photo_refused");
}

async function voice(t: Turn, media: { id: string; size: number | null; mime: string | null }): Promise<string> {
  const pre = voiceCheck(media.size);
  if (!pre.ok) return answered(t, SAY.voiceTooLong, `voice_${pre.why}`);
  let bytes: Uint8Array;
  try {
    bytes = await t.d.media(media.id);
  } catch {
    return answered(t, SAY.unclear, "voice_unreadable");
  }
  const post = voiceCheck(media.size, bytes);
  if (!post.ok) return answered(t, SAY.voiceTooLong, `voice_${post.why}`);
  // Kept privately until V3 adds transcription (28.3); then the audio is deleted and only the text stays.
  await t.d.db.keepVoice(t.phone, t.m.messageId, bytes, media.mime);
  return answered(t, SAY.voiceListening, "voice_kept");
}

// ─── Buttons and Yes (9.3, 25.5).

async function button(t: Turn, action: "approve" | "undo" | "edit", token: string): Promise<string> {
  const owner = await t.d.db.tokenOwner(token, t.phone);
  if (owner === "not_yours") return answered(t, SAY.notYours, "not_yours");
  if (owner === "unknown") return answered(t, SAY.alreadyHandled, "stale_button");
  if (action === "approve") return approveToken(t, token);
  if (action === "undo") {
    const u = await t.d.db.undo(token, t.phone);
    if (u.result === "cancelled") return answered(t, SAY.undone, "undone");
    if (u.result === "too_late") return answered(t, SAY.tooLate, "too_late");
    return answered(t, SAY.alreadyHandled, `undo:${u.result}`);
  }
  return answered(t, `Open Kabsi to edit: ${t.d.appUrl}/app`, "edit_link");
}

async function approveToken(t: Turn, token: string): Promise<string> {
  const a = await t.d.db.approve(token, t.phone);
  const b = businesses(t.who).find((x) => x.location_id === a.location_id) ?? null;
  const tb = { ...t, business: b, head: b ? head(t.who, "business", b) : null };
  if (t.who.conversation?.open_question?.type === "which") await t.d.db.setConv(t.phone, { open_question: null });
  if (a.result === "approved" && a.repeat) return answered(tb, SAY.alreadyHandled, "repeat");
  if (a.result === "approved") return answered(tb, SAY.approved(b?.business ?? "your business"), "approved", [{ id: `u:${token}`, title: "Undo" }]);
  if (a.result === "unknown") return answered(tb, SAY.alreadyHandled, "stale_button");
  const reason = a.reason ?? a.result;
  if (/not_member|not_allowed|approver_not_member/.test(reason)) return answered(tb, SAY.notYours, `refused:${reason}`);
  if (/not_draft|already|changed|expired/.test(reason)) return answered(tb, SAY.alreadyHandled, `refused:${reason}`);
  if (reason === "high_risk") return answered(tb, "This review needs a careful look, so it is approved only in Kabsi.", "refused:high_risk");
  if (reason === "plan_required") return answered(tb, "Your plan has ended, so nothing can be published. Open Kabsi to choose a plan.", "refused:plan_required");
  return answered(tb, `Kabsi could not approve this here. Open Kabsi to finish: ${t.d.appUrl}/app`, `refused:${reason}`);
}

async function yes(t: Turn): Promise<string> {
  if (!businesses(t.who).length) return free(t, t.m.text ?? "yes");
  const items = await t.d.db.openItems(t.phone);
  if (!items.length) return answered(t, SAY.nothingWaiting, "yes_nothing");
  if (items.length === 1) return approveToken(t, items[0].token);
  // Two or more waiting: "Which one?" with the business named on each (25.5).
  // What it is first, so two buttons stay different inside WhatsApp's 20 characters.
  const label = (i: { kind: string; business: string }) => `${i.kind.includes("post") ? "Post" : i.kind.includes("protection") ? "Change" : "Reply"}: ${i.business}`.slice(0, 20).trim();
  const options = items.slice(0, 9).map((i) => ({ token: i.token, label: label(i) }));
  await t.d.db.setConv(t.phone, { open_question: { type: "which", options } satisfies OpenQuestion });
  if (options.length <= 3) return answered(t, SAY.whichOne, "which_one", options.map((o) => ({ id: `w:${o.token}`, title: o.label })));
  return answered(t, `${SAY.whichOne} Reply with the number.\n\n${options.map((o, i) => `${i + 1}. ${o.label}`).join("\n")}`, "which_one");
}

async function openDigestItem(t: Turn, id: number): Promise<string> {
  const [row] = await t.d.db.outboxGet(t.phone, [id]);
  if (!row) return answered(t, SAY.alreadyHandled, "digest_gone");
  await sendReply(t.d.out, t.s, t.phone, row.body, row.buttons, { locationId: row.location_id });
  return "digest_item";
}

// ─── Codes (9.2, 29.7).

async function bind(t: Turn, code: string): Promise<string> {
  const r = await t.d.db.bind(t.phone, code);
  if (r.result === "staff_admin") {
    await t.d.db.setConv(t.phone, { stopped: false });
    return answered(t, SAY.staffBound, "staff_admin");
  }
  if (r.result === "verified") {
    await t.d.db.setConv(t.phone, { stopped: false });
    // 28.5: the first map is the first wow. Scout is asked for it as soon as WhatsApp connects (a stub until V1).
    for (const loc of r.first_owner_locations ?? []) await t.d.firstMap(loc).catch(() => "stub");
    return answered(t, SAY.connected, "verified");
  }
  if (r.result === "phone_in_use") return answered(t, SAY.phoneInUse, "phone_in_use");
  return answered(t, SAY.badCode, "bad_code");
}

// ─── Staff phone (9.9).

async function staff(t: Turn, name: string, arg: string | undefined): Promise<string> {
  switch (name) {
    case "staff_status":
    case "staff_waiting":
    case "staff_today": {
      const n = await t.d.db.staffNumbers();
      const body = name === "staff_status"
        ? `Jobs failed in the last hour: ${n.jobs_failed_1h}. Jobs late: ${n.jobs_waiting}. Publications stuck: ${n.publications_stuck}. Number quality: ${n.number_quality ?? "not read yet"}.`
        : name === "staff_waiting"
        ? `Hand-offs in the last 2 days: ${n.handoffs}. Publications stuck: ${n.publications_stuck}. WhatsApp messages held: ${n.outbox_held}.`
        : `Today (Beirut): ${n.signups_today} new businesses, ${n.reviews_answered_today} replies on Google.`;
      return answered(t, body, name);
    }
    case "staff_pause":
    case "staff_resume": {
      if (!arg) return answered(t, SAY.staffHelpText, "staff_help");
      const r = await t.d.db.staffPause(arg, name === "staff_pause");
      if (!r.ok) return answered(t, SAY.staffNoMatch(r.matches ?? []), "staff_no_match");
      return answered(t, name === "staff_pause" ? SAY.staffPaused(r.business!) : SAY.staffResumed(r.business!), name);
    }
    case "staff_partners": return answered(t, SAY.staffPartnersSoon, "staff_partners_stub");
    case "staff_payouts": return answered(t, SAY.staffPayoutsSoon, "staff_payouts_stub");
    default: return answered(t, SAY.staffHelpText, "staff_help");
  }
}

// ─── Free text: the intent router, with "On it" first when it takes a moment.

async function free(t: Turn, text: string): Promise<string> {
  const { who } = t;
  const d = domains(who);
  const conv = who.conversation;
  // An unknown phone's first words: the greeting of 24.8 (it may have come from the site without the code).
  if (!d.length && !conv?.scan_code && !conv?.open_question && !t.d.ai) return answered(t, say("greeting", t.lang), "greeting");
  const choose = needsRoleChoice(who, null);
  if (choose) return askRole(t, choose, text);
  const dom = activeDomain(t);
  const b = dom === "business" ? pickBusiness(who) : null;
  const role: RoleName = roleFor(who, dom, b);
  if (!t.d.ai) return answered({ ...t, business: b, head: head(who, dom, b) }, role === "unknown" || role === "prospect" ? say("greeting", t.lang) : say("unclear", t.lang), "unclear_no_ai");

  const sleep = t.d.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let settled = false;
  let onIt: Promise<unknown> | null = null;
  void sleep(t.d.onItMs ?? 2500).then(() => {
    if (!settled) onIt = say1({ ...t, business: b, head: head(who, dom, b) }, SAY.onIt);
  });
  const r = await route(t.d.ai, role, text);
  settled = true;
  // "On it" already went: the answer follows it, never before it.
  if (onIt) await onIt;
  if (r.lang) await t.d.db.setConv(t.phone, { language: r.lang });
  const lang = r.lang ?? t.lang;
  if (r.command.k === "tool") {
    if (!may(role, r.command.tool)) return answered({ ...t, lang }, say("unclear", lang), "unclear");
    return tool({ ...t, lang }, r.command.tool, r.command.arg, text);
  }
  const tb = { ...t, lang, business: b, head: head(who, dom, b) };
  if (role === "unknown" && !conv?.open_question) return answered(tb, say("greeting", lang), "greeting");
  return answered(tb, r.question ?? say("unclear", lang), "unclear");
}
