import { supabase, supabaseUrl, anonHeaders } from "@/lib/supabase";

// Plan kinds (Q05, D281). "Free" is never stored: it is a business with Google access and no active trial or plan.
export type PaidKind = "pro_monthly" | "pro_yearly" | "lebanon_yearly";
/** What choose_plan accepts: a paid kind, the trial intent, or "partner" for partner-covered businesses. */
export type PlanKind = PaidKind | "trial" | "partner";
export type Tier = "none" | "trial" | "pro" | "free" | "partner" | "early_access";

export type PlanWindow = { kind: string; starts_at: string; ends_at: string; last_day: string };
export type PlanSummary = {
  tier: Tier;
  /** true once the new offers are on (app_settings.plans_v2); until then the single $120 offer is shown. */
  v2: boolean;
  partner_covered: boolean;
  /** True when "Pay with USDT" (NOWPayments) may be shown to this business. */
  nowpayments?: boolean;
  plan: PlanWindow | null;
  queued: PlanWindow[];
  paid_waiting: boolean;
  unpaid_kind: string | null;
  trial_used: boolean;
  trial_days: number;
  offer: PaidKind[];
};

export async function loadPlanSummary(locationId: string): Promise<PlanSummary> {
  const { data, error } = await supabase.rpc("plan_summary", { p_location: locationId });
  if (error) throw new Error(error.message);
  return data as unknown as PlanSummary;
}

export type PlanOption = { key: PaidKind; price: number; title: string; note: string };

/** The plans a business can buy, in the order shown. Wording depends on whether the new offers are live. */
export function planOptions(s: Pick<PlanSummary, "offer" | "v2">): PlanOption[] {
  const all: Record<PaidKind, PlanOption> = {
    pro_monthly: {
      key: "pro_monthly",
      price: 19,
      title: "Kabsi Pro, monthly",
      note: "Cancel any time",
    },
    pro_yearly: {
      key: "pro_yearly",
      price: 190,
      title: "Kabsi Pro, yearly",
      note: "Two months free",
    },
    lebanon_yearly: s.v2
      ? {
          key: "lebanon_yearly",
          price: 120,
          title: "Lebanon bundle, 12 months",
          note: "Card and setup included",
        }
      : {
          key: "lebanon_yearly",
          price: 120,
          title: "Kabsi Pro, 12 months",
          note: "$10 a month · card included in Lebanon",
        },
  };
  return s.offer.map((k) => all[k]).filter(Boolean);
}

export const PLAN_NAMES: Record<string, string> = {
  trial: "Free trial",
  pro_monthly: "Kabsi Pro · monthly",
  pro_yearly: "Kabsi Pro · yearly",
  lebanon_yearly: "Kabsi Pro · 12 months",
  pro_6m: "Kabsi Pro (earlier plan)",
  partner: "Kabsi Pro · through your partner",
};

export type PayNetwork = "usdttrc20" | "usdtbsc";

/** Creates (or reuses) an invoice and returns the NOWPayments page to send the owner to. */
export async function createInvoice(
  locationId: string,
  item: PaidKind,
  payCurrency: PayNetwork,
): Promise<{ invoice_id: string; invoice_url: string }> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in again.");
  const res = await fetch(`${supabaseUrl}/functions/v1/billing/invoice`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...anonHeaders,
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ location_id: locationId, item, pay_currency: payCurrency }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    message?: string;
    invoice_id?: string;
    invoice_url?: string;
  };
  if (!res.ok || !json.invoice_url || !json.invoice_id)
    throw new Error(json.message || "Something went wrong. Please try again.");
  return { invoice_id: json.invoice_id, invoice_url: json.invoice_url };
}

export type InvoiceStatus = { status: string; last_payment_status: string | null };
export async function invoiceStatus(invoiceId: string): Promise<InvoiceStatus> {
  const { data, error } = await supabase.rpc("billing_invoice_status", { p_id: invoiceId });
  if (error) throw new Error(error.message);
  return data as unknown as InvoiceStatus;
}

export const METHOD_NAMES: Record<string, string> = {
  cash: "Cash",
  whish: "Whish",
  omt: "OMT",
  usdt: "USDT",
  nowpayments: "USDT (invoice)",
};
