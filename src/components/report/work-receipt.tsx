import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SourceLabel } from "@/components/kabsi/d3-account";
import { ExampleBadge, StatusPill, buttonClass } from "@/components/kabsi/ui";
import { cn } from "@/lib/utils";
import { asSentence } from "@/lib/insights";

// The Monday Results Report as a short work receipt (master plan 30.15 section 3.6, V4 item 4; Design 3's WorkReceipt): what
// Kabsi did as chips, what waits for a yes, one next step, then Google's numbers with calls and direction requests apart, each
// block under the label of where it comes from. Drawn from weekly_reports.data.receipt (supabase/functions/_shared/
// results-report/receipt.ts); nothing is invented, and a block with no data is not shown.

type Pair = { this: number; last: number; change: string };
export type ReceiptData = {
  v: number;
  did: { key: string; label: string; count: number }[];
  did_total: number;
  waiting: { count: number; items: { title: string; path: string }[] };
  next_step: { title: string; path: string } | null;
  google: {
    example: boolean;
    views: Pair;
    website_clicks: Pair;
    calls: Pair;
    directions: Pair;
  } | null;
  growth: {
    new_reviews: number;
    link_opens: number;
    by: { message: number; qr: number; tag: number };
  } | null;
  ai: {
    question: string;
    assistant: string;
    asked_on: string;
    named: boolean;
    sources: { domain: string; title: string }[];
    label: string;
  } | null;
  competitor: string | null;
};

const QUIET = "A quiet week. Kabsi kept watching your Google profile.";
const OPEN_NOTE = "An open is not a review.";

const safePath = (p: string | undefined) => (p && p.startsWith("/") ? p : "/app");

function Num({ label, p, sub }: { label: string; p?: Pair; sub?: string }) {
  return (
    <div className="rounded-inner bg-surface-2 p-3">
      <dt className="text-small text-text-2">{label}</dt>
      <dd className="mt-1 font-display text-h3 font-bold">{p ? p.this : sub}</dd>
      {p ? (
        <dd className="text-label font-semibold text-text-2">
          {p.change === "no change"
            ? "no change from the week before"
            : p.change
              ? `${p.change} than the week before`
              : `${p.last} the week before`}
        </dd>
      ) : null}
    </div>
  );
}

