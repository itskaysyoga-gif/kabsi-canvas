// The Growth agent's weekly read for one business (P0.8-09, K-143): once a week, if the business is on a plan with the
// checklist, read three numbers about its Google profile and keep them. The 5 minute detect_tasks job offers it every time
// and the database says whether it is due, so no new schedule is needed. Deps are passed in so a Deno test needs no network.
// Fix 3: `read` takes Kabsi's own business id and answers null when the business has no Google profile to read (no
// Google location name, concierge); it never sends Kabsi's id to Google. A failed read is recorded, and the database
// keeps the read from being due again for 24 hours (coach_read_due), so a broken read can never repeat every 5 minutes.
import type { CoachNumbers } from "./read.ts";

export type CoachRead = CoachNumbers & { source: "live" | "mock" };
export type CoachRefreshDeps = {
  /** public.coach_read_due */
  due(locationId: string): Promise<boolean>;
  /** The business's Google location name looked up, then the Google layer's coachRead (the mock for a demo). */
  read(locationId: string): Promise<CoachRead | null>;
  /** public.coach_profile_put */
  save(locationId: string, n: CoachRead): Promise<void>;
  /** public.coach_read_failed: not due again for 24 hours. */
  failed(locationId: string, error: string): Promise<void>;
};

/** Which Google location the Coach may read for a business row: null for no Google name or a concierge business (no
 *  call at all); demo for a test persona (is_demo or a locations/demo- name), which reads the mock (R-17). */
export function coachTarget(l: { google_location_id?: string | null; concierge?: boolean | null; is_demo?: boolean | null } | null):
  { name: string; demo: boolean } | null {
  const name = l?.google_location_id ?? null;
  if (!l || !name || l.concierge || name.startsWith("locations/concierge-")) return null;
  return { name, demo: l.is_demo === true || name.startsWith("locations/demo-") };
}

/** "read" when numbers were fetched and kept (the tasks should be looked at again), "skipped" otherwise. */
export async function refreshCoach(locationId: string, deps: CoachRefreshDeps): Promise<"read" | "skipped"> {
  if (!(await deps.due(locationId))) return "skipped";
  let n: CoachRead | null;
  try {
    n = await deps.read(locationId);
  } catch (e) {
    // The failure is kept first; if even that fails, the read's own error is still the one reported.
    await deps.failed(locationId, String(e).slice(0, 300)).catch(() => {});
    throw e;
  }
  if (!n) return "skipped";
  try {
    await deps.save(locationId, n);
  } catch (e) {
    // A read that cannot be kept counts as failed too, so it is not sent to Google again in 5 minutes.
    await deps.failed(locationId, String(e).slice(0, 300)).catch(() => {});
    throw e;
  }
  return "read";
}
