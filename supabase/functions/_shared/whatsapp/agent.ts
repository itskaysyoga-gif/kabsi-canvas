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
import { MAX_BYTES } from "../photos/sniff.ts";
import { notify, type Out, reply as sendReply } from "./outbox.ts";
import type { SendState } from "./policy.ts";
import { toE164 } from "./phone.ts";
import {
  type BusinessRole, businesses, type Domain, domainOf, domains, head, may, needsRoleChoice, type OpenQuestion, pickBusiness,
  roleFor, type RoleName, type Who,
} from "./roles.ts";
import { type Command, isAbuse, parse } from "./router.ts";
import { guessLang, headed, SAY, say } from "./say.ts";
import { forWhatsApp, type Nora } from "./nora.ts";
import { describeHours, type HoursChange, parseHours } from "./hours-parse.ts";
import { checkTypedPost } from "../posts/typed.ts";
import { keywordFrom, type MapDetails, mapDetailsText } from "./map.ts";
import { numbersText, type Summary } from "./staff-alerts.ts";
import { ASK_INTRO, reviewRequestLink, reviewRequestMessage } from "../review-growth/message.ts";
import { type GrowthStats, growthLine } from "../review-growth/stats.ts";
import { ANSWER_WINDOW_MS, readUpdate } from "../review-growth/monthly.ts";
import { CATEGORY_MENU, categoryLabel, type PhotoCategory, pickCategory } from "../review-growth/photo.ts";
import type { Transcript } from "../voice/transcribe.ts";
import { CATALOGUE, extraKey, type Period, type Plan, planKey } from "../creem.ts";
import type { FirstBack, OnboardingHooks } from "../onboarding/hooks.ts";
import { monthlyFacts, SAY_ONBOARDING, setupReply } from "../onboarding/stages.ts";
import { inviteButtons } from "../onboarding/tick.ts";
import type { OnboardingAction } from "./router.ts";

export interface AgentDb {
  /** first: no earlier message from this phone was ever stored (the welcome goes only then). */
  store(phone: string, providerId: string, kind: string, payload: unknown, referral: Record<string, string> | null): Promise<{ duplicate: boolean; id?: string; first?: boolean }>;
  done(id: string, result: string): Promise<void>;
  resolve(phone: string): Promise<Who>;
  setConv(phone: string, patch: Record<string, unknown>): Promise<void>;
  attachCode(phone: string, scan: string | null, partner: string | null): Promise<void>;
  bind(phone: string, code: string): Promise<{ result: string; user_id?: string; first_owner_locations?: string[] }>;
  stopOptin(phone: string): Promise<void>;
  /** START: every opt-in this phone stopped is active again, for every role, and the conversation is no longer stopped. */
  start(phone: string): Promise<number>;
  tokenOwner(token: string, phone: string): Promise<"mine" | "not_yours" | "unknown">;
  approve(token: string, phone: string): Promise<{ result: string; reason?: string; repeat?: boolean; location_id?: string; target_type?: string }>;
  undo(token: string, phone: string): Promise<{ result: string }>;
  openItems(phone: string): Promise<{ token: string; kind: string; business: string; location_id: string; target_type?: string }[]>;
  /** 30.10 point 7: special hours the owner typed become one draft (special_hours_prepare) with its Approve token. */
  hoursPrepare(locationId: string, userId: string, c: HoursChange): Promise<{ ok: boolean; token?: string; reason?: string }>;
  /** 30.10 point 7: a typed post becomes a draft (owner_post_prepare) with its Approve token. */
  postPrepare(locationId: string, userId: string, text: string): Promise<{ ok: boolean; token?: string; text?: string; reason?: string }>;
  /** "Show me" under a map: its numbers, only for a business this phone is bound to. */
  mapDetails(scanId: string): Promise<(MapDetails & { location_id: string }) | null>;
  ownerDraft(userId: string, reviewId: string, text: string): Promise<{ ok: boolean; reason?: string }>;
  actionCreate(userId: string, targetType: string, targetId: string): Promise<{ ok: boolean; token?: string; text?: string; reason?: string }>;
  stats(locationId: string, days: number): Promise<{ new_reviews: number; answered: number; waiting: number; average: number | null }>;
  reviewLink(locationId: string): Promise<string | null>;
  acceptPhoto(locationId: string, userId: string, bytes: Uint8Array): Promise<{ ok: boolean; reason?: string }>;
  /** V3: Review Growth numbers, link opens apart from new reviews (no person is counted). */
  growth(locationId: string, days: number): Promise<GrowthStats>;
  /** V3: Edit on a photo waiting for a yes: the category the owner picked. Owner or manager of that business only. */
  photoCategory(userId: string, photoId: string, category: PhotoCategory): Promise<{ ok: boolean; reason?: string; location_id?: string }>;
  /** V3: Skip on a photo, from the phone the button was made for. */
  photoSkip(token: string, phone: string): Promise<{ result: string; location_id?: string }>;
  /** V3: the owner answered this month's question. */
  monthlyAnswered(locationId: string): Promise<void>;
  staffNumbers(): Promise<Record<string, number | string | null>>;
  /** 9.9, 26.9: the last 24 hours and the budgets, for "today" and the morning digest. */
  staffSummary(): Promise<Summary>;
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
  /** Nora's answer from the public facts to a question the fixed tools do not cover (28.6, 28.7). */
  nora?: Nora | null;
  /** A new AI draft for a review with the owner's instruction (the existing reply pipeline). */
  editDraft(reviewId: string, instruction: string): Promise<{ ok: boolean; reason?: string }>;
  /** 28.5: the first map when WhatsApp connects: run it now when the search is confirmed, else suggest one to confirm. */
  firstMap(locationId: string): Promise<{ state: "started" | "waiting" | "ask" | "none"; keyword?: string | null }>;
  /** 27.3 item 1: the owner's yes to a search; the map runs at once (the visibility function, with its plan limits). */
  confirmKeyword?(locationId: string, keyword: string): Promise<{ ok: boolean; reason?: string }>;
  /** 28.1: the full map image for a scan code, once V1's job has it. A stub (null) until V1 merges. */
  mapImage(scanCode: string): Promise<Uint8Array | null>;
  /** V3 (28.3): a voice note to text. The audio stays in memory and is never stored; without it voice notes say they are off. */
  transcribe?(audio: Uint8Array, mime: string | null, phone: string): Promise<Transcript>;
  /** V4 (30.16 section 3): onboarding in four stages; absent where a test does not need it. */
  onboarding?: OnboardingHooks;
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
  // V3 (30.15 section 3.5): a shared contact is a customer's name and number. Kabsi never stores it, not even until the message is
  // handled: only the fact that a contact arrived is kept.
  const keep = m.contacts?.length ? { ...m, contacts: [] } : m;
  const stored = await d.db.store(phone, m.messageId, m.contacts?.length ? "contacts" : m.media?.kind ?? m.type, keep, m.referral ?? null);
  if (stored.duplicate || !stored.id) return "duplicate";
  const work = handle(d, { ...m, from: phone }, { first: !!stored.first }).then(async (r) => (await d.db.done(stored.id!, r), r));
  if (background) {
    background(work.catch(() => "error"));
    return "accepted";
  }
  return await work;
}

