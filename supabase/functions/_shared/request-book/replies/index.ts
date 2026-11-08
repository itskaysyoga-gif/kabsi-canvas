// Every reply the request book sends, built by code from the record (RB-C2). A model never writes a reply and no reply
// is a template with a hole a model could fill. The rules, each tested:
//   - Never "booked", never "available": Kabsi records what the owner tells it, it is not a diary and checks no one's time.
//   - "Confirmed" only for a confirmation the record holds (staff and customer are separate facts).
//   - A list says it covers only what was entered in Kabsi, shows 15 rows and then how many more.
//   - Unconfirmed means an appointment missing either confirmation, and the line says which one is missing.
//   - A message with buttons stays under 1,024 characters, with at most 3 buttons of 20 characters.
//   - Words come from the pack. Plain English, no dashes, no exclamation marks (kabsi-copy).
import type { Pack } from "../packs/schema.ts";
import type { NormalizedMessage } from "../normalize/index.ts";
import type { Kind, Refusal, Reply, RequestRow } from "../types.ts";
import {
  BUTTON_BODY_MAX, BUTTON_TITLE_MAX, COVERS_NOTE, MAX_BUTTONS, MAX_ROWS, TEXT_BODY_MAX, clip, confirmationShort, confirmationText,
  fieldLabel, formatDay, formatWhen, kindWord, statusKeyWord, statusWord, whenText, type ReplyContext,
} from "./words.ts";

export { BUTTON_BODY_MAX, BUTTON_TITLE_MAX, COVERS_NOTE, MAX_BUTTONS, MAX_ROWS, TEXT_BODY_MAX };
export type { ReplyContext };

/** The last gate every reply passes: at most 3 buttons, short titles, and a body inside WhatsApp's limit for its kind. */
export function finish(body: string, buttons?: string[]): Reply {
  const max = buttons && buttons.length ? BUTTON_BODY_MAX : TEXT_BODY_MAX;
  const text = body.length <= max ? body : `${body.slice(0, max - 4).trimEnd()} ...`;
  if (!buttons || buttons.length === 0) return { body: text };
  return { body: text, buttons: buttons.slice(0, MAX_BUTTONS).map((b) => clip(b, BUTTON_TITLE_MAX)) };
}

const label = (row: Pick<RequestRow, "kind" | "number">, pack: Pack) => `${kindWord(pack, row.kind)} ${row.number}`;
const who = (row: Pick<RequestRow, "customer_name">) => clip(row.customer_name ?? "No name", 40);

/** One request on one line: number, who, what, when, status and, for an appointment, what is still missing. */
export function requestLine(row: RequestRow, ctx: ReplyContext, opts: { summaryMax?: number } = {}): string {
  const parts = [`#${row.number} ${who(row)}`, clip(row.summary, opts.summaryMax ?? 60)];
  const when = whenText(row, ctx);
  if (when) parts.push(when);
  parts.push(statusWord(ctx.pack, row));
  const c = confirmationShort(row, ctx.pack);
  if (c) parts.push(c);
  return parts.join(" \u00b7 ");
}

/** The whole state of one request, in one reply. */
export function summaryReply(row: RequestRow, ctx: ReplyContext): Reply {
  const lines = [`${label(row, ctx.pack)} for ${who(row)}`, `${clip(row.summary, 300)}`];
  const when = whenText(row, ctx);
  lines.push(when ? `When: ${when}` : "When: no time entered");
  lines.push(`Status: ${statusWord(ctx.pack, row)}`);
  const c = confirmationText(row, ctx.pack);
  if (c) lines.push(c);
  if (row.next_action) {
    const due = row.next_action_due_at ? ` by ${formatWhen(row.next_action_due_at, ctx.timeZone, ctx.now)}` : "";
    lines.push(`Next step: ${clip(row.next_action, 120)}${due}`);
  }
  lines.push(row.kind === "appointment" ? "This is a note in Kabsi. It is not entered in any other diary." : "This is what was entered in Kabsi.");
  return finish(lines.join("\n"));
}

/**
 * Lines that must fit one message: the head, then the rows, then the footer. Rows are dropped from the end, and counted
 * in "and N more", until it fits, so the footer (the note that a list covers only what was entered in Kabsi) is never
 * the part that is cut.
 */
function fit(head: string[], items: string[], foot: string[], max: number, alreadyMore: number, moreText: (n: number) => string): string {
  let shown = items.length;
  for (;;) {
    const more = alreadyMore + (items.length - shown);
    const body = [...head, ...items.slice(0, shown), ...(more > 0 ? [moreText(more)] : []), ...foot].join("\n");
    if (body.length <= max || shown <= 0) return body;
    shown--;
  }
}