export function WorkReceipt({
  r,
  business,
  dates,
  maps,
  headingLevel = "h2",
}: {
  r: ReceiptData;
  business: string;
  dates: string;
  /** The latest check's count line, on the latest report only. */
  maps?: { keyword: string; line: string } | null | undefined;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const id = dates.replace(/\W+/g, "-");
  return (
    <article
      id={`receipt-${id}`}
      className="rounded-card border border-line bg-surface-1 shadow-rest"
      aria-labelledby={`receipt-h-${id}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-small text-text-2">{business}</p>
          <H id={`receipt-h-${id}`} className="font-display text-h3 font-bold">
            Results Report, {dates}
          </H>
        </div>
      </header>

      <div className="grid sm:grid-cols-3 sm:divide-x sm:divide-line">
        <section className="border-b border-line p-4 sm:border-b-0 sm:p-5">
          <h3 className="text-title font-bold">What Kabsi did</h3>
          {r.did.length ? (
            <ul className="mt-3 flex flex-wrap gap-2">
              {r.did.map((d) => (
                <li
                  key={d.key}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ok-soft px-3 text-small font-semibold text-text-1"
                >
                  <Check className="size-4 shrink-0 text-ok" strokeWidth={3} aria-hidden />
                  {d.label}
                  <span className="font-bold">{d.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-body">{QUIET}</p>
          )}
        </section>
        <section className="border-b border-line p-4 sm:border-b-0 sm:p-5">
          <h3 className="text-title font-bold">Waiting for your yes</h3>
          {r.waiting.count ? (
            <>
              <ul className="mt-3 space-y-1">
                {r.waiting.items.map((w) => (
                  <li key={w.title} className="text-body">
                    {w.title}
                  </li>
                ))}
              </ul>
              {r.waiting.count > r.waiting.items.length ? (
                <p className="mt-1 text-small text-text-2">
                  {r.waiting.count - r.waiting.items.length} more on Home.
                </p>
              ) : null}
              <Link
                to={safePath(r.waiting.items[0]?.path) as "/"}
                className={cn(buttonClass("secondary", "md"), "mt-3")}
              >
                Open it
              </Link>
            </>
          ) : (
            <p className="mt-3 text-body">Nothing is waiting for your yes.</p>
          )}
        </section>
        <section className="p-4 sm:p-5">
          <h3 className="text-title font-bold">One next step</h3>
          {r.next_step ? (
            <>
              <p className="mt-3 text-body">{r.next_step.title}</p>
              <Link
                to={safePath(r.next_step.path) as "/"}
                className={cn(buttonClass("tertiary"), "mt-1")}
              >
                Open it
              </Link>
            </>
          ) : (
            <p className="mt-3 text-body text-text-2">Nothing this week.</p>
          )}
        </section>
      </div>

      {r.google || r.growth ? (
        <section className="border-t border-line p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <SourceLabel>From your Google Business Profile</SourceLabel>
            {r.google?.example ? <ExampleBadge /> : null}
          </div>
          <h3 className="sr-only">From your Google Business Profile</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {r.google ? (
              <>
                <Num label="Calls" p={r.google.calls} />
                <Num label="Direction requests" p={r.google.directions} />
                <Num label="Website clicks" p={r.google.website_clicks} />
              </>
            ) : null}
            {r.growth ? <Num label="New reviews" sub={String(r.growth.new_reviews)} /> : null}
          </dl>
        </section>
      ) : null}

      {r.growth ? (
        <section className="border-t border-line p-4 sm:p-5">
          <SourceLabel>From your Kabsi review link</SourceLabel>
          <h3 className="sr-only">From your Kabsi review link</h3>
          <p className="mt-3 text-body">
            Your review link was opened {r.growth.link_opens}{" "}
            {r.growth.link_opens === 1 ? "time" : "times"}. {OPEN_NOTE}
          </p>
        </section>
      ) : null}

      {maps || r.competitor ? (
        <section className="border-t border-line p-4 sm:p-5">
          <SourceLabel>From Kabsi&apos;s Google Maps checks</SourceLabel>
          <h3 className="sr-only">From Kabsi&apos;s Google Maps checks</h3>
          {maps ? (
            <>
              <p className="mt-3 text-body">
                For &lsquo;{maps.keyword}&rsquo;: {maps.line}
              </p>
              <Link
                to="/app/insights"
                className="mt-1 inline-flex min-h-11 items-center text-small font-bold underline underline-offset-4"
              >
                See the places
              </Link>
            </>
          ) : null}
          {r.competitor ? (
            <>
              <p className="mt-3 text-body">{r.competitor}</p>
              <p className="mt-1 text-small text-text-2">
                Kabsi tells you only when something changes that matters.
              </p>
            </>
          ) : null}
        </section>
      ) : null}

      {r.ai ? (
        <section className="border-t border-line p-4 sm:p-5">
          <h3 className="text-title font-bold">An answer customers might see</h3>
          <p className="mt-2 text-small text-text-2">Asked on {r.ai.asked_on}.</p>
          <p className="mt-2 text-small font-bold text-text-2">The question, to {r.ai.assistant}</p>
          <p className="mt-1 text-body font-semibold">&lsquo;{asSentence(r.ai.question)}&rsquo;</p>
          <div className="mt-3">
            {r.ai.named ? (
              <StatusPill tone="ok">Named you</StatusPill>
            ) : (
              <StatusPill tone="info">Did not name you</StatusPill>
            )}
          </div>
          {r.ai.sources.length ? (
            <p className="mt-3 text-small text-text-2">
              Sources it named: {r.ai.sources.map((s) => s.domain).join(", ")}.
            </p>
          ) : null}
          <p className="mt-3 text-label font-semibold text-text-2">{r.ai.label}</p>
        </section>
      ) : null}
    </article>
  );
}