/** The work for one stored message. Also run by the tick for a message whose first try did not finish. */
export async function handle(d: AgentDeps, m: Inbound, o: { first?: boolean } = {}): Promise<string> {
  const phone = m.from;
  const [who, s] = await Promise.all([d.db.resolve(phone), d.out.db.state(phone)]);
  // The message opened the 24-hour window: anything held for this phone goes now.
  if ((await d.db.releaseHeld(phone)) > 0) void d.flush().catch(() => {});
  const cmd = parse(m);
  const text = m.text ?? "";
  const lang = guessLang(text) ?? who.conversation?.language ?? "en";
  if (text && lang !== who.conversation?.language) await d.db.setConv(phone, { language: lang });
  const t: Turn = { d, s: { ...s, window_expires_at: new Date((d.now ?? Date.now)() + 86_400_000).toISOString() }, who, phone, lang, m, first: !!o.first };
  return await run(t, cmd);
}

type Turn = {
  d: AgentDeps; s: SendState; who: Who; phone: string; lang: string; m: Inbound; head?: string | null; business?: BusinessRole | null;
  /** The person's first message to Kabsi: the only one that gets the welcome (QA 1, 25 Oct). */
  first?: boolean;
};

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
    // START is the person's own opt-in again (13b phone test, 25 Oct): every role comes back, not only the conversation.
    await d.db.start(phone);
    return answered(await again(t), SAY.started, "started");
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

  // The map's buttons and the owner's search for the map (28.5).
  if (cmd.k === "map") return mapButton(t, cmd.action, cmd.scanId);
  if (cmd.k === "keyword") return keywordButton(t, cmd.action, cmd.locationId);
  if (conv?.open_question?.type === "keyword" && !conv.open_question.suggested && cmd.k === "free") {
    return keywordTyped(t, conv.open_question.location_id, cmd.text);
  }

  // The one question back about an hours change: the answer is read together with the first message.
  if (conv?.open_question?.type === "hours" && (cmd.k === "free" || (cmd.k === "tool" && cmd.tool === "hours"))) {
    const q = conv.open_question;
    await d.db.setConv(phone, { open_question: null, active_location_id: q.location_id, active_role: "business" });
    const next: Turn = { ...t, who: { ...who, conversation: { ...conv, open_question: null, active_location_id: q.location_id, active_role: "business" } } };
    return withBusiness(next, "hours", null, (tb) => hours(tb, `${q.pending} ${t.m.text ?? ""}`, true));
  }

  // V3: a photo's Edit, Skip, and the category the owner picks; the monthly question's answer.
  if (cmd.k === "photo_edit") return photoEdit(t, cmd.photoId);
  if (cmd.k === "photo_skip") return photoSkip(t, cmd.token);
  const oq = conv?.open_question;
  if (oq?.type === "photo_category") {
    if (cmd.k === "number") return photoCategoryPicked(t, oq, String(cmd.n));
    // Anything that is not a kind of photo is a new message, not an answer: the menu is closed and the message handled as usual.
    if (cmd.k === "free" && pickCategory(cmd.text)) return photoCategoryPicked(t, oq, cmd.text);
    await d.db.setConv(phone, { open_question: null });
  }
  // V4: the onboarding buttons, the setup question typed as words, and the owner's yes to the monthly answer's facts.
  if (cmd.k === "onboarding") return onboardingButton(t, cmd.action, cmd.locationId);
  if (cmd.k === "facts") return factsButton(t, cmd.action, cmd.locationId, cmd.month);
  if (oq?.type === "setup") {
    const typed = cmd.k === "yes" ? "yes" : cmd.k === "tool" && cmd.tool === "help" ? "help" : cmd.k === "free" ? setupReply(cmd.text) : null;
    if (typed) return onboardingButton(t, typed === "yes" ? "yes" : typed, oq.location_id);
  }
  if (oq?.type === "update" && now - Date.parse(oq.at) < ANSWER_WINDOW_MS) {
    if (cmd.k === "free") return monthlyAnswer(t, oq.location_id, cmd.text);
    // A bare yes answers "anything new?", never an approval waiting elsewhere: ask what is new and keep the question open.
    if (cmd.k === "yes") return answered(t, SAY.updateWhat, "update_what");
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
  if (cmd.k === "photo") return withBusiness(t, "photo", null, (tb) => photo(tb, cmd.media.id, cmd.media.size));
  if (cmd.k === "voice") return voice(t, cmd.media);
  if (cmd.k === "video") return withBusiness(t, "photo", null, (tb) => answered(tb, SAY.videoKept, "video"));
  if (cmd.k === "file") return answered(t, SAY.photoUnreadable, "file_refused");
  if (cmd.k === "contact") {
    // "Ask a customer" (30.15 section 3.5): the owner shared a customer's contact. Kabsi does not read, keep or use the number or the
    // name; the answer is the one ready message, to forward from the owner's own phone.
    return withBusiness(t, "ask_customer", null, (tb) => askCustomer(tb));
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
    // The welcome only on a person's first message; later a hello gets the short menu.
    case "greet": return !domains(who).length ? answered(t, say(t.first && !t.who.conversation?.scan_code ? "greeting" : "unknownHelp", t.lang), t.first ? "greeting" : "help") : help(t);
    case "question": return askNora(t, arg ?? text);
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
  await t.d.db.handoff(t.phone, b ? `${b.business} (${b.role}) asked to talk to someone` : `${/^[aeiou]/i.test(roleFor(t.who, activeDomain(t), b)) ? "An" : "A"} ${roleFor(t.who, activeDomain(t), b)} phone asked to talk to someone`);
  return answered({ ...t, business: b, head: b ? head(t.who, "business", b) : t.head }, say("handoff", t.lang), "handoff");
}

async function sendMap(t: Turn): Promise<string> {
  const code = t.who.conversation?.scan_code;
  if (!code) return answered(t, say("greeting", t.lang), "map_no_code");
  // 28.1: the full map image as soon as V1's job has it. Until V1 merges, there is no image yet.
  const img = await t.d.mapImage(code);
  if (!img) return answered(t, SAY.mapComing, "map_pending");
  // V4: the nearby places image (three places and the count), drawn again by the sender from the same check.
  await notify(t.d.out, { phone: t.phone, userId: null, locationId: null, kind: "free_check_map", body: SAY_ONBOARDING.checkMap,
    media: { map_scan: `check:${code.replace(/^KAB-/i, "").toUpperCase()}` }, dedupe: `free_check_map:${code}:${t.phone}` });
  return "map_sent";
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
      const line = SAY.stats(b.business, days, await t.d.db.stats(b.location_id, days));
      // V3: link opens beside the reviews, never added to them ("An open is not a review.").
      const g = await t.d.db.growth(b.location_id, days).catch(() => null);
      return answered(t, g ? `${line}\n\n${growthLine(g)}` : line, "stats");
    }
    case "ask_customer": return askCustomer(t);
    case "review_link":
    case "qr": {
      const code = await t.d.db.reviewLink(b.location_id);
      if (!code) return answered(t, SAY.noReviewLink(b.business), "no_review_link");
      const url = `${app}/review/${code}`;
      return answered(t, name === "qr" ? SAY.qr(b.business, url) : SAY.reviewLink(b.business, url), name);
    }
    case "billing": return billing(t, arg);
    case "hours": return hours(t, t.m.text ?? arg ?? "", false);
    case "post": return typedPost(t, t.m.text ?? "");
    case "exact_reply": return exactReply(t, arg ?? "");
    case "edit_draft": return editDraft(t, arg ?? "");
    case "switch": return answered(t, SAY.switched(b.business), "switched");
    default: return answered(t, SAY.unclear, "unclear");
  }
}

