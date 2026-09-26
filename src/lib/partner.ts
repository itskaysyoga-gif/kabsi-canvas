// Partner data layer (Phase 9). Reads go through RLS and the aggregate-only `partner_locations` RPC
// (partners never see review text, D210). Writes go through RPCs or the `partner` Edge Function,
// which sends the emails.
import { supabase, supabaseUrl } from "@/lib/supabase";

export const USDT_TRC20 = "TMbdkH9hY14RGgz9N99DCXu3LXGDZBDqMe";
export const BINANCE_PAY_ID = "User-2ad9b";

export type Partner = {
  id: string;
  name: string;
  handle: string | null;
  status: string;
  rate_usd: number | null;
  founding: boolean;
  price_locked_until: string | null;
};
export type PartnerLocation = {
  location_id: string;
  name: string;
  country: string | null;
  status: string;
  activated_at: string | null;
  taps_7d: number;
  taps_30d: number;
};
export type PartnerInvite = {
  id: string;
  business_email: string;
  business_name: string | null;
  accepted_at: string | null;
  created_at: string;
};
export type PartnerCard = {
  code: string;
  status: string;
  label: string | null;
  activated_at: string | null;
};
export type Claim = {
  id: string;
  invoice_id: string | null;
  network: "trc20" | "binance_pay";
  tx_ref: string;
  status: "pending" | "confirmed" | "rejected";
  note: string | null;
  created_at: string;
};
export type Invoice = {
  id: string;
  month: string;
  active_count: number;
  free_count: number;
  rate_usd: number;
  amount_usd: number;
  status: "unpaid" | "paid" | "waived";
  paid_at: string | null;
};
export type MonthSoFar = {
  active_count: number;
  free_count: number;
  rate_usd: number;
  amount_usd: number;
};

export const LOCATION_STATUS: Record<string, string> = {
  onboarding: "Setting up",
  access_pending: "Waiting for Google access",
  awaiting_payment: "Waiting for payment",
  waiting_list: "Waiting list",
  active: "Active",
  paused: "Paused",
  disabled: "Disabled",
};

const FRIENDLY: Record<string, string> = {
  forbidden: "You don't have access to this.",
  handle_taken: "Another partner already uses this handle.",
  bad_email: "Enter a valid email.",
  name_required: "Enter the partner's name.",
  already_decided: "This payment was already confirmed or rejected.",
  partners_handle_check: "Handle: 3–30 lowercase letters, numbers or dashes.",
};
export function partnerError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = Object.keys(FRIENDLY).find((key) => message.includes(key));
  return (code && FRIENDLY[code]) || message || "Something went wrong. Please try again.";
}

// The partner this account belongs to. Signing in with the email Kabsi has on file links the account.
export async function myPartner(): Promise<Partner | null> {
  const { data: id, error } = await supabase.rpc("claim_partner_membership");
  if (error || !id) return null;
  const { data, error: readError } = await supabase
    .from("partners")
    .select("id, name, handle, status, rate_usd, founding, price_locked_until")
    .eq("id", id as string)
    .maybeSingle();
  if (readError) throw new Error(readError.message);
  return (data as Partner | null) ?? null;
}

const firstOfMonth = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString().slice(0, 10);

export async function partnerWorkspace(partnerId: string) {
  const [locations, invites, cards, invoices, claims, soFar, mode] = await Promise.all([
    supabase.rpc("partner_locations", { p_partner: partnerId }),
    supabase
      .from("partner_invites")
      .select("id, business_email, business_name, accepted_at, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("cards")
      .select("code, status, label, activated_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("partner_invoices")
      .select("id, month, active_count, free_count, rate_usd, amount_usd, status, paid_at")
      .eq("partner_id", partnerId)
      .order("month", { ascending: false })
      .limit(24),
    supabase
      .from("usdt_claims")
      .select("id, invoice_id, network, tx_ref, status, note, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.rpc("partner_invoice_calc", { p_partner: partnerId, p_month: firstOfMonth() }),
    supabase.rpc("google_mode"),
  ]);
  for (const r of [locations, invites, cards, invoices, claims])
    if (r.error) throw new Error(r.error.message);
  return {
    locations: (locations.data ?? []) as PartnerLocation[],
    invites: (invites.data ?? []) as PartnerInvite[],
    cards: (cards.data ?? []) as PartnerCard[],
    invoices: (invoices.data ?? []) as Invoice[],
    claims: (claims.data ?? []) as Claim[],
    monthSoFar: ((soFar.data as MonthSoFar[] | null) ?? [])[0] ?? null,
    live: mode.data === "live",
  };
}

type ApiError = { error?: string; message?: string };
async function partnerCall<T>(route: "invite" | "claim" | "decide", body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Please log in again.");
  const res = await fetch(`${supabaseUrl}/functions/v1/partner/${route}`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & ApiError;
  if (!res.ok) throw new Error(json.message || "Something went wrong. Please try again.");
  return json;
}

export const inviteBusiness = (partnerId: string, email: string, name: string) =>
  partnerCall<{ ok: true; invite_id: string; link: string; emailed: boolean }>("invite", {
    partner_id: partnerId,
    email,
    name,
  });
export const submitClaim = (invoiceId: string, network: Claim["network"], txRef: string) =>
  partnerCall<{ ok: true; claim_id: string }>("claim", {
    invoice_id: invoiceId,
    network,
    tx_ref: txRef,
  });
export const decideClaim = (claimId: string, confirm: boolean, note?: string) =>
  partnerCall<{ ok: true; status: string }>("decide", { claim_id: claimId, confirm, note });

// ── staff
export type StaffPartner = Partner & {
  contact_email: string | null;
  instagram: string | null;
  country: string | null;
  created_at: string;
  partner_members: { user_id: string }[];
};
export type StaffClaim = Claim & {
  amount_usd: number | null;
  partners: { name: string } | null;
  partner_invoices: { month: string } | null;
};
export type Lead = {
  id: string;
  kind: string;
  name: string;
  email: string;
  instagram: string | null;
  country: string | null;
  volume: string | null;
  message: string | null;
  created_at: string;
};

export async function staffPartnerData() {
  const [partners, claims, leads] = await Promise.all([
    supabase
      .from("partners")
      .select(
        "id, name, handle, status, rate_usd, founding, price_locked_until, contact_email, instagram, country, created_at, partner_members(user_id)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("usdt_claims")
      .select(
        "id, invoice_id, network, tx_ref, status, note, created_at, amount_usd, partners(name), partner_invoices(month)",
      )
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("leads")
      .select("id, kind, name, email, instagram, country, volume, message, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  for (const r of [partners, claims, leads]) if (r.error) throw new Error(r.error.message);
  return {
    partners: (partners.data ?? []) as unknown as StaffPartner[],
    claims: (claims.data ?? []) as unknown as StaffClaim[],
    leads: (leads.data ?? []) as Lead[],
  };
}

export async function createPartner(input: {
  name: string;
  handle: string;
  email: string;
  instagram: string;
  country: string;
}) {
  const { data, error } = await supabase.rpc("staff_create_partner", {
    p_name: input.name,
    p_handle: input.handle,
    p_email: input.email,
    p_instagram: input.instagram || null,
    p_country: input.country || null,
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export const money = (n: number | string | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`;
export const monthName = (d: string) =>
  new Date(`${d.slice(0, 10)}T00:00:00Z`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
export const shortDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "—";
