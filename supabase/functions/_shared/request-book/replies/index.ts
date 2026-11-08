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
const who = (row: Pick<RequestRow, "customer_name">) => row.customer_name ?? "No name";

/** One request on one line: number, who, what, when, status and, for an appointment, what is still missing. */
export function requestLine(row: RequestRow, ctx: ReplyContext, opts: { summaryMax?: number } = {}): string {
  const parts = [`#${row.number} ${who(row)}`, clip(row.summary, opts.summaryMax ?? 60)];
  const when = whenText(row, ctx);
  if (when) parts.push(when);
  parts.push(statusWord(ctx.pack, row));
  const c = confirmationShort(row, ctx.pack);
  if (c) parts.push(c);
  return parts.join(" · ");
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

/** A list of requests: the first 15, then how many more, and the note that it covers only what was entered in Kabsi. */
function listBody(rows: RequestRow[], more: number, ctx: ReplyContext): string {
  const shown = rows.slice(0, MAX_ROWS);
  const rest = more + (rows.length - shown.length);
  const kinds = [...new Set(shown.map((r) => r.kind))];
  const out: string[] = [];
  if (kinds.length <= 1) out.push(...shown.map((r) => requestLine(r, ctx)));
  else {
    const order = ctx.pack.kinds.filter((k) => kinds.includes(k)).concat(kinds.filter((k) => !ctx.pack.kinds.includes(k)));
    for (const k of order) {
      out.push(kindWord(ctx.pack, k, true));
      out.push(...shown.filter((r) => r.kind === k).map((r) => requestLine(r, ctx)));
    }
  }
  if (rest > 0) out.push(`and ${rest} more`);
  return out.join("\n");
}

/** "What is open", with the filter that was asked for. Plain text, no buttons. */
export function openListReply(rows: RequestRow[], more: number, ctx: ReplyContext, filter: { unconfirmed?: boolean; kind?: Kind } = {}): Reply {
  const total = rows.length + more;
  const plural = kindWord(ctx.pack, filter.kind ?? "appointment", true).toLowerCase();
  if (total === 0) {
    const none = filter.unconfirmed ? `No ${plural} are waiting for a confirmation.` : "Nothing is open.";
    return finish(`${none}\n${COVERS_NOTE}`);
  }
  const head = filter.unconfirmed
    ? `${total} ${total === 1 ? kindWord(ctx.pack, "appointment").toLowerCase() : plural} still ${total === 1 ? "needs" : "need"} a confirmation.`
    : `${total} open.`;
  return finish(`${head}\n${listBody(rows, more, ctx)}\n${COVERS_NOTE}`);
}

/** The answer to "find": none, one in full, or several to choose from. */
export function foundReply(rows: RequestRow[], more: number, ctx: ReplyContext): Reply {
  const total = rows.length + more;
  if (total === 0) return finish(`Nothing found in Kabsi for that.\n${COVERS_NOTE}`);
  if (total === 1 && rows[0]) return summaryReply(rows[0], ctx);
  return finish(`${total} found. Which one? Send its number.\n${listBody(rows, more, ctx)}\n${COVERS_NOTE}`);
}

export type ProposalView = {
  kind: Kind;
  /** The name the owner gave. Stated words only. */
  name: string | null;
  /** What it is for, in the owner's own words or the pack's service labels. */
  summary: string | null;
  norm: Pick<NormalizedMessage, "phone" | "when">;
};

/**
 * The proposal the owner saves. What was read is shown plainly, an unknown is left out, never filled in. When a time
 * or a number could be read two ways, each reading is a button and the tap saves that reading.
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
    readings = w.candidates.map((c) => (c.startsAt ? formatWhen(c.startsAt, ctx.timeZone, ctx.now) : c.date ? formatDay(c.date) : ""));
    parts.push(readings.join(" or "));
  }
  const head = `${kindWord(ctx.pack, p.kind)}: ${parts.length ? parts.join(" · ") : "nothing readable yet"}`;
  if (readings.length >= 2 && readings.length <= MAX_BUTTONS) {
    return finish(`${head}\nWhich time did you mean? Nothing is saved until you tap.`, readings);
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
  if (flags.includes("confirmations_cleared")) lines.push("The time changed, so both confirmations were cleared.");
  return finish([`${label(row, ctx.pack)}`, ...lines].join("\n"), ["Undo"]);
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
