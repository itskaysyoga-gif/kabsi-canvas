// Anthropic calls (SPEC D207). Model ids live in ../models.ts; the model, effort and token cap for each step of each agent
// live in agents.ts. This file only sends; what is sent, and what happens to the answer, is decided by the contract
// runner (contract.ts).
import { MODELS, shouldFallBack } from "../models.ts";
import { type AgentName, costMicros, takesEffort, type Usage } from "./agents.ts";

export { MODELS };

export class AnthropicError extends Error {
  constructor(public status: number, detail: string) {
    super(`anthropic ${status}: ${detail}`);
  }
}

function apiKey() {
  // The key was saved as "Anthropic_Api" in the dashboard; accept both names.
  const key = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("Anthropic_Api");
  if (!key) throw new Error("anthropic_not_configured");
  return key;
}

// Token counter for one job; the caller records it in ai_usage (K-100) and, per agent and model, in ai_agent_usage
// (master plan 28.6 and 25.8). Cache reads and writes are counted apart so the saving from prompt caching shows (26.1).
export type Meter = { input: number; output: number; agent?: AgentName; byModel?: Record<string, Usage> };
export const newMeter = (agent?: AgentName): Meter => ({ input: 0, output: 0, agent, byModel: {} });

export function meterAdd(meter: Meter, model: string, usage: Record<string, unknown> | undefined) {
  const u: Usage = {
    input: Number(usage?.input_tokens ?? 0), output: Number(usage?.output_tokens ?? 0),
    cacheRead: Number(usage?.cache_read_input_tokens ?? 0), cacheWrite: Number(usage?.cache_creation_input_tokens ?? 0),
  };
  meter.input += u.input + u.cacheRead + u.cacheWrite;
  meter.output += u.output;
  const m = (meter.byModel ??= {});
  const t = (m[model] ??= { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
  t.input += u.input; t.output += u.output; t.cacheRead += u.cacheRead; t.cacheWrite += u.cacheWrite;
}

/** Cost of everything on the meter, in millionths of a US dollar. */
export const meterCost = (meter: Meter) => Object.entries(meter.byModel ?? {}).reduce((s, [model, u]) => s + costMicros(model, u), 0);

/** A system prompt in parts. A part with `cache` is a prompt-caching breakpoint (K-120.4): the rules and a business's
 *  memory stay the same from draft to draft, so Anthropic reuses them instead of reading them again. */
export type SystemPart = { text: string; cache?: boolean };
export type System = string | SystemPart[];

/** Structured output (26.1): the answer must match this JSON schema; code still validates what comes back. */
export type JsonSchema = Record<string, unknown>;
export type CallOptions = { effort?: "low" | "medium" | "high"; schema?: JsonSchema };

export const systemBody = (system: System) =>
  typeof system === "string"
    ? system
    : system.map((p) => ({ type: "text", text: p.text, ...(p.cache ? { cache_control: { type: "ephemeral" } } : {}) }));

/** The request body, apart for the tests (prompt caching on every draft call, the facts block last, 26.1). */
export function requestBody(model: string, system: System, user: string, maxTokens: number, o: CallOptions = {}) {
  const output_config: Record<string, unknown> = {};
  if (o.effort && takesEffort(model)) output_config.effort = o.effort;
  if (o.schema) output_config.format = { type: "json_schema", schema: o.schema };
  return {
    model, max_tokens: maxTokens, system: systemBody(system), messages: [{ role: "user", content: user }],
    ...(Object.keys(output_config).length ? { output_config } : {}),
  };
}

type Fetch = typeof fetch;
let send: Fetch = (...a) => fetch(...a);
/** Tests only: replace the network. */
export const setFetch = (f: Fetch) => { send = f; };

// N-004: the model stopped at the token cap before writing anything (it spent the budget thinking). Asked once more
// with twice the room; a second empty answer is an error the caller handles, never an empty draft.
const RETRY_CAP = 8000;

export async function message(model: string, system: System, user: string, maxTokens: number, meter?: Meter, o: CallOptions = {}): Promise<string> {
  let cap = maxTokens;
  for (let attempt = 0; ; attempt++) {
    const res = await send("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(requestBody(model, system, user, cap, o)),
    });
    const data = await res.json();
    if (!res.ok) throw new AnthropicError(res.status, JSON.stringify(data).slice(0, 300));
    if (meter) meterAdd(meter, model, data.usage);
    const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
    if (text) return text;
    if (data.stop_reason === "max_tokens" && attempt === 0 && cap < RETRY_CAP) {
      cap = Math.min(cap * 2, RETRY_CAP);
      continue;
    }
    throw new Error(`anthropic empty reply (${model}, stop_reason=${data.stop_reason})`);
  }
}

// Drafting call: the configured draft model first, the fallback only if that model is unavailable (Q09).
// Returns the model that actually wrote the text so the draft row records the truth.
export async function draftMessage(system: System, user: string, maxTokens: number, meter?: Meter, o: CallOptions = {}): Promise<{ text: string; model: string }> {
  try {
    return { text: await message(MODELS.draft, system, user, maxTokens, meter, o), model: MODELS.draft };
  } catch (e) {
    if (!(e instanceof AnthropicError) || !shouldFallBack(e.status) || MODELS.fallback === MODELS.draft) throw e;
    console.log(JSON.stringify({ fn: "ai", ok: false, draft_model_failed: MODELS.draft, status: e.status, fallback: MODELS.fallback }));
    return { text: await message(MODELS.fallback, system, user, maxTokens, meter, o), model: MODELS.fallback };
  }
}

export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`model returned no JSON: ${text.slice(0, 120)}`);
  return JSON.parse(text.slice(start, end + 1)) as T;
}