// ─── Hours and typed posts (30.10 point 7): drafted, shown back exactly, approved with a Yes through the one pipeline.

async function hours(t: Turn, text: string, asked: boolean): Promise<string> {
  const b = t.business!;
  const p = parseHours(text, new Date((t.d.now ?? Date.now)()), b.time_zone ?? "UTC");
  if (!p.ok) {
    if (p.why === "permanent") return answered(t, SAY.hoursWeekly(b.business, `${t.d.appUrl}/app/hours`), "hours_weekly");
    // One short question back (9.3 "unclear times"); the answer is read with this message. Asked once only.
    const line = p.why === "no_times" ? SAY.hoursNeedTimes : p.why === "bad_time" ? SAY.hoursBadTime : p.why === "past" ? SAY.hoursPast
      : p.why === "too_far" ? SAY.hoursTooFar : SAY.hoursAsk;
    if (!asked) await t.d.db.setConv(t.phone, { open_question: { type: "hours", pending: text.slice(0, 300), location_id: b.location_id } satisfies OpenQuestion });
    return answered(t, line, `hours_${p.why}`);
  }
  const r = await t.d.db.hoursPrepare(b.location_id, b.user_id, p.change);
  if (!r.ok || !r.token) return prepareRefused(t, r.reason, "hours");
  return answered(t, SAY.hoursShown(b.business, describeHours(p.change)), "hours_shown", [{ id: `a:${r.token}`, title: "Approve" }, { id: `e:${r.token}`, title: "Edit on kabsi.co" }]);
}