/** The rows of a list, grouped by kind when there is more than one, as lines. */
function listLines(shown: RequestRow[], ctx: ReplyContext): string[] {
  const kinds = [...new Set(shown.map((r) => r.kind))];
  if (kinds.length <= 1) return shown.map((r) => requestLine(r, ctx));
  const order = ctx.pack.kinds.filter((k) => kinds.includes(k)).concat(kinds.filter((k) => !ctx.pack.kinds.includes(k)));
  return order.flatMap((k) => [kindWord(ctx.pack, k, true), ...shown.filter((r) => r.kind === k).map((r) => requestLine(r, ctx))]);
}

/** A list of requests: the first 15, then how many more, and the note that it covers only what was entered in Kabsi. */
function listReply(head: string, rows: RequestRow[], more: number, ctx: ReplyContext, foot: string[]): Reply {
  const shown = rows.slice(0, MAX_ROWS);
  const lines = listLines(shown, ctx);
  const body = fit([head], lines, foot, TEXT_BODY_MAX, more + (rows.length - shown.length), (n) => `and ${n} more`);
  return finish(body);
}

/** "What is open", with the filter that was asked for. Plain text, no buttons. */
export function openListReply(rows: RequestRow[], more: number, ctx: ReplyContext, filter: { unconfirmed?: boolean; kind?: Kind } = {}): Reply {
  const total = rows.length + more;
  const plural = kindWord(ctx.pack, filter.kind ?? "appointment", true).toLowerCase();
  if (total === 0) {
    const none = filter.unconfirmed ? `No ${plural} are waiting for a confirmation.` : "Nothing is open.";
    return finish(`${none}\n${COVERS_NOTE}`);
  }
  // The headline is only as strong as the rows: if any listed row holds both confirmations it is not claimed to be missing one.
  const allMissing = rows.every((r) => r.kind === "appointment" && !(r.staff_confirmed && r.customer_confirmed));
  const head = filter.unconfirmed && allMissing
    ? `${total} ${total === 1 ? kindWord(ctx.pack, "appointment").toLowerCase() : plural} still ${total === 1 ? "needs" : "need"} a confirmation.`
    : `${total} open.`;
  return listReply(head, rows, more, ctx, [COVERS_NOTE]);
}

/** The answer to "find": none, one in full, or several to choose from. */
export function foundReply(rows: RequestRow[], more: number, ctx: ReplyContext): Reply {
  const total = rows.length + more;
  if (total === 0) return finish(`Nothing found in Kabsi for that.\n${COVERS_NOTE}`);
  if (total === 1 && rows[0]) return summaryReply(rows[0], ctx);
  return listReply(`${total} found. Which one? Send its number.`, rows, more, ctx, [COVERS_NOTE]);
}

export type ProposalView = {
  kind: Kind;
  /** The name the owner gave. Stated words only. */
  name: string | null;
  /** What it is for, in the owner's own words or the pack's service labels. */
  summary: string | null;
  norm: Pick<NormalizedMessage, "phone" | "when">;
};

/** What one reading of a time is called on a button: the day and hour, or whichever part was written. */
const readingLabel = (c: { date: string | null; time: string | null; startsAt: string | null }, ctx: ReplyContext): string => {
  if (c.startsAt) return formatWhen(c.startsAt, ctx.timeZone, ctx.now);
  return [c.date ? formatDay(c.date) : "", c.time ?? ""].filter(Boolean).join(" ");
};

/**
 * The proposal the owner saves. What was read is shown plainly, an unknown is left out, never filled in. When a time
 * or a number could be read two or three ways, each reading is a button and the tap saves that reading. While anything
 * is still unresolved there is no Save: with more readings than buttons the owner is asked to say it again.
 */
