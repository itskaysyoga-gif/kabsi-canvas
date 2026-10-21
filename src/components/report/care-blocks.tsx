import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";

// The Weekly Care Report's newer blocks (P0.5-04, K-28, K-72): what Kabsi did, counted from the audit log; the customer
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
      <h3 className="text-base font-bold">{title}</h3>
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
          className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-kb-hairline p-3"
        >
          <span className="text-sm font-medium">{l.title}</span>
          <Button asChild size="compact" variant="outline">
            <Link to={l.path}>Open</Link>
          </Button>
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
      <p className="mt-3 font-display text-3xl leading-tight" data-testid="care-headline">
        {r.care.headline}
      </p>
      <Block title="Google Profile">
        <p className="text-sm leading-6">{r.care.profile_line}</p>
      </Block>
      <Block title="Content">
        <p className="text-sm leading-6">
          {updates} {updates === 1 ? "update" : "updates"} and {c.photos_published}{" "}
          {c.photos_published === 1 ? "photo" : "photos"} published.
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
            {r.activity.example ? <StatusPill tone="grey">Example figures</StatusPill> : null}
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ACTIVITY.map((a) => {
                const p = r.activity![a.key];
                return (
                  <div key={a.key} className="rounded-card bg-kb-sand p-4">
                    <p className="text-sm text-kb-stone">{a.label}</p>
                    <p className="mt-1 text-2xl font-bold">{p.this}</p>
                    <p className="mt-0.5 text-sm text-kb-stone">
                      {p.change ? `${p.change} than the week before` : `${p.last} the week before`}
                    </p>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs leading-5 text-kb-stone">
              Google's figures are kept with a report for 30 days.
              {r.activity.example
                ? " These are examples until Kabsi's Google connection is live."
                : ""}
            </p>
          </>
        ) : (
          <p className="text-sm text-kb-stone">
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
                <p className="mt-2 text-sm text-kb-stone">
                  There are {(r.needs_total ?? 0) - r.needs.length} more on Home.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm">Nothing needs you right now.</p>
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
          <p className="text-sm font-bold" data-testid="time-saved">
            {r.time_saved.words} saved
          </p>
          <details className="mt-1">
            <summary className="min-h-10 cursor-pointer text-sm underline underline-offset-4">
              How this is worked out
            </summary>
            <p className="mt-1 text-sm leading-6 text-kb-stone">{r.time_saved.formula}</p>
            <ul className="mt-2 space-y-1 text-sm">
              {r.time_saved.parts
                .filter((p) => p.count > 0)
                .map((p) => (
                  <li key={p.label}>
                    {p.label}: {p.count} × {p.minutes_each} minutes = {p.minutes} minutes
                  </li>
                ))}
            </ul>
          </details>
        </Block>
      ) : null}

      {r.terms?.items.length ? (
        <Block title="How people found you">
          {r.terms.example ? <StatusPill tone="grey">Example figures</StatusPill> : null}
          <ul className="mt-2 space-y-1 text-sm">
            {r.terms.items.map((t) => (
              <li key={t.term} className="flex justify-between gap-3">
                <span>{t.term}</span>
                <span className="text-kb-stone">{t.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs leading-5 text-kb-stone">
            The words people searched in {r.terms.month_label}, kept with a report for 30 days.
          </p>
        </Block>
      ) : null}
    </>
  );
}
