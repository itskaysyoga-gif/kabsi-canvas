// The tasks Kabsi sent to Google for one business, each with its owner state (master plan 30.15 section 3.1). Read
// through RLS: members who can see everything (can_see 'all') read publications; staff read nothing here.
import { supabase } from "@/lib/supabase";
import { googleLink, ownerState, taskNoun, type OwnerState } from "@/lib/task-state";

export type TaskItem = {
  id: string;
  kind: string;
  noun: string;
  state: string;
  owner: OwnerState;
  link: string | null;
  text: string | null;
  at: string;
  targetId: string;
};

type Row = {
  id: string;
  target_type: string;
  target_id: string;
  state: string;
  payload: { text?: string; summary?: string } | null;
  google_response: unknown;
  approved_at: string;
  updated_at: string;
};

/** The place ID of a business, for "See it on Google" links. */
async function placeId(locationId: string): Promise<string | null> {
  const { data } = await supabase
    .from("locations")
    .select("place_id")
    .eq("id", locationId)
    .maybeSingle();
  return ((data as { place_id?: string | null } | null)?.place_id ?? null) || null;
}

export async function recentTasks(
  locationId: string,
  opts: { kinds?: string[]; limit?: number; days?: number } = {},
): Promise<TaskItem[]> {
  const since = new Date(Date.now() - (opts.days ?? 30) * 86_400_000).toISOString();
  let q = supabase
    .from("publications")
    .select("id, target_type, target_id, state, payload, google_response, approved_at, updated_at")
    .eq("location_id", locationId)
    .gte("approved_at", since)
    .order("approved_at", { ascending: false })
    .limit(opts.limit ?? 20);
  if (opts.kinds?.length) q = q.in("target_type", opts.kinds);
  const [{ data, error }, place] = await Promise.all([q, placeId(locationId)]);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Row[]).map((r) => {
    const owner = ownerState(r.state);
    return {
      id: r.id,
      kind: r.target_type,
      noun: taskNoun(r.target_type),
      state: r.state,
      owner,
      link:
        owner === "confirmed"
          ? googleLink({ target_type: r.target_type, place_id: place, response: r.google_response })
          : null,
      text: r.payload?.text ?? r.payload?.summary ?? null,
      at: r.updated_at ?? r.approved_at,
      targetId: r.target_id,
    };
  });
}

/** The latest task for each target (a review, a post), so a list can show its state next to it. */
export function latestByTarget(items: TaskItem[]): Map<string, TaskItem> {
  const m = new Map<string, TaskItem>();
  for (const t of items) if (!m.has(t.targetId)) m.set(t.targetId, t);
  return m;
}
