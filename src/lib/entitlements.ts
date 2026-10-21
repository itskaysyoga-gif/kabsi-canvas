// What the business may do now (P0.4-06; K-101, K-48): one answer from public.entitlements, the database function
// every feature checks. The browser only reads it to show the plan line; the server enforces it.
import { supabase } from "@/lib/supabase";

export type EntitlementState = "demo" | "concierge" | "paid" | "trial" | "grace" | "ended" | "none";

export type Entitlements = {
  organization_id: string;
  state: EntitlementState;
  watch: boolean;
  draft: boolean;
  publish: boolean;
  ends_at: string | null;
  trial: { started_at: string; ends_at: string; grace_ends_at: string; day: number } | null;
  caps: {
    profile_fixes: { limit: number; used: number };
    backlog_drafts: { limit: number };
    ai_generations: { limit: number; used: number };
  } | null;
  trial_used: boolean;
};

/** The entitlements of the business's organisation, or null when the caller may not read them. */
export async function loadEntitlements(locationId: string): Promise<Entitlements | null> {
  const { data, error } = await supabase.rpc("entitlements", {
    p_org: null,
    p_location: locationId,
  });
  if (error) return null;
  return data as Entitlements;
}
