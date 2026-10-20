// Home's data (K-06, K-09): the Google connection strip, the detail behind each card, the item's history and "What Kabsi
// did" from the audit log. Everything the owner can act on comes from list_tasks (src/lib/tasks.ts); nothing here counts
// or scores anything. Reads go through RLS; nothing here writes.
import { supabase } from "@/lib/supabase";
import { PLAN_NAMES } from "@/lib/plans";
import type { Task } from "@/lib/tasks";
import { fieldLabel } from "@/lib/profile-fields";
import { historyLine } from "@/lib/home-state";

const DAY = 86_400_000;

export type PlanState = { name: string; line: string; tone: "green" | "amber" | "red" | "grey" };
export type HomeFacts = {
  lastCheckAt: string | null;
  plan: PlanState;
  /** Visits to the review link in the last 30 days (link activity, never reviews). */
  linkOpens30d: number;
  hasReport: boolean;
};

const daysLeft = (iso: string | null) =>
  iso ? Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / DAY)) : null;

/** The few facts the strip and the footer lines need. One round of RLS reads. */
export async function loadHomeFacts(locationId: string): Promise<HomeFacts> {
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const [conn, plans, claims, taps, report] = await Promise.all([
    supabase
      .from("google_connections")
      .select("last_successful_sync_at")
      .eq("location_id", locationId)
      .maybeSingle(),
    supabase
      .from("plans")
      .select("kind, ends_at")
      .eq("location_id", locationId)
      .eq("status", "active")
      .gt("ends_at", new Date().toISOString())
      .order("ends_at", { ascending: false }),
    supabase
      .from("usdt_claims")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("kind", "plan")
      .eq("status", "pending"),
    supabase
      .from("taps")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .eq("is_bot", false)
      .gte("created_at", since30),
    supabase
      .from("weekly_reports")
      .select("week_of", { count: "exact", head: true })
      .eq("location_id", locationId),
  ]);
  // Rows are optional by role (a manager does not read plans), so a refusal is "no plan line", not an error.
  const rows = (plans.data ?? []) as { kind: string; ends_at: string | null }[];
  const top = rows[0] ?? null;
  const left = daysLeft(top?.ends_at ?? null);
  const name = top ? (PLAN_NAMES[top.kind] ?? "Kabsi Pro") : "No plan yet";
  const plan: PlanState = !top
    ? (claims.count ?? 0) > 0
      ? { name: "Payment sent", line: "We're confirming it", tone: "amber" }
      : { name: "No active plan", line: "Choose a plan", tone: "red" }
    : top.kind === "partner"
      ? { name, line: "Through your partner", tone: "green" }
      : top.kind === "trial"
        ? {
            name,
            line: left === null ? "" : `${left} days left`,
            tone: left !== null && left <= 3 ? "amber" : "green",
          }
        : {
            name,
            line: left === null ? "Active" : `${left} days left`,
            tone: left !== null && left <= 7 ? "amber" : "green",
          };
  return {
    lastCheckAt:
      (conn.data as { last_successful_sync_at: string | null } | null)?.last_successful_sync_at ??
      null,
    plan,
    linkOpens30d: taps.count ?? 0,
    hasReport: (report.count ?? 0) > 0,
  };
}

