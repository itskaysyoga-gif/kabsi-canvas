import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { SourceLabel } from "@/components/kabsi/d3-account";
import { ExampleBadge, buttonClass } from "@/components/kabsi/ui";
import { cn } from "@/lib/utils";

// The monthly report (PROOF-2, blueprint section 8): three bands, Work done, Results, What is next, then what customers
// mention when 3 or more reviews say the same thing. Drawn from monthly_reports.data (supabase/functions/_shared/monthly-report/
// compose.ts). The server stores the words with the numbers, so this page never words a number itself and the page, the email and
// the message say the same thing. Google's own lines sit under `google` and are removed after 30 days; a month without them
// shows Kabsi's own lines only. Nearby businesses are read live when the email is made and are not kept, so they are not here.

export type MonthlyData = {
  v: number;
  month_of: string;
  label: string;
  business: string;
  work: { did: { key: string; label: string; count: number }[]; total: number; lines: string[] };
  results: { taps: { total: number; lines: string[] } };
  next: { title: string; path: string }[];
  google?: { example: boolean; results: string[]; feedback: { line: string }[] };
};
export type MonthlyRow = { id: string; month_of: string; data: MonthlyData };

const safePath = (p: string | undefined) => (p && p.startsWith("/") ? p : "/app");
const NOTHING = "Nothing to show yet. The numbers fill in once Google shares them.";

export function MonthlyReport({
  r,
  headingLevel = "h2",
}: {
  r: MonthlyData;
  headingLevel?: "h2" | "h3";
}) {
  const H = headingLevel;
  const id = `monthly-${r.month_of}`;
  const results = [...(r.google?.results ?? []), ...r.results.taps.lines];
  const feedback = r.google?.feedback ?? [];
  return (
    <article
      id={id}
      className="rounded-card border border-line bg-surface-1 shadow-rest"
      aria-labelledby={`${id}-h`}
    >
      <header className="border-b border-line p-4 sm:p-5">
        <p className="text-small text-text-2">{r.business}</p>
        <H id={`${id}-h`} className="font-display text-h3 font-bold">
          Your monthly report, {r.label}
        </H>
      </header>

      <section className="border-b border-line p-4 sm:p-5">
        <h3 className="text-title font-bold">Work done</h3>
        {r.work.did.length ? (
          <ul className="mt-3 flex flex-wrap gap-2">
            {r.work.did.map((d) => (
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
        ) : null}
        <ul className="mt-3 space-y-1 text-body">
          {r.work.lines
            .filter((l) => !r.work.did.some((d) => l === `${d.label}: ${d.count}`))
            .map((l) => (
              <li key={l}>{l}</li>
            ))}
        </ul>
      </section>

      <section className="border-b border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-title font-bold">Results</h3>
          {r.google?.example ? <ExampleBadge /> : null}
        </div>
        {r.google?.results.length ? (
          <>
            <SourceLabel className="mt-3">From your Google Business Profile</SourceLabel>
            <ul className="mt-2 space-y-1 text-body">
              {r.google.results.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        ) : null}
        {r.results.taps.lines.length ? (
          <>
            <SourceLabel className="mt-3">From your Kabsi links and cards</SourceLabel>
            <ul className="mt-2 space-y-1 text-body">
              {r.results.taps.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </>
        ) : null}
        {!results.length ? <p className="mt-3 text-body text-text-2">{NOTHING}</p> : null}
      </section>

      {feedback.length ? (
        <section className="border-b border-line p-4 sm:p-5">
          <h3 className="text-title font-bold">What customers mention</h3>
          <ul className="mt-3 space-y-1 text-body">
            {feedback.map((f) => (
              <li key={f.line}>{f.line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="p-4 sm:p-5">
        <h3 className="text-title font-bold">What is next</h3>
        {r.next.length ? (
          <ul className="mt-3 space-y-3">
            {r.next.map((n) => (
              <li key={n.title}>
                <p className="text-body">{n.title}</p>
                <Link to={safePath(n.path) as "/"} className={cn(buttonClass("tertiary"), "mt-1")}>
                  Open it
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-body text-text-2">Nothing needs you right now.</p>
        )}
      </section>
    </article>
  );
}
