// A short profile health summary from the Profile Coach's checklist (PROOF-2, blueprint 11.2 row 14), pure. The input is what
// public.coach_checklist returns. Plain words only: no score and no points (K-07). Items Kabsi has not read from a live profile
// say nothing (K-82). Never advice about who the owner is.
import { COACH_ITEMS } from "../coach/catalog.ts";

export type ChecklistRow = { id: string; status: "done" | "todo" | "unknown" | "later" };
export type Checklist = { locked?: boolean; items?: ChecklistRow[]; source?: string; read_at?: string | null };
export type ProfileHealth = {
  state: "locked" | "unread" | "ok";
  done: number;
  of: number;
  todo: string[];
  line: string;
  /** The Profile Coach page, where each item is explained. */
  path: string;
};

const title = (id: string) => COACH_ITEMS.find((i) => i.id === id)?.title ?? id;

export function profileHealthSummary(c: Checklist | null): ProfileHealth {
  const path = "/app/coach";
  if (!c || c.locked) return { state: "locked", done: 0, of: 0, todo: [], line: "Your profile check is not on for this business yet.", path };
  const known = (c.items ?? []).filter((i) => i.status === "done" || i.status === "todo");
  if (!known.length) return { state: "unread", done: 0, of: 0, todo: [], line: "Kabsi has not read your profile details yet. It checks them in your first week.", path };
  const done = known.filter((i) => i.status === "done").length;
  const todo = known.filter((i) => i.status === "todo").map((i) => title(i.id));
  const head = `${done} of ${known.length} profile items are in place.`;
  const line = todo.length ? `${head} Still to do: ${todo.slice(0, 3).join(", ")}${todo.length > 3 ? ` and ${todo.length - 3} more` : ""}.` : `${head} Nothing is missing.`;
  return { state: "ok", done, of: known.length, todo, line, path };
}
