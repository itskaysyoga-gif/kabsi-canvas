import { Link } from "@tanstack/react-router";
import { ExampleBadge, buttonClass } from "@/components/kabsi/ui";

// The Results Report's older blocks, for reports sent before V4's work receipt (P0.5-04, K-28, K-72): what Kabsi did, counted from the audit log; the customer
// activity (Google's numbers, kept for 30 days at most); what needs the owner; the Profile Coach's plan; the time saved, an
// estimate with its formula one tap away; and, on Pro, how people found the profile. Reports from before it have none.
export type CareLine = { title: string; path: string };
type Pair = { this: number; last: number; change: string };
export type CareData = {
  care?: {
    headline: string;
    things: number;
    profile_line: string;
    counts: {
      posts_published: number;
      hours_updates: number;
      profile_updates: number;
      photos_published: number;
    };
  };
  time_saved?: {
    minutes: number;
    words: string;
    formula: string;
    parts: { label: string; count: number; minutes_each: number; minutes: number }[];
  };
  needs?: CareLine[];
  needs_total?: number;
  plan?: CareLine[];
  activity?: { example: boolean; views: Pair; calls: Pair; website_clicks: Pair; directions: Pair };
  terms?: { example: boolean; month_label: string; items: { term: string; count: string }[] };
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="text-title font-bold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Lines({ lines }: { lines: CareLine[] }) {
  return (
    <ul className="space-y-2">
      {lines.map((l) => (
        <li
          key={l.title}
          className="flex flex-wrap items-center justify-between gap-2 rounded-inner border border-line p-3"
        >
          <span className="text-small font-semibold">{l.title}</span>
          <Link to={l.path} className={buttonClass("secondary", "md")}>
            Open
          </Link>
        </li>
      ))}
    </ul>
  );
}

const ACTIVITY: { key: "calls" | "website_clicks" | "directions" | "views"; label: string }[] = [
  { key: "calls", label: "Calls" },
  { key: "website_clicks", label: "Website clicks" },
  { key: "directions", label: "Direction requests" },
  { key: "views", label: "Times your profile was seen" },
];

/** The top of a report: the headline from the audit log and the Google Profile and Content lines. */
export function CareTop({ r }: { r: CareData }) {
  if (!r.care) return null;
  const c = r.care.counts;
  const updates = c.posts_published + c.hours_updates + c.profile_updates;
  return (
    <>
      <p className="mt-3 font-display text-h3 leading-tight" data-testid="care-headline">
        {r.care.headline}
      </p>
      <Block title="Google Profile">
        <p className="text-small leading-6">{r.care.profile_line}</p>
      </Block>
      <Block title="Content">
        <p className="text-small leading-6">
          {updates} {updates === 1 ? "update" : "updates"} and {c.photos_published}{" "}
          {c.photos_published === 1 ? "photo" : "photos"} sent to Google.
        </p>
      </Block>
    </>
  );
}

/** The rest of a report: customer activity, what needs you, the plan, time saved and how people found you. */
export function CareBottom({ r, latest }: { r: CareData; latest: boolean }) {
  if (!r.care) return null;
  return (
    <>
      <Block title="Customer activity">
        {r.activity ? (
          <>
            {r.activity.example ? <ExampleBadge /> : null}
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ACTIVITY.map((a) => {
                const p = r.activity![a.key];
                return (
                  <div key={a.key} className="rounded-inner bg-surface-2 p-3">
                    <p className="text-small text-text-2">{a.label}</p>
                    <p className="mt-1 font-display text-h3 font-bold">{p.this}</p>
                    <p className="mt-0.5 text-small text-text-2">
                      {p.change === "no change"
                        ? "no change from the week before"
                        : p.change
                          ? `${p.change} than the week before`
                          : `${p.last} the week before`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-label font-semibold text-text-2">
              Google's figures are kept with a report for 30 days.
              {r.activity.example
                ? " These are examples until Kabsi's Google connection is live."
                : ""}
            </p>
          </>
        ) : (
          <p className="text-small text-text-2">
            Google's figures are not kept for more than 30 days, so this report no longer shows
            them.
          </p>
        )}
      </Block>

      {latest ? (
        <Block title="What needs you">
          {r.needs?.length ? (
            <>
              <Lines lines={r.needs} />
              {(r.needs_total ?? 0) > r.needs.length ? (
                <p className="mt-2 text-small text-text-2">
                  There are {(r.needs_total ?? 0) - r.needs.length} more on Home.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-small">Nothing needs you right now.</p>
          )}
        </Block>
      ) : null}

      {latest && r.plan?.length ? (
        <Block title="Your profile this week">
          <Lines lines={r.plan} />
        </Block>
      ) : null}

      {r.time_saved?.words ? (
        <Block title="Time saved">
          <p className="text-small font-bold" data-testid="time-saved">
            {r.time_saved.words} saved
          </p>
          <details className="mt-1">
            <summary className="flex min-h-11 cursor-pointer items-center text-small underline underline-offset-4">
              How this is worked out
            </summary>
            <p className="mt-1 text-small leading-6 text-text-2">{r.time_saved.formula}</p>
            <ul className="mt-2 space-y-1 text-small">
              {r.time_saved.parts
                .filter((p) => p.count > 0)
                .map((p) => (
                  <li key={p.label}>
                    {p.label}: {p.count} times {p.minutes_each} minutes is {p.minutes} minutes
                  </li>
                ))}
            </ul>
          </details>
        </Block>
      ) : null}

      {r.terms?.items.length ? (
        <Block title="How people found you">
          {r.terms.example ? <ExampleBadge /> : null}
          <ul className="mt-2 space-y-1 text-small">
            {r.terms.items.map((t) => (
              <li key={t.term} className="flex justify-between gap-3">
                <span>{t.term}</span>
                <span className="text-text-2">{t.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-label font-semibold text-text-2">
            The words people searched in {r.terms.month_label}, kept with a report for 30 days.
          </p>
        </Block>
      ) : null}
    </>
  );
}
