// RB-C2: the whole policy table. Every kind, every status, every target, every outcome, every role and every state of
// the time, checked against a table written out by hand. The same rules are in the database (the test in
// tests/request-book-code.test.ts reads the migration and compares what it can).
import { assert, assertEquals } from "jsr:@std/assert@1";
import {
  ACTIONS, ACTION_APPROVAL, ALL_FROM, ALL_TO, CORRECTABLE_FIELDS, ROLE_TABLE, STAFF_CORRECTABLE_FIELDS, UNDO_WINDOW_MINUTES,
  actionDecision, confirmationDecision, convertDecision, correctDecision, moveRule, statusDecision, undoDecision, type Approval,
} from "./policy.ts";
import { KINDS, OPEN_STATUSES, OUTCOMES, ROLES, type Kind, type Role } from "./types.ts";

const NOW = new Date("2026-11-08T10:00:00Z");
const PAST = new Date("2026-11-08T08:00:00Z");
const FUTURE = new Date("2026-11-09T08:00:00Z");
type TimeState = "none" | "past" | "future";
const startsAt = (t: TimeState) => (t === "none" ? null : t === "past" ? PAST : FUTURE);

type Expect = { allowed: false } | { allowed: true; approval: Approval; flags: string[]; ownerOnly?: boolean };

/** The table by hand, from docs/kabsi-3/build-decisions.md and engineering-reference.md section 1. */
function expected(kind: Kind, from: string, to: string, outcome: string | null, t: TimeState): Expect {
  const no = { allowed: false } as const;
  const undo = (flags: string[] = []): Expect => ({ allowed: true, approval: "undo_offered", flags });
  const ask = (flags: string[] = [], ownerOnly = false): Expect => ({ allowed: true, approval: "ask_first", flags, ownerOnly });
  if (from === "closed") return no; // reopening has its own test
  const closing = to === "closed";
  if (!closing) {
    if (outcome !== null) return no;
    if (kind === "enquiry" && from === "new" && to === "contacted") return undo();
    if (kind === "job") {
      if (from === "waiting" && to === "active") return undo();
      if (from === "active" && to === "ready") return undo();
      if (from === "ready" && to === "active") return undo();
      if (from === "waiting" && to === "ready") return ask(["arrival_not_recorded"]);
    }
    return no;
  }
  if (outcome === null || outcome === "voided" || outcome === "converted") return no;
  if (kind === "enquiry") return outcome === "lost" ? ask([], true) : no;
  if (outcome === "cancelled") return ask([], true);
  if (kind === "appointment") {
    if (outcome === "attended") return t === "past" ? undo() : ask([t === "none" ? "attended_without_time" : "attended_before_time"]);
    if (outcome === "no_show") return t === "past" ? undo() : ask(["no_show_before_time"]);
    return no;
  }
  // job
  if (outcome === "completed") return from === "waiting" ? ask(["arrival_not_recorded"]) : undo();
  if (outcome === "no_show") {
    if (from !== "waiting") return no;
    return t === "past" ? undo() : ask(["no_show_before_time"]);
  }
  return no;
}

Deno.test("policy: every move of every kind, for every role and every state of the time", () => {
  let checked = 0;
  let allowedCount = 0;
  for (const kind of KINDS) {
    for (const from of ALL_FROM[kind]) {
      for (const { to, outcome } of ALL_TO[kind]) {
        for (const t of ["none", "past", "future"] as TimeState[]) {
          for (const role of ROLES) {
            const want = expected(kind, from, to, outcome, t);
            const got = statusDecision({ role, kind, from, to, outcome, startsAt: startsAt(t), now: NOW, reopenTo: null, closedOutcome: null });
            const id = `${kind} ${from}>${to}/${outcome} ${t} ${role}`;
            checked++;
            if (!want.allowed) {
              assertEquals(got.allowed, false, id);
              continue;
            }
            if (want.ownerOnly && role === "staff") {
              assertEquals(got, { allowed: false, reason: "forbidden" }, id);
              continue;
            }
            allowedCount++;
            assertEquals(got, { allowed: true, approval: want.approval, flags: want.flags }, id);
          }
        }
      }
    }
  }
  assert(checked > 500, `only ${checked} combinations were checked`);
  assert(allowedCount > 0);
});