export function proposalReply(p: ProposalView, ctx: ReplyContext): Reply {
  const parts: string[] = [];
  if (p.name) parts.push(p.name);
  const phone = p.norm.phone;
  if (phone.status === "ok") parts.push(phone.value);
  if (phone.status === "ambiguous") parts.push(phone.candidates.map((c) => c.value).join(" or "));
  if (p.summary) parts.push(clip(p.summary, 100));
  const w = p.norm.when;
  let readings: string[] = [];
  if (w.status === "ok") {
    if (w.startsAt) parts.push(formatWhen(w.startsAt, ctx.timeZone, ctx.now));
    else if (w.date) parts.push(`${formatDay(w.date)}, ${w.dayPart ? `${w.dayPart}, no exact time` : "no time"}`);
    else if (w.dayPart) parts.push(`${w.dayPart}, no exact time`);
  } else if (w.status === "ambiguous") {
    readings = w.candidates.map((c) => readingLabel(c, ctx)).filter(Boolean);
    parts.push(readings.join(" or "));
  }
  const head = `${kindWord(ctx.pack, p.kind)}: ${parts.length ? parts.join(" \u00b7 ") : "nothing readable yet"}`;
  if (w.status === "ambiguous") {
    if (readings.length === w.candidates.length && readings.length >= 2 && readings.length <= MAX_BUTTONS) {
      return finish(`${head}\nWhich time did you mean? Nothing is saved until you tap.`, readings);
    }
    return finish(`${head}\nThat time could mean several things. Say the day and the hour, for example Thursday 3pm. Nothing is saved yet.`, ["Change"]);
  }
  if (phone.status === "ambiguous") {
    const numbers = phone.candidates.map((c) => c.value);
    if (numbers.length >= 2 && numbers.length <= MAX_BUTTONS) return finish(`${head}\nWhich number did you mean? Nothing is saved until you tap.`, numbers);
    return finish(`${head}\nThere is more than one number. Send the one to use. Nothing is saved yet.`, ["Change"]);
  }
  return finish(`${head}\nNothing is saved until you tap Save.`, ["Save", "Change"]);
}

/** After Save. Undo stays offered for 10 minutes. */
export function savedReply(row: RequestRow, ctx: ReplyContext): Reply {
  return finish(`${label(row, ctx.pack)} saved.\n${requestLine(row, ctx, { summaryMax: 160 })}`, ["Undo"]);
}

const FLAG_NOTE: Record<string, string> = {
  arrival_not_recorded: "The step before was never recorded, and Kabsi has not added one.",
  attended_without_time: "No time was entered for it.",
  attended_before_time: "Its time had not come yet.",
  no_show_before_time: "Its time had not come yet.",
  reopened: "It was closed.",
};

/** After a status change that applied at once. */
export function statusChangedReply(row: RequestRow, ctx: ReplyContext, flags: string[] = []): Reply {
  const notes = flags.map((f) => FLAG_NOTE[f]).filter(Boolean);
  const body = [`${label(row, ctx.pack)} is now ${statusWord(ctx.pack, row)}.`, requestLine(row, ctx, { summaryMax: 160 }), ...notes].join("\n");
  return finish(body, ["Undo"]);
}

/** The question asked before a change that needs the owner's yes: a step was skipped, or the change ends the request. */
export function askFirstReply(
  row: RequestRow, ctx: ReplyContext,
  change: { to: string; outcome: string | null; flags: string[]; reopen?: boolean },
): Reply {
  const pack = ctx.pack;
  const name = label(row, pack);
  const target = statusKeyWord(pack, row.kind, change.outcome ?? change.to);
  const now = statusWord(pack, row);
  const lines: string[] = [];
  if (change.reopen) lines.push(`${name} is closed as ${now}.`, "Reopen it?");
  else if (change.flags.includes("arrival_not_recorded")) {
    lines.push(`${name} is still ${now}, and the step before ${target} was never recorded.`,
      change.to === "closed" ? `Close it as ${target} anyway?` : `Mark it ${target} anyway?`);
  } else if (change.flags.includes("attended_without_time") || change.flags.includes("attended_before_time")) {
    lines.push(`${name} has ${change.flags.includes("attended_without_time") ? "no time entered" : "a time that has not come yet"}.`, `Close it as ${target} anyway?`);
  } else if (change.flags.includes("no_show_before_time")) {
    lines.push(`${name} has ${row.starts_at ? "a time that has not come yet" : "no time entered"}.`, `Close it as ${target} anyway?`);
  } else lines.push(`This closes ${name} as ${target}.`, "Go ahead?");
  return finish(lines.join("\n"), ["Yes", "No"]);
}

/** After a confirmation was recorded or cleared. The words are written from the record the database now holds. */
export function confirmationReply(row: RequestRow, ctx: ReplyContext): Reply {
  const c = confirmationText(row, ctx.pack) ?? "";
  return finish(`${label(row, ctx.pack)} updated.\n${requestLine(row, ctx, { summaryMax: 120 })}\n${c}`.trimEnd(), ["Undo"]);
}

export type FieldChange = { field: string; before: unknown; after: unknown };

