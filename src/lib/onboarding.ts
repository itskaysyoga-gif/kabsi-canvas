// Data layer for /start and card activation. Every write is a membership-checked RPC or Edge
// Function (migrations 20260925060903 / places-search). The browser never writes tables directly.
import { supabase } from "@/lib/supabase";
import { callFunction } from "@/lib/api";

export type OnboardingStep = "business" | "access" | "knowledge" | "plan" | "done";
export type KnowledgeCard = {
  signature?: string;
  /** Things the owner never wants said or promised in replies and posts (D257). */
  avoid?: string;
  tone?: "warm" | "formal" | "short";
  contact_phone?: string;
  hours_note?: string;
  mention?: string;
  staff_names?: string[];
  [key: string]: unknown;
};
export type Location = {
  id: string;
  name: string;
  address: string | null;
  country: string | null;
  status: string;
  onboarding_step: OnboardingStep;
  partner_id: string | null;
  consent_at: string | null;
  access_granted_at: string | null;
  /** Set when Kabsi's Manager access stopped working (D250). */
  access_lost_at?: string | null;
  knowledge_card: KnowledgeCard;
  created_at: string;
};
export type PlaceResult = {
  place_id: string;
  name: string;
  address: string;
  country: string | null;
};

const FRIENDLY: Record<string, string> = {
  already_on_kabsi:
    "This business is already on Kabsi. If it's yours, email hello@kabsi.co and we'll sort it out.",
  unknown_card: "We couldn't find that card code. Check the code printed under the QR.",
  card_in_use: "This card is already linked to another business.",
  card_disabled: "This card has been switched off. Email hello@kabsi.co.",
  location_has_no_place_id: "Pick your business on the map first.",
  not_configured: "Business search isn't switched on yet. Please try again later.",
  rate_limited: "Too many tries. Wait a few minutes and try again.",
  forbidden: "You don't have access to this business.",
};
export function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const code = Object.keys(FRIENDLY).find((key) => message.includes(key));
  return (code && FRIENDLY[code]) || "Something went wrong. Please try again.";
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

// The owner app works on one business at a time: the one picked in the header, else the newest. Only
// businesses the signed-in user is a member of count. Staff can read every business through RLS, but the
// owner app must never treat someone else's business as theirs (writes would be refused anyway).
const LOCATION_COLUMNS =
  "id, name, address, country, status, onboarding_step, partner_id, consent_at, access_granted_at, access_lost_at, knowledge_card, created_at";
const CHOSEN_KEY = "kabsi.location";

export async function myLocations(): Promise<Location[]> {
  const { data: session } = await supabase.auth.getSession();
  const uid = session.session?.user.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("locations")
    .select(`${LOCATION_COLUMNS}, location_members!inner(user_id)`)
    .eq("location_members.user_id", uid)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as (Location & { location_members?: unknown })[]).map(
    ({ location_members: _m, ...l }) => l as Location,
  );
}

export function chooseLocation(id: string) {
  try {
    window.localStorage.setItem(CHOSEN_KEY, id);
  } catch {
    /* private mode: fall back to the newest business */
  }
}

export async function myLatestLocation(): Promise<Location | null> {
  const list = await myLocations();
  let chosen: string | null = null;
  try {
    chosen = window.localStorage.getItem(CHOSEN_KEY);
  } catch {
    chosen = null;
  }
  return list.find((l) => l.id === chosen) ?? list[0] ?? null;
}

export async function searchPlaces(query: string) {
  const result = await callFunction<{ places: PlaceResult[] }>("places-search", { query });
  return result.places;
}

export const startLocation = (place: PlaceResult, partnerHandle?: string, inviteId?: string) =>
  rpc<string>("start_location", {
    p_place_id: place.place_id,
    p_name: place.name,
    p_address: place.address,
    p_country: place.country ?? "",
    p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    p_partner_handle: partnerHandle ?? null,
    p_invite: inviteId ?? null,
  });

export const CONSENT_TEXT =
  "I authorise Kabsi to manage review replies and profile updates for this business on Google, and to publish only what I approve.";
export const saveConsent = (locationId: string) =>
  rpc<string>("save_consent", { p_location: locationId, p_text: CONSENT_TEXT });
export const setStep = (locationId: string, step: OnboardingStep) =>
  rpc<void>("set_onboarding_step", { p_location: locationId, p_step: step });
export const saveKnowledge = (locationId: string, card: KnowledgeCard) =>
  rpc<void>("update_knowledge_card", { p_location: locationId, p_card: card });
export const choosePlan = (locationId: string, kind: "pro_6m" | "pro_12m" | "partner") =>
  rpc<string>("choose_plan", { p_location: locationId, p_kind: kind });
export const activateCard = (code: string, locationId: string, label?: string) =>
  rpc<string>("activate_card", { p_code: code, p_location: locationId, p_label: label ?? null });
