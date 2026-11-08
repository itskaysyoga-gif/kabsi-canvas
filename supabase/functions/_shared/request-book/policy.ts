// Who may do what (RB-C2). The table of PR B's rules, in code, so a caller can know before it calls and the replies can
// say why not. The database is the authority: every rule here is checked again inside the request_* functions
// (supabase/migrations/20261108183317_request_book_functions.sql: private.rb_rule, request_set_status, request_correct,
// request_undo, and 20261108200837_request_book_reads.sql for proposals), and a test lists every combination.
// Pure: no database, network or clock; the time is passed in.
import { KINDS, OPEN_STATUSES, OUTCOMES, ROLES, type Kind, type Role } from "./types.ts";

/** How a change that is allowed is carried out. "ask_first" means nothing is written until the owner says yes. */
export type Approval = "none" | "undo_offered" | "ask_first";

export type Decision =
  | { allowed: true; approval: Approval; flags: string[] }
  | { allowed: false; reason: string };

const yes = (approval: Approval, flags: string[] = []): Decision => ({ allowed: true, approval, flags });
const no = (reason: string): Decision => ({ allowed: false, reason });

export const isManagerOrOwner = (role: Role) => role === "owner" || role === "manager";

/** How long Undo works, in minutes (request_undo). */
export const UNDO_WINDOW_MINUTES = 10;

// ---------------------------------------------------------------------------------------------------------------
// Status moves: one table for every kind (private.rb_rule). Statuses and outcomes are the database's own codes.
// ---------------------------------------------------------------------------------------------------------------

export type Move = { kind: Kind; from: string; to: string; outcome: string | null };

type Rule = { reason: string | null; needsAck: boolean; ownerOnly: boolean; flags: string[] };

/** private.rb_rule, line for line. `timePassed` is "starts_at is set and not in the future". */
export function moveRule(m: Move, timePassed: boolean, startsAtSet: boolean): Rule {
  const ok = (needsAck = false, ownerOnly = false, flags: string[] = []): Rule => ({ reason: null, needsAck, ownerOnly, flags });
  const bad = (reason: string): Rule => ({ reason, needsAck: false, ownerOnly: false, flags: [] });
  if (m.to === m.from) return bad("no_change");
  if (m.to === "closed") {
    if (m.outcome === null) return bad("outcome_required");
    if (m.outcome === "voided") return bad("not_allowed");
    if (m.outcome === "converted") return bad("use_convert");
    if (m.kind === "enquiry" && m.outcome === "lost") return ok(true, true);
    if (m.outcome === "cancelled" && (m.kind === "appointment" || m.kind === "job")) return ok(true, true);
    if (m.kind === "appointment" && m.outcome === "attended") {
      if (!startsAtSet) return ok(true, false, ["attended_without_time"]);
      if (!timePassed) return ok(true, false, ["attended_before_time"]);
      return ok();
    }
    if (m.outcome === "no_show" && (m.kind === "appointment" || (m.kind === "job" && m.from === "waiting"))) {
      return timePassed ? ok() : ok(true, false, ["no_show_before_time"]);
    }
    if (m.kind === "job" && m.outcome === "completed") {
      return m.from === "waiting" ? ok(true, false, ["arrival_not_recorded"]) : ok();
    }
    return bad("not_allowed");
  }
  if (m.outcome !== null) return bad("not_allowed");
  const key = `${m.kind}:${m.from}:${m.to}`;
  if (["enquiry:new:contacted", "job:waiting:active", "job:active:ready", "job:ready:active"].includes(key)) return ok();
  if (key === "job:waiting:ready") return ok(true, false, ["arrival_not_recorded"]);
  return bad("not_allowed");
}

/**
 * May this person make this status move, and how is it carried out? Combines the move table with the role rule.
 * A closed request is reopened by an owner or manager only, only to where it was (`reopenTo`), and always asks first.
 */
