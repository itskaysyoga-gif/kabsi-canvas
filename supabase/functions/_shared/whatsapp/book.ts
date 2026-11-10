// RB-E (R-139, Gate 1): the request book on WhatsApp, capture and find. The one file under whatsapp/ that imports the
// request book (a guard test holds that). Everything here is pure: the database and the model are passed in, so the
// conversation suite runs on fakes. agent.ts calls it from one seam, after the steps that use no AI and before the
// intent router, and only for a business whose request book is on (app_settings.request_book and location_packs.state).
//
// Rules this file keeps:
//   - who is acting and for which business come only from the verified sender's BusinessRole (user_id, location_id),
//     never from the message or a button;
//   - the model only quotes (extract.ts); code fills every value, and nothing is saved until the owner's Save or tap;
//   - Save uses the WhatsApp message id of the tap as its key, so a retry returns the first result and an old Save
//     tap finds the proposal already used and makes no second request;
//   - no time is invented: words with no exact time are kept as words, with no time set;
//   - every reply is built by code from the record (replies/), and says nothing the record does not hold.
import { type Ask, type Extraction, extract, type ExtractRefusal, nameCase, toEvidence } from "../request-book/extract.ts";
import { getPack, type Pack } from "../request-book/packs/index.ts";
import {
  askFirstReply, confirmationReply, convertedReply, correctedReply, COVERS_NOTE, finish, foundReply, openListReply, refusalReply, requestLine,
  savedReply, statusChangedReply, summaryReply, undoneReply,
} from "../request-book/replies/index.ts";
import { asWritten, clip, confirmationShort, kindWord, statusKeyWord, statusWord, whenText } from "../request-book/replies/words.ts";
import { OPEN_STATUSES, type Kind, type Reply, type RequestRow } from "../request-book/types.ts";
import { MAX_RAW_TEXT } from "../request-book/intake/adapter.ts";
import {
  type BookCommand, correction, nameFits, parseBookCommand, readWhen, saysArrived, servicesIn, type Since, statusFor, type Target,
} from "../request-book/commands.ts";
import type { Button } from "./channel.ts";
import type { OpenQuestion } from "./roles.ts";

export type Json = Record<string, unknown>;

/** The request book's database calls, each through its service-only function. Location and actor come from the caller. */
export interface BookDb {
  /** The seam's one check: the businesses among these whose request book is on, with their pack. Empty when it is off. */
  on(locationIds: string[]): Promise<Record<string, { pack: string; version: number }>>;
  propose(location: string, actor: string, key: string, rawText: string, evidence: Json, providerId: string | null): Promise<Json>;
  revise(location: string, actor: string, key: string, intake: string, rawText: string, evidence: Json): Promise<Json>;
  discard(location: string, actor: string, key: string, intake: string): Promise<Json>;
  intake(location: string, actor: string, intake: string): Promise<Json>;
  create(location: string, actor: string, key: string, input: Json): Promise<Json>;
  get(location: string, actor: string, ref: string): Promise<Json>;
  find(location: string, actor: string, query: Json): Promise<Json>;
  // RB-F: the PR B writes and the reads behind update, confirm, convert, correct, Undo and what's open.
  setStatus(location: string, actor: string, key: string, request: string, version: number, to: string, outcome: string | null, ack: boolean): Promise<Json>;
  setConfirmation(location: string, actor: string, key: string, request: string, version: number, party: "staff" | "customer", confirmed: boolean): Promise<Json>;
  correct(location: string, actor: string, key: string, request: string, version: number, changes: Json): Promise<Json>;
  convert(location: string, actor: string, key: string, request: string, version: number, input: Json): Promise<Json>;
  undo(location: string, actor: string, key: string, activity: string): Promise<Json>;
  listOpen(location: string, actor: string, filter: Json): Promise<Json>;
  recent(location: string, actor: string, minutes: number): Promise<Json>;
}

export type BookDeps = { db: BookDb; ask: Ask | null };

/** The businesses (location ids) where the book is on, each with the pack Kabsi has for it. A pack Kabsi lacks is off. */
export async function bookOn(db: BookDb, ids: string[]): Promise<Map<string, Pack>> {
  const out = new Map<string, Pack>();
  if (!ids.length) return out;
  const rows = await db.on(ids).catch(() => ({} as Record<string, { pack: string; version: number }>));
  for (const id of ids) {
    const r = rows[id];
    const pack = r ? getPack(r.pack, r.version) : null;
    if (pack) out.set(id, pack);
  }
  return out;
}

/** How long a proposal stays open for a second message to revise it. After that a message is a new request. */
export const PROPOSAL_OPEN_MS = 30 * 60_000;
/** "On it" for request tools waits 10 seconds (it is a billable message); the rest of the agent keeps 2.5. */
export const ON_IT_REQUEST_MS = 10_000;

// ─── Word rules (docs/kabsi-3/engineering-reference.md section 6), for a business with the request book on.

export type Ref = { number: number; word: "closed" | "cancel" | "post" | null };

/**
 * A request reference: "42", "#42", "request 42", or one of the words that already mean something followed by a number
 * ("closed 42", "cancel 42", "post 42"). The words alone keep today's meaning (hours, billing, a Google post).
 */