async function typedPost(t: Turn, raw: string): Promise<string> {
  const b = t.business!;
  // The post is the owner's own words after "post:"; anything else is asked for once, with an example.
  const m = /^\s*(?:new\s+)?post\s*:?\s+([\s\S]+)$/i.exec(raw);
  if (!m) return answered(t, SAY.postAsk(b.business), "post_ask");
  const c = checkTypedPost(m[1]);
  if (!c.ok) return answered(t, SAY.postProblem(b.business, c.problems), "post_problem");
  const r = await t.d.db.postPrepare(b.location_id, b.user_id, c.text);
  if (!r.ok || !r.token) return prepareRefused(t, r.reason, "post");
  return answered(t, SAY.postShown(b.business, (r.text ?? c.text).trim()), "post_shown", [{ id: `a:${r.token}`, title: "Approve" }, { id: `e:${r.token}`, title: "Edit on kabsi.co" }]);
}

function prepareRefused(t: Turn, reason: string | undefined, what: "hours" | "post"): Promise<string> {
  const b = t.business!;
  const why = reason ?? "unknown";
  if (/not_allowed|not_member/.test(why)) return answered(t, SAY.approverOnly(b.business), `${what}_refused:${why}`);
  if (/location_not_active|concierge/.test(why)) return answered(t, SAY.notConnectedYet(b.business, `${t.d.appUrl}/app`), `${what}_refused:${why}`);
  if (/bad_dates/.test(why)) return answered(t, SAY.hoursAsk, `${what}_refused:${why}`);
  if (/house_style|bad_post_text/.test(why)) return answered(t, SAY.postAsk(b.business), `${what}_refused:${why}`);
  return answered(t, `Kabsi could not prepare this here. Open your Kabsi account to finish: ${t.d.appUrl}/app`, `${what}_refused:${why}`);
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

async function photo(t: Turn, mediaId: string, size: number | null = null): Promise<string> {
  const b = t.business!;
  // Sec 1: a file WhatsApp says is over the photo limit is refused before it is downloaded into memory.
  if ((size ?? 0) > MAX_BYTES) return answered(t, SAY.photoUnreadable, "photo_too_big");
  // V3 (30.15 section 3.4): photos from WhatsApp are on both plans. The photo engine checks it in the background; the tick then
  // asks the owner Yes, Edit or Skip (review-growth/photo.ts). A member of staff sends, the owner approves.
  let bytes: Uint8Array;
  try {
    bytes = await t.d.media(mediaId);
  } catch {
    return answered(t, SAY.photoUnreadable, "photo_unreadable");
  }
  const refused = photoRefusal(bytes);
  if (refused === "video") return answered(t, SAY.videoKept, "video");
  if (refused) return answered(t, SAY.photoUnreadable, "photo_unreadable");
  // A business Kabsi cannot reach on Google yet (early access) refuses the upload: say so, never a silent failure.
  const r = await t.d.db.acceptPhoto(b.location_id, b.user_id, bytes).catch(() => null);
  if (!r) return answered(t, SAY.notConnectedYet(b.business, `${t.d.appUrl}/app`), "photo_not_connected");
  if (!r.ok) return answered(t, SAY.photoUnreadable, "photo_refused");
  return answered(t, b.role === "staff" ? SAY.photoTakenStaff : SAY.photoTaken, "photo");
}

/** Edit on a photo: which kind of photo is it? The answer sets the category the yes will carry. */
async function photoEdit(t: Turn, photoId: string): Promise<string> {
  const b = pickBusiness(t.who)?.role !== "staff" ? pickBusiness(t.who) : null;
  const first = businesses(t.who).find((x) => x.role !== "staff");
  const biz = b ?? first;
  if (!biz) return answered(t, SAY.notYours, "photo_edit_refused");
  await t.d.db.setConv(t.phone, { open_question: { type: "photo_category", photo_id: photoId, location_id: biz.location_id } satisfies OpenQuestion });
  // No business is named here: the menu says nothing about which one, and the confirmation names the photo's own business.
  return answered(t, SAY.photoCategoryAsk(CATEGORY_MENU), "photo_edit");
}

async function photoCategoryPicked(t: Turn, q: Extract<OpenQuestion, { type: "photo_category" }>, text: string): Promise<string> {
  const key = pickCategory(text);
  if (!key) return answered(t, SAY.photoCategoryBad, "photo_category_bad");
  // The photo's own business (the RPC checks the member), not the first business of a phone that has several.
  const mine = businesses(t.who).filter((x) => x.role !== "staff");
  if (!mine.length) return answered(t, SAY.notYours, "photo_category_refused");
  const r = await t.d.db.photoCategory(mine.find((x) => x.location_id === q.location_id)?.user_id ?? mine[0].user_id, q.photo_id, key);
  const b = mine.find((x) => x.location_id === r.location_id) ?? mine.find((x) => x.location_id === q.location_id) ?? mine[0];
  const tb = { ...t, business: b, head: head(t.who, "business", b) };
  await t.d.db.setConv(t.phone, { open_question: null });
  if (!r.ok) return answered(tb, SAY.photoGone, `photo_category_refused:${r.reason}`);
  // A new yes for the new category: the old button no longer matches what the owner sees, so it is refused (an edit voids the old yes).
  const a = await t.d.db.actionCreate(b.user_id, "photo", q.photo_id);
  if (!a.ok || !a.token) return answered(tb, SAY.photoGone, `photo_category_refused:${a.reason}`);
  return answered(tb, SAY.photoCategorySet(categoryLabel(key)), "photo_category_set", [
    { id: `a:${a.token}`, title: "Yes" }, { id: `pe:${q.photo_id}`, title: "Edit" }, { id: `ps:${a.token}`, title: "Skip" },
  ]);
}

async function photoSkip(t: Turn, token: string): Promise<string> {
  const owner = await t.d.db.tokenOwner(token, t.phone);
  if (owner === "not_yours") return answered(t, SAY.notYours, "not_yours");
  if (owner === "unknown") return answered(t, SAY.photoGone, "stale_button");
  const r = await t.d.db.photoSkip(token, t.phone);
  if (t.who.conversation?.open_question?.type === "photo_category") await t.d.db.setConv(t.phone, { open_question: null });
  return answered(t, r.result === "skipped" ? SAY.photoSkipped : SAY.photoGone, r.result === "skipped" ? "photo_skipped" : `photo_skip:${r.result}`);
}

/** "Ask a customer": the one ready message with the business's review link, as its own message so it can be forwarded. Kabsi never
 *  receives, keeps or messages a customer's number; the same message goes to every customer. */
async function askCustomer(t: Turn): Promise<string> {
  const b = t.business!;
  const code = await t.d.db.reviewLink(b.location_id);
  const link = code ? reviewRequestLink(code) : null;
  if (!link) return answered(t, SAY.askNoLink(b.business), "ask_no_link");
  await say1(t, ASK_INTRO);
  await sendReply(t.d.out, t.s, t.phone, reviewRequestMessage(b.business, link), undefined, { locationId: b.location_id });
  return "ask_customer";
}

/** The owner's answer to the monthly question: nothing, an hours draft, or a post made of their own words. Drafts only. */
async function monthlyAnswer(t: Turn, locationId: string, text: string): Promise<string> {
  const b = businesses(t.who).find((x) => x.location_id === locationId && x.role !== "staff");
  await t.d.db.setConv(t.phone, { open_question: null });
  if (!b) return free(t, text);
  const tb = { ...t, business: b, head: head(t.who, "business", b) };
  const r = readUpdate(text, new Date((t.d.now ?? Date.now)()), b.time_zone ?? "UTC");
  await t.d.db.monthlyAnswered(locationId).catch(() => {});
  if (r.kind === "nothing") return answered(tb, SAY.updateNothing, "update_nothing");
  let result: string;
  if (r.kind === "hours") result = await hours(tb, r.text, false);
  else if (r.kind === "refused") result = await answered(tb, SAY.updateProblem(b.business, r.problems), "update_problem");
  else {
    const p = await t.d.db.postPrepare(b.location_id, b.user_id, r.text);
    result = !p.ok || !p.token ? await prepareRefused(tb, p.reason, "post")
      : await answered(tb, SAY.updatePostShown(b.business, (p.text ?? r.text).trim()), "update_post_shown",
        [{ id: `a:${p.token}`, title: "Approve" }, { id: `e:${p.token}`, title: "Edit on kabsi.co" }]);
  }
  // V4 (LATER row): new services and prices in the answer become About your business facts the owner confirms; none is used before.
  const facts = monthlyFacts(text);
  if (facts.length && t.d.onboarding) {
    const month = new Intl.DateTimeFormat("en-CA", { timeZone: b.time_zone ?? "UTC", year: "numeric", month: "2-digit" }).format(new Date((t.d.now ?? Date.now)()));
    const n = await t.d.onboarding.proposeFacts(b.location_id, facts, month).catch(() => 0);
    if (n > 0) {
      await say1(tb, SAY_ONBOARDING.factsAsk(b.business, facts.map((f) => f.text)),
        [{ id: `kf:y:${b.location_id}:${month}`, title: "Save them" }, { id: `kf:n:${b.location_id}:${month}`, title: "Not now" }]);
    }
  }
  return result;
}

/** A voice note (28.3): refused over 10 MB or 3 minutes with the kind line; otherwise transcribed in memory, the audio dropped,
 *  and the words handled like a typed message. Only the text is used. */
async function voice(t: Turn, media: { id: string; size: number | null; mime: string | null }): Promise<string> {
  if (!domains(t.who).length) return answered(t, say("unclear", t.lang), "voice_stranger");
  const pre = voiceCheck(media.size);
  if (!pre.ok) return answered(t, SAY.voiceTooLong, `voice_${pre.why}`);
  if (!t.d.transcribe) return answered(t, SAY.voiceOff, "voice_off");
  let bytes: Uint8Array;
  try {
    bytes = await t.d.media(media.id);
  } catch {
    return answered(t, SAY.voiceFailed, "voice_unreadable");
  }
  const post = voiceCheck(media.size, bytes);
  if (!post.ok) return answered(t, SAY.voiceTooLong, `voice_${post.why}`);
  let r: Transcript;
  try {
    r = await t.d.transcribe(bytes, media.mime, t.phone);
  } catch {
    r = { ok: false, reason: "failed" };
  }
  // The audio was only ever in memory here: nothing wrote it anywhere, and nothing below uses it.
  if (!r.ok) return answered(t, r.reason === "not_configured" ? SAY.voiceOff : SAY.voiceFailed, `voice_${r.reason}`);
  await say1(t, SAY.voiceHeard(r.text));
  const m: Inbound = { ...t.m, text: r.text, media: null, mediaId: null, type: "text" };
  return run({ ...t, m }, parse(m));
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
  const what = (i: { kind: string; target_type?: string }) => {
    const k = i.target_type ?? i.kind;
    return k.includes("photo") ? "Photo" : k.includes("post") ? "Post" : k.includes("hours") ? "Hours" : k.includes("protection") || k.includes("revert") ? "Change" : "Reply";
  };
  const label = (i: { kind: string; business: string; target_type?: string }) => `${what(i)}: ${i.business}`.slice(0, 20).trim();
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
    // The phone is staff_admin from this moment, so this reply already goes live (13b phone test, 25 Oct).
    return answered(await again(t), SAY.staffBound, "staff_admin");
  }
  if (r.result === "verified") {
    await t.d.db.setConv(t.phone, { stopped: false });
    const tn = await again(t);
    // V4 (30.16 section 3, stage 3): an owner still setting up gets Nora's first message and the free check instead.
    const ob = t.d.onboarding && r.user_id ? await t.d.onboarding.afterBind(r.user_id, r.first_owner_locations ?? [], t.who.conversation?.scan_code ?? null).catch(() => null) : null;
    if (ob) return onboardingFirst(tn, ob);
    await say1(tn, SAY.connected);
    // 28.5: the first map is the first wow, within 5 minutes of connecting. With a confirmed search it runs now; without
    // one the owner is asked to confirm the search Kabsi suggests (one business at a time).
    for (const loc of r.first_owner_locations ?? []) {
      const f = await t.d.firstMap(loc).catch(() => ({ state: "none" as const, keyword: null }));
      if (f.state !== "ask") continue;
      const b = businesses(tn.who).find((x) => x.location_id === loc);
      if (!b) continue;
      return askKeyword({ ...tn, business: b, head: head(tn.who, "business", b) }, f.keyword ?? null, "verified");
    }
    return "verified";
  }
  if (r.result === "phone_in_use") return answered(t, SAY.phoneInUse, "phone_in_use");
  return answered(t, SAY.badCode, "bad_code");
}

