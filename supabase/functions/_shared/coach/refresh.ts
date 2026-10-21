// The Growth agent's weekly read for one business (P0.8-09, K-143): once a week, if the business is on a plan with the
// checklist, read three numbers about its Google profile and keep them. The 5 minute detect_tasks job offers it every time
// and the database says whether it is due, so no new schedule is needed. Deps are passed in so a Deno test needs no network.
import type { CoachNumbers } from "./read.ts";

export type CoachRefreshDeps = {
  /** public.coach_read_due */
  due(locationId: string): Promise<boolean>;
  /** The Google layer's coachRead (the mock until Gate A). */
  read(locationId: string): Promise<CoachNumbers & { source: "live" | "mock" }>;
  /** public.coach_profile_put */
  save(locationId: string, n: CoachNumbers & { source: "live" | "mock" }): Promise<void>;
};

/** "read" when numbers were fetched and kept (the tasks should be looked at again), "skipped" otherwise. */
export async function refreshCoach(locationId: string, deps: CoachRefreshDeps): Promise<"read" | "skipped"> {
  if (!(await deps.due(locationId))) return "skipped";
  const n = await deps.read(locationId);
  await deps.save(locationId, n);
  return "read";
}