export function refOf(text: string): Ref | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "").replace(/\s+/g, " ");
  const word = /^(closed|cancel|post)\s+(?:request\s+)?#?(\d{1,9})$/.exec(t);
  if (word) return { number: Number(word[2]), word: word[1] as Ref["word"] };
  const plain = /^(?:(?:request|req|appointment|enquiry|job|no\.?|number)\s*)?#?\s*(\d{1,9})$/.exec(t);
  if (plain && Number(plain[1]) > 0) return { number: Number(plain[1]), word: null };
  return null;
}

// ─── Lines. Plain words, no dashes, no exclamation marks, never booked, available or confirmed (kabsi-copy, replies/).

export const BOOK_SAY = {
  changeAsk: "Send what to change, or the whole request again. Nothing is saved yet.",
  tapReading: "Tap the one you meant on the message above. Nothing is saved yet.",
  expired: "That draft is more than 30 days old, so it was not saved. Send the details again.",
  dropped: "Okay. That draft was not saved.",
  howEnded: "Say how it ended, for example the number and a word such as cancel or no show.",
  findWhat: "Send the name or the number of the request.",
  notRead: "I could not read that just now. Nothing was saved. Please send it again.",
  tryAgain: "Kabsi could not reach your request book just now. Nothing new was saved. Please send it again in a minute.",
  tapSave: "A request draft is waiting. Tap Save or Change on it, so this yes is not counted for anything else.",
  stillWaiting: "The request above is still waiting. Tap Save or Change. Nothing is saved yet.",
} as const;

// ─── Proposals.

/** The buttons under a proposal: Save and Change carry the proposal's id; two or three readings carry their place. */
export function proposalButtons(reply: Reply, ex: Extraction, intakeId: string): Button[] {
  const ask = ex.askField ? ex.fields[ex.askField] : null;
  return (reply.buttons ?? []).map((title, i) => {
    if (ask && ask.show === "buttons") return { id: `rp:${intakeId}:${i}`, title };
    return { id: title === "Save" ? `rs:${intakeId}` : `rc:${intakeId}`, title };
  });
}

export type Read = { ok: true; ex: Extraction } | { ok: false; reply: Reply };

/** One message (or a proposal and the message that revises it) read into a proposal. A refusal or nothing read saves nothing. */
export async function readRequest(text: string, pack: Pack, ctx: { country: string | null; timeZone: string; now: Date }, ask: Ask | null): Promise<Read> {
  if (!ask) return { ok: false, reply: finish(BOOK_SAY.notRead) };
  const r: Extraction | ExtractRefusal = await extract(text.slice(0, MAX_RAW_TEXT), { pack, ...ctx }, ask);
  if ("ok" in r) return { ok: false, reply: finish(r.reason === "too_long" ? "That is too long to read in one message. Send the request on its own." : BOOK_SAY.notRead) };
  if (r.nothingToRead || r.issues.includes("no_model_answer")) return { ok: false, reply: r.reply };
  return { ok: true, ex: r };
}

export { refusalReply, toEvidence };
export type { Pack };

type Evidence = {
  kind?: string; raw?: string | null; normalized?: unknown; candidates?: { label: string; value: unknown }[];
  validation?: { passed?: boolean; reason?: string | null };
};

const words = (s: string) => s.replace(/\s+/g, " ").trim();

/** What a saved request is for: the pack's service labels when it knows them, else the owner's words. */
function summaryOf(pack: Pack, e: Evidence): string | null {
  const n = e.normalized as { text?: string; services?: string[] } | null;
  if (!n) return null;
  const labels = [...new Set((n.services ?? []).map((k) => pack.services.find((s) => s.key === k)?.label).filter((x): x is string => !!x))];
  const text = labels.length ? labels.join(" and ") : words(n.text ?? "");
  return text ? text.slice(0, 1000) : null;
}

// RB-F2: the name rule and the packs, for the agent's tests (book.ts stays the only file here that imports request-book).
export { getPack, nameCase };

export type Built = { ok: true; input: Json } | { ok: false; why: "needs_tap" | "missing"; missing: string[] };

/**
 * The input of request_create, from a proposal's evidence and the owner's tap. A field that still needs a choice is never
 * saved; a pick chooses one reading of the first such field. A time is saved only where code read one; words with no exact
 * time are kept as the owner wrote them, with no time set.
 */
export function createInput(pack: Pack, evidence: Json, intakeId: string, pick?: number, rawText?: string | null): Built {
  const input: Json = { kind: pack.defaultKind satisfies Kind, entry_method: "typed", intake_id: intakeId };
  // RB-F: a job the owner's own words say is already in ("car's here") starts as in, not waiting. Read by code, never guessed.
  if (pack.defaultKind === "job" && rawText && saysArrived(rawText)) input.initial_status = "active";
  const details: Json = {};
  const missing: string[] = [];
  let picked = pick === undefined;
  for (const spec of pack.fields) {
    const e = (evidence[spec.key] ?? {}) as Evidence;
    let value = e.normalized;
    if (e.kind === "ambiguous") {
      const c = !picked && pick !== undefined ? e.candidates?.[pick] : undefined;
      if (!c) return { ok: false, why: "needs_tap", missing: [] };
      value = c.value;
      picked = true;
    } else if (e.kind !== "stated" && e.kind !== "inferred") {
      if (spec.required) missing.push(spec.label);
      continue;
    }
    switch (spec.target) {
      case "customer_name":
        if (typeof value === "string" && value.trim()) input.customer_name = nameCase(words(value)).slice(0, 200);
        else if (spec.required) missing.push(spec.label);
        break;
      case "phone":
        if (typeof value === "string" && /^\+\d{7,15}$/.test(value)) input.identifiers = [{ kind: "phone", value }];
        break;
      case "summary": {
        const s = summaryOf(pack, { ...e, normalized: value });
        if (s) input.summary = s;
        else if (spec.required) missing.push(spec.label);
        break;
      }
      case "when": {
        const w = value as { starts_at?: string | null; text?: string } | null;
        // RB-F2: words the date reader understood are saved in their clean form ("Thursday afternoon"); words it did not
        // understand are saved marked as written, so no later list shows them as if they had been read.
        const read = !(e.kind === "stated" && e.validation?.passed === false && !w?.starts_at);
        const raw = e.raw ? words(e.raw) : w?.text ? words(w.text) : null;
        const said = read ? (w?.text ? words(w.text) : raw) : raw ? asWritten(raw.slice(0, 180)) : null;
        if (w?.starts_at) input.starts_at = w.starts_at;
        if (said) input.requested_window_text = said.slice(0, 200);
        break;
      }
      case "details":
        if (typeof value === "string" && value.trim()) details[spec.key] = words(value).slice(0, 200);
        break;
    }
  }
  if (pick !== undefined && !picked) return { ok: false, why: "needs_tap", missing: [] };
  if (missing.length) return { ok: false, why: "missing", missing };
  if (Object.keys(details).length) input.details = details;
  return { ok: true, input };
}