export function statusDecision(args: {
  role: Role; kind: Kind; from: string; to: string; outcome: string | null; startsAt: Date | null; now: Date;
  /** The status the request had before it was closed, from its timeline. Null when unknown. */
  reopenTo?: string | null;
  /** The outcome the request closed with, for reopening. Required when `from` is "closed"; left out, a reopening is refused. */
  closedOutcome?: string | null;
}): Decision {
  const { role, kind, from, to, outcome } = args;
  if (!ROLES.includes(role)) return no("not_member");
  if (from === "closed") {
    if (!isManagerOrOwner(role)) return no("forbidden");
    // How it closed must be known: a request closed as converted or voided is never reopened, and not knowing refuses.
    if (args.closedOutcome === undefined || args.closedOutcome === "converted" || args.closedOutcome === "voided") return no("not_reopenable");
    if (args.reopenTo == null || to !== args.reopenTo || outcome !== null) return no("not_allowed");
    return yes("ask_first", ["reopened"]);
  }
  const timePassed = args.startsAt !== null && args.startsAt.getTime() <= args.now.getTime();
  const r = moveRule({ kind, from, to, outcome }, timePassed, args.startsAt !== null);
  if (r.reason) return no(r.reason);
  if (r.ownerOnly && !isManagerOrOwner(role)) return no("forbidden");
  return yes(r.needsAck ? "ask_first" : "undo_offered", r.flags);
}

/** Every statuses a request of this kind can be in, open or closed, for a full enumeration. */
export const ALL_FROM: Record<Kind, readonly string[]> = {
  enquiry: [...OPEN_STATUSES.enquiry, "closed"],
  appointment: [...OPEN_STATUSES.appointment, "closed"],
  job: [...OPEN_STATUSES.job, "closed"],
};
/** Every target the status function can be asked for, open or "closed" with an outcome (null outcome for open). */
export const ALL_TO: Record<Kind, readonly { to: string; outcome: string | null }[]> = Object.fromEntries(
  KINDS.map((k) => [k, [
    ...OPEN_STATUSES[k].map((s) => ({ to: s, outcome: null })),
    ...OUTCOMES[k].map((o) => ({ to: "closed", outcome: o })),
    { to: "closed", outcome: null },
  ]]),
) as Record<Kind, { to: string; outcome: string | null }[]>;

// ---------------------------------------------------------------------------------------------------------------
// The other actions (request_create, request_set_confirmation, request_convert_enquiry, request_correct, request_undo,
// the proposal functions and the reads).
// ---------------------------------------------------------------------------------------------------------------

export const ACTIONS = [
  "capture", "proposal_revise", "proposal_discard", "find", "list_open", "summarize",
  "set_confirmation", "convert", "correct_core", "correct_follow_up", "undo",
] as const;
export type Action = (typeof ACTIONS)[number];

/** The fields request_correct accepts, and which of them staff may change (v_allowed and v_any_role). */
export const CORRECTABLE_FIELDS = [
  "summary", "requested_window_text", "starts_at", "ends_at", "next_action", "next_action_due_at",
  "follow_up_user_id", "origin_channel", "external_system", "external_id", "details", "customer_name",
] as const;
export const STAFF_CORRECTABLE_FIELDS = ["next_action", "next_action_due_at", "follow_up_user_id"] as const;

/** Who may take each action. Every role is a member of the business; a non-member is refused before this table. */
export const ROLE_TABLE: Record<Action, Record<Role, boolean>> = {
  capture: { owner: true, manager: true, staff: true },
  // A proposal's own writer, or an owner or manager (checked with `isProposer`).
  proposal_revise: { owner: true, manager: true, staff: false },
  proposal_discard: { owner: true, manager: true, staff: false },
  find: { owner: true, manager: true, staff: true },
  list_open: { owner: true, manager: true, staff: true },
  summarize: { owner: true, manager: true, staff: true },
  set_confirmation: { owner: true, manager: true, staff: true },
  convert: { owner: true, manager: true, staff: true },
  correct_core: { owner: true, manager: true, staff: false },
  correct_follow_up: { owner: true, manager: true, staff: true },
  // Owner or manager for anyone's change, staff only for their own (checked with `isOriginalActor`).
  undo: { owner: true, manager: true, staff: false },
};

