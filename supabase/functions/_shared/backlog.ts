// Day-one backlog (K-66, K-101, R-18, P0.3-10). When Kabsi first reads a business's reviews, the newest unanswered ones
// are drafted at once. A free trial gets the 10 most recent (the rest wait for a plan); a paid plan gets all of them once
// the live switch is on (app_settings.full_backlog, R-18: switched on with P0.7-04); until then every other plan keeps
// the earlier limit of 20 (D221). Pure rules first, then the two small reads they need.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const TRIAL_BACKLOG = 10;
export const EARLIER_BACKLOG = 20;

export type BacklogPolicy = { trial: boolean; fullBacklog: boolean };

/** How many unanswered reviews are drafted on the first read. */
export function backlogLimit(p: BacklogPolicy): number {
  if (p.trial) return TRIAL_BACKLOG;
  return p.fullBacklog ? Number.POSITIVE_INFINITY : EARLIER_BACKLOG;
}

/** The state of the nth unanswered review on the first read (1 is the newest): drafted now, or waiting. */
export function backlogState(position: number, limit: number): "new" | "archived" {
  return position <= limit ? "new" : "archived";
}

/** Reviews that waited for a plan are drafted once the business has one (only with the full backlog on). */
export const reopensOnPlan = (p: BacklogPolicy) => !p.trial && p.fullBacklog;

// deno-lint-ignore no-explicit-any
type Db = SupabaseClient<any, "public", any>;

export async function backlogPolicy(db: Db, locationId: string): Promise<BacklogPolicy> {
  const [plans, setting] = await Promise.all([
    db.from("plans").select("kind, ends_at").eq("location_id", locationId).eq("status", "active"),
    db.from("app_settings").select("value").eq("key", "full_backlog").maybeSingle(),
  ]);
  const live = ((plans.data ?? []) as { kind: string; ends_at: string | null }[])
    .filter((p) => !p.ends_at || Date.parse(p.ends_at) > Date.now());
  const trial = live.some((p) => p.kind === "trial") && !live.some((p) => p.kind !== "trial");
  return { trial, fullBacklog: (setting.data as { value: string } | null)?.value === "on" };
}
