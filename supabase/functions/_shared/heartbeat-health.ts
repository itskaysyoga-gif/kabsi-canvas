// FIX-0: GET /health, public, for the outside uptime monitor. It answers only a status. 200 when jobs_log has a line from the
// last 15 minutes (the cron tick writes one every tick), 503 when it has none, and 503 when the table cannot be read: an
// unreadable heartbeat is red, never green. No value, no count of businesses, nothing a visitor could use.
export const HEARTBEAT_MINUTES = 15;

export function heartbeatResponse(lastLineAt: string | null | undefined, now = new Date()): { status: number; body: Record<string, unknown> } {
  if (!lastLineAt) return { status: 503, body: { status: "silent", minutes: HEARTBEAT_MINUTES } };
  const t = Date.parse(lastLineAt);
  if (!Number.isFinite(t)) return { status: 503, body: { status: "unknown" } };
  const age = Math.max(0, Math.round((now.getTime() - t) / 1000));
  const ok = age <= HEARTBEAT_MINUTES * 60;
  return { status: ok ? 200 : 503, body: { status: ok ? "ok" : "silent", last_line_seconds_ago: age, limit_seconds: HEARTBEAT_MINUTES * 60 } };
}