// ─── Reads.

/** request_get's answer as one row the replies can show. */
export function rowOf(r: Json): RequestRow | null {
  const q = r.request as Json | undefined;
  if (r.ok !== true || !q) return null;
  return {
    request_id: String(q.id), number: Number(q.number), kind: q.kind as Kind, status: String(q.status), outcome: (q.outcome as string | null) ?? null,
    summary: String(q.summary ?? ""), customer_id: String(q.customer_id), customer_name: r.customer_erased ? null : (r.customer_name as string | null) ?? null,
    requested_window_text: (q.requested_window_text as string | null) ?? null, starts_at: (q.starts_at as string | null) ?? null,
    staff_confirmed: !!q.staff_confirmed_at, customer_confirmed: !!q.customer_confirmed_at, next_action: (q.next_action as string | null) ?? null,
    next_action_due_at: (q.next_action_due_at as string | null) ?? null, follow_up_user_id: (q.follow_up_user_id as string | null) ?? null,
    created_at: String(q.created_at ?? ""),
  };
}

export type Ctx = { pack: Pack; timeZone: string; now: Date };

/** After Save: the request in one line, with Undo for 10 minutes (the button carries the creation's activity id). */
export function savedText(row: RequestRow, ctx: Ctx): Reply {
  return savedReply(row, ctx);
}

/** The line a proposal adds when the owner's words say a job is already in: the status it will be saved with. */
export function arrivedLine(pack: Pack, text: string): string | null {
  return pack.defaultKind === "job" && saysArrived(text) ? `Status: ${statusKeyWord(pack, "job", "active")}` : null;
}

/** "request 42": its whole state. "closed 42", "cancel 42", "post 42": the same, and that nothing was changed. */
export async function requestSummary(db: BookDb, location: string, actor: string, ref: Ref, ctx: Ctx): Promise<Reply> {
  const r = await db.get(location, actor, String(ref.number));
  const row = rowOf(r);
  if (!row) return refusalReply({ reason: String(r.reason ?? "not_found") });
  const s = summaryReply(row, ctx);
  return ref.word === "closed" ? finish(`${s.body}\n${BOOK_SAY.howEnded}`) : s;
}

/** A name or a number: one request in full, several to choose from (one question), or none. */
export async function findReply(db: BookDb, location: string, actor: string, arg: string | undefined, ctx: Ctx): Promise<Reply> {
  if (!arg) return finish(BOOK_SAY.findWhat);
  const ref = refOf(arg);
  if (ref) return await requestSummary(db, location, actor, { ...ref, word: null }, ctx);
  const r = await db.find(location, actor, { name: arg });
  if (r.ok !== true) return r.reason === "invalid_field" ? finish(BOOK_SAY.findWhat) : refusalReply({ reason: String(r.reason ?? "invalid_input") });
  const rows = Array.isArray(r.rows) ? (r.rows as RequestRow[]) : [];
  return foundReply(rows, Number(r.more ?? 0), ctx);
}

// --- RB-F: update, confirm, convert, correct, Undo and what's open. Code reads the command (commands.ts, no model); the
// database decides what is allowed (private.rb_rule, the role checks, Undo's 10 minutes) and every reply is written from
// what it returned. A skipped step or a change that ends a request is asked first; nothing is invented in between.

export { correction, parseBookCommand, readWhen, saysArrived };
export type { BookCommand };
/** A pack by id, version 1 (for the tests, which may import the request book only through this file). */
export const packOf = (id: string): Pack => getPack(id, 1)!;

/** One request with what a write needs: the row the replies show, its version and its details. */
export type Full = { row: RequestRow; version: number; details: Json | null };

export function fullOf(r: Json): Full | null {
  const row = rowOf(r);
  if (!row) return null;
  const q = r.request as Json;
  return { row, version: Number(q.row_version ?? 0), details: (q.details as Json | null) ?? null };
}

export type RbAsk = Extract<OpenQuestion, { type: "rb_ask" }>;
export type RbTime = Extract<OpenQuestion, { type: "rb_time" }>;
/** What one command does: the reply, its buttons, and the question it leaves open (null closes any request question). */
export type Act = { body: string; result: string; buttons?: Button[]; question?: RbAsk | RbTime | null };
export type Me = { location: string; actor: string };

