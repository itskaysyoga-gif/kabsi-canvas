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
import { type Ask, type Extraction, extract, type ExtractRefusal, toEvidence } from "../request-book/extract.ts";
import { getPack, type Pack } from "../request-book/packs/index.ts";
import { finish, foundReply, refusalReply, savedReply, summaryReply } from "../request-book/replies/index.ts";
import type { Kind, Reply, RequestRow } from "../request-book/types.ts";
import { MAX_RAW_TEXT } from "../request-book/intake/adapter.ts";
import type { Button } from "./channel.ts";

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
  changesLater: "Changing a request here is not switched on yet. Nothing was changed.",
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

export type Built = { ok: true; input: Json } | { ok: false; why: "needs_tap" | "missing"; missing: string[] };

/**
 * The input of request_create, from a proposal's evidence and the owner's tap. A field that still needs a choice is never
 * saved; a pick chooses one reading of the first such field. A time is saved only where code read one; words with no exact
 * time are kept as the owner wrote them, with no time set.
 */
export function createInput(pack: Pack, evidence: Json, intakeId: string, pick?: number): Built {
  const input: Json = { kind: pack.defaultKind satisfies Kind, entry_method: "typed", intake_id: intakeId };
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
        if (typeof value === "string" && value.trim()) input.customer_name = words(value).slice(0, 200);
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
        const said = e.raw ? words(e.raw) : w?.text ? words(w.text) : null;
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

/** After Save: the request in one line. Undo comes with RB-F, so no button is offered that would not work yet. */
export function savedText(row: RequestRow, ctx: Ctx): Reply {
  return finish(savedReply(row, ctx).body);
}

/** "request 42": its whole state. "closed 42", "cancel 42", "post 42": the same, and that nothing was changed. */
export async function requestSummary(db: BookDb, location: string, actor: string, ref: Ref, ctx: Ctx): Promise<Reply> {
  const r = await db.get(location, actor, String(ref.number));
  const row = rowOf(r);
  if (!row) return refusalReply({ reason: String(r.reason ?? "not_found") });
  const s = summaryReply(row, ctx);
  return ref.word ? finish(`${s.body}\n${BOOK_SAY.changesLater}`) : s;
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
