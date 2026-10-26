// AI Visibility providers (master plan 27.3 item 2, 27.10, 30.10). ChatGPT and Perplexity come through DataForSEO's
// LLM Responses live endpoints; Gemini comes from Google's API with the Google Maps grounding tool. Each client turns
// one prompt into one raw answer: the text, the sources it cited (domain and title only) and what the call cost.
// Credentials (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD, GEMINI_API_KEY) are Supabase secrets read by the caller and
// never logged. Docs and terms: .claude/skills/kabsi-data-providers (checked 26 Oct 2026).

import { generateContent } from "../../google/gemini/generate.ts";

export type AiProviderName = "chatgpt" | "perplexity" | "gemini";
export const PROVIDERS: readonly AiProviderName[] = ["chatgpt", "perplexity", "gemini"];

export type AiSource = { domain: string; title: string };
export type RawAnswer = { text: string; sources: AiSource[]; model: string; costMicros: number; sourceCount: number };
export type AskContext = { country: string | null; city: string | null; lat?: number | null; lng?: number | null };

export interface AiProvider {
  readonly name: AiProviderName;
  readonly live: boolean;
  ask(prompt: string, ctx: AskContext): Promise<RawAnswer>;
}

/** `retry` false: another try cannot help (a bad request, a missing key), so the job is not retried. */
export class AiProviderError extends Error {
  constructor(message: string, readonly retry: boolean) {
    super(message);
  }
}

// Models (DataForSEO /models lists the ones that take web search). Settings can override them without a deploy.
export const MODELS: Record<AiProviderName, string> = { chatgpt: "gpt-4.1-mini", perplexity: "sonar", gemini: "gemini-2.5-flash" };

/** What one call is expected to cost, in millionths of a US dollar, before it is made (the cap check). */
export const ESTIMATE_MICROS: Record<AiProviderName, number> = { chatgpt: 40_000, perplexity: 15_000, gemini: 40_000 };

