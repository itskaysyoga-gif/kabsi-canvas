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
  /** Set when Google's text and name were removed after 30 days (D257). */
  content_purged_at: string | null;
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
  // Profile health facts (D240: facts, no composite score)
  reviews90d: number;
  answered90d: number;
  lastPostAt: string | null;
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
  const since90 = new Date(Date.now() - 90 * DAY).toISOString();
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
    reviews90,
    answered90,
    lastPost,
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
      .select(
        "id, reviewer_name, star_rating, comment, state, urgency, review_created_at, content_purged_at",
      )
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
    supabase
      .from("reviews")
      .select("id", head)
      .eq("location_id", locationId)
      .gte("review_created_at", since90),
    supabase
      .from("reviews")
      .select("id", head)
      .eq("location_id", locationId)
      .gte("review_created_at", since90)
      .or("state.eq.posted,state.eq.handled_offline,existing_reply.not.is.null"),
    supabase
      .from("gbp_posts")
      .select("updated_at")
      .eq("location_id", locationId)
      .eq("state", "posted")
      .order("updated_at", { ascending: false })
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
    reviews90d: count(reviews90),
    answered90d: count(answered90),
    lastPostAt: (lastPost.data as { updated_at: string } | null)?.updated_at ?? null,
  };
}

export const PLAN_NAME: Record<string, string> = {
  pro_6m: "Kabsi Pro · 6 months",
  pro_12m: "Kabsi Pro · 12 months",
  partner: "Kabsi Pro · through your partner",
};

export function daysSince(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY));
}

export function daysUntil(iso: string | null) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DAY));
}

// "What Kabsi did": the owner's recent approved Google writes and Kabsi's own background work, newest
// first. Facts from the tables only; nothing is estimated.
export type ActivityKind =
  "reply" | "post" | "photo" | "hours" | "revert" | "drafts" | "check" | "report";
export type Activity = { key: string; kind: ActivityKind; text: string; at: string };

const FIELD_LABEL: Record<string, string> = {
  title: "business name",
  phone: "phone number",
  address: "address",
  website: "website",
  hours: "opening hours",
  categories: "main category",
};

export async function loadActivity(locationId: string): Promise<Activity[]> {
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const since7 = new Date(Date.now() - 7 * DAY).toISOString();
  const [pubs, drafts, loc, reports] = await Promise.all([
    supabase
      .from("publications")
      .select("id, target_type, status, payload, created_at")
      .eq("location_id", locationId)
      .in("status", ["live", "in_review", "sent"])
      .gte("created_at", since30)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("reply_drafts")
      .select("id, reviews!inner(location_id)", { count: "exact", head: true })
      .eq("reviews.location_id", locationId)
      .gte("created_at", since7),
    supabase.from("locations").select("shield_checked_at").eq("id", locationId).maybeSingle(),
    supabase
      .from("weekly_reports")
      .select("id, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (pubs.error) throw new Error(pubs.error.message);

  const out: Activity[] = [];
  for (const p of (pubs.data ?? []) as {
    id: string;
    target_type: string;
    status: string;
    payload: Record<string, unknown> | null;
    created_at: string;
  }[]) {
    const review = p.status === "in_review" ? " (Google is reviewing it)" : "";
    const text =
      p.target_type === "review_reply"
        ? "Posted a review reply you approved"
        : p.target_type === "local_post"
          ? "Posted your Google update"
          : p.target_type === "photo"
            ? "Added your photo to Google"
            : p.target_type === "special_hours"
              ? "Set your special hours on Google"
              : p.target_type === "listing_revert"
                ? `Put your ${FIELD_LABEL[String(p.payload?.["field"])] ?? "details"} back on Google`
                : null;
    if (!text) continue;
    const kind: ActivityKind =
      p.target_type === "review_reply"
        ? "reply"
        : p.target_type === "local_post"
          ? "post"
          : p.target_type === "photo"
            ? "photo"
            : p.target_type === "special_hours"
              ? "hours"
              : "revert";
    out.push({ key: p.id, kind, text: text + review, at: p.created_at });
  }
  const drafted = drafts.count ?? 0;
  if (drafted > 0)
    out.push({
      key: "drafts",
      kind: "drafts",
      text: `Drafted ${drafted} ${drafted === 1 ? "reply" : "replies"} for you this week`,
      at: new Date().toISOString(),
    });
  const checked = (loc.data as { shield_checked_at: string | null } | null)?.shield_checked_at;
  if (checked)
    out.push({ key: "check", kind: "check", text: "Checked your Google details", at: checked });
  const report = (reports.data ?? [])[0] as { id: string; created_at: string } | undefined;
  if (report)
    out.push({
      key: report.id,
      kind: "report",
      text: "Sent your weekly report",
      at: report.created_at,
    });
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 6);
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}
