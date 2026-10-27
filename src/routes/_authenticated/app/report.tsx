import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { trackReportOpened } from "@/lib/telemetry";
import { loadNearby } from "@/lib/insights";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { CareBottom, CareTop, type CareData } from "@/components/report/care-blocks";
import { WorkReceipt, type ReceiptData } from "@/components/report/work-receipt";

// Reports (UX 1, Design 3): the Monday Results Report as a work receipt (V4's data.receipt), then the earlier ones, the last
// 12 weeks. Reports from before V4 have no receipt and keep their older blocks. Read through RLS (members only).
export const Route = createFileRoute("/_authenticated/app/report")({
  head: () => ({
    meta: [{ title: "Reports | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: ReportPage,
});

type ReportData = {
  period: { from: string; to: string };
  rating: number | null;
  rating_count: number | null;
  rating_change: number | null;
  rating_drop: boolean;
  new_reviews: number;
  new_avg: number | null;
  replied: number;
  waiting: number;
  taps: { total: number; nfc: number; qr: number };
  quotes?: string[]; // older reports only; no longer shown (K-113.3, R-19)
  receipt?: ReceiptData;
} & CareData;
type Row = { id: string; week_of: string; data: ReportData };

async function loadReports(locationId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from("weekly_reports")
    .select("id, week_of, data")
    .eq("location_id", locationId)
    .order("week_of", { ascending: false })
    .limit(12);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

const dates = (r: ReportData) => `${r.period.from} to ${r.period.to}`;

function ReportPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reports = useQuery({
    queryKey: ["reports", loc?.id],
    queryFn: () => loadReports(loc!.id),
    enabled: !!loc,
  });
  const nearby = useQuery({
    queryKey: ["nearby", loc?.id],
    queryFn: () => loadNearby(loc!.id, loc!.name),
    enabled: !!loc,
  });
  // G-44: the owner opened the report (the latest one on screen), once per report per session.
  const latestId = reports.data?.[0]?.id;
  useEffect(() => {
    if (loc && latestId) trackReportOpened(loc.id, latestId);
  }, [loc, latestId]);
  const n = nearby.data;
  const maps =
    n?.state === "done" && n.countLine && n.check
      ? { keyword: n.check.keyword, line: n.countLine }
      : null;
  const [latest, ...earlier] = reports.data ?? [];

  return (
    <>
      <AccountTop title="Reports" lead="Every Monday on WhatsApp. The last 12 weeks are here." />
      {!location.isLoading && !loc ? (
        <Link to="/start" className={buttonClass()} data-main-cta>
          Add your business
        </Link>
      ) : null}
      {location.isLoading || reports.isLoading ? (
        <div
          className="rounded-card border border-line bg-surface-1 p-5"
          role="status"
          aria-label="Loading"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ) : null}
      {reports.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void reports.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : null}
      {reports.data?.length === 0 ? (
        <EmptyState icon={FileText} title="Your first report comes on Monday.">
          It shows what Kabsi did, what waits for your yes and one next step.
        </EmptyState>
      ) : null}
      {latest && loc ? (
        latest.data.receipt ? (
          <WorkReceipt
            r={latest.data.receipt}
            business={loc.name}
            dates={dates(latest.data)}
            maps={maps}
          />
        ) : (
          <Panel title={`Results Report, ${dates(latest.data)}`} id="latest">
            <OlderBody r={latest.data} latest />
          </Panel>
        )
      ) : null}
      {earlier.length && loc ? (
        <Panel title="Earlier reports" id="earlier" className="mt-4">
          <ul className="divide-y divide-line">
            {earlier.map(({ id, data: r }) => (
              <li key={id}>
                <details className="group">
                  <summary className="press flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 py-2 text-body font-semibold [&::-webkit-details-marker]:hidden">
                    Results Report, {dates(r)}
                    <ChevronDown
                      className="size-5 shrink-0 text-text-2 transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="pb-4">
                    {r.receipt ? (
                      <WorkReceipt
                        r={r.receipt}
                        business={loc.name}
                        dates={dates(r)}
                        headingLevel="h3"
                      />
                    ) : (
                      <OlderBody r={r} latest={false} />
                    )}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="rounded-inner bg-surface-2 p-3">
      <dt className="text-small text-text-2">{label}</dt>
      <dd className="mt-1 font-display text-h3 font-bold">{value}</dd>
      {sub ? <dd className="text-label font-semibold text-text-2">{sub}</dd> : null}
    </div>
  );
}

/** A report from before V4's work receipt: its own blocks, as they were sent. */
function OlderBody({ r, latest }: { r: ReportData; latest: boolean }) {
  return (
    <>
      <CareTop r={r} />
      {r.rating_drop && r.rating_change != null ? (
        <p className="mt-3 rounded-inner bg-warn-soft p-3 text-small">
          Your Google rating went down {Math.abs(r.rating_change).toFixed(1)} this week.
        </p>
      ) : null}
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Google rating"
          value={r.rating == null ? "-" : r.rating.toFixed(1)}
          sub={
            r.rating_change == null
              ? r.rating_count != null
                ? `${r.rating_count} reviews`
                : undefined
              : r.rating_change === 0
                ? "no change"
                : `${r.rating_change > 0 ? "+" : ""}${r.rating_change.toFixed(1)} this week`
          }
        />
        <Stat
          label="New reviews"
          value={String(r.new_reviews)}
          sub={r.new_avg != null ? `average ${r.new_avg.toFixed(1)}` : undefined}
        />
        <Stat label="Replied" value={`${r.replied} of ${r.new_reviews}`} />
        <Stat
          label="Card and link opens"
          value={String(r.taps.total)}
          sub={r.taps.total ? `${r.taps.nfc} tap, ${r.taps.qr} QR` : undefined}
        />
      </dl>
      <p className="mt-3 text-label font-semibold text-text-2">
        Opens count how often your review page was opened, not how many reviews were written.
      </p>
      {latest && r.waiting ? (
        <p className="mt-4 text-small">
          {r.waiting} {r.waiting === 1 ? "review is" : "reviews are"} waiting for your reply.{" "}
          <Link
            to="/app/reviews"
            search={{ f: "needs" }}
            className="inline-flex min-h-11 items-center font-bold underline underline-offset-4"
          >
            Reply now
          </Link>
        </p>
      ) : null}
      <CareBottom r={r} latest={latest} />
    </>
  );
}
