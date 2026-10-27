import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  attentionOf,
  errorTypeLabel,
  minutesLabel,
  type Diagnostics,
  type Health,
} from "@/lib/system-health";
import { Button, STAFF_CARD, STAFF_H2 } from "./staff-ui";

// Staff System health (P0.6-11; K-44 staff part, K-36): everything that can be wrong behind the product, in one place, read
// through staff-only functions. Technical detail for the team; owners see plain messages elsewhere and never this page.

const when = (iso: string | null | undefined) => (iso ? fmtDateTime(iso) : "-");

async function loadHealth(): Promise<Health> {
  const { data, error } = await supabase.rpc("staff_system_health");
  if (error) throw new Error(error.message);
  return data as unknown as Health;
}

async function loadDiagnostics(location: string): Promise<Diagnostics> {
  const { data, error } = await supabase.rpc("staff_business_diagnostics", {
    p_location: location,
  });
  if (error) throw new Error(error.message);
  return data as unknown as Diagnostics;
}

export function SystemHealthPanel() {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: ["staff-system-health"],
    queryFn: loadHealth,
    refetchInterval: 60_000,
  });
  const [msg, setMsg] = useState("");
  const act = useMutation({
    mutationFn: async (v: { job: number; what: "retry" | "cancel" }) => {
      const { error } = await supabase.rpc(
        v.what === "retry" ? "staff_job_retry" : "staff_job_cancel",
        {
          p_job: v.job,
        },
      );
      if (error) throw new Error(error.message);
      return v;
    },
    onSuccess: async (v) => {
      setMsg(v.what === "retry" ? `Job ${v.job} is back in the queue.` : `Job ${v.job} is closed.`);
      await queryClient.invalidateQueries({ queryKey: ["staff-system-health"] });
      await queryClient.invalidateQueries({ queryKey: ["staff-health"] });
    },
    onError: (e) => {
      const m = e instanceof Error ? e.message : String(e);
      setMsg(
        m === "already_open"
          ? "The same work is already waiting in the queue, so this one was not retried."
          : m === "not_dead"
            ? "That job is no longer dead."
            : m,
      );
    },
  });
  const h = q.data;
  const attention = h ? attentionOf(h) : [];
  return (
    <section id="system-health" className={STAFF_CARD}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={STAFF_H2}>System health</h2>
        <Button variant="ghost" size="compact" onClick={() => void q.refetch()}>
          <RefreshCw /> {q.isFetching ? "Checking" : "Refresh"}
        </Button>
      </div>
      {q.isError ? <p className="mt-2 text-bad">{q.error.message}</p> : null}
      {h ? (
        <>
          <p className="mt-1 text-small text-text-2">
            Checked {when(h.checked_at)} · refreshes every minute · Google is in {h.google.mode}{" "}
            mode.
          </p>
          {attention.length === 0 ? (
            <p className="mt-3 rounded-inner bg-surface-2 p-4">
              Nothing needs attention. No dead jobs, no stuck publications, the breaker is closed.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {attention.map((a) => (
                <li
                  key={a.id}
                  className={cn(
                    "rounded-card border-2 p-3 text-small",
                    a.level === "red" ? "border-bad font-bold text-bad" : "border-text-1",
                  )}
                >
                  {a.text}
                </li>
              ))}
            </ul>
          )}
          {msg ? <p className="mt-3 text-small font-bold">{msg}</p> : null}

          <Block
            title="Google"
            note="Errors by type (24 hours), the breaker, request rates and the Places cap."
          >
            <p className="text-small">
              Circuit breaker:{" "}
              <span className={cn(h.google.breaker?.state !== "closed" && "font-bold text-bad")}>
                {h.google.breaker?.state ?? "unknown"}
              </span>
              {h.google.breaker?.state !== "closed" && h.google.breaker?.open_until
                ? `, closes ${when(h.google.breaker.open_until)}`
                : ""}
              {h.google.breaker?.state === "closed"
                ? `, ${h.google.breaker.failures_in_window} failures in the current minute (20 opens it)`
                : ""}
            </p>
            <p className="mt-1 text-small">
              Errors, 24 hours:{" "}
              {h.google.errors_24h.length
                ? h.google.errors_24h.map((e) => `${errorTypeLabel(e.type)} ${e.n}`).join(" · ")
                : "none"}
            </p>
            <p className="mt-1 text-small">
              Requests in the last minute:{" "}
              {h.google.rate.length
                ? h.google.rate.map((r) => `${r.bucket} ${r.calls_last_minute}`).join(" · ")
                : "none recorded"}
              {" · "}Places today {h.google.places.calls_today} of {h.google.places.daily_cap}
              {h.google.places.daily_cap === 0 ? " (off)" : ""}
            </p>
          </Block>

          <Block
            title={`Sync lag (${h.sync.connected} connected, ${h.sync.late} late)`}
            note="Businesses with working access, worst first. Late means no good check for 30 minutes or an error."
          >
            <Rows
              empty="No business is connected yet."
              rows={h.sync.worst.map((w) => ({
                key: w.location_id,
                bad: (w.lag_minutes ?? 0) > 30 || w.sync_status === "error",
                text: `${w.business}: last good check ${minutesLabel(w.lag_minutes)} ago, status ${w.sync_status ?? "none"}${w.error ? `, ${w.error}` : ""}`,
              }))}
            />
          </Block>

          <Block
            title={`Access problems (${h.access_problems.length})`}
            note="Google access in an error, lost or being removed."
          >
            <Rows
              empty="None."
              rows={h.access_problems.map((a) => ({
                key: a.location_id,
                bad: true,
                text: `${a.business}: ${a.access_state} since ${when(a.since)}${a.error ? `, ${a.error}` : ""}`,
              }))}
            />
          </Block>

          <Block
            title={`Job queue and dead jobs (${h.queue.dead})`}
            note="A dead job has used all its tries. Retry gives it a fresh set. Cancel closes it."
          >
            <p className="text-small">
              {h.queue.pending} waiting · {h.queue.running} running · {h.queue.retrying} retrying ·{" "}
              <span className={cn(h.queue.due_late > 0 && "font-bold text-bad")}>
                {h.queue.due_late} late
              </span>{" "}
              · oldest due job waited {Math.round(h.queue.oldest_due_seconds / 60)} min
            </p>
            <ul className="mt-2 space-y-2">
              {h.dead_jobs.length === 0 ? (
                <li className="text-small text-text-2">No dead jobs.</li>
              ) : null}
              {h.dead_jobs.map((j) => (
                <li key={j.id} className="rounded-card bg-surface-2 p-3 text-small">
                  <p className="font-bold">
                    #{j.id} {j.kind}
                    {j.business ? ` (${j.business})` : ""} · {j.attempts} of {j.max_attempts} tries
                    · {when(j.at)}
                  </p>
                  <p className="mt-1 break-words font-mono text-label">
                    {j.last_error ?? "no error recorded"}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="secondary"
                      size="compact"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ job: j.id, what: "retry" })}
                    >
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="compact"
                      disabled={act.isPending}
                      onClick={() => act.mutate({ job: j.id, what: "cancel" })}
                    >
                      Cancel
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Block>

          <Block
            title={`Publications (${h.publications.stuck.length} stuck, ${h.publications.failed_7d} failed in 7 days)`}
            note="Stuck: approved or publishing for 15 minutes, or checking for an hour."
          >
            <Rows
              empty="Nothing stuck."
              rows={h.publications.stuck.map((p) => ({
                key: p.id,
                bad: true,
                text: `${p.business}: ${p.kind} is ${p.state} since ${when(p.since)}, ${p.attempts ?? 0} tries, ${p.checks ?? 0} checks${p.error ? `, ${p.error}` : ""}`,
              }))}
            />
            {h.publications.failed.length ? (
              <details className="mt-2 text-small">
                <summary className="cursor-pointer font-bold">Recent failures</summary>
                <Rows
                  empty=""
                  rows={h.publications.failed.map((p) => ({
                    key: p.id,
                    bad: false,
                    text: `${when(p.at)} ${p.business}: ${p.kind} ${p.state}${p.error ? `, ${p.error}` : ""}`,
                  }))}
                />
              </details>
            ) : null}
          </Block>

          <Block
            title={`Photo processing (${h.photos.failed_7d} failed in 7 days)`}
            note={`${h.photos.stuck_checking} still being checked after 15 minutes.`}
          >
            <Rows
              empty="No failures."
              rows={h.photos.recent.map((p) => ({
                key: p.id,
                bad: false,
                text: `${when(p.at)} ${p.business}: ${p.state}${p.reason ? `, ${p.reason}` : ""}`,
              }))}
            />
          </Block>

          <Block
            title="Email and notification delivery"
            note="Last 24 hours. Addresses are shown as the domain only."
          >
            <p className="text-small">
              Emails sent {h.delivery.emails_sent_24h} ·{" "}
              <span className={cn(h.delivery.emails_failed_24h > 0 && "font-bold text-bad")}>
                failed {h.delivery.emails_failed_24h}
              </span>{" "}
              · queued over 15 min {h.delivery.emails_queued_late} · notices failed{" "}
              {h.delivery.notices_failed_24h} · notices sending over 15 min{" "}
              {h.delivery.notices_sending_late} · staff alerts unsent {h.delivery.alerts_unsent}
            </p>
            <Rows
              empty=""
              rows={h.delivery.recent_failures.map((f, i) => ({
                key: `${f.at}-${i}`,
                bad: false,
                text: `${when(f.at)} ${f.kind} ${f.status}${f.to_domain ? ` to ${f.to_domain}` : ""}${f.error ? `, ${f.error}` : ""}`,
              }))}
            />
          </Block>
        </>
      ) : null}
    </section>
  );
}

