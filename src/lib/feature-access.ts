// What the plan allows (K-126), read from public.feature_access, which asks the entitlements (P0.4-06). Essentials and
// Pro features check this one answer; the server that does the work asks again, so hiding a button is never the
// only lock. "none" is grace, ended or no plan: only the review link and QR code run.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type FeatureAccess = {
  state: string;
  plan: "none" | "essentials" | "pro";
  essentials: boolean;
  pro: boolean;
};

export async function loadFeatureAccess(locationId: string): Promise<FeatureAccess | null> {
  const { data, error } = await supabase.rpc("feature_access", { p_location: locationId });
  if (error) return null;
  return data as FeatureAccess;
}

/** The business's access, or undefined while it loads. null means the caller could not read it (nothing unlocks). */
export function useFeatureAccess(locationId: string | undefined) {
  return useQuery({
    queryKey: ["feature-access", locationId],
    queryFn: () => loadFeatureAccess(locationId!),
    enabled: !!locationId,
    staleTime: 60_000,
  });
}
