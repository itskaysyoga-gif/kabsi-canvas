import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation } from "@/lib/onboarding";
import { trackReportOpened } from "@/lib/telemetry";
import { ChevronDown, FileBarChart as PageGlyph } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";
import { CareBottom, CareTop, type CareData } from "@/components/report/care-blocks";

// Weekly reports (D222): the same facts as the Monday email. Read through RLS (members only).
export const Route = createFileRoute("/_authenticated/app/report")({
  head: () => ({
    meta: [{ title: "Weekly Care Report | Kabsi" }, { name: "robots", content: "noindex" }],
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="rounded-card bg-surface-2 p-4">
      <p className="text-small text-text-2">{label}</p>
      <p className="mt-1 text-h3 font-bold">{value}</p>
      {sub ? <p className="mt-0.5 text-small text-text-2">{sub}</p> : null}
    </div>
  );
}

function ReportPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const reports = useQuery({
    queryKey: ["reports", loc?.id],
    queryFn: () => loadReports(loc!.id),
    enabled: !!loc,
  });
  // G-44: the owner opened the report (the latest one on screen), once per report per session.
  const latestId = reports.data?.[0]?.id;
  useEffect(() => {
    if (loc && latestId) trackReportOpened(loc.id, latestId);
  }, [loc, latestId]);
  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
      <Link
        to="/app"
        className="-ml-2 inline-flex min-h-10 items-center rounded-card px-2 text-small font-medium text-text-2 hover:text-text-1"
      >
        ← Home
      </Link>
      <div className="mt-5">
        <PageIcon icon={<PageGlyph />} />
      </div>
      <p className="text-small font-bold uppercase tracking-wider text-text-2">Your week</p>
      <h1 className="mt-1 font-display text-h2 leading-none sm:text-5xl">Weekly report</h1>
      <p className="mt-2 text-text-2">
        Every Monday morning, a short summary of your week on Google. Facts only.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {reports.isLoading ? <p className="mt-6 text-text-2">Loading…</p> : null}
      {reports.data?.length === 0 ? (
        <div className="mt-7 rounded-panel bg-surface-1 p-7 shadow-rest">
          <p className="font-bold">Your first report arrives on Monday.</p>
          <p className="mt-1 text-small text-text-2">It's emailed to you and kept here.</p>
        </div>
      ) : null}
      <div className="mt-7 space-y-5">
        {reports.data?.map(({ id, data: r }, i) =>
          i === 0 ? (
            <article key={id} className="rounded-panel bg-surface-1 p-6 shadow-rest sm:p-7">
              <p className="text-small font-bold uppercase tracking-wider text-text-2">
                Latest · {r.period.from} to {r.period.to}
              </p>
              <ReportBody r={r} latest />
            </article>
          ) : (
            <details key={id} className="group rounded-panel bg-surface-1 shadow-rest">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 sm:px-7">
                <span className="font-medium">
                  {r.period.from} to {r.period.to}
                </span>
                <span className="flex items-center gap-3 text-small text-text-2">
                  {r.rating != null ? `${r.rating.toFixed(1)} ★` : ""} · {r.new_reviews} new
                  <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                </span>
              </summary>
              <div className="px-6 pb-6 sm:px-7">
                <ReportBody r={r} latest={false} />
              </div>
            </details>
          ),
        )}
      </div>
    </div>
  );
}

function ReportBody({ r, latest }: { r: ReportData; latest: boolean }) {
  return (
    <>
      <CareTop r={r} />
      {r.rating_drop && r.rating_change != null ? (
        <p className="mt-3 rounded-card border-2 border-text-1 p-3 text-small">
          Your Google rating went down {Math.abs(r.rating_change).toFixed(1)} this week.
        </p>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          sub={r.taps.total ? `${r.taps.nfc} tap · ${r.taps.qr} QR` : undefined}
        />
      </div>
      <p className="mt-3 text-label leading-5 text-text-2">
        Opens count how often your review page was opened, not how many reviews were written.
      </p>
      {latest && r.waiting ? (
        <p className="mt-4 text-small">
          {r.waiting} {r.waiting === 1 ? "review is" : "reviews are"} waiting for your reply.{" "}
          <Link
            to="/app/reviews"
            search={{ f: "needs" }}
            className="inline-flex min-h-10 items-center font-bold underline underline-offset-4"
          >
            Reply now
          </Link>
        </p>
      ) : null}
      <CareBottom r={r} latest={latest} />
    </>
  );
}
