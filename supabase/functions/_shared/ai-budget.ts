// Daily AI budget (K-100, R-21): each drafting job (a review reply or a post) takes one generation from the
// business's daily cap and the global daily cap before any model call. The caps live in app_settings
// (ai_daily_cap_business, ai_daily_cap_global); the global cap alerts #kabsi-alerts once a day from the database.
import { admin } from "./kabsi.ts";
import type { Meter } from "./ai.ts";

export class AiBudgetError extends Error {
  constructor(public scope: "business" | "global") {
    super(`ai_budget_${scope}`);
  }
}

// What the owner sees when drafting stops for the day.
export const AI_BUDGET_MESSAGE = {
  business: "Kabsi has written as many drafts as it can for this business today. New drafts start again tomorrow.",
  global: "Kabsi has paused new drafts for today. They start again tomorrow, and nothing you already have is lost.",
};

export async function takeAiBudget(locationId: string) {
  const { data, error } = await admin().rpc("ai_budget_take", { p_location: locationId });
  if (error) throw error;
  if (data === "business" || data === "global") throw new AiBudgetError(data);
}

// Tokens used by the job, recorded after it ran. Never fails the caller.
export async function recordAiUsage(locationId: string, meter: Meter) {
  if (!meter.input && !meter.output) return;
  try {
    await admin().rpc("ai_usage_add", { p_location: locationId, p_input: meter.input, p_output: meter.output });
  } catch { /* usage counting must never break a draft */ }
}
