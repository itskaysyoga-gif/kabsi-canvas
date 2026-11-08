// The six tools of the request book (RB-C2): capture, find, list_open, update, correct and summarize. Each one declares
// its contract: the input it accepts, who may use it, how risky it is, how its change is approved, where its
// idempotency key comes from and what it costs. The contract is data; the router that will use it (a later session)
// reads it and nothing here runs a tool. Unknown input fields are refused, as the database does.
import { INTAKE_SOURCES, KINDS, ORIGIN_CHANNELS, ROLES, type Role } from "../types.ts";

export type FieldType = "string" | "integer" | "boolean" | "uuid" | "iso_time" | "object" | "enum";

export type InputField = {
  type: FieldType;
  required?: boolean;
  /** For enum. */
  values?: readonly string[];
  /** For string: the longest allowed. */
  max?: number;
};

export type InputSchema = Record<string, InputField>;

/** How a change is approved: a proposal the owner saves, a change with Undo offered, or a question first. */
export type ApprovalPath = "none" | "proposal_and_save" | "undo_offered" | "ask_first_when_policy_says";

/** What a call costs: no model, one small model call, or the extraction call. */
export type CostClass = "none" | "small" | "extraction";

/** Where the key that makes a retry safe comes from. */
export type IdempotencySource = "none" | "provider_message_id" | "proposal_id" | "button_id";

export type Risk = "read" | "low" | "medium";

export type ToolName = "capture" | "find" | "list_open" | "update" | "correct" | "summarize";

export type ToolContract = {
  name: ToolName;
  version: number;
  /** The database functions this tool may call, and no others. */
  database: readonly string[];
  input: InputSchema;
  roles: readonly Role[];
  risk: Risk;
  approval: ApprovalPath;
  idempotency: IdempotencySource;
  cost: CostClass;
  /** When the cost can be "none" for the usual phrases. */
  noModelWhen?: string;
  /** Whether it writes a row. A read tool never does. */
  writes: boolean;
};

const ALL_ROLES: readonly Role[] = ROLES;
const id = (required = false): InputField => ({ type: "uuid", required });

export const TOOLS: Record<ToolName, ToolContract> = {
  capture: {
    name: "capture",
    version: 1,
    database: ["request_intake_propose", "request_intake_revise", "request_intake_discard", "customer_suggest", "request_create"],
    input: {
      source: { type: "enum", values: INTAKE_SOURCES, required: true },
      text: { type: "string", max: 8000 },
      provider_message_id: { type: "string", max: 200 },
      kind: { type: "enum", values: KINDS },
      origin_channel: { type: "enum", values: ORIGIN_CHANNELS },
      // Saving a proposal: the one the owner tapped Save on.
      intake_id: id(),
    },
    roles: ALL_ROLES,
    risk: "low",
    approval: "proposal_and_save",
    idempotency: "proposal_id",
    cost: "extraction",
    noModelWhen: "never: reading a free text message into a proposal is the one extraction call; saving a proposal calls no model",
    writes: true,
  },
  find: {
    name: "find",
    version: 1,
    database: ["request_find", "request_get", "customer_suggest"],
    input: {
      number: { type: "string", max: 10 },
      name: { type: "string", max: 200 },
      phone: { type: "string", max: 40 },
      text: { type: "string", max: 200 },
    },
    roles: ALL_ROLES,
    risk: "read",
    approval: "none",
    idempotency: "none",
    cost: "small",
    noModelWhen: "a request number needs no model; a name, phone or words are matched by the database",
    writes: false,
  },
  list_open: {
    name: "list_open",
    version: 1,
    database: ["request_list_open"],
    input: {
      kind: { type: "enum", values: KINDS },
      status: { type: "enum", values: ["new", "contacted", "requested", "waiting", "active", "ready"] },
      unconfirmed: { type: "boolean" },
      due: { type: "iso_time" },
    },
    roles: ALL_ROLES,
    risk: "read",
    approval: "none",
    idempotency: "none",
    cost: "none",
    writes: false,
  },
  update: {
    name: "update",
    version: 1,
    // Status, confirmation and conversion: one tool, chosen by `operation`.
    database: ["request_set_status", "request_set_confirmation", "request_convert_enquiry"],
    input: {
      operation: { type: "enum", values: ["status", "confirmation", "conversion"], required: true },
      request_id: id(),
      expected_version: { type: "integer" },
      to_status: { type: "string", max: 20 },
      outcome: { type: "string", max: 20 },
      party: { type: "enum", values: ["staff", "customer"] },
      confirmed: { type: "boolean" },
      to_kind: { type: "enum", values: ["appointment", "job"] },
      summary: { type: "string", max: 1000 },
      requested_window_text: { type: "string", max: 200 },
      starts_at: { type: "iso_time" },
      acknowledged: { type: "boolean" },
    },
    roles: ALL_ROLES,
    risk: "medium",
    approval: "ask_first_when_policy_says",
    idempotency: "provider_message_id",
    cost: "none",
    noModelWhen: "a request number and a status word need no model",
    writes: true,
  },
  correct: {
    name: "correct",
    version: 1,
    database: ["request_correct"],
    input: {
      request_id: id(true),
      expected_version: { type: "integer", required: true },
      summary: { type: "string", max: 1000 },
      requested_window_text: { type: "string", max: 200 },
      starts_at: { type: "iso_time" },
      ends_at: { type: "iso_time" },
      next_action: { type: "string", max: 300 },
      next_action_due_at: { type: "iso_time" },
      follow_up_user_id: id(),
      customer_name: { type: "string", max: 200 },
      details: { type: "object" },
    },
    roles: ALL_ROLES,
    risk: "medium",
    approval: "undo_offered",
    idempotency: "provider_message_id",
    cost: "small",
    noModelWhen: "none: working out which request and which field a correction means takes one small model call",
    writes: true,
  },
  summarize: {
    name: "summarize",
    version: 1,
    database: ["request_get", "request_find"],
    input: {
      request_id: id(),
      number: { type: "string", max: 10 },
    },
    roles: ALL_ROLES,
    risk: "read",
    approval: "none",
    idempotency: "none",
    cost: "small",
    noModelWhen: "a request number needs no model",
    writes: false,
  },
};