/** An Undo button: the activity ids of one reply, the latest first. WhatsApp keeps a button id under 256 characters. */
export const undoButton = (ids: string[]): Button[] => (ids.length && ids.length <= 6 ? [{ id: `ru:${ids.join(".")}`, title: "Undo" }] : []);

const lbl = (pack: Pack, row: Pick<RequestRow, "kind" | "number">) => `${kindWord(pack, row.kind)} ${row.number}`;
const whoOf = (row: Pick<RequestRow, "customer_name">) => clip(row.customer_name ?? "No name", 40);
const refused = (r: Json) => refusalReply({ reason: String(r.reason ?? "unknown") }).body;
const at = (now: Date) => now.toISOString();
const sameInstant = (a: string | null, b: string | null) => !!a && !!b && Date.parse(a) === Date.parse(b);
/** Eight hex characters for a question's buttons (unbiased: straight from a random UUID). */
export const nonce = () => crypto.randomUUID().replace(/-/g, "").slice(0, 8);

type Resolved = { k: "one"; full: Full } | { k: "many"; rows: RequestRow[] } | { k: "not_open" } | { k: "none" } | { k: "refused"; body: string };

/** The request a command means: by number (the database decides what that number may do), or by a name that has requests. */
async function resolve(db: BookDb, me: Me, target: Target, fits: (r: RequestRow) => boolean): Promise<Resolved> {
  if ("number" in target) {
    const r = await db.get(me.location, me.actor, String(target.number));
    const f = fullOf(r);
    return f ? { k: "one", full: f } : { k: "refused", body: refused(r) };
  }
  const r = await db.find(me.location, me.actor, { name: target.name });
  // The database matches part of a name; only whole words count here ("Sam" is not Samira).
  const rows = (r.ok === true && Array.isArray(r.rows) ? (r.rows as RequestRow[]) : []).filter((x) => nameFits(x.customer_name, target.name));
  if (!rows.length) return { k: "none" };
  const open = rows.filter((x) => x.status !== "closed" && fits(x));
  if (!open.length) return { k: "not_open" };
  if (open.length > 1) return { k: "many", rows: open };
  const g = await db.get(me.location, me.actor, String(open[0]!.number));
  const f = fullOf(g);
  return f ? { k: "one", full: f } : { k: "refused", body: refused(g) };
}

/** One question when a name fits several: send the number with the same words. */
function which(rows: RequestRow[], example: string, ctx: Ctx, result: string): Act {
  const lines = rows.slice(0, 5).map((r) => requestLine(r, ctx));
  return { body: [`${rows.length} open with that name. Which one? Send its number with it, for example ${rows[0]!.number} ${example}.`, ...lines].join("\n"), result };
}

const NOT_OPEN = "Nothing open in Kabsi has that name. Nothing was changed.";

/** Runs one command for the verified sender's own business. Null: not a command after all, so the message goes on as before. */
export async function runCommand(db: BookDb, me: Me, cmd: BookCommand, ctx: Ctx, key: string): Promise<Act | null> {
  switch (cmd.k) {
    case "status": return await statusCmd(db, me, cmd.items, ctx, key);
    case "confirm": return await confirmCmd(db, me, cmd.target, cmd.when, ctx, key);
    case "convert": return await convertCmd(db, me, cmd.name, cmd.rest, ctx, key);
    case "correct": return await correctCmd(db, me, cmd.number, cmd.from, cmd.to, ctx, key);
    case "undo": return await undoCmd(db, me, ctx, key);
    case "open": return await openCmd(db, me, cmd.keys, ctx);
    case "unconfirmed": return await unconfirmedCmd(db, me, ctx);
    case "asked": return await askedCmd(db, me, cmd.about, cmd.since, ctx);
  }
}

