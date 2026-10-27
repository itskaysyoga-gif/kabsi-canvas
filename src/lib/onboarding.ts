// Data layer for /start and card activation. Every write is a membership-checked RPC or Edge
// Function (migrations 20260925060903 / places-search). The browser never writes tables directly.
import { anonHeaders, sessionFetch, supabase, supabaseUrl } from "@/lib/supabase";
import { callFunction } from "@/lib/api";
import { RESUME_CODE, type OnboardingStatus } from "@/lib/onboarding-flow";
import type { PlanKind } from "@/lib/plans";
import type { OwnerVariant, ScenarioId } from "@/lib/scenarios";

export type OnboardingStep = "business" | "access" | "knowledge" | "confirm" | "plan" | "done";
export type Location = {
  id: string;
  name: string;
  address: string | null;
  country: string | null;
  status: string;
  onboarding_step: OnboardingStep;
  consent_at: string | null;
  access_granted_at: string | null;
  /** Early access (D267): a person on the team does the Google steps by hand. */
  concierge?: boolean;
  concierge_first_post_at?: string | null;
  /** Set when Kabsi's Manager access stopped working (D250). */
  access_lost_at?: string | null;
  /** The owner disconnected Kabsi in Settings (K-41, P0.2-02); access_removed_at once Google no longer lists Kabsi. */
  disconnect_requested_at?: string | null;
  access_removed_at?: string | null;
  /** Demo workspace (P0.1-06): an invented business for recordings; every screen shows "Demo data". */
  is_demo?: boolean;
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
  "id, name, address, country, status, onboarding_step, consent_at, access_granted_at, access_lost_at, disconnect_requested_at, access_removed_at, concierge, concierge_first_post_at, is_demo, created_at";
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

export const startLocation = (place: PlaceResult) =>
  rpc<string>("start_location", {
    p_place_id: place.place_id,
    p_name: place.name,
    p_address: place.address,
    p_country: place.country ?? "",
    p_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

export const CONSENT_TEXT =
  "I authorise Kabsi to manage review replies and profile updates for this business on Google, and to publish only what I approve.";
export const saveConsent = (locationId: string) =>
  rpc<string>("save_consent", { p_location: locationId, p_text: CONSENT_TEXT });
export const setStep = (locationId: string, step: OnboardingStep) =>
  rpc<void>("set_onboarding_step", { p_location: locationId, p_step: step });
export const choosePlan = (locationId: string, kind: PlanKind) =>
  rpc<string>("choose_plan", { p_location: locationId, p_kind: kind });
export const activateCard = (code: string, locationId: string, label?: string) =>
  rpc<string>("activate_card", { p_code: code, p_location: locationId, p_label: label ?? null });

/** Google access as the database knows it (google_connections.access_state): the one source of the live status pill. */
export type AccessState =
  "none" | "pending" | "granted" | "error" | "lost" | "removing" | "removed";
export async function loadAccessState(locationId: string): Promise<AccessState> {
  const { data, error } = await supabase
    .from("google_connections")
    .select("access_state")
    .eq("location_id", locationId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return ((data as { access_state?: AccessState } | null)?.access_state ?? "none") as AccessState;
}

/** Before Gate A every Google call runs in mock mode and a person accepts the invitation by hand (K-93). */
export async function loadGoogleLive(): Promise<boolean> {
  const { data, error } = await supabase.rpc("google_mode");
  if (error) return false;
  return data === "live";
}

/** "Send these steps to my other device": one email to the signed-in person's own address (send_manager_steps). */
export const sendManagerSteps = (locationId: string, step: number) =>
  rpc<void>("send_manager_steps", { p_location: locationId, p_step: step });

/** The situation the owner reported while adding Kabsi (P0.4-04): the open one, or null. Read through RLS. */
export type ScenarioRow = {
  scenario: ScenarioId;
  variant: OwnerVariant | null;
  started_at: string;
  done_at: string | null;
};
export async function loadScenario(locationId: string): Promise<ScenarioRow | null> {
  const { data, error } = await supabase
    .from("onboarding_scenarios")
    .select("scenario, variant, started_at, done_at")
    .eq("location_id", locationId)
    .is("resolved_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as ScenarioRow | null) ?? null;
}
export const setScenario = (
  locationId: string,
  scenario: ScenarioId,
  variant?: OwnerVariant | null,
) =>
  rpc<void>("set_onboarding_scenario", {
    p_location: locationId,
    p_scenario: scenario,
    p_variant: variant ?? null,
  });
export const scenarioDone = (locationId: string) =>
  rpc<void>("scenario_done", { p_location: locationId });
export const clearScenario = (locationId: string) =>
  rpc<void>("clear_onboarding_scenario", { p_location: locationId });

// ── Onboarding in four stages (V4, master plan 30.16 section 3) ───────────────────────────────────────────────────────

/** The stages as the server knows them (members only; owners also get the resume code, made once). */
export const loadOnboardingStatus = (locationId: string) =>
  rpc<OnboardingStatus>("onboarding_status", { p_location: locationId });

/** Stage 2: the owner confirms the business and that they can manage its Google profile. */
export const confirmBusiness = (locationId: string) =>
  rpc<void>("confirm_business", { p_location: locationId });

/** Joins the free check the owner came from to the business (stage 1 to 2). False when the code is unknown or taken. */
export const claimFreeCheck = (locationId: string, code: string) =>
  rpc<boolean>("claim_free_check", { p_location: locationId, p_code: code });

/** What GET /api/resume answers: the business the link belongs to, its stage and the page for it. */
export type ResumeAnswer = {
  location_id: string;
  business: string;
  stage: "confirm" | "whatsapp" | "access" | "first_task" | "done";
  access: string;
  path: string;
};

/**
 * The resume link's next step, for the signed-in person. null when the code is not right or the business is not theirs
 * (the server says "not_found" for both, so a forwarded link shows a stranger nothing).
 */
export async function resumeStep(code: string): Promise<ResumeAnswer | null> {
  if (!RESUME_CODE.test(code)) return null;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await sessionFetch(
    `${supabaseUrl}/functions/v1/api/resume?code=${encodeURIComponent(code)}`,
    { headers: { ...anonHeaders, ...(token ? { authorization: `Bearer ${token}` } : {}) } },
  );
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`resume_${res.status}`);
  return (await res.json()) as ResumeAnswer;
}

/** Email 1: whether a setup email with the setup link really went to the signed-in person for this business. */
export async function setupLinkEmailed(locationId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("my_setup_link_emailed", { p_location: locationId });
  if (error) return false;
  return data === true;
}
