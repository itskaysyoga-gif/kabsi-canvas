// Home dashboard data: one round of RLS reads for the signed-in owner's business. Facts only (D222):
// counts come straight from the tables, the rating from the daily public-rating snapshot.
import { supabase } from "@/lib/supabase";

const DAY = 86_400_000;

export type RecentReview = {
  id: string;
  reviewer_name: string | null;
  star_rating: number;
  comment: string | null;
  state: string;
  urgency: string | null;
  review_created_at: string | null;
};
export type ActivePlan = {
  kind: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
};
export type Dashboard = {
  waiting: number;
  urgent: number;
  recent: RecentReview[];
  newReviews7d: number;
  replied7d: number;
  rating: number | null;
  ratingCount: number | null;
  ratingChange: number | null;
  taps7d: number;
  taps30d: number;
  activeCards: number;
  openChanges: number;
  shieldWatching: boolean;
  postDrafts: number;
  photoDrafts: number;
  plan: ActivePlan | null;
  planPaidUntil: string | null;
  pendingClaim: boolean;
  latestReport: { week_of: string } | null;
};

const count = (r: { count: number | null; error: { message: string } | null }) => {
  if (r.error) throw new Error(r.error.message);
  return r.count ?? 0;
};

export async function waitingCount(locationId: string) {
  return count(
    await supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .in("state", ["drafted", "blocked"]),
  );
}

export async function loadDashboard(locationId: string): Promise<Dashboard> {
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const head = { count: "exact" as const, head: true };
  const [
    waiting,
    urgent,
    recent,
    new7,
    replied7,
    snaps,
    taps7,
    taps30,
    cards,
    changes,
    baseline,
    posts,
    photos,
    plans,
    claims,
    report,
  ] = await Promise.all([
    supabase
      .from("reviews")
      .select("id", head)
      .eq("location_id", locationId)
      .in("state", ["drafted", "blocked"]),
    supabase
      .from("reviews")
      .select("id", head)
      .eq("location_id", locationId)
      .in("state", ["drafted", "blocked"])
      .eq("urgency", "urgent"),
    supabase
      .from("reviews")
      .select("id, reviewer_name, star_rating, comment, state, urgency, review_created_at")
      .eq("location_id", locationId)
      .order("review_created_at", { ascending: false })
      .limit(3),
    supabase
      .from("reviews")
      .select("id", head)
      .eq("location_id", locationId)
      .gte("review_created_at", since7),
    supabase
      .from("reviews")
      .select("id", head)
      .eq("location_id", locationId)
      .gte("review_created_at", since7)
      .eq("state", "posted"),
    supabase
      .from("rating_snapshots")
      .select("taken_on, rating, review_count")
      .eq("location_id", locationId)
      .order("taken_on", { ascending: false })
      .limit(8),
    supabase
      .from("taps")
      .select("id", head)
      .eq("location_id", locationId)
      .eq("is_bot", false)
      .gte("created_at", since7),
    supabase
      .from("taps")
      .select("id", head)
      .eq("location_id", locationId)
      .eq("is_bot", false)
      .gte("created_at", since30),
    supabase
      .from("cards")
      .select("code", head)
      .eq("location_id", locationId)
      .eq("status", "active"),
    supabase
      .from("listing_changes")
      .select("id", head)
      .eq("location_id", locationId)
      .eq("state", "open"),
    supabase
      .from("listing_baselines")
      .select("location_id")
      .eq("location_id", locationId)
      .maybeSingle(),
    supabase
      .from("gbp_posts")
      .select("id", head)
      .eq("location_id", locationId)
      .eq("state", "draft"),
    supabase.from("photos").select("id", head).eq("location_id", locationId).eq("state", "draft"),
    supabase
      .from("plans")
      .select("kind, status, starts_at, ends_at")
      .eq("location_id", locationId)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("starts_at"),
    supabase
      .from("usdt_claims")
      .select("id", head)
      .eq("location_id", locationId)
      .eq("kind", "plan")
      .eq("status", "pending"),
    supabase
      .from("weekly_reports")
      .select("week_of")
      .eq("location_id", locationId)
      .order("week_of", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (recent.error) throw new Error(recent.error.message);

  // Rating: latest daily snapshot vs the one 7 days earlier (D233).
  const s = (snaps.data ?? []) as {
    taken_on: string;
    rating: number | null;
    review_count: number | null;
  }[];
  const latest = s[0] ?? null;
  const weekAgo = latest
    ? s.find((x) => Date.parse(latest.taken_on) - Date.parse(x.taken_on) >= 7 * DAY)
    : undefined;
  const ratingChange =
    latest?.rating != null && weekAgo?.rating != null
      ? Math.round((Number(latest.rating) - Number(weekAgo.rating)) * 10) / 10
      : null;

  // Plan: the one running now, and the last paid day across back-to-back renewals.
  const active = ((plans.data ?? []) as ActivePlan[]).filter((p) => p.ends_at);
  const now = Date.now();
  const current =
    active.find((p) => (p.starts_at ? Date.parse(p.starts_at) <= now : true)) ?? active[0] ?? null;
  const paidUntil = active.reduce<string | null>(
    (max, p) => (!max || Date.parse(p.ends_at!) > Date.parse(max) ? p.ends_at : max),
    null,
  );

  return {
    waiting: count(waiting),
    urgent: count(urgent),
    recent: (recent.data ?? []) as RecentReview[],
    newReviews7d: count(new7),
    replied7d: count(replied7),
    rating: latest?.rating != null ? Number(latest.rating) : null,
    ratingCount: latest?.review_count ?? null,
    ratingChange,
    taps7d: count(taps7),
    taps30d: count(taps30),
    activeCards: count(cards),
    openChanges: count(changes),
    shieldWatching: !!baseline.data,
    postDrafts: count(posts),
    photoDrafts: count(photos),
    plan: current,
    planPaidUntil: paidUntil,
    pendingClaim: count(claims) > 0,
    latestReport: (report.data as { week_of: string } | null) ?? null,
  };
}

export const PLAN_NAME: Record<string, string> = {
  pro_6m: "Kabsi Pro · 6 months",
  pro_12m: "Kabsi Pro · 12 months",
  partner: "Kabsi Pro · through your partner",
};

export function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DAY));
}