/** Whether the action needs the owner's yes before anything is written, when it is allowed. */
export const ACTION_APPROVAL: Record<Action, Approval> = {
  capture: "none", // the proposal is the approval: nothing is saved until the owner taps Save
  proposal_revise: "none",
  proposal_discard: "none",
  find: "none",
  list_open: "none",
  summarize: "none",
  set_confirmation: "undo_offered",
  convert: "undo_offered",
  correct_core: "undo_offered",
  correct_follow_up: "undo_offered",
  undo: "none",
};

/** May this role take this action at all? Proposals and Undo have a second condition, passed in. */
export function actionDecision(role: Role, action: Action, opts: { isProposer?: boolean; isOriginalActor?: boolean } = {}): Decision {
  if (!ROLES.includes(role)) return no("not_member");
  if (ROLE_TABLE[action][role]) return yes(ACTION_APPROVAL[action]);
  if ((action === "proposal_revise" || action === "proposal_discard") && opts.isProposer) return yes(ACTION_APPROVAL[action]);
  if (action === "undo" && opts.isOriginalActor) return yes(ACTION_APPROVAL[action]);
  return no("forbidden");
}

/**
 * request_correct: the fields to change, by role, and the state of the request. An unknown field is refused whoever asks,
 * a closed request cannot be corrected, an erased customer's name cannot be changed, and a new time on an appointment
 * that holds a confirmation clears both (the flag the database records).
 */
export function correctDecision(
  role: Role, fields: readonly string[],
  state: { status?: string; kind?: Kind; hasConfirmation?: boolean; customerErased?: boolean } = {},
): Decision {
  if (!ROLES.includes(role)) return no("not_member");
  if (fields.length === 0) return no("invalid_input");
  const unknown = fields.find((f) => !(CORRECTABLE_FIELDS as readonly string[]).includes(f));
  if (unknown) return no("unknown_field");
  if (role === "staff" && fields.some((f) => !(STAFF_CORRECTABLE_FIELDS as readonly string[]).includes(f))) return no("forbidden");
  if (state.status === "closed") return no("closed");
  if (state.customerErased && fields.includes("customer_name")) return no("customer_erased");
  const clears = state.hasConfirmation === true && (fields.includes("starts_at") || fields.includes("ends_at"));
  return yes("undo_offered", clears ? ["confirmations_cleared"] : []);
}

/** request_undo: the person, how old the change is, and whether it is the latest one. An Undo cannot be undone. */
export function undoDecision(args: {
  role: Role; isOriginalActor: boolean; ageMinutes: number; isLatest: boolean; isUndo: boolean; alreadyUndone: boolean;
}): Decision {
  if (!ROLES.includes(args.role)) return no("not_member");
  if (!isManagerOrOwner(args.role) && !args.isOriginalActor) return no("forbidden");
  if (args.isUndo) return no("not_undoable");
  if (args.alreadyUndone) return no("already_undone");
  if (!args.isLatest) return no("not_latest");
  if (args.ageMinutes > UNDO_WINDOW_MINUTES) return no("window_passed");
  return yes("none");
}

/** request_set_confirmation: only an appointment, only while open, and only with a time set to confirm. */
export function confirmationDecision(args: {
  role: Role; kind: Kind; status: string; startsAt: Date | null; confirmed: boolean; alreadySo: boolean;
}): Decision {
  if (args.kind !== "appointment") return no("not_appointment");
  if (args.status === "closed") return no("closed");
  if (args.confirmed && args.startsAt === null) return no("time_required");
  if (args.alreadySo) return no("no_change");
  return actionDecision(args.role, "set_confirmation");
}

/** request_convert_enquiry: only an open enquiry becomes an appointment or a job; the enquiry stays as it was. */
export function convertDecision(args: { role: Role; kind: Kind; status: string; to: Kind }): Decision {
  if (!ROLES.includes(args.role)) return no("not_member");
  if (args.to !== "appointment" && args.to !== "job") return no("invalid_field");
  if (args.kind !== "enquiry") return no("not_enquiry");
  if (args.status === "closed") return no("closed");
  return actionDecision(args.role, "convert");
}
