// The day-one backlog (K-66, K-101, P0.3-10): the low-risk replies the owner can approve together, the approval of exactly
// that list, and the progress of what goes to Google. Reads go through RLS; the approval is one membership-checked RPC.
import { supabase } from "@/lib/supabase";
import { SENT_STATES } from "@/lib/dashboard";

export type BacklogItem = {
  id: string;
  reviewer: string | null;
  stars: number;
  comment: string | null;
  version: number;
  reply: string;
};

/** The low-risk backlog replies that are ready, newest review first, with the exact text that would go out. */
export async function loadBacklogList(locationId: string): Promise<BacklogItem[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, reviewer_name, star_rating, comment, review_created_at, reply_drafts(body, safety_ok, version)",
    )
    .eq("location_id", locationId)
    .eq("is_backlog", true)
    .eq("state", "drafted")
    .eq("risk", "low")
    .order("review_created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const out: BacklogItem[] = [];
  for (const row of (data ?? []) as {
    id: string;
    reviewer_name: string | null;
    star_rating: number;
    comment: string | null;
    reply_drafts?: { body: string; safety_ok: boolean; version: number }[];
  }[]) {
    const latest = [...(row.reply_drafts ?? [])].sort((a, b) => b.version - a.version)[0];
    if (!latest || !latest.safety_ok || !latest.body.trim()) continue;
    out.push({
      id: row.id,
      reviewer: row.reviewer_name,
      stars: row.star_rating,
      comment: row.comment,
      version: latest.version,
      reply: latest.body,
    });
  }
  return out;
}

export type BacklogResult = { approved: string[]; left_out: { review_id: string; why: string }[] };

/** Approves exactly the list that was shown. A reply whose draft changed since is left out and reported. */
export async function approveBacklog(
  locationId: string,
  items: BacklogItem[],
): Promise<BacklogResult> {
  const { data, error } = await supabase.rpc("approve_backlog", {
    p_location: locationId,
    p_items: items.map((i) => ({ review_id: i.id, version: i.version })),
  });
  if (error) {
    throw new Error(
      error.message.includes("not_allowed_to_approve")
        ? "The owner approves replies."
        : "Couldn't approve these. Nothing was sent. Try again.",
    );
  }
  return data as unknown as BacklogResult;
}

export type BacklogProgress = { total: number; sent: number; failed: number } | null;

/** How far the last "Approve all" has got: replies sent to Google out of the replies approved (last 2 days). */
export async function loadBacklogProgress(locationId: string): Promise<BacklogProgress> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  const { data: ev, error } = await supabase
    .from("audit_events")
    .select("after, created_at")
    .eq("location_id", locationId)
    .eq("action", "backlog_approved")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error(error.message);
  const ids = new Set<string>();
  for (const e of (ev ?? []) as { after: { reviews?: string[] } | null }[])
    for (const id of e.after?.reviews ?? []) ids.add(id);
  if (!ids.size) return null;
  const { data: pubs, error: pubErr } = await supabase
    .from("publications")
    .select("target_id, state")
    .eq("location_id", locationId)
    .eq("target_type", "review_reply")
    .in("target_id", [...ids]);
  if (pubErr) throw new Error(pubErr.message);
  const rows = (pubs ?? []) as { target_id: string; state: string }[];
  return {
    total: ids.size,
    sent: new Set(rows.filter((r) => SENT_STATES.includes(r.state)).map((r) => r.target_id)).size,
    failed: new Set(rows.filter((r) => r.state === "failed").map((r) => r.target_id)).size,
  };
}