Deno.test("policy: the reason a move is refused", () => {
  const r = (kind: Kind, from: string, to: string, outcome: string | null) =>
    statusDecision({ role: "owner", kind, from, to, outcome, startsAt: PAST, now: NOW });
  assertEquals(r("job", "waiting", "waiting", null), { allowed: false, reason: "no_change" });
  assertEquals(r("job", "waiting", "closed", null), { allowed: false, reason: "outcome_required" });
  assertEquals(r("job", "waiting", "closed", "voided"), { allowed: false, reason: "not_allowed" });
  assertEquals(r("enquiry", "new", "closed", "converted"), { allowed: false, reason: "use_convert" });
  assertEquals(r("job", "waiting", "active", "completed"), { allowed: false, reason: "not_allowed" });
  assertEquals(r("appointment", "requested", "requested", null), { allowed: false, reason: "no_change" });
  assertEquals(r("job", "ready", "waiting", null), { allowed: false, reason: "not_allowed" });
});

Deno.test("policy: staff cannot cancel or mark lost, and an owner or manager can, after asking", () => {
  for (const [kind, from, outcome] of [["job", "active", "cancelled"], ["appointment", "requested", "cancelled"], ["enquiry", "new", "lost"]] as const) {
    assertEquals(statusDecision({ role: "staff", kind, from, to: "closed", outcome, startsAt: null, now: NOW }), { allowed: false, reason: "forbidden" });
    for (const role of ["owner", "manager"] as Role[]) {
      assertEquals(statusDecision({ role, kind, from, to: "closed", outcome, startsAt: null, now: NOW }), { allowed: true, approval: "ask_first", flags: [] });
    }
  }
});

Deno.test("policy: a time that is exactly now counts as passed, as the database compares starts_at <= now()", () => {
  const d = statusDecision({ role: "staff", kind: "appointment", from: "requested", to: "closed", outcome: "attended", startsAt: NOW, now: NOW });
  assertEquals(d, { allowed: true, approval: "undo_offered", flags: [] });
});

Deno.test("policy: reopening is for an owner or manager, to where it was, never from converted or voided, and always asks first", () => {
  const base = { kind: "job" as Kind, from: "closed", to: "ready", outcome: null, startsAt: null, now: NOW, reopenTo: "ready", closedOutcome: "completed" };
  assertEquals(statusDecision({ ...base, role: "staff" }), { allowed: false, reason: "forbidden" });
  for (const role of ["owner", "manager"] as Role[]) {
    assertEquals(statusDecision({ ...base, role }), { allowed: true, approval: "ask_first", flags: ["reopened"] });
    assertEquals(statusDecision({ ...base, role, to: "active" }), { allowed: false, reason: "not_allowed" });
    assertEquals(statusDecision({ ...base, role, reopenTo: null }), { allowed: false, reason: "not_allowed" });
    assertEquals(statusDecision({ ...base, role, outcome: "completed" }), { allowed: false, reason: "not_allowed" });
    assertEquals(statusDecision({ ...base, role, closedOutcome: "voided" }), { allowed: false, reason: "not_reopenable" });
    assertEquals(statusDecision({ ...base, role, kind: "enquiry", closedOutcome: "converted" }), { allowed: false, reason: "not_reopenable" });
  }
});

Deno.test("policy: moveRule matches statusDecision for the part that does not depend on the role", () => {
  for (const kind of KINDS) {
    for (const from of OPEN_STATUSES[kind]) {
      for (const { to, outcome } of ALL_TO[kind]) {
        const rule = moveRule({ kind, from, to, outcome }, false, false);
        const d = statusDecision({ role: "owner", kind, from, to, outcome, startsAt: null, now: NOW });
        assertEquals(d.allowed, rule.reason === null, `${kind} ${from} ${to}`);
      }
    }
  }
});

Deno.test("policy: every status and outcome of every kind is known, and nothing else", () => {
  assertEquals(OPEN_STATUSES.job, ["waiting", "active", "ready"]);
  assertEquals(OUTCOMES.appointment, ["attended", "no_show", "cancelled", "voided"]);
  for (const k of KINDS) assert(ALL_TO[k].length === OPEN_STATUSES[k].length + OUTCOMES[k].length + 1);
});

Deno.test("policy: the table of actions by role", () => {
  const want: Record<string, [boolean, boolean, boolean]> = {
    capture: [true, true, true],
    proposal_revise: [true, true, false],
    proposal_discard: [true, true, false],
    find: [true, true, true],
    list_open: [true, true, true],
    summarize: [true, true, true],
    set_confirmation: [true, true, true],
    convert: [true, true, true],
    correct_core: [true, true, false],
    correct_follow_up: [true, true, true],
    undo: [true, true, false],
  };
  assertEquals([...ACTIONS].sort(), Object.keys(want).sort());
  for (const a of ACTIONS) {
    ROLES.forEach((role, i) => {
      assertEquals(ROLE_TABLE[a][role], want[a]![i], `${a} ${role}`);
      assertEquals(actionDecision(role, a).allowed, want[a]![i], `${a} ${role}`);
    });
  }
});