/**
 * The Undo button is not a seventh tool: it is the approval path of update and correct ("Undo offered"). It runs
 * request_undo for the activity the button carries, under the rules of undoDecision in policy.ts, and its retry key is
 * the button's own id.
 */
export const UNDO_BUTTON = { database: "request_undo", idempotency: "button_id" as IdempotencySource } as const;

export const TOOL_NAMES = Object.keys(TOOLS) as ToolName[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InputCheck = { ok: true } | { ok: false; reason: "invalid_input" | "unknown_field" | "invalid_field" | "missing_field"; field?: string };

/** Checks an input against a tool's schema. Refuses a field the schema does not name, like the database does. */
export function checkInput(tool: ToolName, input: unknown): InputCheck {
  const schema = TOOLS[tool].input;
  if (typeof input !== "object" || input === null || Array.isArray(input)) return { ok: false, reason: "invalid_input" };
  const obj = input as Record<string, unknown>;
  for (const key of Object.keys(obj)) if (!(key in schema)) return { ok: false, reason: "unknown_field", field: key };
  for (const [key, f] of Object.entries(schema)) {
    const v = obj[key];
    if (v === undefined || v === null) {
      if (f.required) return { ok: false, reason: "missing_field", field: key };
      continue;
    }
    const good =
      f.type === "string" ? typeof v === "string" && v.length > 0 && (f.max === undefined || v.length <= f.max)
      : f.type === "integer" ? Number.isInteger(v)
      : f.type === "boolean" ? typeof v === "boolean"
      : f.type === "uuid" ? typeof v === "string" && UUID.test(v)
      : f.type === "iso_time" ? typeof v === "string" && !Number.isNaN(Date.parse(v)) && /^\d{4}-\d{2}-\d{2}T/.test(v)
      : f.type === "object" ? typeof v === "object" && !Array.isArray(v)
      : typeof v === "string" && (f.values ?? []).includes(v);
    if (!good) return { ok: false, reason: "invalid_field", field: key };
  }
  return { ok: true };
}

/** Whether a role may use a tool at all. The finer rules (which move, which field) are in policy.ts. */
export const roleMayUse = (role: Role, tool: ToolName): boolean => TOOLS[tool].roles.includes(role);