function Block({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 rounded-panel bg-surface-1 p-5 shadow-rest">
      <h3 className="font-bold">{title}</h3>
      <p className="mt-0.5 text-label text-text-2">{note}</p>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Rows({
  rows,
  empty,
}: {
  rows: { key: string; text: string; bad: boolean }[];
  empty: string;
}) {
  if (rows.length === 0) return empty ? <p className="text-small text-text-2">{empty}</p> : null;
  return (
    <ul className="mt-1 space-y-1 font-mono text-label">
      {rows.map((r) => (
        <li key={r.key} className={cn("break-words", r.bad && "font-bold text-bad")}>
          {r.text}
        </li>
      ))}
    </ul>
  );
}

/** One business in technical terms: what Google says, its jobs, publications, emails and audit. Never a credential. */
export function BusinessDiagnostics({ location }: { location: string }) {
  const q = useQuery({
    queryKey: ["staff-diagnostics", location],
    queryFn: () => loadDiagnostics(location),
  });
  const d = q.data;
  if (q.isLoading) return <p className="mt-3 text-small text-text-2">Reading</p>;
  if (q.isError) return <p className="mt-3 text-small text-bad">{q.error.message}</p>;
  if (!d || !d.business) return <p className="mt-3 text-small text-text-2">No such business.</p>;
  const g = d.google;
  const counts = (o: Record<string, number>) =>
    Object.keys(o).length
      ? Object.entries(o)
          .map(([k, n]) => `${k} ${n}`)
          .join(" · ")
      : "none";
  return (
    <div className="mt-3 space-y-3 rounded-card bg-surface-2 p-4 text-small">
      <p>
        {d.business.status} · step {d.business.onboarding_step}
        {d.business.concierge ? " · early access" : ""} · {d.business.country ?? "no country"} ·
        created {when(d.business.created_at)}
      </p>
      {g ? (
        <p>
          Google: access {g.access_state}, sync {g.sync_status ?? "none"}, last good check{" "}
          {when(g.last_successful_sync_at)}, last try {when(g.last_attempted_sync_at)}, next{" "}
          {when(g.next_sync_at)}, next Protection {when(g.next_protection_at)}, Google location{" "}
          {g.has_google_location ? "set" : "not set"}, voice of merchant{" "}
          {g.voice_of_merchant ? "yes" : "no"}
          {g.last_error ? `, error: ${g.last_error}` : ""}
        </p>
      ) : (
        <p>No Google connection row.</p>
      )}
      <p>
        Reviews: {counts(d.reviews)} · Photos: {counts(d.photos)}
      </p>
      <List
        title="Jobs"
        empty="none"
        rows={d.jobs.map(
          (j) =>
            `#${j.id} ${j.kind} ${j.state}, ${j.attempts} tries, ${j.finished_at ? `done ${when(j.finished_at)}` : `due ${when(j.next_run_at)}`}${j.last_error ? `, ${j.last_error}` : ""}`,
        )}
      />
      <List
        title="Publications"
        empty="none"
        rows={d.publications.map(
          (p) =>
            `${when(p.at)} ${p.kind} ${p.state} (${p.route ?? "no route"}), ${p.attempts ?? 0} tries, ${p.checks ?? 0} checks${p.error ? `, ${p.error}` : ""}`,
        )}
      />
      <List
        title="Emails"
        empty="none"
        rows={d.emails.map(
          (e) => `${when(e.at)} ${e.kind} ${e.status}${e.error ? `, ${e.error}` : ""}`,
        )}
      />
      <List
        title="Audit"
        empty="none"
        rows={d.audit.map(
          (a) =>
            `${when(a.at)} ${a.action}${a.result ? ` ${a.result}` : ""}${a.channel ? ` (${a.channel})` : ""}`,
        )}
      />
    </div>
  );
}

function List({ title, rows, empty }: { title: string; rows: string[]; empty: string }) {
  return (
    <div>
      <p className="font-bold">{title}</p>
      {rows.length ? (
        <ul className="mt-1 space-y-0.5 font-mono text-label">
          {rows.map((r, i) => (
            <li key={i} className="break-words">
              {r}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-label text-text-2">{empty}</p>
      )}
    </div>
  );
}