Deno.test("policy: staff may revise or discard only their own proposal, and undo only their own change", () => {
  for (const a of ["proposal_revise", "proposal_discard"] as const) {
    assertEquals(actionDecision("staff", a), { allowed: false, reason: "forbidden" });
    assertEquals(actionDecision("staff", a, { isProposer: false }), { allowed: false, reason: "forbidden" });
    assertEquals(actionDecision("staff", a, { isProposer: true }).allowed, true);
  }
  assertEquals(actionDecision("staff", "undo", { isOriginalActor: true }).allowed, true);
  assertEquals(actionDecision("staff", "undo").allowed, false);
  // The flag cannot open an action that has no second condition.
  assertEquals(actionDecision("staff", "correct_core", { isProposer: true, isOriginalActor: true }).allowed, false);
  assertEquals(actionDecision("nobody" as unknown as Role, "find"), { allowed: false, reason: "not_member" });
});

Deno.test("policy: which actions ask first, offer Undo, or need no approval", () => {
  assertEquals(ACTION_APPROVAL.capture, "none"); // the proposal and its Save are the approval
  for (const a of ["set_confirmation", "convert", "correct_core", "correct_follow_up"] as const) assertEquals(ACTION_APPROVAL[a], "undo_offered");
  for (const a of ["find", "list_open", "summarize", "undo", "proposal_revise", "proposal_discard"] as const) assertEquals(ACTION_APPROVAL[a], "none");
});

Deno.test("policy: correction fields by role, and an unknown field is refused for everyone", () => {
  for (const role of ["owner", "manager"] as Role[]) {
    for (const f of CORRECTABLE_FIELDS) assertEquals(correctDecision(role, [f]), { allowed: true, approval: "undo_offered", flags: [] }, `${role} ${f}`);
  }
  for (const f of CORRECTABLE_FIELDS) {
    const staffMay = (STAFF_CORRECTABLE_FIELDS as readonly string[]).includes(f);
    assertEquals(correctDecision("staff", [f]).allowed, staffMay, `staff ${f}`);
    if (!staffMay) assertEquals(correctDecision("staff", [f]), { allowed: false, reason: "forbidden" });
  }
  assertEquals(correctDecision("staff", ["next_action", "summary"]), { allowed: false, reason: "forbidden" });
  assertEquals(correctDecision("staff", ["next_action", "next_action_due_at"]).allowed, true);
  for (const role of ROLES) {
    assertEquals(correctDecision(role, ["status"]), { allowed: false, reason: "unknown_field" });
    assertEquals(correctDecision(role, ["staff_confirmed_at"]), { allowed: false, reason: "unknown_field" });
    assertEquals(correctDecision(role, ["kind"]), { allowed: false, reason: "unknown_field" });
    assertEquals(correctDecision(role, []), { allowed: false, reason: "invalid_input" });
  }
});

Deno.test("policy: undo needs the right person, a change that is the latest, not an undo, not already undone, and 10 minutes", () => {
  const ok = { role: "owner" as Role, isOriginalActor: false, ageMinutes: 3, isLatest: true, isUndo: false, alreadyUndone: false };
  assertEquals(undoDecision(ok), { allowed: true, approval: "none", flags: [] });
  assertEquals(UNDO_WINDOW_MINUTES, 10);
  assertEquals(undoDecision({ ...ok, ageMinutes: 10 }).allowed, true);
  assertEquals(undoDecision({ ...ok, ageMinutes: 10.01 }), { allowed: false, reason: "window_passed" });
  assertEquals(undoDecision({ ...ok, isLatest: false }), { allowed: false, reason: "not_latest" });
  assertEquals(undoDecision({ ...ok, isUndo: true }), { allowed: false, reason: "not_undoable" });
  assertEquals(undoDecision({ ...ok, alreadyUndone: true }), { allowed: false, reason: "already_undone" });
  assertEquals(undoDecision({ ...ok, role: "staff" }), { allowed: false, reason: "forbidden" });
  assertEquals(undoDecision({ ...ok, role: "staff", isOriginalActor: true }).allowed, true);
  assertEquals(undoDecision({ ...ok, role: "manager" }).allowed, true);
});

