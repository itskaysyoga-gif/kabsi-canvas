// Founding 25 and Kabsi Partners for the staff page (master plan 30.17 section 1, 29, 30.15 section 5). Every read and
// write goes through a staff-only database function (is_staff() is checked inside); the tables hold no browser grant.
import { supabase } from "@/lib/supabase";

export type FoundingTrade = "beauty_hair" | "food" | "health" | "other";
export const TRADE_LABEL: Record<FoundingTrade, string> = {
  beauty_hair: "Beauty and hair",
  food: "Food and drink",
  health: "Health",
  other: "Other",
};

export type FoundingPlaces = {
  total: number;
  left: number;
  open_to_any: boolean;
  by_trade: Record<FoundingTrade, { cap: number; taken: number }>;
};
export type FoundingApplication = {
  id: string;
  created_at: string;
  business_name: string;
  country: string;
  trade: FoundingTrade;
  business_kind: string;
  whatsapp: string;
  why_now: string;
  case_study: "named" | "anonymous";
  status: "new" | "accepted" | "waitlisted" | "declined";
  decided_at: string | null;
  decision_note: string | null;
  organization_id: string | null;
  linked_at: string | null;
};
export type FoundingMember = {
  application_id: string;
  business: string;
  trade: FoundingTrade;
  started_at: string | null;
  ends_at: string | null;
  day: number | null;
  approvals_7d: number;
  weeks_with_approval: number;
  weeks: number | null;
  paying: boolean;
};
export type FoundingOverview = {
  places: FoundingPlaces;
  applications: FoundingApplication[];
  members: FoundingMember[];
  kill_gate: {
    program_day: number | null;
    gate_day: number;
    gate_on: string | null;
    weekly_approvers: number;
    linked: number;
    needed: number;
    below: boolean;
  };
};

export type Partner = {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  city: string | null;
  kind: string;
  reach: string | null;
  pitch: string | null;
  uae_permit: string | null;
  status: "applied" | "approved" | "declined" | "paused" | "left";
  handle: string | null;
  code: string | null;
  founding_partner: boolean;
  payout_method: string | null;
  payout_last4: string | null;
  referrals: number;
  self_referrals: number;
  held_cents: number;
  cleared_cents: number;
  paid_cents: number;
  test_cents: number;
};
export type Payout = {
  id: string;
  partner_id: string;
  partner: string;
  run_on: string;
  currency: string;
  amount_cents: number;
  lines: number;
  state: "proposed" | "approved" | "sent";
  method: string | null;
  last4: string | null;
  reference: string | null;
  sent_at: string | null;
};
export type PartnersOverview = {
  places: { founding_total: number; founding_left: number };
  partners: Partner[];
  payouts: Payout[];
  next_run_on: string;
};

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw new Error(error.hint || error.message);
  return data as T;
}

export const loadFounding = () => rpc<FoundingOverview>("staff_founding_overview");
export const decideFounding = (
  id: string,
  status: "accepted" | "waitlisted" | "declined",
  note?: string,
) =>
  rpc<FoundingPlaces>("staff_founding_decide", {
    p_id: id,
    p_status: status,
    p_note: note ?? null,
  });
export const linkFounding = (id: string, location: string) =>
  rpc<{ linked: boolean; trial_started: boolean; ends_at: string | null }>("staff_founding_link", {
    p_id: id,
    p_location: location,
  });

export const loadPartners = () => rpc<PartnersOverview>("staff_partners_overview");
export const decidePartner = (
  id: string,
  status: "approved" | "declined" | "paused" | "left",
  handle?: string,
) =>
  rpc<{ handle: string | null; code: string | null }>("staff_partner_decide", {
    p_id: id,
    p_status: status,
    p_handle: handle ?? null,
    p_note: null,
  });
export const setPayoutDetails = (id: string, method: "usdt" | "usdc" | "paypal", detail: string) =>
  rpc<{ last4: string }>("staff_partner_payout_details", {
    p_id: id,
    p_method: method,
    p_detail: detail,
  });
export const runPayouts = (on: string) =>
  rpc<{ cleared: number; payouts: number }>("staff_payout_run", { p_run: on });
export const approvePayouts = (on: string) => rpc<number>("staff_payouts_approve", { p_run: on });
export const payoutSent = (id: string, reference: string) =>
  rpc<{ sent: boolean }>("staff_payout_sent", { p_payout: id, p_reference: reference });

export const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;
