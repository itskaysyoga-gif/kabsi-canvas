import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CircleCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { loadFounding, loadPartners } from "@/lib/programs";
import { loadConciergeQueue } from "@/lib/concierge";
import { STAFF_PAGES } from "@/lib/staff-nav";
import {
  capShare,
  failedRuns24h,
  newBusinesses,
  todayRows,
  type TodayRow,
} from "@/lib/staff-today";
import { buttonClass, EmptyState } from "@/components/kabsi/ui";
import { STAFF_CARD, STAFF_H2, StaffTop } from "@/components/staff/staff-ui";
import { ALL_CHATS, chatsKey, loadChats } from "@/components/staff/chats-panel";
import { openFollowups } from "@/components/staff/followups-panel";
import { loadOperations } from "@/components/staff/operations-panel";
import { loadSystemHealth } from "@/components/staff/system-health-panel";
import { loadJobHealth } from "@/components/staff/ops-panel";
import { aiSpend, providerMonths, usd } from "@/components/staff/costs-panel";
import { useStaffLocations } from "@/components/staff/businesses-panel";
import { cn } from "@/lib/utils";

// Today (App 5, master plan 30.33 item 3): what needs a person now, from the reads each staff page already makes, under
// the same query keys, so opening a page after Today asks for nothing again. The caps and the provider refusals come
// from staff_today (20261105170458_app5_staff_today.sql). Nothing here changes anything: every action is on its page.
export const Route = createFileRoute("/_authenticated/staff/")({
  head: () => ({
    meta: [{ title: "Today | Staff | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: Today,
});

type StaffToday = {
  checked_at: string;
  caps: { dataforseo_usd: number; ai_visibility_usd: number };
  refusals_24h: { title: string; at: string }[];
};

async function loadToday(): Promise<StaffToday> {
  const { data, error } = await supabase.rpc("staff_today" as never);
  if (error) throw new Error(error.message);
  return data as unknown as StaffToday;
}

function Today() {
  const now = Date.now();
  const reads = {
    founding: useQuery({ queryKey: ["staff-founding"], queryFn: loadFounding }),
    partners: useQuery({ queryKey: ["staff-partners"], queryFn: loadPartners }),
    chats: useQuery({ queryKey: chatsKey(ALL_CHATS), queryFn: () => loadChats(ALL_CHATS) }),
    followups: useQuery({ queryKey: ["staff-followups"], queryFn: openFollowups }),
    concierge: useQuery({ queryKey: ["concierge-queue"], queryFn: loadConciergeQueue }),
    operations: useQuery({ queryKey: ["staff-operations"], queryFn: loadOperations }),
    system: useQuery({ queryKey: ["staff-system-health"], queryFn: loadSystemHealth }),
    jobs: useQuery({ queryKey: ["staff-health"], queryFn: loadJobHealth }),
    businesses: useStaffLocations(),
    today: useQuery({ queryKey: ["staff-today"], queryFn: loadToday }),
  };
  const months = useQuery({ queryKey: ["staff-provider-spend"], queryFn: providerMonths });
  const aiToday = useQuery({ queryKey: ["staff-ai-spend", "1"], queryFn: () => aiSpend(1) });

  const fresh = newBusinesses(reads.businesses.data ?? [], now);
  const o = reads.operations.data;
  const rows = todayRows({
    now,
    foundingNew: reads.founding.data?.applications.filter((a) => a.status === "new").length,
    partnersApplied: reads.partners.data?.partners.filter((p) => p.status === "applied").length,
    chatsHandoff: reads.chats.data?.filter((c) => c.status === "handoff").length,
    followupsDue: reads.followups.data?.filter((f) => Date.parse(f.due_at) <= now).length,
    conciergeTasks: reads.concierge.data?.tasks.length,
    stuckApprovals: o?.stuck.length,
    accessStopped: o?.access_stopped.length,
    webhooksRefused24h: o?.webhooks_rejected.reduce((t, w) => t + (w.count ?? 1), 0),
    failedJobs24h: failedRuns24h(reads.jobs.data?.schedules),
    deadJobs: reads.system.data?.queue.dead,
    googleErrors24h: reads.system.data?.google.errors_24h.reduce((t, e) => t + e.n, 0),
    providerRefusals24h: reads.today.data?.refusals_24h.length,
    newBusinesses: fresh,
  });
  const loading = Object.values(reads).some((q) => q.isLoading);
  const failed = (Object.entries(reads) as [keyof typeof reads, { isError: boolean }][])
    .filter(([, q]) => q.isError)
    .map(([k]) => READ_NAME[k]);
  const retry = () => {
    for (const q of Object.values(reads)) if (q.isError) void q.refetch();
  };

  return (
    <>
      <StaffTop page={STAFF_PAGES.today} />
      {failed.length ? (
        <p
          role="alert"
          className="mb-5 rounded-card border-2 border-bad bg-surface-1 p-4 text-small font-semibold text-bad"
        >
          Some figures did not load: {failed.join(", ")}. The rows below leave them out.{" "}
          <button type="button" className="underline underline-offset-4" onClick={retry}>
            Try again
          </button>
        </p>
      ) : null}

      <section aria-labelledby="today-now" className={STAFF_CARD}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today-now" className={STAFF_H2}>
            Needs a person now
          </h2>
          {!loading ? (
            <p className="text-small text-text-2">
              {rows.length === 0 ? "Nothing waiting" : `${rows.length} to look at`}
            </p>
          ) : null}
        </div>
        {loading ? (
          <p className="mt-4 text-small text-text-2" role="status">
            Checking every page
          </p>
        ) : rows.length === 0 && failed.length === 0 ? (
          <EmptyState icon={CircleCheck} title="All clear." className="mt-4">
            Nothing is waiting for a person. Today checks again each time you open it.
          </EmptyState>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {rows.map((r) => (
              <TodayItem key={r.id} r={r} />
            ))}
          </ul>
        )}
      </section>

      {fresh.length ? (
        <section aria-labelledby="today-new" className={cn(STAFF_CARD, "mt-5")}>
          <h2 id="today-new" className={STAFF_H2}>
            New this week
          </h2>
          <p className="mt-1 text-small text-text-2">Businesses still setting up, newest first.</p>
          <ul className="mt-3 divide-y divide-line">
            {fresh.slice(0, 8).map((b, i) => (
              <li
                key={`${b.name}-${i}`}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3"
              >
                <span className="min-w-0 font-bold break-words">{b.name}</span>
                <span className="text-small text-text-2">Step: {b.step}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="today-spend" className={cn(STAFF_CARD, "mt-5")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="today-spend" className={STAFF_H2}>
            Spend against the caps
          </h2>
          <Link
            to={"/staff/costs" as "/staff"}
            className="inline-flex min-h-11 items-center gap-1 text-small font-bold underline underline-offset-4"
          >
            All costs <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <Spend
          months={months.data}
          monthsError={months.isError}
          caps={reads.today.data?.caps}
          places={reads.system.data?.google.places}
          aiTodayMicros={
            aiToday.data ? Object.values(aiToday.data).reduce((t, v) => t + v.micros, 0) : undefined
          }
          aiTodayRuns={
            aiToday.data ? Object.values(aiToday.data).reduce((t, v) => t + v.runs, 0) : undefined
          }
        />
        {reads.today.data?.refusals_24h.length ? (
          <div className="mt-4">
            <h3 className="text-body font-bold">Provider refusals, last 24 hours</h3>
            <ul className="mt-2 space-y-1 text-small">
              {reads.today.data.refusals_24h.map((r) => (
                <li key={`${r.at}-${r.title}`} className="break-words">
                  {r.title}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </>
  );
}

const READ_NAME = {
  founding: "Founding 25",
  partners: "Partners",
  chats: "chats",
  followups: "follow-ups",
  concierge: "concierge",
  operations: "operations",
  system: "system health",
  jobs: "job health",
  businesses: "businesses",
  today: "caps and refusals",
} as const;

function TodayItem({ r }: { r: TodayRow }) {
  const page = STAFF_PAGES[r.page];
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex min-w-0 items-center gap-3 text-body font-semibold">
        <span
          aria-hidden
          className={cn(
            "grid h-8 min-w-8 shrink-0 place-items-center rounded-full px-2 text-label font-bold",
            r.level === "red" ? "bg-bad text-kb-white" : "bg-kb-yellow text-kb-black",
          )}
        >
          {r.count > 99 ? "99+" : r.count}
        </span>
        <span className="min-w-0 break-words">{r.text}</span>
      </p>
      <Link
        to={page.to as "/staff"}
        search={(r.show ? { show: r.show } : {}) as never}
        className={cn(buttonClass("secondary", "md"), "shrink-0 self-start sm:self-auto")}
      >
        {r.button}
      </Link>
    </li>
  );
}

function Spend({
  months,
  monthsError,
  caps,
  places,
  aiTodayMicros,
  aiTodayRuns,
}: {
  months: { provider: string; month: string; calls: number; micros: number }[] | undefined;
  monthsError: boolean;
  caps: StaffToday["caps"] | undefined;
  places: { daily_cap: number; calls_today: number } | undefined;
  aiTodayMicros: number | undefined;
  aiTodayRuns: number | undefined;
}) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const spent = (p: string) =>
    (months ?? []).find((m) => m.provider === p && m.month.slice(0, 7) === thisMonth)?.micros ?? 0;
  const lines: { label: string; value: string; share: number | null }[] = [
    {
      label: "DataForSEO, this month",
      value: caps
        ? `${usd(spent("dataforseo"))} of ${usd(caps.dataforseo_usd * 1_000_000)}`
        : usd(spent("dataforseo")),
      share: caps ? capShare(spent("dataforseo"), caps.dataforseo_usd) : null,
    },
    {
      label: "AI Visibility, this month",
      value: caps
        ? `${usd(spent("ai_visibility"))} of ${usd(caps.ai_visibility_usd * 1_000_000)}`
        : usd(spent("ai_visibility")),
      share: caps ? capShare(spent("ai_visibility"), caps.ai_visibility_usd) : null,
    },
    {
      label: "AI answers, last 24 hours",
      value:
        aiTodayMicros === undefined
          ? "-"
          : `${usd(aiTodayMicros)} for ${aiTodayRuns ?? 0} ${aiTodayRuns === 1 ? "answer" : "answers"}`,
      share: null,
    },
    {
      label: "Google Places, today",
      value: places
        ? `${places.calls_today} of ${places.daily_cap} calls${places.daily_cap === 0 ? " (off)" : ""}`
        : "-",
      share:
        places && places.daily_cap > 0
          ? Math.min(100, Math.round((places.calls_today / places.daily_cap) * 100))
          : null,
    },
  ];
  if (monthsError)
    return (
      <p className="mt-3 text-small font-semibold text-bad" role="alert">
        The spend did not load. Open Costs to try again.
      </p>
    );
  return (
    <dl className="mt-3 grid gap-3 sm:grid-cols-2">
      {lines.map((l) => (
        <div key={l.label} className="rounded-inner border border-line p-4">
          <dt className="text-small text-text-2">{l.label}</dt>
          <dd className="mt-1 text-title font-bold tabular-nums">{l.value}</dd>
          {l.share !== null ? (
            <dd className="mt-2">
              <span className="sr-only">{l.share} percent of the cap</span>
              <span aria-hidden className="block h-2 overflow-hidden rounded-full bg-surface-2">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    l.share >= 80 ? "bg-bad" : "bg-text-1",
                  )}
                  style={{ width: `${Math.max(2, l.share)}%` }}
                />
              </span>
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