const MAX_SOURCES = 10;
export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}
/** ChatGPT cites a Google Maps search link for every place it names: that is the place, not a source an owner can act on. */
const isMapsLink = (url: string) => {
  try {
    const u = new URL(url);
    return /(^|\.)google\.[a-z.]+$/.test(u.hostname) && u.pathname.startsWith("/maps");
  } catch {
    return false;
  }
};
const clean = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Sources cited, domain and title only (no URL path, no snippet), one per domain and title. */
export function sourcesFrom(annotations: { url?: string | null; title?: string | null }[] | null | undefined): AiSource[] {
  const seen = new Set<string>();
  const out: AiSource[] = [];
  for (const a of annotations ?? []) {
    const domain = a?.url && !isMapsLink(a.url) ? domainOf(a.url) : null;
    if (!domain) continue;
    const title = clean(a.title, 120);
    const k = `${domain}|${title.toLowerCase()}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push({ domain, title });
    if (out.length >= MAX_SOURCES) break;
  }
  return out;
}

// ─── DataForSEO LLM Responses (ChatGPT, Perplexity) ──────────────────────────────────────────────────────────────
type DfsSection = { type?: string; text?: string | null; annotations?: { url?: string | null; title?: string | null }[] | null };
type DfsItem = { type?: string; sections?: DfsSection[] | null };
type DfsTask = {
  status_code: number; status_message?: string; cost?: number;
  result?: { model_name?: string; money_spent?: number; items?: DfsItem[] | null }[] | null;
};
export type DfsResponse = { status_code: number; status_message?: string; cost?: number; tasks?: DfsTask[] | null };

const DFS = "https://api.dataforseo.com/v3/ai_optimization";
const PATH: Record<"chatgpt" | "perplexity", string> = { chatgpt: "chat_gpt", perplexity: "perplexity" };

/** DataForSEO status codes that mean "try later": rate limit, busy, timeout, internal error. */
const retryable = (code: number) => code === 40202 || code === 40209 || code === 50000 || (code >= 50000 && code < 60000) || code === 40501;

/** One live answer parsed: the message text of every item, every annotation, the cost of the call. */
export function parseDfs(json: DfsResponse, model: string): RawAnswer {
  const task = json.tasks?.[0];
  if (!task) throw new AiProviderError("dataforseo_no_task", true);
  if (task.status_code !== 20000) throw new AiProviderError(`dataforseo_task_${task.status_code}`, retryable(task.status_code));
  const result = task.result?.[0];
  const sections = (result?.items ?? []).filter((i) => (i.type ?? "message") === "message").flatMap((i) => i.sections ?? []);
  const text = sections.map((s) => s.text ?? "").join("\n").trim();
  if (!text) throw new AiProviderError("empty_answer", true);
  const costUsd = Number(task.cost ?? json.cost ?? 0) || 0;
  const sources = sourcesFrom(sections.flatMap((s) => s.annotations ?? []));
  return { text, sources, model: result?.model_name ?? model, costMicros: Math.round(costUsd * 1e6), sourceCount: sources.length };
}

export function dataForSeoAi(name: "chatgpt" | "perplexity", login: string, password: string, model = MODELS[name], fetcher: typeof fetch = fetch): AiProvider {
  const auth = "Basic " + btoa(`${login}:${password}`);
  return {
    name,
    live: true,
    async ask(prompt, ctx) {
      const body: Record<string, unknown> = { user_prompt: prompt.slice(0, 500), model_name: model, max_output_tokens: 1024 };
      if (name === "chatgpt") body.web_search = true;
      if (ctx.country) body.web_search_country_iso_code = ctx.country.toUpperCase();
      if (ctx.city && name === "chatgpt") body.web_search_city = ctx.city;
      const res = await fetcher(`${DFS}/${PATH[name]}/llm_responses/live`, {
        method: "POST", headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify([body]),
      });
      if (!res.ok) throw new AiProviderError(`dataforseo_http_${res.status}`, res.status === 429 || res.status >= 500);
      const json = (await res.json()) as DfsResponse;
      if (json.status_code !== 20000) throw new AiProviderError(`dataforseo_${json.status_code}`, retryable(json.status_code));
      return parseDfs(json, model);
    },
  };
}

// ─── Gemini with Google Maps grounding ───────────────────────────────────────────────────────────────────────────
type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: { maps?: { uri?: string; title?: string } }[] } }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  error?: { code?: number; message?: string };
};

// Google's price list, 26 Oct 2026: Gemini 2.5 Flash 0.30 in and 2.50 out per million tokens; 25 USD per 1000 grounded prompts.
export const GEMINI_PRICE = { inPerMillion: 0.30, outPerMillion: 2.5, groundedPrompt: 0.025 } as const;

/**
 * One Gemini answer parsed. Google's terms (Additional Terms, "Grounding with Google Maps") do not let Kabsi keep the Maps
 * result, so the sources are not kept: only how many places Gemini grounded on (a count) and what the call cost.
 */
export function parseGemini(json: GeminiResponse, model: string): RawAnswer {
  if (json.error) throw new AiProviderError(`gemini_${json.error.code ?? "error"}`, (json.error.code ?? 500) === 429 || (json.error.code ?? 500) >= 500);
  const cand = json.candidates?.[0];
  const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("\n").trim();
  if (!text) throw new AiProviderError("empty_answer", true);
  const chunks = (cand?.groundingMetadata?.groundingChunks ?? []).filter((c) => c.maps);
  const u = json.usageMetadata ?? {};
  const usd = ((u.promptTokenCount ?? 0) * GEMINI_PRICE.inPerMillion + ((u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0)) * GEMINI_PRICE.outPerMillion) / 1e6
    + (chunks.length ? GEMINI_PRICE.groundedPrompt : 0);
  return { text, sources: [], model, costMicros: Math.round(usd * 1e6), sourceCount: chunks.length };
}

export function geminiAi(apiKey: string, model = MODELS.gemini, fetcher: typeof fetch = fetch): AiProvider {
  return {
    name: "gemini",
    live: true,
    async ask(prompt, ctx) {
      const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt.slice(0, 500) }] }],
        tools: [{ googleMaps: {} }],
        generationConfig: { maxOutputTokens: 1024 },
      };
      if (ctx.lat != null && ctx.lng != null) body.toolConfig = { retrievalConfig: { latLng: { latitude: ctx.lat, longitude: ctx.lng } } };
      const { status, json } = await generateContent(apiKey, model, body, fetcher);
      if (status !== 200 && status !== 400) throw new AiProviderError(`gemini_http_${status}`, status === 429 || status >= 500);
      return parseGemini(json as GeminiResponse, model);
    },
  };
}