/** The turn after something changed who the phone is (a code, START): its roles and send state read again. */
async function again(t: Turn): Promise<Turn> {
  const [who, s] = await Promise.all([t.d.db.resolve(t.phone), t.d.out.db.state(t.phone)]);
  return { ...t, who, s: { ...s, stopped: false, window_expires_at: t.s.window_expires_at } };
}

// ─── Onboarding in four stages (V4, 30.16 section 3; docs/COPY.md 20).

/** Stage 3: Nora's first message back after the owner connected WhatsApp, then the free check whatever the answer. */
async function onboardingFirst(t: Turn, ob: FirstBack): Promise<string> {
  const b = businesses(t.who).find((x) => x.location_id === ob.location_id) ?? null;
  const tb = { ...t, business: b, head: null };
  await t.d.db.setConv(t.phone, { open_question: { type: "setup", location_id: ob.location_id } satisfies OpenQuestion });
  await say1(tb, SAY_ONBOARDING.firstBack(ob.name, ob.business, !!ob.check),
    [{ id: `ob:y:${ob.location_id}`, title: "Yes" }, { id: `ob:h:${ob.location_id}`, title: "Help" }]);
  if (ob.check) await say1(tb, SAY_ONBOARDING.check(ob.check.term, ob.check.date, ob.check.fact));
  return "onboarding_first";
}

