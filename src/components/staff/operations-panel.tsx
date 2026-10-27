import { fmtDateTime } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button, STAFF_CARD, STAFF_H2, STAFF_ITEM } from "./staff-ui";

// Sec 2 (master plan 30.15 section 8): the operations view. One staff-only RPC, staff_operations, returns five lists,
// each row with what to do: approvals stuck for more than 15 minutes, businesses whose Google access stopped, failed
// publications in the last 7 days, jobs failing or waiting too long, and webhooks refused in the last 24 hours. Error
// text is scrubbed of addresses, phone numbers and tokens in the database before it reaches this page.

type Row = {
  todo: string;
  id?: string | number;
  business?: string | null;
  what?: string;
  state?: string;
  since?: string | null;
  at?: string | null;
  error?: string | null;
  kind?: string;
  attempts?: number;
  source?: string;
  reason?: string;
  count?: number;
  last_at?: string;
  location_id?: string;
};
export type Operations = {
  checked_at: string;
  google_writes: string;
  stuck: Row[];
  access_stopped: Row[];
  failed_publications: Row[];
  jobs: Row[];
  webhooks_rejected: Row[];
};

async function loadOperations(): Promise<Operations> {
  const { data, error } = await supabase.rpc("staff_operations");
  if (error) throw new Error(error.message);
  return data as Operations;
}

const when = (v: unknown) => (typeof v === "string" && v ? fmtDateTime(v) : "-");
const words = (v: unknown) => String(v ?? "").replace(/_/g, " ");

const SECTIONS: {
  key: keyof Omit<Operations, "checked_at" | "google_writes">;
  title: string;
  empty: string;
  line: (r: Row) => string;
}[] = [
  {
    key: "stuck",
    title: "Approved, not sent after 15 minutes",
    empty: "Nothing is stuck.",
    line: (r) => `${r.business} · ${words(r.what)} · ${words(r.state)} since ${when(r.since)}`,
  },
  {
    key: "access_stopped",
    title: "Google access stopped",
    empty: "Every business's access works.",
    line: (r) => `${r.business} · ${words(r.state)} since ${when(r.since)}`,
  },
  {
    key: "failed_publications",
    title: "Failed publications, last 7 days",
    empty: "No failed publications.",
    line: (r) =>
      `${r.business} · ${words(r.what)} · ${words(r.state)} ${when(r.at)}${r.error ? ` · ${r.error}` : ""}`,
  },
  {
    key: "jobs",
    title: "Jobs failing or waiting too long",
    empty: "Every job is running on time.",
    line: (r) =>
      `${words(r.kind)}${r.business ? ` · ${r.business}` : ""} · ${words(r.state)} after ${r.attempts} tries · ${when(r.at)}${r.error ? ` · ${r.error}` : ""}`,
  },
  {
    key: "webhooks_rejected",
    title: "Webhooks refused, last 24 hours",
    empty: "No webhook was refused.",
    line: (r) =>
      `${words(r.source)} · ${words(r.reason)} · ${r.count} times, last ${when(r.last_at)}`,
  },
];

export function OperationsPanel() {
  const q = useQuery({ queryKey: ["staff-operations"], queryFn: loadOperations });
  const o = q.data;
  return (
    <section id="operations" className={STAFF_CARD}>
      <div className="flex items-center justify-between gap-3">
        <h2 className={STAFF_H2}>Operations</h2>
        <Button
          size="compact"
          variant="ghost"
          onClick={() => void q.refetch()}
          disabled={q.isFetching}
        >
          <RefreshCw aria-hidden /> Refresh
        </Button>
      </div>
      <p className="mt-1 text-small text-text-2">
        What needs a person now. Each row says what to do.
        {o ? ` Checked ${when(o.checked_at)}.` : ""}
        {o && o.google_writes !== "on" ? " Google writes are paused." : ""}
      </p>
      {q.isLoading ? <p className="mt-4 text-text-2">Loading</p> : null}
      {q.error ? (
        <p className="mt-4 text-small font-semibold text-bad" role="alert">
          The operations view did not load. Try Refresh.
        </p>
      ) : null}
      {o ? (
        <div className="mt-4 space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.key}>
              <h3 className="text-body font-bold">
                {s.title} <span className="text-text-2">({o[s.key].length})</span>
              </h3>
              {o[s.key].length === 0 ? (
                <p className="mt-1 text-small text-text-2">{s.empty}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {o[s.key].map((r, i) => (
                    <li key={`${s.key}-${r.id ?? i}`} className={STAFF_ITEM}>
                      <p className="break-words text-small font-semibold text-text-1">
                        {s.line(r)}
                      </p>
                      <p className="mt-1 text-small text-text-2">{r.todo}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