Deno.test("policy: confirmation is for an open appointment with a time, and either side may be recorded by any member", () => {
  const ok = { role: "staff" as Role, kind: "appointment" as Kind, status: "requested", startsAt: FUTURE, confirmed: true, alreadySo: false };
  for (const role of ROLES) assertEquals(confirmationDecision({ ...ok, role }), { allowed: true, approval: "undo_offered", flags: [] });
  assertEquals(confirmationDecision({ ...ok, kind: "job" }), { allowed: false, reason: "not_appointment" });
  assertEquals(confirmationDecision({ ...ok, kind: "enquiry" }), { allowed: false, reason: "not_appointment" });
  assertEquals(confirmationDecision({ ...ok, status: "closed" }), { allowed: false, reason: "closed" });
  assertEquals(confirmationDecision({ ...ok, startsAt: null }), { allowed: false, reason: "time_required" });
  // Clearing a confirmation needs no time.
  assertEquals(confirmationDecision({ ...ok, startsAt: null, confirmed: false }).allowed, true);
  assertEquals(confirmationDecision({ ...ok, alreadySo: true }), { allowed: false, reason: "no_change" });
});

Deno.test("policy: only an open enquiry converts, to an appointment or a job, and any member may do it", () => {
  const ok = { role: "staff" as Role, kind: "enquiry" as Kind, status: "new", to: "appointment" as Kind };
  for (const role of ROLES) for (const to of ["appointment", "job"] as Kind[]) assertEquals(convertDecision({ ...ok, role, to }).allowed, true);
  assertEquals(convertDecision({ ...ok, to: "enquiry" }), { allowed: false, reason: "invalid_field" });
  assertEquals(convertDecision({ ...ok, kind: "appointment" }), { allowed: false, reason: "not_enquiry" });
  assertEquals(convertDecision({ ...ok, kind: "job" }), { allowed: false, reason: "not_enquiry" });
  assertEquals(convertDecision({ ...ok, status: "closed" }), { allowed: false, reason: "closed" });
});

// ---- found by the independent review ---------------------------------------------------------------------------

Deno.test("policy: a role that is not owner, manager or staff is refused everywhere, as a non-member", () => {
  for (const role of ["admin", null, undefined, ""] as unknown as Role[]) {
    assertEquals(statusDecision({ role, kind: "job", from: "waiting", to: "active", outcome: null, startsAt: null, now: NOW }), { allowed: false, reason: "not_member" });
    assertEquals(correctDecision(role, ["next_action"]), { allowed: false, reason: "not_member" });
    assertEquals(undoDecision({ role, isOriginalActor: true, ageMinutes: 1, isLatest: true, isUndo: false, alreadyUndone: false }), { allowed: false, reason: "not_member" });
    assertEquals(confirmationDecision({ role, kind: "appointment", status: "requested", startsAt: FUTURE, confirmed: true, alreadySo: false }), { allowed: false, reason: "not_member" });
    assertEquals(convertDecision({ role, kind: "enquiry", status: "new", to: "appointment" }), { allowed: false, reason: "not_member" });
  }
});

Deno.test("policy: reopening needs to know how the request closed", () => {
  const base = { role: "owner" as Role, kind: "enquiry" as Kind, from: "closed", to: "new", outcome: null, startsAt: null, now: NOW, reopenTo: "new" };
  assertEquals(statusDecision(base), { allowed: false, reason: "not_reopenable" }); // closedOutcome left out
  assertEquals(statusDecision({ ...base, closedOutcome: "converted" }), { allowed: false, reason: "not_reopenable" });
  assertEquals(statusDecision({ ...base, closedOutcome: "lost" }), { allowed: true, approval: "ask_first", flags: ["reopened"] });
});

Deno.test("policy: a correction of a closed request, of an erased customer's name, and of a time that clears confirmations", () => {
  assertEquals(correctDecision("owner", ["summary"], { status: "closed" }), { allowed: false, reason: "closed" });
  assertEquals(correctDecision("owner", ["summary"], { status: "requested" }).allowed, true);
  assertEquals(correctDecision("owner", ["customer_name"], { customerErased: true }), { allowed: false, reason: "customer_erased" });
  assertEquals(correctDecision("owner", ["summary"], { customerErased: true }).allowed, true);
  assertEquals(correctDecision("owner", ["starts_at"], { kind: "appointment", hasConfirmation: true }), { allowed: true, approval: "undo_offered", flags: ["confirmations_cleared"] });
  assertEquals(correctDecision("manager", ["ends_at", "summary"], { hasConfirmation: true }), { allowed: true, approval: "undo_offered", flags: ["confirmations_cleared"] });
  assertEquals(correctDecision("owner", ["starts_at"], { hasConfirmation: false }), { allowed: true, approval: "undo_offered", flags: [] });
  assertEquals(correctDecision("owner", ["summary"], { hasConfirmation: true }), { allowed: true, approval: "undo_offered", flags: [] });
  // A closed request is refused before anything else a role could do to it, but a role limit still wins first.
  assertEquals(correctDecision("staff", ["summary"], { status: "closed" }), { allowed: false, reason: "forbidden" });
});
