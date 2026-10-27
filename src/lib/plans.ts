import { anonHeaders, supabase, supabaseUrl } from "@/lib/supabase";

// Plan kinds (Q05, D281; K-124, K-126). Card payments through Creem arrive with P0.4-07; until then nothing can be
// bought here, so plan_summary offers no paid kind and choose_plan takes only the trial intent. No plan is stored as
// "Free": a business with no trial or plan simply has none, and its review link and QR code keep working.
export type PaidKind = "pro_monthly" | "pro_yearly" | "pro_6m";
/** What choose_plan accepts until card payments open: the trial intent. */
export type PlanKind = "trial";
export type Tier = "none" | "trial" | "pro" | "essentials" | "paused" | "free" | "early_access";

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
  /** Session 10 (10.2.13): the paid buttons work once plans open, and before that only for Kabsi's test accounts. */
  checkout_open?: boolean;
  entitlements?: {
    state: string;
    plan: "essentials" | "pro" | null;
    billing: Billing | null;
    ends_at: string | null;
  } | null;
};

/** The owner's Creem subscription as entitlements reports it (master plan 10.2.9). */
export type Billing = {
  state: "incomplete" | "active" | "past_due" | "paused" | "cancelled" | "expired";
  plan: "essentials" | "pro";
  period: "month" | "year" | null;
  units: number;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  payment_failed: boolean;
  grace_ends_at: string | null;
  data_kept_until: string | null;
};

export type BillingOp =
  "checkout" | "portal" | "cancel" | "keep" | "upgrade" | "downgrade" | "add_location";
/** One owner action through billing-creem (the Plan screen; WhatsApp runs the same code on the server). */
export async function billingAction(
  op: BillingOp,
  locationId: string,
  extra: { plan?: "essentials" | "pro"; period?: "month" | "year" } = {},
): Promise<{
  url?: string;
  ends_at?: string | null;
  units?: number;
  effective?: "now" | "renewal";
}> {
  const { data, error } = await supabase.functions.invoke("billing-creem/owner", {
    body: { op, location_id: locationId, ...extra },
  });
  if (error) {
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new Error(
      (body as { message?: string } | null)?.message ?? "Something went wrong. Please try again.",
    );
  }
  return data as {
    url?: string;
    ends_at?: string | null;
    units?: number;
    effective?: "now" | "renewal";
  };
}

/** Lines of docs/COPY.md sections 19 and 3, and the closed-button label of master plan 10.2.13. */
export const PLAN_COPY = {
  title: "Your plan",
  chooseEssentials: "Choose Essentials",
  choosePro: "Choose Pro",
  creem: "Payments are processed by Creem, our merchant of record.",
  monthly: "Monthly",
  yearly: "Yearly, 2 months free",
  openSoon: "Plans open soon",
} as const;
export const PAID_NAMES: Record<string, string> = {
  essentials_month: "Kabsi Essentials, monthly",
  essentials_year: "Kabsi Essentials, yearly",
  pro_month: "Kabsi Pro, monthly",
  pro_year: "Kabsi Pro, yearly",
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

/** Founding places left (master plan 10.2.4), live mode only; null when unknown. The pricing page hides the block at 0 or
 * null, so it never shows a number that is not real. */
export async function loadFoundingLeft(): Promise<number | null> {
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/billing-creem/founding`, {
      headers: anonHeaders,
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { left?: unknown };
    return typeof body.left === "number" ? body.left : null;
  } catch {
    return null;
  }
}

/** docs/COPY.md section 3. */
export const PRICING_COPY = {
  founding: (n: number) =>
    `Founding price: the first 30 paying businesses keep their price for as long as they stay. ${n} places left.`,
  underButtons:
    "Free for 14 days. No card. Cancel in WhatsApp. Your trial starts when Kabsi's access to your Google profile works.",
} as const;
