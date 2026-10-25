// The one owner queue (K-08, P0.3-05). Tasks are made only by the server-side detectors; the browser reads them through
// list_tasks (open tasks by priority, then age, each with its page) and can only put one off for 3 or 30 days.
// Priorities, never points or a score (K-07).
import { supabase } from "@/lib/supabase";

export type TaskKind =
  | "review_reply"
  | "profile_change"
  | "photo_batch"
  | "post"
  | "hours_confirm"
  | "knowledge_confirm"
  | "profile_gap"
  | "reconnect"
  | "billing"
  | "google_needs_action";
export type TaskPriority = "urgent" | "recommended" | "nice";
export type Task = {
  id: string;
  kind: TaskKind;
  priority: TaskPriority;
  title: string;
  why: string;
  recommendation: string | null;
  /** The app page where the owner acts on it. */
  path: string;
  evidence: Record<string, unknown>;
  created_at: string;
};
export type TaskList = { tasks: Task[]; snoozed: number };

export async function loadTasks(locationId: string): Promise<TaskList> {
  const { data, error } = await supabase.rpc("list_tasks", { p_location: locationId });
  if (error) throw new Error(error.message);
  return data as unknown as TaskList;
}

export async function taskAction(taskId: string, action: "later" | "skip") {
  const { error } = await supabase.rpc("task_action", { p_task: taskId, p_action: action });
  if (error) throw new Error(error.message);
}

/** Review replies waiting for the owner (the Reviews badge): open review tasks, read through RLS. */
export async function waitingReplies(locationId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId)
    .eq("kind", "review_reply")
    .eq("state", "open");
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Opens Nora, the assistant, optionally with a first message. */
export function askNora(prompt?: string) {
  window.dispatchEvent(new CustomEvent("kabsi:open-nora", { detail: { prompt } }));
}
