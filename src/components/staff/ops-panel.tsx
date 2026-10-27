import { fmtDateTime } from "@/lib/format";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// Staff operations (spec §9): job health, read through the staff-only RPC staff_job_health. Card codes and card
// orders are gone (K-125, P0.8-01): Kabsi sells no NFC cards and mints no new codes; existing codes keep working.

type Health = {
  schedules: {
    name: string;
    schedule: string;
    active: boolean;
    last_start: string | null;
    last_status: string | null;
    last_message: string | null;
    failed_24h: number;
  }[];
  jobs: {
    job: string;
    runs_7d: number;
    fails_7d: number;
    last_at: string;
    last_fail_at: string | null;
  }[];
  recent_failures: { job: string; at: string; detail: unknown }[];
  /** The job queue (P0.1-12a): open work and the jobs that stopped in the last 7 days. */
  queue?: {
    pending: number;
    running: number;
    retrying: number;
    due_late: number;
    dead_7d: number;
    failed_7d: number;
  };
  stopped_jobs?: {
    id: number;
    kind: string;
    state: string;
    business: string | null;
    attempts: number;
    last_error: string | null;
    at: string;
  }[];
  http_errors_24h: number;
  http_calls_24h: number;
  emails_failed_24h: number;
  emails_sent_24h: number;
  publications_failed_7d: number;
  reviews_blocked: number;
  google_mode: string;
  email_from: string;
  checked_at: string;
};
const when = (iso: string | null) => (iso ? fmtDateTime(iso) : "-");

async function loadHealth(): Promise<Health> {
  const { data, error } = await supabase.rpc("staff_job_health");
  if (error) throw new Error(error.message);
  return data as Health;
}

export function OpsPanel() {
  return (
    <div className="mt-8 space-y-10">
      <JobHealth />
    </div>
  );
}

function JobHealth() {
  const q = useQuery({ queryKey: ["staff-health"], queryFn: loadHealth });
  const h = q.data;
  const bad = (n: number) => (n > 0 ? "text-bad font-bold" : "");
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title font-bold">Job health</h2>
        <Button variant="ghost" size="compact" onClick={() => void q.refetch()}>
          <RefreshCw /> {q.isFetching ? "Checking…" : "Refresh"}
        </Button>
      </div>
      {q.isError ? <p className="mt-2 text-bad">{q.error.message}</p> : null}
      {h ? (
        <>
          <p className="mt-1 text-small text-text-2">
            Google: {h.google_mode} · sending as {h.email_from} · checked {when(h.checked_at)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat
              label="Failed calls, 24h"
              value={`${h.http_errors_24h} / ${h.http_calls_24h}`}
              warn={h.http_errors_24h > 0}
            />
            <Stat
              label="Emails failed, 24h"
              value={String(h.emails_failed_24h)}
              warn={h.emails_failed_24h > 0}
            />
            <Stat label="Emails sent, 24h" value={String(h.emails_sent_24h)} />
            <Stat
              label="Google writes failed, 7d"
              value={String(h.publications_failed_7d)}
              warn={h.publications_failed_7d > 0}
            />
            <Stat
              label="Blocked drafts"
              value={String(h.reviews_blocked)}
              warn={h.reviews_blocked > 0}
            />
          </div>
          <div className="mt-4 overflow-x-auto rounded-panel bg-surface-1 shadow-rest">
            <table className="w-full text-left text-small">
              <thead className="text-text-2">
                <tr>
                  <th className="p-3 font-medium">Schedule</th>
                  <th className="p-3 font-medium">Runs</th>
                  <th className="p-3 font-medium">Last run</th>
                  <th className="p-3 font-medium">Failed 24h</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {h.schedules.map((s) => (
                  <tr key={s.name}>
                    <td className="p-3 font-mono text-label">{s.name.replace(/^kabsi_/, "")}</td>
                    <td className="p-3 font-mono text-label">{s.schedule}</td>
                    <td className={cn("p-3", s.last_status === "failed" && "text-bad")}>
                      {when(s.last_start)} · {s.active ? (s.last_status ?? "never") : "paused"}
                    </td>
                    <td className={cn("p-3", bad(s.failed_24h))}>{s.failed_24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-small text-text-2">
            Work done, last 7 days:{" "}
            {h.jobs.length
              ? h.jobs
                  .map((j) => `${j.job} ${j.runs_7d}${j.fails_7d ? ` (${j.fails_7d} failed)` : ""}`)
                  .join(" · ")
              : "nothing yet"}
          </p>
          {h.queue ? (
            <p className="mt-2 text-small text-text-2">
              Job queue: {h.queue.pending} waiting · {h.queue.running} running · {h.queue.retrying}{" "}
              retrying · <span className={bad(h.queue.due_late)}>{h.queue.due_late} late</span> ·{" "}
              <span className={bad(h.queue.dead_7d + h.queue.failed_7d)}>
                {h.queue.dead_7d} dead and {h.queue.failed_7d} failed in 7 days
              </span>
            </p>
          ) : null}
          {h.stopped_jobs?.length ? (
            <details className="mt-2 text-small" open>
              <summary className="cursor-pointer font-bold text-bad">
                {h.stopped_jobs.length} stopped {h.stopped_jobs.length === 1 ? "job" : "jobs"}
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-label">
                {h.stopped_jobs.map((j) => (
                  <li key={j.id}>
                    {when(j.at)} {j.kind} {j.state} after {j.attempts}{" "}
                    {j.attempts === 1 ? "try" : "tries"}
                    {j.business ? ` (${j.business})` : ""}: {j.last_error ?? ""}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {h.recent_failures.length ? (
            <details className="mt-2 text-small">
              <summary className="cursor-pointer font-bold text-bad">
                {h.recent_failures.length} recent failures
              </summary>
              <ul className="mt-2 space-y-1 font-mono text-label">
                {h.recent_failures.map((f, i) => (
                  <li key={i}>
                    {when(f.at)} {f.job}: {JSON.stringify(f.detail).slice(0, 200)}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-panel bg-surface-1 p-4 shadow-rest">
      <p className="text-label text-text-2">{label}</p>
      <p className={cn("mt-1 text-h3 font-bold", warn && "text-bad")}>{value}</p>
    </div>
  );
}