// Status changes. Each one is one write with no acknowledgement first; the database answers needs_confirmation for a
// skipped step or a change that ends a request, and only then is the owner asked (one question per reply).
async function statusCmd(db: BookDb, me: Me, items: { target: Target; keys: string[] }[], ctx: Ctx, key: string): Promise<Act | null> {
  const pack = ctx.pack;
  const lines: string[] = [];
  const undo: string[] = [];
  let ask: { row: RequestRow; version: number; to: string; outcome: string | null; flags: string[] } | null = null;
  let only: { row: RequestRow; flags: string[] } | null = null;
  for (const [i, it] of items.entries()) {
    const tag = "number" in it.target ? `#${it.target.number}` : "That name";
    const res = await resolve(db, me, it.target, (r) => !!statusFor(r.kind, it.keys));
    if (res.k === "none") {
      // A name with no request at all: not a command, unless other parts of the message were.
      if (items.length === 1) return null;
      lines.push("Nothing in Kabsi has that name.");
      continue;
    }
    if (res.k === "not_open") {
      if (items.length === 1) return { body: NOT_OPEN, result: "request_status_not_open" };
      lines.push(NOT_OPEN);
      continue;
    }
    if (res.k === "refused") {
      lines.push(`${tag}: ${res.body}`);
      continue;
    }
    if (res.k === "many") {
      const word = [...statusPhrasesOf(pack, it.keys)][0] ?? "ready";
      if (items.length === 1) return which(res.rows, word, ctx, "request_status_which");
      lines.push(`${res.rows.length} open with that name. Send the number with the word.`);
      continue;
    }
    const { row, version } = res.full;
    const mv = statusFor(row.kind, it.keys);
    if (!mv) {
      lines.push(`${lbl(pack, row)}: ${refusalReply({ reason: "not_allowed" }).body}`);
      continue;
    }
    const r = await db.setStatus(me.location, me.actor, `${key}:s${i}`, row.request_id, version, mv.to, mv.outcome, false);
    if (r.ok === true) {
      const next = { ...row, status: String(r.status), outcome: (r.outcome as string | null) ?? null };
      undo.unshift(String(r.activity_id));
      lines.push(`${lbl(pack, next)} is now ${statusWord(pack, next)}.`);
      only = { row: next, flags: Array.isArray(r.flags) ? (r.flags as string[]) : [] };
      continue;
    }
    if (r.reason === "needs_confirmation" && !ask) {
      ask = { row, version, to: mv.to, outcome: mv.outcome, flags: Array.isArray(r.flags) ? (r.flags as string[]) : [] };
      continue;
    }
    if (r.reason === "needs_confirmation") {
      lines.push(`${lbl(pack, row)} needs your yes first. Send it on its own.`);
      continue;
    }
    lines.push(`${lbl(pack, row)}: ${refused(r)}`);
  }
  const n = nonce();
  const question = ask
    ? { type: "rb_ask" as const, location_id: me.location, request_id: ask.row.request_id, version: ask.version, to: ask.to, outcome: ask.outcome, at: at(ctx.now), nonce: n }
    : null;
  // With other parts already applied, their Undo stays on the reply next to Yes and No.
  const yesNo = ask ? [{ id: `ra:${ask.row.request_id}:${n}`, title: "Yes" }, { id: `rx:${ask.row.request_id}:${n}`, title: "No" }, ...undoButton(undo)] : [];
  const askBody = ask ? askFirstReply(ask.row, ctx, { to: ask.to, outcome: ask.outcome, flags: ask.flags }).body : null;
  if (only && undo.length === 1 && !ask && lines.length === 1) {
    return { body: statusChangedReply(only.row, ctx, only.flags).body, result: "request_status", buttons: undoButton(undo), question: null };
  }
  if (ask && !lines.length) return { body: askBody!, result: "request_status_ask", buttons: yesNo, question };
  const body = [...lines, ...(askBody ? [askBody] : [])].join("\n");
  return { body: finish(body).body, result: ask ? "request_status_ask" : undo.length ? "request_status_many" : "request_status_refused",
    buttons: ask ? yesNo : undoButton(undo), question };
}

/** The owner's own words for a status, for the example in a question: the pack's word for the first key. */
function statusPhrasesOf(pack: Pack, keys: string[]): string[] {
  const out: string[] = [];
  for (const k of pack.kinds) for (const key of keys) {
    const w = pack.words.status[k]?.[key];
    if (w) out.push(w.toLowerCase());
  }
  return out;
}

/** The owner's yes or no to a question asked before a change. Yes makes the change with the version that was asked about. */
export async function askAnswer(db: BookDb, me: Me, q: RbAsk, yes: boolean, ctx: Ctx, key: string): Promise<Act> {
  if (!yes) return { body: "Okay. Nothing was changed.", result: "request_ask_no", question: null };
  const g = fullOf(await db.get(me.location, me.actor, q.request_id));
  if (!g) return { body: refusalReply({ reason: "not_found" }).body, result: "request_ask_gone", question: null };
  const r = await db.setStatus(me.location, me.actor, key, q.request_id, q.version, q.to, q.outcome, true);
  if (r.ok !== true) return { body: refused(r), result: `request_ask_refused:${r.reason}`, question: null };
  const next = { ...g.row, status: String(r.status), outcome: (r.outcome as string | null) ?? null };
  const flags = Array.isArray(r.flags) ? (r.flags as string[]) : [];
  return { body: statusChangedReply(next, ctx, flags).body, result: "request_status_acknowledged", buttons: undoButton([String(r.activity_id)]), question: null };
}

// Confirmation: the customer told staff, and staff records it. Kabsi never says it checked a diary or booked anything.
async function confirmCmd(db: BookDb, me: Me, target: Target, when: string | null, ctx: Ctx, key: string): Promise<Act | null> {
  const pack = ctx.pack;
  const res = await resolve(db, me, target, (r) => r.kind === "appointment");
  // No open appointment by that name: not a confirmation Kabsi can record, so the message goes on as before.
  if (res.k === "none" || res.k === "not_open") return null;
  if (res.k === "refused") return { body: res.body, result: "request_confirm_refused" };
  if (res.k === "many") return which(res.rows, "confirmed", ctx, "request_confirm_which");
  const f = res.full;
  if (!when) return await confirmApply(db, me, f, null, ctx, key);
  const r = readWhen(when, pack, { now: ctx.now, timeZone: ctx.timeZone });
  const head = `${lbl(pack, f.row)} for ${whoOf(f.row)}`;
  const customer = pack.words.customer.singular;
  // "Sarah confirmed she will pay": no day or hour at all, so not a confirmation of a time.
  if (r.k === "none") return null;
  if (r.k === "window") {
    return { body: `${head}: say the day and the hour, for example Thursday 3pm. Nothing was changed.`, result: "request_confirm_no_time" };
  }
  if (r.k === "one") return await confirmApply(db, me, f, r.startsAt, ctx, key);
  const n = nonce();
  const question: RbTime = { type: "rb_time", location_id: me.location, request_id: f.row.request_id, version: f.version, action: "confirm",
    readings: r.k === "guess" ? [r.startsAt] : r.readings.map((x) => x.startsAt), services: [], at: at(ctx.now), nonce: n };
  if (r.k === "guess") {
    return { body: `${head}: ${r.label}?\nTap it to set that time and record that the ${customer} confirmed. Nothing is changed until you tap.`,
      result: "request_confirm_guess", buttons: [{ id: `rt:${f.row.request_id}:${n}:0`, title: r.label }], question };
  }
  return { body: `${head}: which time did the ${customer} confirm? Nothing is changed until you tap.`, result: "request_confirm_choose",
    buttons: r.readings.map((x, i) => ({ id: `rt:${f.row.request_id}:${n}:${i}`, title: x.label })), question };
}

