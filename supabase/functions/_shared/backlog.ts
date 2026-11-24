// Day-one backlog (K-66, K-101, R-18, P0.3-10; GATE-2). When Kabsi first reads a business's reviews, every unanswered review
// from the last 90 days is drafted at once and arrives as one numbered list to approve (launch checklist line 5). Older
// unanswered reviews wait ("archived"); they are never drafted on their own. The trial needs a card since OFFER-2 (30.53), so
// there is no trial cap any more. Pure rules first, then the small read they need.

export const FIRST_DAY_DAYS = 90;
const DAY = 86_400_000;

/** The state of an unanswered review on the first read: drafted now when it is from the last 90 days, else waiting. */
export function firstDayState(createTime: string | null | undefined, now: Date): "new" | "archived" {
  const t = Date.parse(createTime ?? "");
  if (!Number.isFinite(t)) return "archived";
  return now.getTime() - t <= FIRST_DAY_DAYS * DAY ? "new" : "archived";
}

/** The earliest review time a reopened backlog review may have (reviews that waited for a plan, from the last 90 days only). */
export const firstDaySince = (now: Date) => new Date(now.getTime() - FIRST_DAY_DAYS * DAY).toISOString();

export type BacklogPolicy = { trial: boolean; fullBacklog: boolean };

/** Reviews that waited for a plan (the old trial cap) are drafted once the business has one, with the full backlog on. */
export const reopensOnPlan = (p: BacklogPolicy) => !p.trial && p.fullBacklog;

/** Whether the first-day list should wait: a review of the first read is still being drafted, and the read is under an hour
 *  old. After an hour the list goes with what is ready, so one failed draft never holds it back. */
export function holdFirstDayList(stillDrafting: number, firstReadAt: string | null, now: Date): boolean {
  if (!stillDrafting) return false;
  const t = Date.parse(firstReadAt ?? "");
  return Number.isFinite(t) && now.getTime() - t < 3600_000;
}

// deno-lint-ignore no-explicit-any
type Db = SupabaseClient<any, "public", any>;

// The trial and its backlog cap come from the organisation's entitlements (P0.4-06), never from plan rows.
export async function backlogPolicy(db: Db, locationId: string): Promise<BacklogPolicy> {
  const [ent, setting] = await Promise.all([
    db.rpc("entitlements", { p_org: null, p_location: locationId }),
    db.from("app_settings").select("value").eq("key", "full_backlog").maybeSingle(),
  ]);
  if (ent.error) throw ent.error;
  const state = (ent.data as { state?: string } | null)?.state;
  return { trial: state === "trial" || state === "grace", fullBacklog: (setting.data as { value: string } | null)?.value === "on" };
}