export type CardDetail = {
  /** Who and what: "New review, 4 stars, from Sarah". */
  eyebrow: string | null;
  /** The text of the review, short. */
  quote: string | null;
  /** What Kabsi prepared, exactly as it would go out. */
  prepared: string | null;
  /** The evidence in one or two plain lines ("Google shows 18:00. You approved 22:00."). */
  evidence: string[];
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}...` : s);

const stars = (n: number) => `${n} ${n === 1 ? "star" : "stars"}`;

type ValueJson = { display?: string } | null;

/**
 * The detail behind the cards that are shown: the review and its draft, the two values of a profile change, the post
 * text. At most three cards are on screen, so at most three small reads of each kind.
 */
export async function loadCardDetails(tasks: Task[]): Promise<Record<string, CardDetail>> {
  const out: Record<string, CardDetail> = {};
  const idOf = (t: Task, key: string) => {
    const v = t.evidence[key];
    return typeof v === "string" ? v : null;
  };
  const reviewIds = tasks
    .filter((t) => t.kind === "review_reply")
    .map((t) => idOf(t, "review_id"))
    .filter((x): x is string => !!x);
  const changeIds = tasks
    .filter((t) => t.kind === "profile_change")
    .map((t) => idOf(t, "profile_change_id"))
    .filter((x): x is string => !!x);
  const postIds = tasks
    .filter((t) => t.kind === "post")
    .map((t) => idOf(t, "post_id"))
    .filter((x): x is string => !!x);
  const [reviews, drafts, changes, posts] = await Promise.all([
    reviewIds.length
      ? supabase
          .from("reviews")
          .select("id, reviewer_name, star_rating, comment, content_purged_at")
          .in("id", reviewIds)
      : null,
    reviewIds.length
      ? supabase
          .from("reply_drafts")
          .select("review_id, body, version")
          .in("review_id", reviewIds)
          .order("version", { ascending: false })
      : null,
    changeIds.length
      ? supabase
          .from("profile_changes")
          .select("id, field, previous_value, previous_fact_id, google_value")
          .in("id", changeIds)
      : null,
    postIds.length ? supabase.from("gbp_posts").select("id, body").in("id", postIds) : null,
  ]);
  const byId = <T extends { id: string }>(r: { data: unknown } | null) =>
    new Map(((r?.data ?? []) as T[]).map((x) => [x.id, x]));
  const rv = byId<{
    id: string;
    reviewer_name: string | null;
    star_rating: number;
    comment: string | null;
    content_purged_at: string | null;
  }>(reviews);
  const ch = byId<{
    id: string;
    field: string;
    previous_value: ValueJson;
    previous_fact_id: string | null;
    google_value: ValueJson;
  }>(changes);
  const po = byId<{ id: string; body: string | null }>(posts);
  const latestDraft = new Map<string, string>();
  for (const d of (drafts?.data ?? []) as { review_id: string; body: string }[]) {
    if (!latestDraft.has(d.review_id)) latestDraft.set(d.review_id, d.body);
  }
  for (const t of tasks) {
    if (t.kind === "review_reply") {
      const r = rv.get(idOf(t, "review_id") ?? "");
      const first = r?.reviewer_name?.trim().split(/\s+/)[0];
      const high = t.evidence["risk"] === "high";
      out[t.id] = {
        eyebrow: r ? `New review, ${stars(r.star_rating)}${first ? `, from ${first}` : ""}` : null,
        quote: r?.comment ? clip(r.comment, 160) : r ? "Rating only, no text" : null,
        // A high-risk review gets no draft (K-13); the card says so instead.
        prepared: high ? null : (latestDraft.get(idOf(t, "review_id") ?? "") ?? null),
        evidence: high ? ["Kabsi did not draft a reply. Open it to see what to check first."] : [],
      };
    } else if (t.kind === "profile_change") {
      const c = ch.get(idOf(t, "profile_change_id") ?? "");
      const approved = c?.previous_fact_id ? (c.previous_value?.display ?? null) : null;
      const shows = c?.google_value?.display ?? null;
      out[t.id] = {
        eyebrow: null,
        quote: null,
        prepared: null,
        evidence: c
          ? [
              `Google shows ${shows ? `"${shows}"` : "nothing"}.`,
              approved ? `You approved "${approved}".` : "Not yet confirmed by you.",
            ]
          : [],
      };
    } else if (t.kind === "post") {
      const p = po.get(idOf(t, "post_id") ?? "");
      out[t.id] = {
        eyebrow: "Google update ready",
        quote: null,
        prepared: p?.body ? clip(p.body, 200) : null,
        evidence: [],
      };
    } else {
      out[t.id] = { eyebrow: null, quote: null, prepared: null, evidence: [] };
    }
  }
  return out;
}

export type HistoryItem = { id: number; at: string; line: string };

/** The audit trail behind one card: what happened to this item, newest first. */
export async function loadHistory(locationId: string, task: Task): Promise<HistoryItem[]> {
  const ids = [task.id];
  for (const key of ["review_id", "profile_change_id", "post_id", "publication_id", "target_id"]) {
    const v = task.evidence[key];
    if (typeof v === "string") ids.push(v);
  }
  const { data, error } = await supabase
    .from("audit_events")
    .select("id, created_at, action, result, object_type")
    .eq("location_id", locationId)
    .in("object_id", ids)
    .neq("action", "google_check")
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  return (
    (data ?? []) as {
      id: number;
      created_at: string;
      action: string;
      result: string | null;
      object_type: string | null;
    }[]
  ).map((e) => ({
    id: e.id,
    at: e.created_at,
    line: historyLine(e.action, e.result, e.object_type),
  }));
}

export type FeedLine = { key: string; at: string; text: string; action: string; times: number };

/** "What Kabsi did", the last 7 days, from the audit log (K-09). Routine checks come back as one line a day. */
export async function loadFeed(locationId: string): Promise<FeedLine[]> {
  const { data, error } = await supabase.rpc("activity_feed", {
    p_location: locationId,
    p_days: 7,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as { happened_at: string; action: string; line: string; times: number }[])
    .slice(0, 8)
    .map((r, i) => ({
      key: `${r.happened_at}-${i}`,
      at: r.happened_at,
      text: r.line,
      action: r.action,
      times: r.times,
    }));
}