/** Sets the time when it is new (a time change clears the confirmations the old time had), then records the customer's confirmation. */
async function confirmApply(db: BookDb, me: Me, f: Full, startsAt: string | null, ctx: Ctx, key: string): Promise<Act> {
  // Checked before any write, so a time is never set on a request that cannot hold a confirmation.
  if (f.row.kind !== "appointment") return { body: refusalReply({ reason: "not_appointment" }).body, result: "request_confirm_refused:not_appointment", question: null };
  if (f.row.status === "closed") return { body: refusalReply({ reason: "closed" }).body, result: "request_confirm_refused:closed", question: null };
  const acts: string[] = [];
  let version = f.version;
  let cleared = false;
  if (startsAt && !sameInstant(startsAt, f.row.starts_at)) {
    const c = await db.correct(me.location, me.actor, `${key}:t`, f.row.request_id, version, { starts_at: startsAt });
    if (c.ok !== true) return { body: refused(c), result: `request_confirm_refused:${c.reason}`, question: null };
    acts.unshift(String(c.activity_id));
    version = Number(c.row_version);
    cleared = Array.isArray(c.flags) && (c.flags as string[]).includes("confirmations_cleared");
  }
  const s = await db.setConfirmation(me.location, me.actor, `${key}:c`, f.row.request_id, version, "customer", true);
  if (s.ok !== true && !acts.length) return { body: refused(s), result: `request_confirm_refused:${s.reason}`, question: null };
  if (s.ok === true) acts.unshift(String(s.activity_id));
  const after = fullOf(await db.get(me.location, me.actor, f.row.request_id));
  if (!after) return { body: refusalReply({ reason: "not_found" }).body, result: "request_confirm_gone", question: null };
  const lines = [confirmationReply(after.row, ctx).body];
  if (cleared) lines.push("The time changed, so the confirmations recorded for the old time were cleared.");
  if (s.ok !== true) lines.push(`The time is set. The confirmation was not recorded: ${refused(s)}`);
  return { body: finish(lines.join("\n")).body, result: s.ok === true ? "request_confirmed" : "request_time_set", buttons: undoButton(acts), question: null };
}

// Conversion: the enquiry closes as converted and a new linked request starts. Its timeline is not touched in between.
async function convertCmd(db: BookDb, me: Me, name: string, rest: string, ctx: Ctx, key: string): Promise<Act | null> {
  const pack = ctx.pack;
  const res = await resolve(db, me, { name }, (r) => r.kind === "enquiry");
  // No open enquiry by that name: this is a new request, and capture reads it as before.
  if (res.k === "none" || res.k === "not_open") return null;
  if (res.k === "refused") return { body: res.body, result: "request_convert_refused" };
  if (res.k === "many") return which(res.rows, "booked", ctx, "request_convert_which");
  const f = res.full;
  const s = servicesIn(rest, pack);
  const r = readWhen(rest, pack, { now: ctx.now, timeZone: ctx.timeZone });
  const into = newKind(pack);
  if (r.k === "guess" || r.k === "choose") {
    const n = nonce();
    const question: RbTime = { type: "rb_time", location_id: me.location, request_id: f.row.request_id, version: f.version, action: "convert",
      readings: r.k === "guess" ? [r.startsAt] : r.readings.map((x) => x.startsAt), services: s.keys, at: at(ctx.now), nonce: n };
    const head = `${lbl(pack, f.row)} for ${whoOf(f.row)} becomes ${/^[aeiou]/i.test(kindWord(pack, into)) ? "an" : "a"} ${kindWord(pack, into).toLowerCase()}`;
    if (r.k === "guess") {
      return { body: `${head}: ${r.label}?\nTap it to save it at that time. Nothing is changed until you tap.`, result: "request_convert_guess",
        buttons: [{ id: `rt:${f.row.request_id}:${n}:0`, title: r.label }], question };
    }
    return { body: `${head}. Which time did you mean? Nothing is changed until you tap.`, result: "request_convert_choose",
      buttons: r.readings.map((x, i) => ({ id: `rt:${f.row.request_id}:${n}:${i}`, title: x.label })), question };
  }
  const input: Json = { kind: into };
  if (s.labels.length) input.summary = s.labels.join(" and ");
  if (r.k === "one") input.starts_at = r.startsAt;
  if (r.k === "window") input.requested_window_text = clip(r.text, 200);
  return await convertApply(db, me, f, input, ctx, key);
}

const newKind = (pack: Pack): Kind => pack.kinds.find((k) => k !== "enquiry") ?? "appointment";

