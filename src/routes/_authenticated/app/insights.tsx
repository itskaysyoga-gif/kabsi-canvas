import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Sparkles } from "lucide-react";
import { AccountTop, Panel, SourceLabel } from "@/components/kabsi/d3-account";
import { HeldBack, useFirstTaskDone } from "@/components/kabsi/d3-settings-parts";
import {
  Button,
  buttonClass,
  EmptyState,
  ErrorState,
  ExampleBadge,
  Skeleton,
  StatusPill,
} from "@/components/kabsi/ui";
import { NearbyPlaces } from "@/components/kabsi/nearby-places";
import { DailyChart } from "@/components/insights/daily-chart";
import {
  AI_LABEL,
  asSentence,
  compareText,
  loadAiAnswer,
  loadInsights,
  loadNearby,
  loadRivalLine,
  termCountText,
  type AiAnswerView,
  type InsightsAnswer,
  type NearbyState,
} from "@/lib/insights";
import { myLatestLocation } from "@/lib/onboarding";
import { WHATSAPP_ON } from "@/lib/site";

// Where you show up (UX 1, Design 3; master plan 30.15 sections 2, 3.8 and 3.9): Kabsi's own checks first (the nearby
// places from the latest visibility scan, the latest AI answer, Competitor Watch only when something changed that matters),
// then Google's own performance numbers, labelled apart (P0.5-05, K-26, K-138). AI answers and competitors open after the
// first task is done (V4). Nothing here is invented: a part with no data is not shown.
export const Route = createFileRoute("/_authenticated/app/insights")({
  head: () => ({
    meta: [{ title: "Where you show up | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: InsightsPage,
});

const FIRST_CHECK = WHATSAPP_ON
  ? "Kabsi searches from 49 places around your business, like a customer. It takes a few minutes, and the result comes to WhatsApp too."
  : "Kabsi searches from 49 places around your business, like a customer. It takes a few minutes.";

function Loading() {
  return (
    <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
        </div>
      ))}
    </div>
  );
}

function InsightsPage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const open = useFirstTaskDone(loc?.id);
  const nearby = useQuery({
    queryKey: ["nearby", loc?.id],
    queryFn: () => loadNearby(loc!.id, loc!.name),
    enabled: !!loc,
  });
  const ai = useQuery({
    queryKey: ["ai-answer", loc?.id],
    queryFn: () => loadAiAnswer(loc!.id),
    enabled: !!loc && open === true,
  });
  const rival = useQuery({
    queryKey: ["rival-line", loc?.id],
    queryFn: () => loadRivalLine(loc!.id),
    enabled: !!loc && open === true,
  });

  return (
    <>
      <AccountTop
        title="Where you show up"
        lead="Kabsi's own checks of public Google Maps and AI answers."
      />
      {!location.isLoading && !loc ? (
        <Link to="/start" className={buttonClass()} data-main-cta>
          Add your business
        </Link>
      ) : null}
      {location.isLoading || nearby.isLoading ? <Loading /> : null}
      {nearby.isError ? (
        <ErrorState title="This page did not load." onRetry={() => void nearby.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : null}
      {loc && nearby.data ? (
        <div className="space-y-4">
          <MapsPanel n={nearby.data} />
          {open === false ? (
            <Panel title="AI answers and competitors" id="held-back">
              <HeldBack />
            </Panel>
          ) : null}
          {open && ai.data ? <AiPanel a={ai.data} /> : null}
          {open && rival.data ? (
            <Panel title="Competitors" id="competitors">
              <SourceLabel>From Kabsi&apos;s Google Maps checks</SourceLabel>
              <p className="mt-3 text-body">{rival.data}</p>
              <p className="mt-1 text-small text-text-2">
                Kabsi tells you only when something changes that matters.
              </p>
            </Panel>
          ) : null}
        </div>
      ) : null}
      {loc ? <GoogleNumbers locationId={loc.id} /> : null}
    </>
  );
}

function MapsPanel({ n }: { n: NearbyState }) {
  if (n.state === "none" || n.state === "running")
    return (
      <EmptyState icon={Sparkles} title="Your first check is running.">
        {FIRST_CHECK}
      </EmptyState>
    );
  if (n.state === "failed")
    return (
      <EmptyState icon={Sparkles} title="Your first check did not finish.">
        Kabsi tries again on its own. Nothing changed on Google.
      </EmptyState>
    );
  return (
    <Panel title="Google Maps" id="maps">
      <SourceLabel>From Kabsi&apos;s Google Maps checks</SourceLabel>
      {n.check ? (
        <NearbyPlaces
          check={n.check}
          example={false}
          title="h3"
          className="mt-4 max-w-[36rem] shadow-none ring-1 ring-line"
        />
      ) : n.countLine ? (
        <p className="mt-3 text-body">{n.countLine}</p>
      ) : null}
    </Panel>
  );
}

function AiPanel({ a }: { a: AiAnswerView }) {
  const long = (a.answer?.length ?? 0) > 360;
  return (
    <Panel title="An answer customers might see" id="ai">
      <p className="text-small text-text-2">
        Asked on {a.askedOn}, {a.every}.
      </p>
      <div className="mt-3 rounded-inner bg-surface-2 p-4">
        <p className="text-small font-bold text-text-2">The question, to {a.assistant}</p>
        <p className="mt-1 text-body font-semibold">&lsquo;{asSentence(a.question)}&rsquo;</p>
        {a.answer ? (
          <>
            <p className="mt-4 text-small font-bold text-text-2">The answer</p>
            {long ? (
              <details className="group mt-1">
                <summary className="cursor-pointer list-none text-body [&::-webkit-details-marker]:hidden">
                  <span className="group-open:hidden">{a.answer.slice(0, 340).trimEnd()} ...</span>
                  <span className="mt-1 flex min-h-11 items-center gap-1 text-small font-bold underline underline-offset-4 group-open:hidden">
                    Read the whole answer
                    <ChevronDown className="size-4" aria-hidden />
                  </span>
                </summary>
                <p className="whitespace-pre-line break-words text-body">{a.answer}</p>
              </details>
            ) : (
              <p className="mt-1 whitespace-pre-line break-words text-body">{a.answer}</p>
            )}
          </>
        ) : null}
        {a.named !== null ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {a.named ? (
              <StatusPill tone="ok">Named you</StatusPill>
            ) : (
              <StatusPill tone="info">Did not name you</StatusPill>
            )}
          </div>
        ) : null}
        {a.sources.length ? (
          <p className="mt-4 text-small text-text-2">Sources it named: {a.sources.join(", ")}.</p>
        ) : null}
      </div>
      <p className="mt-3 text-label font-semibold text-text-2">{AI_LABEL}</p>
    </Panel>
  );
}

/* ---------- From your Google Business Profile (Insights, P0.5-05) ---------- */

function GoogleNumbers({ locationId }: { locationId: string }) {
  const insights = useQuery({
    queryKey: ["insights", locationId],
    queryFn: () => loadInsights(locationId),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const a = insights.data;
  return (
    <section className="mt-10" aria-labelledby="gbp">
      <h2 id="gbp" className="font-display text-h3 font-bold">
        From your Google Business Profile
      </h2>
      <p className="mt-1 text-small text-text-2">
        How people used your Google profile. Kabsi says what changed, never why.
      </p>
      <div className="mt-4">
        {insights.isLoading ? <Loading /> : null}
        {insights.isError ? (
          <Panel>
            <div role="alert">
              <p className="text-body font-bold">Your figures could not be read just now.</p>
              <p className="mt-1 text-small text-text-2">
                {insights.error instanceof Error
                  ? insights.error.message
                  : "Try again in a moment."}
              </p>
              <Button
                variant="secondary"
                size="md"
                className="mt-3"
                onClick={() => void insights.refetch()}
              >
                Try again
              </Button>
            </div>
          </Panel>
        ) : null}
        {a && !a.available ? (
          <Panel>
            <p className="text-body font-bold">
              Your figures appear once Kabsi is connected to your profile.
            </p>
            <p className="mt-1 text-small text-text-2">
              Until then there is nothing to show, and Kabsi does not guess.
            </p>
          </Panel>
        ) : null}
        {a?.available && a.summary ? <Figures a={a} /> : null}
      </div>
    </section>
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
    <div className="rounded-inner bg-surface-2 p-3 sm:p-4">
      <dt className="flex flex-wrap items-center justify-between gap-2 text-small text-text-2">
        <span>{label}</span>
        {example ? <ExampleBadge /> : null}
      </dt>
      <dd className="mt-1 font-display text-h3 font-bold">{value.toLocaleString("en-US")}</dd>
      {sub ? <dd className="text-label font-semibold text-text-2">{sub}</dd> : null}
    </div>
  );
}

function Figures({ a }: { a: InsightsAnswer }) {
  const s = a.summary!;
  const against = s.periods.kind === "month_so_far" ? "last month" : s.periods.last_label;
  return (
    <div className="space-y-4">
      <Panel>
        <SourceLabel>From your Google Business Profile</SourceLabel>
        {a.example ? (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-small text-text-2">
            <ExampleBadge /> Example figures. Yours appear once Kabsi is connected to your profile.
          </p>
        ) : null}
        <p className="mt-3 font-display text-h3 font-bold leading-tight" aria-live="polite">
          {s.headline}
        </p>
        {/* Calls and direction requests each have their own tile, never added together (30.15 3.6). */}
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {s.tiles.map((t) => (
            <Tile
              key={t.key}
              label={t.label}
              value={t.this}
              sub={compareText(t.change, against)}
              example={a.example}
            />
          ))}
        </dl>
        <p className="mt-3 text-label font-semibold text-text-2">
          {s.periods.kind === "month_so_far"
            ? `${s.periods.this_label} so far, against the same days of ${s.periods.last_label}.`
            : `${s.periods.this_label} against ${s.periods.last_label}.`}{" "}
          Google&apos;s figures can be a day or two behind.
        </p>
        <details className="group mt-4 border-t border-line pt-1">
          <summary className="press flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-small font-bold [&::-webkit-details-marker]:hidden">
            See details
            <ChevronDown
              className="size-5 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="space-y-3 pt-2">
            <DailyChart title="Calls" points={s.daily} pick={(p) => p.calls} />
            <DailyChart title="Direction requests" points={s.daily} pick={(p) => p.directions} />
            <DailyChart title="Website clicks" points={s.daily} pick={(p) => p.website_clicks} />
            <DailyChart
              title="Times your profile was seen"
              points={s.daily}
              pick={(p) => p.views}
            />
            <details className="rounded-inner border border-line">
              <summary className="flex min-h-11 cursor-pointer items-center px-4 text-small font-bold">
                Show the numbers as a table
              </summary>
              <div className="overflow-x-auto px-4 pb-4">
                <table className="w-full text-start text-small">
                  <thead>
                    <tr className="text-text-2">
                      <th className="py-2 pe-3 text-start font-semibold">Day</th>
                      <th className="py-2 pe-3 text-start font-semibold">Calls</th>
                      <th className="py-2 pe-3 text-start font-semibold">Directions</th>
                      <th className="py-2 pe-3 text-start font-semibold">Website</th>
                      <th className="py-2 text-start font-semibold">Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.daily.map((d) => (
                      <tr key={d.date} className="border-t border-line">
                        <td className="py-1.5 pe-3">{d.date}</td>
                        <td className="py-1.5 pe-3">{d.calls}</td>
                        <td className="py-1.5 pe-3">{d.directions}</td>
                        <td className="py-1.5 pe-3">{d.website_clicks}</td>
                        <td className="py-1.5">{d.views}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
        </details>
      </Panel>

      <Panel
        title={`How people found you${a.terms ? ` in ${a.terms.month_label}` : ""}`}
        id="terms"
        action={a.example && a.terms ? <ExampleBadge /> : undefined}
      >
        {a.terms ? (
          <>
            <p className="text-small text-text-2">
              The words people searched on Google before they saw your profile. Google shares them
              once a month.
            </p>
            {a.terms.items.length === 0 ? (
              <p className="mt-4 text-small">
                Google has not shared any search terms for {a.terms.month_label}.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {a.terms.items.map((t) => (
                  <li key={t.term} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="min-w-0 break-words text-body">{t.term}</span>
                    <span className="shrink-0 text-body font-bold">{termCountText(t)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-label font-semibold text-text-2">
              Google shows &quot;fewer than 15&quot; instead of a number when only a few people
              searched.
            </p>
          </>
        ) : (
          <div className="rounded-inner bg-surface-2 p-4 text-small" role="status">
            <p className="font-bold">The search terms report is part of Pro.</p>
            <Link
              to="/app/plan"
              className="mt-1 inline-flex min-h-11 items-center font-bold underline underline-offset-4"
            >
              See your plan
            </Link>
          </div>
        )}
      </Panel>
    </div>
  );
}
