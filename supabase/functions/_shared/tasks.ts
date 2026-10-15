// The one task queue (K-08, P0.3-05) from the Edge Functions' side. The tasks themselves are made and closed by the
// detectors in the database (migration 20261015090000_task_engine.sql); this file holds the detect_tasks job handler
// and what Nora's list_tasks tool returns, with no database import so the tests run without credentials.

export type TaskRow = {
  kind: string;
  priority: "urgent" | "recommended" | "nice";
  title: string;
  why: string;
  path: string;
};

// What Nora sees: the first five open tasks (already in order: urgent, recommended, nice, then oldest first), each
// with only its priority, title, reason and page; how many more there are; how many the owner put off.
export function nextTasks(data: unknown, max = 5) {
  const d = (data ?? {}) as { tasks?: TaskRow[]; snoozed?: number };
  const all = Array.isArray(d.tasks) ? d.tasks : [];
  return {
    tasks: all.slice(0, max).map((t) => ({ priority: t.priority, title: t.title, why: t.why, path: t.path })),
    more: Math.max(all.length - max, 0),
    put_off: Number(d.snoozed ?? 0),
  };
}

// The detect_tasks job: run every detector for one business. A business that no longer exists is not an error.
export async function detectTasks(
  locationId: string | null,
  run: (locationId: string) => Promise<Record<string, number> | null>,
): Promise<Record<string, number>> {
  if (!locationId) throw new Error("detect_tasks needs a business");
  const made = await run(locationId);
  return made ?? {};
}