/** The setup replies: only an owner of that business, and only with the onboarding side present. */
async function onboardingButton(t: Turn, action: OnboardingAction, locationId: string): Promise<string> {
  const b = businesses(t.who).find((x) => x.location_id === locationId && x.role === "owner");
  const ob = t.d.onboarding;
  if (!b || !ob) return answered(t, SAY.notYours, "onboarding_not_yours");
  const tb = { ...t, business: b, head: head(t.who, "business", b) };
  if (action === "yes") {
    const r = await ob.setupYes(locationId, b.user_id);
    if (!r.ok) return answered(tb, SAY.notYours, "onboarding_not_yours");
    await t.d.db.setConv(t.phone, { open_question: null });
    // Stage 4's steps, with the ID on its own so a long press copies it; claimed once with the tick's fallback.
    if (await ob.claim(locationId, "invite")) {
      await say1(tb, SAY_ONBOARDING.invite, inviteButtons(locationId));
      await say1({ ...tb, head: null }, SAY_ONBOARDING.id);
    }
    // Stage 3: the search Kabsi will track, prefilled from the free check; the map runs once access works (LATER row).
    if (r.hasKeyword) return "onboarding_yes";
    return askKeyword(tb, r.suggested, "onboarding_yes");
  }
  if (action === "help") {
    await t.d.db.setConv(t.phone, { open_question: null });
    await ob.founderHelp(locationId, b.user_id, t.phone);
    return answered(tb, SAY_ONBOARDING.founderAsked, "onboarding_help");
  }
  if (action === "someone_else") return answered(tb, SAY_ONBOARDING.someoneElse, "onboarding_someone_else");
  if (action === "cannot_find") return answered(tb, SAY_ONBOARDING.cannotFind(b.business), "onboarding_cannot_find");
  if (action === "done") return answered(tb, SAY_ONBOARDING.inviteSent, "onboarding_invite_sent");
  await ob.skipFirst(locationId);
  return answered(tb, SAY_ONBOARDING.skipped, "first_task_skipped");
}