async function convertApply(db: BookDb, me: Me, f: Full, input: Json, ctx: Ctx, key: string): Promise<Act> {
  const c = await db.convert(me.location, me.actor, key, f.row.request_id, f.version, input);
  if (c.ok !== true) return { body: refused(c), result: `request_convert_refused:${c.reason}`, question: null };
  const created = fullOf(await db.get(me.location, me.actor, String(c.number)));
  if (!created) return { body: `${lbl(ctx.pack, f.row)} was converted.`, result: "request_converted", buttons: undoButton([String(c.activity_id)]), question: null };
  return { body: convertedReply(f.row, created.row, ctx).body, result: "request_converted", buttons: undoButton([String(c.activity_id)]), question: null };
}

/** The reading the owner tapped (or a typed yes to the one guess), for a confirmation or a conversion. */
export async function timePicked(db: BookDb, me: Me, q: RbTime, i: number, ctx: Ctx, key: string): Promise<Act> {
  const startsAt = q.readings[i];
  if (!startsAt) return { body: "Tap the time you meant on the message above. Nothing is changed yet.", result: "request_time_tap" };
  const f = fullOf(await db.get(me.location, me.actor, q.request_id));
  if (!f) return { body: refusalReply({ reason: "not_found" }).body, result: "request_time_gone", question: null };
  // The request changed since the question: the tap would apply to something the owner did not see.
  if (f.version !== q.version) return { body: refusalReply({ reason: "version_conflict" }).body, result: "request_time_refused:version_conflict", question: null };
  if (q.action === "confirm") return await confirmApply(db, me, f, startsAt, ctx, key);
  const labels = q.services.map((k) => ctx.pack.services.find((s) => s.key === k)?.label).filter((x): x is string => !!x);
  const input: Json = { kind: newKind(ctx.pack), starts_at: startsAt };
  if (labels.length) input.summary = [...new Set(labels)].join(" and ");
  return await convertApply(db, me, f, input, ctx, key);
}

// Correct: the request this person touched in the last 30 minutes, or the number they gave. If none, or it is not clear
// which one, Kabsi asks; it never picks between two.
async function correctCmd(db: BookDb, me: Me, number: number | null, from: string, to: string, ctx: Ctx, key: string): Promise<Act | null> {
  const pack = ctx.pack;
  const ask = (n: number) => `Which one? Send its number with the change, for example ${n} not ${clip(from, 30)}, ${clip(to, 30)}. Nothing was changed.`;
  const cands: Full[] = [];
  if (number !== null) {
    const g = await db.get(me.location, me.actor, String(number));
    const f = fullOf(g);
    if (!f) return { body: refused(g), result: "request_correct_refused" };
    cands.push(f);
  } else {
    const r = await db.recent(me.location, me.actor, 30);
    const rows = r.ok === true && Array.isArray(r.rows) ? (r.rows as Json[]) : [];
    for (const x of rows.slice(0, 5)) {
      const f = fullOf(await db.get(me.location, me.actor, String(x.request_id)));
      if (f && f.row.status !== "closed") cands.push(f);
    }
    // Nothing touched lately: "not now, thanks" is not a correction, so the message goes on as before.
    if (!cands.length) return null;
  }
  const hits = cands
    .map((f) => ({ f, c: correction(pack, { customer_name: f.row.customer_name, summary: f.row.summary, details: f.details }, from, to) }))
    .filter((x) => x.c !== null);
  if (!hits.length) {
    // Without a number, words that are on no recent request are not a correction ("not sure, maybe later").
    if (number === null) return null;
    if (cands.length === 1) return { body: `${lbl(pack, cands[0]!.row)} does not say ${clip(from, 40)}. Nothing was changed.`, result: "request_correct_not_found" };
    return { body: ask(cands[0]!.row.number), result: "request_correct_which" };
  }
  if (hits.length > 1) return { body: ask(hits[0]!.f.row.number), result: "request_correct_which" };
  const { f, c } = hits[0]!;
  const r = await db.correct(me.location, me.actor, key, f.row.request_id, f.version, c!.changes);
  if (r.ok !== true) return { body: refused(r), result: `request_correct_refused:${r.reason}`, question: null };
  const after = fullOf(await db.get(me.location, me.actor, f.row.request_id)) ?? f;
  const flags = Array.isArray(r.flags) ? (r.flags as string[]) : [];
  return { body: correctedReply(after.row, [c!.shown], ctx, flags).body, result: "request_corrected", buttons: undoButton([String(r.activity_id)]), question: null };
}

// Undo: the latest effective change, inside 10 minutes (request_undo holds both rules). A typed undo with nothing of the
// request book's to undo keeps today's meaning.
async function undoCmd(db: BookDb, me: Me, ctx: Ctx, key: string): Promise<Act | null> {
  const r = await db.recent(me.location, me.actor, 10);
  const rows = r.ok === true && Array.isArray(r.rows) ? (r.rows as Json[]) : [];
  const id = rows[0]?.latest_activity_id;
  if (typeof id !== "string") return null;
  return await undoIds(db, me, [id], ctx, key);
}

