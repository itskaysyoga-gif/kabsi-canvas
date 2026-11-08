// RB-C2: every tool declares its contract, and an input outside it is refused.
import { assert, assertEquals } from "jsr:@std/assert@1";
import { ACTIONS } from "../policy.ts";
import { ROLES } from "../types.ts";
import { TOOLS, TOOL_NAMES, UNDO_BUTTON, checkInput, roleMayUse, type ToolName } from "./registry.ts";

const ID = "11111111-1111-4111-8111-111111111111";

Deno.test("registry: exactly the six tools", () => {
  assertEquals([...TOOL_NAMES].sort(), ["capture", "correct", "find", "list_open", "summarize", "update"]);
});

Deno.test("registry: every tool declares schema, roles, risk, approval path, idempotency source and cost class", () => {
  for (const name of TOOL_NAMES) {
    const t = TOOLS[name];
    assertEquals(t.name, name);
    assert(Number.isInteger(t.version) && t.version >= 1, name);
    assert(Object.keys(t.input).length > 0, `${name} input`);
    assert(t.roles.length > 0 && t.roles.every((r) => (ROLES as readonly string[]).includes(r)), `${name} roles`);
    assert(["read", "low", "medium"].includes(t.risk), `${name} risk`);
    assert(["none", "proposal_and_save", "undo_offered", "ask_first_when_policy_says"].includes(t.approval), `${name} approval`);
    assert(["none", "provider_message_id", "proposal_id", "button_id"].includes(t.idempotency), `${name} idempotency`);
    assert(["none", "small", "extraction"].includes(t.cost), `${name} cost`);
    assert(t.database.length > 0, `${name} database`);
  }
});

Deno.test("registry: the contracts the design asks for", () => {
  assertEquals([TOOLS.capture.approval, TOOLS.capture.cost, TOOLS.capture.idempotency], ["proposal_and_save", "extraction", "proposal_id"]);
  assertEquals([TOOLS.update.approval, TOOLS.update.cost, TOOLS.update.idempotency], ["ask_first_when_policy_says", "none", "provider_message_id"]);
  assertEquals([TOOLS.correct.approval, TOOLS.correct.cost], ["undo_offered", "small"]);
  assertEquals(TOOLS.list_open.cost, "none");
  for (const n of ["find", "list_open", "summarize"] as ToolName[]) {
    assertEquals([TOOLS[n].risk, TOOLS[n].approval, TOOLS[n].writes, TOOLS[n].idempotency], ["read", "none", false, "none"], n);
  }
  for (const n of ["capture", "update", "correct"] as ToolName[]) assertEquals(TOOLS[n].writes, true, n);
  assertEquals(UNDO_BUTTON, { database: "request_undo", idempotency: "button_id" });
});

Deno.test("registry: update covers status, confirmation and conversion", () => {
  assertEquals(TOOLS.update.input["operation"]!.values, ["status", "confirmation", "conversion"]);
  assertEquals(TOOLS.update.database, ["request_set_status", "request_set_confirmation", "request_convert_enquiry"]);
});

Deno.test("registry: a read tool calls only reads, and no tool calls a function the database does not have", () => {
  const writes = new Set(["request_create", "request_set_status", "request_set_confirmation", "request_correct", "request_convert_enquiry", "request_undo",
    "request_intake_propose", "request_intake_revise", "request_intake_discard"]);
  const all = new Set([...writes, "request_get", "request_find", "request_list_open", "request_intake_get", "customer_suggest"]);
  for (const name of TOOL_NAMES) {
    for (const fn of TOOLS[name].database) {
      assert(all.has(fn), `${name} calls ${fn}`);
      if (!TOOLS[name].writes) assert(!writes.has(fn), `read tool ${name} calls the write function ${fn}`);
    }
  }
});

Deno.test("registry: every role may use every tool; the finer rules are the policy table's", () => {
  for (const r of ROLES) for (const n of TOOL_NAMES) assertEquals(roleMayUse(r, n), true);
  assert(ACTIONS.length >= TOOL_NAMES.length);
});

Deno.test("registry: a valid input passes for each tool", () => {
  assertEquals(checkInput("capture", { source: "typed", text: "Sarah highlights", provider_message_id: "wamid.1" }), { ok: true });
  assertEquals(checkInput("capture", { source: "typed", intake_id: ID }), { ok: true });
  assertEquals(checkInput("find", { name: "Sarah" }), { ok: true });
  assertEquals(checkInput("find", { number: "#42" }), { ok: true });
  assertEquals(checkInput("list_open", {}), { ok: true });
  assertEquals(checkInput("list_open", { kind: "appointment", unconfirmed: true, due: "2026-11-09T06:00:00.000Z" }), { ok: true });
  assertEquals(checkInput("update", { operation: "status", request_id: ID, expected_version: 2, to_status: "ready" }), { ok: true });
  assertEquals(checkInput("update", { operation: "confirmation", request_id: ID, expected_version: 1, party: "staff", confirmed: true }), { ok: true });
  assertEquals(checkInput("update", { operation: "conversion", request_id: ID, expected_version: 1, to_kind: "appointment" }), { ok: true });
  assertEquals(checkInput("correct", { request_id: ID, expected_version: 3, summary: "Trim" }), { ok: true });
  assertEquals(checkInput("summarize", { number: "42" }), { ok: true });
});