/** The owner's (or a manager's) yes to the month's new facts. */
async function factsButton(t: Turn, action: "yes" | "no", locationId: string, month: string): Promise<string> {
  const b = businesses(t.who).find((x) => x.location_id === locationId && x.role !== "staff");
  if (!b || !t.d.onboarding) return answered(t, SAY.notYours, "facts_not_yours");
  const tb = { ...t, business: b, head: head(t.who, "business", b) };
  if (action === "no") return answered(tb, SAY_ONBOARDING.factsNotSaved, "facts_not_saved");
  const n = await t.d.onboarding.confirmFacts(locationId, b.user_id, month).catch(() => 0);
  return answered(tb, n ? SAY_ONBOARDING.factsSaved(n) : SAY.alreadyHandled, n ? "facts_saved" : "facts_stale");
}

// ─── The map (28.5, 27.3 item 1).

async function askKeyword(t: Turn, suggested: string | null, result: string): Promise<string> {
  const b = t.business!;
  await t.d.db.setConv(t.phone, { open_question: { type: "keyword", location_id: b.location_id, suggested } satisfies OpenQuestion });
  if (!suggested) return answered(t, SAY.keywordAskOpen(b.business), result);
  return answered(t, SAY.keywordAsk(b.business, suggested), result,
    [{ id: `v:y:${b.location_id}`, title: "Yes, use it" }, { id: `v:c:${b.location_id}`, title: "Change it" }]);
}

/** The owner or a manager of that business only; the search and its limits are the visibility function's. */
async function confirmSearch(t: Turn, locationId: string, keyword: string): Promise<string> {
  const b = businesses(t.who).find((x) => x.location_id === locationId);
  if (!b) return answered(t, SAY.notYours, "keyword_not_yours");
  const tb = { ...t, business: b, head: head(t.who, "business", b) };
  if (b.role === "staff") return answered(tb, SAY.roleNotAllowed(b.role), "keyword_staff");
  if (!t.d.confirmKeyword) return answered(tb, SAY.keywordPaused, "keyword_off");
  const r = await t.d.confirmKeyword(locationId, keyword).catch(() => ({ ok: false, reason: "error" }));
  if (r.ok) {
    await t.d.db.setConv(t.phone, { open_question: null });
    return answered(tb, SAY.keywordSet(b.business, keyword), "keyword_set");
  }
  if (r.reason === "not_found_on_maps") {
    await t.d.db.setConv(t.phone, { open_question: { type: "keyword", location_id: locationId, suggested: null } satisfies OpenQuestion });
    return answered(tb, SAY.keywordNotFound(b.business), "keyword_not_found");
  }
  await t.d.db.setConv(t.phone, { open_question: null });
  if (r.reason === "no_plan") return answered(tb, SAY.keywordNoPlan(b.business), "keyword_no_plan");
  if (r.reason === "keyword_limit") return answered(tb, SAY.keywordLimit(b.business), "keyword_limit");
  return answered(tb, SAY.keywordPaused, `keyword_${r.reason ?? "error"}`);
}

