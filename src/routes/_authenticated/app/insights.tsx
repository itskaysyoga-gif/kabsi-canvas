import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 as PageGlyph, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageIcon } from "@/components/shared/page-icon";
import { DailyChart } from "@/components/insights/daily-chart";
import { compareText, loadInsights, termCountText, type InsightsAnswer } from "@/lib/insights";
import { myLatestLocation } from "@/lib/onboarding";

// Insights (P0.5-05, K-26, K-138): one sentence, the tiles, the daily charts behind "See details", and on Pro the
// search terms of the last full month. Nothing is stored: the figures are read from Google when this opens.
export const Route = createFileRoute("/_authenticated/app/insights")({
  head: () => ({
    meta: [{ title: "Insights | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: InsightsPage,
});

function ExampleTag() {
  return (
    <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-label font-bold text-warn">
      Example
    </span>
  );
}

function Tile({
  label,
  value,
  sub,
  example,
}: {
  label: string;
  value: number;
  sub: string;
  example: boolean;
}) {
  return (
    <div className="rounded-card bg-surface-2 p-4">
      <p className="flex items-center justify-between gap-2 text-small text-text-2">
        <span>{label}</span>
        {example ? <ExampleTag /> : null}
      </p>
      <p className="mt-1 text-h3 font-bold">{value.toLocaleString("en-US")}</p>
      {sub ? <p className="mt-0.5 text-small text-text-2">{sub}</p> : null}
    </div>
  );
}

function InsightsPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const insights = useQuery({
    queryKey: ["insights", loc?.id],
    queryFn: () => loadInsights(loc!.id),
    enabled: !!loc,
    staleTime: 5 * 60_000,
    retry: false,
  });
  const a = insights.data;
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
      <p className="text-small font-bold uppercase tracking-wider text-text-2">
        Your Google profile
      </p>
      <h1 className="mt-1 font-display text-h2 leading-none sm:text-5xl">Insights</h1>
      <p className="mt-2 text-text-2">
        How people used your Google profile. Kabsi says what changed, never why.
      </p>

      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {insights.isLoading ? <p className="mt-6 text-text-2">Loading…</p> : null}
      {insights.isError ? (
        <div className="mt-7 rounded-panel bg-surface-1 p-6 shadow-rest" role="alert">
          <p className="font-bold">Your figures could not be read just now.</p>
          <p className="mt-1 text-small text-text-2">
            {insights.error instanceof Error ? insights.error.message : "Try again in a moment."}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => void insights.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {a && !a.available ? (
        <div className="mt-7 rounded-panel bg-surface-1 p-6 shadow-rest">
          <p className="font-bold">Your figures appear once Kabsi is connected to your profile.</p>
          <p className="mt-1 text-small text-text-2">
            Until then there is nothing to show, and Kabsi does not guess.
          </p>
        </div>
      ) : null}
      {a?.available && a.summary ? <Figures a={a} /> : null}

      <Link
        to="/app/report"
        className="mt-6 block rounded-panel bg-surface-1 p-5 shadow-rest hover:bg-surface-2 sm:p-6"
      >
        <p className="font-bold">Your Weekly Care Reports</p>
        <p className="mt-1 text-small text-text-2">
          A short summary every Monday morning. The latest and the older ones are kept here.
        </p>
      </Link>
    </div>
  );
}

function Figures({ a }: { a: InsightsAnswer }) {
  const s = a.summary!;
  const against = s.periods.kind === "month_so_far" ? "last month" : s.periods.last_label;
  return (
    <>
      <section
        className="mt-7 rounded-panel bg-surface-1 p-6 shadow-rest sm:p-7"
        aria-live="polite"
      >
        {a.example ? (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-small text-text-2">
            <ExampleTag /> Example figures. Yours appear once Kabsi is connected to your profile.
          </p>
        ) : null}
        <p className="font-display text-h3 leading-tight sm:text-h2">{s.headline}</p>
      </section>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {s.tiles.map((t) => (
          <Tile
            key={t.key}
            label={t.label}
            value={t.this}
            sub={compareText(t.change, against)}
            example={a.example}
          />
        ))}
      </div>
      <p className="mt-3 text-label leading-5 text-text-2">
        {s.periods.kind === "month_so_far"
          ? `${s.periods.this_label} so far, against the same days of ${s.periods.last_label}.`
          : `${s.periods.this_label} against ${s.periods.last_label}.`}{" "}
        Google's figures can be a day or two behind.
      </p>

      <details className="group mt-5 rounded-panel bg-surface-1 shadow-rest">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-bold sm:px-7">
          See details
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 px-6 pb-6 sm:px-7">
          <DailyChart title="Calls" points={s.daily} pick={(p) => p.calls} />
          <DailyChart title="Website clicks" points={s.daily} pick={(p) => p.website_clicks} />
          <DailyChart title="Direction requests" points={s.daily} pick={(p) => p.directions} />
          <DailyChart title="Times your profile was seen" points={s.daily} pick={(p) => p.views} />
          <details className="rounded-card border border-line">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 text-small font-bold">
              Show the numbers as a table
            </summary>
            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full text-left text-small">
                <thead>
                  <tr className="text-text-2">
                    <th className="py-2 pr-3 font-medium">Day</th>
                    <th className="py-2 pr-3 font-medium">Calls</th>
                    <th className="py-2 pr-3 font-medium">Website</th>
                    <th className="py-2 pr-3 font-medium">Directions</th>
                    <th className="py-2 font-medium">Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {s.daily.map((d) => (
                    <tr key={d.date} className="border-t border-line">
                      <td className="py-1.5 pr-3">{d.date}</td>
                      <td className="py-1.5 pr-3">{d.calls}</td>
                      <td className="py-1.5 pr-3">{d.website_clicks}</td>
                      <td className="py-1.5 pr-3">{d.directions}</td>
                      <td className="py-1.5">{d.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </details>

      <section className="mt-5 rounded-panel bg-surface-1 p-6 shadow-rest sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-h3">
            How people found you{a.terms ? ` in ${a.terms.month_label}` : ""}
          </h2>
          {a.example && a.terms ? <ExampleTag /> : null}
        </div>
        {a.terms ? (
          <>
            <p className="mt-1 text-small text-text-2">
              The words people searched on Google before they saw your profile. Google shares them
              once a month.
            </p>
            {a.terms.items.length === 0 ? (
              <p className="mt-4 text-small">
                Google has not shared any search terms for {a.terms.month_label}.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {a.terms.items.map((t) => (
                  <li key={t.term} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="min-w-0 break-words">{t.term}</span>
                    <span className="shrink-0 font-bold">{termCountText(t)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-label leading-5 text-text-2">
              Google shows "fewer than 15" instead of a number when only a few people searched.
            </p>
          </>
        ) : (
          <div className="mt-3 rounded-card bg-surface-2 p-4 text-small leading-6" role="status">
            <p className="font-bold">The search terms report is part of Pro.</p>
            <Link
              to="/app/plan"
              className="mt-1 inline-block font-bold underline underline-offset-4"
            >
              See your plan
            </Link>
          </div>
        )}
      </section>
    </>
  );
}
