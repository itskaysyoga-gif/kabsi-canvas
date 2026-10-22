// The queue health answer (P0.6-08; K-118, K-87). The uptime monitor calls GET /health/queue every minute or five and
// alerts on anything but 200. A green status page while the queue is stuck is the failure this exists to prevent, so a
// check that cannot read the queue is red too ("unknown"), never green.
export type QueueHealthRow = {
  ok?: boolean;
  oldest_due_seconds?: number;
  due_jobs?: number;
  limit_seconds?: number;
} | null;

export function queueResponse(row: QueueHealthRow): { status: number; body: Record<string, unknown> } {
  if (!row || typeof row.ok !== "boolean") return { status: 503, body: { status: "unknown" } };
  const body = {
    status: row.ok ? "ok" : "stuck",
    oldest_due_seconds: Number(row.oldest_due_seconds ?? 0),
    due_jobs: Number(row.due_jobs ?? 0),
    limit_seconds: Number(row.limit_seconds ?? 600),
  };
  return { status: row.ok ? 200 : 503, body };
}