async function keywordButton(t: Turn, action: "yes" | "change", locationId: string): Promise<string> {
  const q = t.who.conversation?.open_question;
  const b = businesses(t.who).find((x) => x.location_id === locationId);
  if (!b) return answered(t, SAY.notYours, "keyword_not_yours");
  const tb = { ...t, business: b, head: head(t.who, "business", b) };
  if (action === "change") return askKeyword(tb, null, "keyword_change");
  const suggested = q?.type === "keyword" && q.location_id === locationId ? q.suggested : null;
  if (!suggested) return answered(tb, SAY.alreadyHandled, "keyword_stale");
  return confirmSearch(t, locationId, suggested);
}

async function keywordTyped(t: Turn, locationId: string, text: string): Promise<string> {
  const k = keywordFrom(text);
  if (!k) return answered(t, SAY.keywordBad, "keyword_bad");
  return confirmSearch(t, locationId, k);
}

async function mapButton(t: Turn, action: "show" | "later", scanId: string | null): Promise<string> {
  if (action === "later" || !scanId) return answered(t, SAY.mapLater, "map_later");
  const d = await t.d.db.mapDetails(scanId);
  const b = d ? businesses(t.who).find((x) => x.location_id === d.location_id) : null;
  // A map of a business this phone is not bound to is never shown or named (9.2).
  if (!d || !b) return answered(t, SAY.mapGone, "map_gone");
  return answered({ ...t, business: b, head: head(t.who, "business", b) }, mapDetailsText(d), "map_show");
}

// ─── Staff phone (9.9).

async function staff(t: Turn, name: string, arg: string | undefined): Promise<string> {
  switch (name) {
    case "staff_today": return answered(t, numbersText(await t.d.db.staffSummary()), name);
    case "staff_status":
    case "staff_waiting": {
      const n = await t.d.db.staffNumbers();
      const body = name === "staff_status"
        ? `Jobs failed in the last hour: ${n.jobs_failed_1h}. Jobs late: ${n.jobs_waiting}. Publications stuck: ${n.publications_stuck}. Number quality: ${n.number_quality ?? "not read yet"}.`
        : `Hand-offs in the last 2 days: ${n.handoffs}. Publications stuck: ${n.publications_stuck}. WhatsApp messages held: ${n.outbox_held}.`;
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
  const conv = who.conversation;
  const choose = needsRoleChoice(who, null);
  if (choose) return askRole(t, choose, text);
  const dom = activeDomain(t);
  const b = dom === "business" ? pickBusiness(who) : null;
  const role: RoleName = roleFor(who, dom, b);
  const stranger = role === "unknown" || role === "prospect";
  const tb0 = { ...t, business: b, head: head(who, dom, b) };
  // An unknown phone's first words: the greeting of 24.8 (it may have come from the site without the code).
  if (!t.d.ai) return answered(tb0, stranger ? say(t.first ? "greeting" : "unknownHelp", t.lang) : say("unclear", t.lang), "unclear_no_ai");

  const sleep = t.d.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let settled = false;
  let onIt: Promise<unknown> | null = null;
  void sleep(t.d.onItMs ?? 2500).then(() => {
    if (!settled) onIt = say1(tb0, SAY.onIt);
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
  const tb = { ...tb0, lang };
  // The welcome goes on the first message only; after that an unclear line from someone Kabsi does not know is a
  // question for Nora, never the welcome again (QA 1: "what happens to my reviews if I cancel" got the welcome).
  if (stranger && t.first && !conv?.open_question) return answered(tb, say("greeting", lang), "greeting");
  if (stranger) return askNora(tb, text);
  return answered(tb, r.question ?? say("unclear", lang), "unclear");
}

/** Nora answers from the public facts. Without a model, or when it fails, the plain unclear line. */
async function askNora(t: Turn, question: string): Promise<string> {
  const dom = activeDomain(t);
  const b = t.business ?? (dom === "business" ? pickBusiness(t.who) : null);
  const tb = { ...t, business: b, head: t.head ?? head(t.who, dom, b) };
  if (!t.d.nora) return answered(tb, say("unclear", t.lang), "unclear_no_nora");
  try {
    const text = forWhatsApp(await t.d.nora(question, { role: roleFor(t.who, dom, b), lang: t.lang, business: b?.business ?? null }));
    if (!text) return answered(tb, say("unclear", t.lang), "nora_empty");
    return answered(tb, text, "nora");
  } catch {
    return answered(tb, say("unclear", t.lang), "nora_failed");
  }
}