/** Undoes these activities in order (the latest first). Null when the first is not this business's, so the caller tries another. */
export async function undoIds(db: BookDb, me: Me, ids: string[], ctx: Ctx, key: string): Promise<Act | null> {
  const done: Json[] = [];
  let stop: Json | null = null;
  for (const [i, id] of ids.entries()) {
    const r = await db.undo(me.location, me.actor, `${key}:${i}`, id);
    if (r.ok !== true) {
      if (i === 0 && r.reason === "not_found") return null;
      if (!done.length) return { body: refused(r), result: `request_undo_refused:${r.reason}`, question: null };
      stop = r;
      break;
    }
    done.push(r);
  }
  // Every request that was put back, then what could not be, so the reply never claims more than happened.
  const lines = done.map((d) => {
    const row = { kind: d.kind as Kind, number: Number(d.number), status: String(d.status), outcome: (d.outcome as string | null) ?? null };
    return row.outcome === "voided" ? `Undone. ${lbl(ctx.pack, row)} was removed.` : undoneReply(row as RequestRow, ctx).body;
  });
  if (stop) lines.push(`The rest was not undone: ${refused(stop)}`);
  return { body: lines.join("\n"), result: done.at(-1)!.replay ? "request_undone_replay" : stop ? "request_undone_partly" : "request_undone", question: null };
}

// What's open, grouped for this business only. 15 rows, then how many more, and the note that it covers only Kabsi.
async function openCmd(db: BookDb, me: Me, keys: string[] | null, ctx: Ctx): Promise<Act> {
  const status = keys?.find((k) => ctx.pack.kinds.some((kind) => OPEN_STATUSES[kind].includes(k))) ?? null;
  if (keys && !status) return { body: `Nothing is open with that status.\n${COVERS_NOTE}`, result: "request_open" };
  const r = await db.listOpen(me.location, me.actor, status ? { status } : {});
  if (r.ok !== true) return { body: refused(r), result: "request_open_refused" };
  return { body: openGrouped(Array.isArray(r.rows) ? (r.rows as RequestRow[]) : [], Number(r.more ?? 0), ctx).body, result: "request_open" };
}

async function unconfirmedCmd(db: BookDb, me: Me, ctx: Ctx): Promise<Act> {
  const r = await db.listOpen(me.location, me.actor, { unconfirmed: true });
  if (r.ok !== true) return { body: refused(r), result: "request_unconfirmed_refused" };
  return { body: openListReply(Array.isArray(r.rows) ? (r.rows as RequestRow[]) : [], Number(r.more ?? 0), ctx, { unconfirmed: true, kind: "appointment" }).body,
    result: "request_unconfirmed" };
}

async function askedCmd(db: BookDb, me: Me, about: string, since: Since | null, ctx: Ctx): Promise<Act> {
  const s = servicesIn(about, ctx.pack);
  const text = (s.labels.length ? s.labels.join(" ") : about).slice(0, 60);
  const r = await db.find(me.location, me.actor, { text });
  if (r.ok !== true) return { body: `Send a word or two about what they asked, for example: who asked about ${clip(about, 30)} this week.`, result: "request_asked_refused" };
  const from = since ? sinceDay(since, ctx) : null;
  const rows = (Array.isArray(r.rows) ? (r.rows as RequestRow[]) : [])
    .filter((x) => x.kind === "enquiry" && (!from || dayIn(x.created_at, ctx.timeZone) >= from));
  const when = since === "today" ? " today" : since === "week" ? " this week" : since === "month" ? " this month" : "";
  if (!rows.length) return { body: `Nobody in Kabsi asked about ${clip(about, 40)}${when}.\n${COVERS_NOTE}`, result: "request_asked" };
  const more = Number(r.more ?? 0);
  const lines = [`${rows.length}${more ? " or more" : ""} asked about ${clip(about, 40)}${when}.`, ...rows.map((x) => requestLine(x, ctx)), COVERS_NOTE];
  return { body: finish(lines.join("\n")).body, result: "request_asked" };
}

const dayIn = (iso: string, timeZone: string) => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
  } catch {
    return iso.slice(0, 10);
  }
};

/** The first day the question covers, in the business's calendar: today, this week from Monday, or this month. */
export function sinceDay(since: Since, ctx: Pick<Ctx, "now" | "timeZone">): string {
  const today = dayIn(ctx.now.toISOString(), ctx.timeZone);
  if (since === "today") return today;
  if (since === "month") return `${today.slice(0, 8)}01`;
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** The open list, grouped by status (and kind, when a business has more than one open kind). Plain text, no buttons. */
export function openGrouped(rows: RequestRow[], more: number, ctx: Ctx): Reply {
  const pack = ctx.pack;
  const total = rows.length + more;
  if (!total) return finish(`Nothing is open.\n${COVERS_NOTE}`);
  const kinds = new Set(rows.map((r) => r.kind));
  const order = [...pack.kinds, ...[...kinds].filter((k) => !pack.kinds.includes(k))]
    .flatMap((k) => OPEN_STATUSES[k].map((s) => [k, s] as [Kind, string]));
  const lines = [`${total} open.`];
  for (const [k, s] of order) {
    const g = rows.filter((r) => r.kind === k && r.status === s);
    if (!g.length) continue;
    const head = kinds.size > 1 ? `${kindWord(pack, k, true)}, ${statusKeyWord(pack, k, s)}` : `${statusKeyWord(pack, k, s)}`;
    lines.push("", `${head} (${g.length})`);
    for (const r of g) {
      const parts = [`#${r.number} ${whoOf(r)}`, clip(r.summary, 50)];
      const w = whenText(r, ctx);
      if (w) parts.push(w);
      const c = confirmationShort(r, pack);
      if (c) parts.push(c);
      lines.push(parts.join(" · "));
    }
  }
  if (more) lines.push("", `and ${more} more`);
  lines.push("", COVERS_NOTE);
  return finish(lines.join("\n"));
}
