import { supabase } from "@/lib/supabase";

// Plan kinds (Q05, D281; K-124, K-126). Card payments through Creem arrive with P0.4-07; until then nothing can be
// bought here, so plan_summary offers no paid kind and choose_plan takes only the trial intent. No plan is stored as
// "Free": a business with no trial or plan simply has none, and its review link and QR code keep working.
export type PaidKind = "pro_monthly" | "pro_yearly" | "pro_6m";
/** What choose_plan accepts until card payments open: the trial intent. */
export type PlanKind = "trial";
export type Tier = "none" | "trial" | "pro" | "free" | "early_access";

export type PlanWindow = { kind: string; starts_at: string; ends_at: string; last_day: string };
export type PlanSummary = {
  tier: Tier;
  /** true once the new offers are on (app_settings.plans_v2). */
  v2: boolean;
  plan: PlanWindow | null;
  queued: PlanWindow[];
  paid_waiting: boolean;
  trial_used: boolean;
  trial_days: number;
};

export async function loadPlanSummary(locationId: string): Promise<PlanSummary> {
  const { data, error } = await supabase.rpc("plan_summary", { p_location: locationId });
  if (error) throw new Error(error.message);
  return data as unknown as PlanSummary;
}

export const PLAN_NAMES: Record<string, string> = {
  trial: "Pro trial",
  pro_monthly: "Kabsi Pro · monthly",
  pro_yearly: "Kabsi Pro · yearly",
  pro_6m: "Kabsi Pro (earlier plan)",
};

/** The one line shown wherever a paid plan would be bought, until Creem (P0.4-07) opens card payments. */
export const CARD_PAYMENTS_COMING =
  "Card payments in US dollars are coming. Until they open there is nothing to pay.";