const shown = (field: string, v: unknown, ctx: ReplyContext): string => {
  if (v === null || v === undefined || v === "") return "nothing";
  if ((field === "starts_at" || field === "ends_at" || field === "next_action_due_at") && typeof v === "string") return formatWhen(v, ctx.timeZone, ctx.now) || "nothing";
  return clip(typeof v === "string" ? v : JSON.stringify(v), 80);
};

/** After a correction: each field with what it was and what it is now, and a note when the time change cleared the confirmations. */
export function correctedReply(row: RequestRow, changes: FieldChange[], ctx: ReplyContext, flags: string[] = []): Reply {
  const lines = changes.map((c) => `${fieldLabel(ctx.pack, c.field)} changed from ${shown(c.field, c.before, ctx)} to ${shown(c.field, c.after, ctx)}.`);
  // The note about the confirmations is part of the answer, so it is kept and the changes shrink to make room.
  const note = flags.includes("confirmations_cleared") ? ["The time changed, so both confirmations were cleared."] : [];
  const body = fit([label(row, ctx.pack)], lines, note, BUTTON_BODY_MAX, 0, (n) => `and ${n} more ${n === 1 ? "change" : "changes"}`);
  return finish(body, ["Undo"]);
}

/** After an enquiry became an appointment or a job: the enquiry stays on record and the new one holds no confirmation. */
export function convertedReply(enquiry: Pick<RequestRow, "kind" | "number">, created: RequestRow, ctx: ReplyContext): Reply {
  const body = [
    `${label(enquiry, ctx.pack)} became ${label(created, ctx.pack)} for ${who(created)}.`,
    "The enquiry stays on record.",
    requestLine(created, ctx, { summaryMax: 120 }),
    created.kind === "appointment" ? "No confirmation has been recorded yet." : "",
  ].filter(Boolean).join("\n");
  return finish(body, ["Undo"]);
}

/** After Undo. */
export function undoneReply(row: RequestRow, ctx: ReplyContext): Reply {
  return finish(`Undone. ${label(row, ctx.pack)} is back to ${statusWord(ctx.pack, row)}.`);
}

const REFUSALS: Record<string, string> = {
  disabled: "The request book is not switched on for your business.",
  not_member: "That phone is not linked to this business.",
  forbidden: "Only an owner or a manager can do that. Nothing was changed.",
  not_found: "I cannot find that request. Send its number again.",
  version_conflict: "That request changed while you were looking. Send it again and Kabsi will use the latest.",
  window_passed: "Undo is open for 10 minutes and that time has passed. Nothing was changed.",
  not_latest: "Something was changed after that, so it cannot be undone. Undo the latest change first.",
  already_undone: "That was already undone.",
  not_undoable: "An Undo cannot be undone. Make the change again instead.",
  no_change: "That is already how it is. Nothing was changed.",
  closed: "That request is closed. An owner or a manager can reopen it.",
  not_reopenable: "That request cannot be reopened.",
  not_allowed: "Kabsi cannot make that change. Nothing was changed.",
  not_appointment: "Only an appointment has confirmations.",
  not_enquiry: "Only an enquiry can become an appointment or a job.",
  time_required: "Enter a time first, then it can be confirmed.",
  customer_erased: "That customer's details were erased, so this cannot be changed.",
  real_data_refused: "This test business takes made up details only.",
  invalid_input: "I could not read that. Nothing was changed.",
  invalid_field: "One of those details is not valid. Nothing was changed.",
  unknown_field: "Kabsi cannot change that detail. Nothing was changed.",
  use_convert: "To turn an enquiry into an appointment, say so and Kabsi will do it.",
  outcome_required: "Say how it ended, then Kabsi will close it.",
  intake_unavailable: "That draft is no longer open. Send the details again.",
  duplicate_message: "Kabsi already has a draft for that message.",
  values_cleared: "Some details of that change were erased, so it cannot be undone. Nothing was changed.",
  undo_conflict: "Something changed since, so it cannot be undone. Nothing was changed.",
  key_reused: "That tap was already used for a different change. Nothing was changed.",
  invalid_key: "I could not read that. Nothing was changed.",
  customer_not_found: "I cannot find that customer. Send the name again.",
  customer_changed: "That customer's details changed. Send it again.",
};

/** Any refusal from the database or from policy, in words, with what to do next. Never shows a code, a name or a value. */
export function refusalReply(r: Pick<Refusal, "reason">): Reply {
  return finish(REFUSALS[r.reason] ?? "That did not go through. Nothing was changed.");
}

export const KNOWN_REFUSALS = Object.keys(REFUSALS);
