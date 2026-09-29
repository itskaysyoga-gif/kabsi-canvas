// Profile Score and the "Do now" list (D296, D299). Computed in the database from facts Kabsi holds.
import { supabase } from "@/lib/supabase";

export type ScoreItem = {
  key: string;
  label: string;
  max: number;
  earned: number;
  note: string;
  path: string;
};
export type ProfileTask = {
  id: string;
  key: string;
  title: string;
  why: string;
  path: string;
  points: number;
};
export type ProfileView = {
  score: number;
  items: ScoreItem[];
  tasks: ProfileTask[];
  later: number;
};

export async function loadProfile(locationId: string): Promise<ProfileView> {
  const { data, error } = await supabase.rpc("profile_tasks_list", { p_location: locationId });
  if (error) throw new Error(error.message);
  return data as unknown as ProfileView;
}

export async function taskAction(taskId: string, action: "later" | "skip") {
  const { error } = await supabase.rpc("profile_task_action", { p_task: taskId, p_action: action });
  if (error) throw new Error(error.message);
}

/** Opens Nora, the assistant, optionally with a first message. */
export function askNora(prompt?: string) {
  window.dispatchEvent(new CustomEvent("kabsi:open-nora", { detail: { prompt } }));
}
