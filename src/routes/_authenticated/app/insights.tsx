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
    <span className="rounded-full bg-kb-amber-soft px-2.5 py-0.5 text-xs font-bold text-kb-amber">
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
    <div className="rounded-card bg-kb-sand p-4">
      <p className="flex items-center justify-between gap-2 text-sm text-kb-stone">
        <span>{label}</span>
        {example ? <ExampleTag /> : null}
      </p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString("en-US")}</p>
      {sub ? <p className="mt-0.5 text-sm text-kb-stone">{sub}</p> : null}
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
        className="-ml-2 inline-flex min-h-10 items-center rounded-card px-2 text-sm font-medium text-kb-stone hover:text-kb-black"
      >
        ← Home
      </Link>
      <div className="mt-5">
        <PageIcon icon={<PageGlyph />} />
      </div>
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">
        Your Google profile
      </p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Insights</h1>
      <p className="mt-2 text-kb-stone">
        How people used your Google profile. Kabsi says what changed, never why.
      </p>

      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {insights.isLoading ? <p className="mt-6 text-kb-stone">Loading…</p> : null}
      {insights.isError ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb" role="alert">
          <p className="font-bold">Your figures could not be read just now.</p>
          <p className="mt-1 text-sm text-kb-stone">
            {insights.error instanceof Error ? insights.error.message : "Try again in a moment."}
          </p>
          <Button variant="outline" className="mt-3" onClick={() => void insights.refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {a && !a.available ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <p className="font-bold">Your figures appear once Kabsi is connected to your profile.</p>
          <p className="mt-1 text-sm text-kb-stone">
            Until then there is nothing to show, and Kabsi does not guess.
          </p>
        </div>
      ) : null}
      {a?.available && a.summary ? <Figures a={a} /> : null}

      <Link
        to="/app/report"
        className="mt-6 block rounded-large bg-kb-white p-5 shadow-kb hover:bg-kb-sand sm:p-6"
      >
        <p className="font-bold">Your Weekly Care Reports</p>
        <p className="mt-1 text-sm text-kb-stone">
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
      <section className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-7" aria-live="polite">
        {a.example ? (
          <p className="mb-3 flex flex-wrap items-center gap-2 text-sm text-kb-stone">
            <ExampleTag /> Example figures. Yours appear once Kabsi is connected to your profile.
          </p>
        ) : null}
        <p className="font-display text-2xl leading-tight sm:text-4xl">{s.headline}</p>
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
      <p className="mt-3 text-xs leading-5 text-kb-stone">
        {s.periods.kind === "month_so_far"
          ? `${s.periods.this_label} so far, against the same days of ${s.periods.last_label}.`
          : `${s.periods.this_label} against ${s.periods.last_label}.`}{" "}
        Google's figures can be a day or two behind.
      </p>

      <details className="group mt-5 rounded-large bg-kb-white shadow-kb">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-bold sm:px-7">
          See details
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 px-6 pb-6 sm:px-7">
          <DailyChart title="Calls" points={s.daily} pick={(p) => p.calls} />
          <DailyChart title="Website clicks" points={s.daily} pick={(p) => p.website_clicks} />
          <DailyChart title="Direction requests" points={s.daily} pick={(p) => p.directions} />
          <DailyChart title="Times your profile was seen" points={s.daily} pick={(p) => p.views} />
          <details className="rounded-card border border-kb-hairline">
            <summary className="flex min-h-12 cursor-pointer items-center px-4 text-sm font-bold">
              Show the numbers as a table
            </summary>
            <div className="overflow-x-auto px-4 pb-4">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-kb-stone">
                    <th className="py-2 pr-3 font-medium">Day</th>
                    <th className="py-2 pr-3 font-medium">Calls</th>
                    <th className="py-2 pr-3 font-medium">Website</th>
                    <th className="py-2 pr-3 font-medium">Directions</th>
                    <th className="py-2 font-medium">Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {s.daily.map((d) => (
                    <tr key={d.date} className="border-t border-kb-hairline">
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

      <section className="mt-5 rounded-large bg-kb-white p-6 shadow-kb sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl">
            How people found you{a.terms ? ` in ${a.terms.month_label}` : ""}
          </h2>
          {a.example && a.terms ? <ExampleTag /> : null}
        </div>
        {a.terms ? (
          <>
            <p className="mt-1 text-sm text-kb-stone">
              The words people searched on Google before they saw your profile. Google shares them
              once a month.
            </p>
            {a.terms.items.length === 0 ? (
              <p className="mt-4 text-sm">
                Google has not shared any search terms for {a.terms.month_label}.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-kb-hairline">
                {a.terms.items.map((t) => (
                  <li key={t.term} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="min-w-0 break-words">{t.term}</span>
                    <span className="shrink-0 font-bold">{termCountText(t)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs leading-5 text-kb-stone">
              Google shows "fewer than 15" instead of a number when only a few people searched.
            </p>
          </>
        ) : (
          <div className="mt-3 rounded-card bg-kb-sand p-4 text-sm leading-6" role="status">
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