Deno.test("registry: an unknown field is refused, as the database refuses it", () => {
  for (const n of TOOL_NAMES) assertEquals(checkInput(n, { surprise: 1 }), { ok: false, reason: "unknown_field", field: "surprise" }, n);
  // No tool can set a confirmation or a status through another tool, or reach a field the database keeps to itself.
  assertEquals(checkInput("capture", { source: "typed", staff_confirmed_at: "2026-11-09T06:00:00.000Z" }).ok, false);
  assertEquals(checkInput("correct", { request_id: ID, expected_version: 1, status: "ready" }).ok, false);
  assertEquals(checkInput("correct", { request_id: ID, expected_version: 1, staff_confirmed: true }).ok, false);
  assertEquals(checkInput("capture", { source: "typed", location_id: ID }).ok, false); // the business comes from the sender, never the input
  assertEquals(checkInput("capture", { source: "typed", actor: ID }).ok, false);
});

Deno.test("registry: a missing, wrongly typed or out of range input is refused", () => {
  assertEquals(checkInput("capture", {}), { ok: false, reason: "missing_field", field: "source" });
  assertEquals(checkInput("capture", { source: "carrier_pigeon" }), { ok: false, reason: "invalid_field", field: "source" });
  assertEquals(checkInput("capture", { source: "typed", text: "x".repeat(8001) }), { ok: false, reason: "invalid_field", field: "text" });
  assertEquals(checkInput("capture", { source: "typed", text: "" }), { ok: false, reason: "invalid_field", field: "text" });
  assertEquals(checkInput("update", { operation: "status", request_id: "42" }), { ok: false, reason: "invalid_field", field: "request_id" });
  assertEquals(checkInput("update", { operation: "undo" }), { ok: false, reason: "invalid_field", field: "operation" });
  assertEquals(checkInput("correct", { request_id: ID }), { ok: false, reason: "missing_field", field: "expected_version" });
  assertEquals(checkInput("correct", { request_id: ID, expected_version: 1.5 }), { ok: false, reason: "invalid_field", field: "expected_version" });
  assertEquals(checkInput("list_open", { unconfirmed: "yes" }), { ok: false, reason: "invalid_field", field: "unconfirmed" });
  assertEquals(checkInput("list_open", { due: "tomorrow" }), { ok: false, reason: "invalid_field", field: "due" });
  assertEquals(checkInput("list_open", { status: "closed" }), { ok: false, reason: "invalid_field", field: "status" });
  assertEquals(checkInput("find", "Sarah"), { ok: false, reason: "invalid_input" });
  assertEquals(checkInput("find", null), { ok: false, reason: "invalid_input" });
  assertEquals(checkInput("find", [] as unknown), { ok: false, reason: "invalid_input" });
});

// ---- found by the independent review ---------------------------------------------------------------------------

Deno.test("registry: a name that exists on every object is still an unknown field", () => {
  for (const key of ["constructor", "toString", "hasOwnProperty", "__proto__", "valueOf"]) {
    const input = JSON.parse(`{"${key}": "x", "name": "ab"}`);
    assertEquals(checkInput("find", input), { ok: false, reason: "unknown_field", field: key }, key);
  }
});

Deno.test("registry: what each operation needs is enforced, as the database enforces it", () => {
  const miss = (field: string) => ({ ok: false as const, reason: "missing_field" as const, field });
  assertEquals(checkInput("update", { operation: "status", to_status: "contacted" }), miss("request_id"));
  assertEquals(checkInput("update", { operation: "status", request_id: ID, to_status: "contacted" }), miss("expected_version"));
  assertEquals(checkInput("update", { operation: "status", request_id: ID, expected_version: 1 }), miss("to_status"));
  assertEquals(checkInput("update", { operation: "status", request_id: ID, expected_version: 1, to_status: "closed" }), miss("outcome"));
  assertEquals(checkInput("update", { operation: "status", request_id: ID, expected_version: 1, to_status: "closed", outcome: "completed" }), { ok: true });
  assertEquals(checkInput("update", { operation: "conversion" }), miss("request_id"));
  assertEquals(checkInput("update", { operation: "confirmation", request_id: ID, expected_version: 1, party: "staff" }), miss("confirmed"));
  assertEquals(checkInput("correct", { request_id: ID, expected_version: 1 }), miss("summary"));
  assertEquals(checkInput("correct", { request_id: ID, expected_version: 1, details: { car: "x" } }), { ok: true });
  assertEquals(checkInput("capture", { source: "typed" }), miss("text"));
  assertEquals(checkInput("find", {}), miss("name"));
  assertEquals(checkInput("summarize", {}), miss("number"));
});

Deno.test("registry: a time must be a real date with an offset", () => {
  for (const bad of ["2026-02-31T10:00:00Z", "2026-11-09T10:00:00", "2026-11-09", "2026-13-01T10:00:00Z", "2026-11-09T25:00:00Z", "tomorrow"]) {
    assertEquals(checkInput("list_open", { due: bad }), { ok: false, reason: "invalid_field", field: "due" }, bad);
  }
  for (const good of ["2026-11-09T06:00:00Z", "2026-11-09T06:00:00.000Z", "2026-11-09T10:00:00+04:00", "2026-11-09T10:00+04:00"]) {
    assertEquals(checkInput("list_open", { due: good }), { ok: true }, good);
  }
});
