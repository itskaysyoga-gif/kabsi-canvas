// Daily AI budget (K-100, R-21): each drafting job (a review reply or a post) takes one generation from the
// business's daily cap and the global daily cap before any model call. The organisation's entitlements come first
// (P0.4-06): no drafting without a plan or trial, and a trial stops at its 100 generations. The caps live in app_settings
// (ai_daily_cap_business, ai_daily_cap_global); the global cap alerts #kabsi-alerts once a day from the database.
import { admin } from "./kabsi.ts";
import type { Meter } from "./ai.ts";
import { costMicros } from "./ai/agents.ts";

export type AiBudgetScope = "business" | "global" | "trial" | "plan";
export class AiBudgetError extends Error {
  constructor(public scope: AiBudgetScope) {
    super(`ai_budget_${scope}`);
  }
}

// What the owner sees when drafting stops for the day.
export const AI_BUDGET_MESSAGE = {
  business: "Kabsi has written as many drafts as it can for this business today. New drafts start again tomorrow.",
  global: "Kabsi has paused new drafts for today. They start again tomorrow, and nothing you already have is lost.",
  // K-101: the trial's silent cap of 100 generations, then the owner is asked to subscribe or book a call.
  trial: "Your free trial has used the drafts it includes. Choose a plan or book a free setup call to keep new drafts coming.",
  plan: "New drafts start again when you choose a plan.",
};

export async function takeAiBudget(locationId: string) {
  const { data, error } = await admin().rpc("ai_budget_take", { p_location: locationId });
  if (error) throw error;
  if (data === "business" || data === "global" || data === "trial" || data === "plan") throw new AiBudgetError(data);
}

// Tokens used by the job, recorded after it ran: the daily total, and per agent and model with the cost (28.6, 25.8).
// Never fails the caller.
export async function recordAiUsage(locationId: string | null, meter: Meter) {
  if (!meter.input && !meter.output) return;
  try {
    if (locationId) await admin().rpc("ai_usage_add", { p_location: locationId, p_input: meter.input, p_output: meter.output });
    if (meter.agent) {
      for (const [model, u] of Object.entries(meter.byModel ?? {})) {
        await admin().rpc("ai_agent_usage_add", {
          p_location: locationId, p_agent: meter.agent, p_model: model, p_input: u.input, p_output: u.output,
          p_cache_read: u.cacheRead, p_cache_write: u.cacheWrite, p_cost_micros: costMicros(model, u),
        });
      }
    }
  } catch { /* usage counting must never break a draft */ }
}
