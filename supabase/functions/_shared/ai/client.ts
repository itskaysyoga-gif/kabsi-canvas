// Anthropic calls (SPEC D207). Model ids live in ../models.ts: a Sonnet model drafts, Haiku classifies and checks.
// This file only sends; what is sent, and what happens to the answer, is decided by the contract runner (contract.ts).
import { MODELS, shouldFallBack } from "../models.ts";

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

// Token counter for one drafting job; the caller records it in ai_usage (K-100).
export type Meter = { input: number; output: number };
export const newMeter = (): Meter => ({ input: 0, output: 0 });

/** A system prompt in parts. A part with `cache` is a prompt-caching breakpoint (K-120.4): the rules and a business's
 *  memory stay the same from draft to draft, so Anthropic reuses them instead of reading them again. */
export type SystemPart = { text: string; cache?: boolean };
export type System = string | SystemPart[];

const systemBody = (system: System) =>
  typeof system === "string"
    ? system
    : system.map((p) => ({ type: "text", text: p.text, ...(p.cache ? { cache_control: { type: "ephemeral" } } : {}) }));

export async function message(model: string, system: System, user: string, maxTokens: number, meter?: Meter) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: maxTokens, system: systemBody(system), messages: [{ role: "user", content: user }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new AnthropicError(res.status, JSON.stringify(data).slice(0, 300));
  if (meter) { meter.input += Number(data.usage?.input_tokens ?? 0); meter.output += Number(data.usage?.output_tokens ?? 0); }
  const text = (data.content ?? []).filter((b: { type: string }) => b.type === "text").map((b: { text: string }) => b.text).join("").trim();
  if (!text) throw new Error(`anthropic empty reply (${model}, stop_reason=${data.stop_reason})`);
  return text;
}

// Drafting call: the configured draft model first, the fallback only if that model is unavailable (Q09).
// Returns the model that actually wrote the text so the draft row records the truth.
export async function draftMessage(system: System, user: string, maxTokens: number, meter?: Meter): Promise<{ text: string; model: string }> {
  try {
    return { text: await message(MODELS.draft, system, user, maxTokens, meter), model: MODELS.draft };
  } catch (e) {
    if (!(e instanceof AnthropicError) || !shouldFallBack(e.status) || MODELS.fallback === MODELS.draft) throw e;
    console.log(JSON.stringify({ fn: "ai", ok: false, draft_model_failed: MODELS.draft, status: e.status, fallback: MODELS.fallback }));
    return { text: await message(MODELS.fallback, system, user, maxTokens, meter), model: MODELS.fallback };
  }
}

export function parseJson<T>(text: string): T {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error(`model returned no JSON: ${text.slice(0, 120)}`);
  return JSON.parse(text.slice(start, end + 1)) as T;
}
