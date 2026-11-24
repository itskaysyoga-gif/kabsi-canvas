// SITE-2 (blueprint 3.1 section 5): the free check result. In this order: your rating and reviews beside 3 nearby
// businesses, the profile basics, whether your links work now, the reply Kabsi would write for your latest review, what
// Kabsi would do each month, then "Start 14 days free" with the trial line. No score, no AI answers block, no fear
// wording. A part the server did not return says so plainly and is never made up; the sample reply is labelled Example.
import { Check, CircleSlash } from "lucide-react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/offer";
import { BLUEPRINT } from "@/content/industries/blueprint";
import { ExampleBadge, KabsiMark, buttonClass } from "./ui";

const card = "rounded-panel border border-line bg-surface-1 p-5 sm:p-8";

export type NearbyRow = { name: string; rating: number | null; reviews: number | null };
export type LinkState = "loads" | "fails" | null;
/** What the server may add to a snapshot. Both are optional: a part that is missing is shown as not read, never invented. */
export type ResultExtras = {
  links?: { website?: LinkState; booking?: LinkState } | undefined;
  latest_review?: { stars: number; text: string; reply: string; author?: string | null } | undefined;
};

const figures = (r: NearbyRow) =>
  r.rating === null && r.reviews === null
    ? "Not shown"
    : [
        r.rating === null ? null : r.rating.toFixed(1),
        r.reviews === null ? null : `${r.reviews} ${r.reviews === 1 ? "review" : "reviews"}`,
      ]
        .filter(Boolean)
        .join(", ");

/** Your rating and review count beside up to 3 nearby businesses, read live from Google and not stored. */
export function NearbyTable({
  you,
  nearby,
  hideYou = false,
}: {
  you: NearbyRow;
  nearby: NearbyRow[] | null;
  /** A saved check holds only the nearby businesses, not your own figures. */
  hideYou?: boolean;
}) {
  const rows = (nearby ?? []).slice(0, 3);
  return (
    <section aria-labelledby="near-h" className={card}>
      <h2 id="near-h" className="text-h3">
        You beside 3 nearby businesses
      </h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-body text-text-2">
          Nearby businesses could not be read for this check.
        </p>
      ) : null}
      <ul className="mt-4 divide-y divide-line">
        {[
          ...(hideYou ? [] : [{ ...you, mine: true }]),
          ...rows.map((r) => ({ ...r, mine: false })),
        ].map((r) => (
          <li
            key={`${r.mine ? "you" : "n"}-${r.name}`}
            className="flex flex-wrap items-baseline justify-between gap-x-4 py-3"
          >
            <span
              className={cn(
                "min-w-0 break-words text-body",
                r.mine ? "font-bold" : "font-semibold",
              )}
            >
              {r.mine ? `${r.name} (you)` : r.name}
            </span>
            <span className="text-body text-text-2">{figures(r)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-small text-text-2">
        Shown live from Google. Kabsi does not store it.
      </p>
    </section>
  );
}

/** The profile basics: what Google shows, in plain words. A detail Google does not show is "Not shown", with no alarm. */
export function BasicsList({ rows }: { rows: { label: string; value: string | null }[] }) {
  return (
    <section aria-labelledby="basics-h" className={card}>
      <h2 id="basics-h" className="text-h3">
        Your profile basics
      </h2>
      <ul className="mt-4 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.label} className="flex gap-3 py-3">
            {r.value ? (
              <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
            ) : (
              <CircleSlash className="mt-1 size-4 shrink-0 text-text-3" aria-hidden />
            )}
            <p className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 text-body">
              <span className="font-semibold">{r.label}</span>
              <span className="min-w-0 break-words text-text-2">{r.value ?? "Not shown"}</span>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function linkLine(label: string, has: boolean, state: LinkState | undefined): string {
  if (!has) return `${label}: not on your profile.`;
  if (state === "loads") return `${label}: opens now.`;
  if (state === "fails")
    return `${label}: did not open when we tried. Kabsi tells you if it stays down.`;
  return `${label}: on your profile. Once connected, Kabsi opens it every day.`;
}

/** Whether the website and the booking link work now. Only a result the server read is stated as one. */
export function LinksNow({
  hasWebsite,
  links,
}: {
  hasWebsite: boolean;
  links: ResultExtras["links"];
}) {
  return (
    <section aria-labelledby="links-h" className={card}>
      <h2 id="links-h" className="text-h3">
        Do your links work now?
      </h2>
      <ul className="mt-3 space-y-2 text-body">
        <li>{linkLine("Website", hasWebsite, links?.website)}</li>
        <li>
          {links?.booking
            ? linkLine("Booking link", true, links.booking)
            : "Booking link: Kabsi checks it every day once you are connected."}
        </li>
      </ul>
    </section>
  );
}

/** The reply Kabsi would write for the latest review: the real one when the server sent it, otherwise an Example. */
export function ReplyWould({
  latest,
  industry,
}: {
  latest: ResultExtras["latest_review"];
  industry: string | null;
}) {
  const ex = industry ? BLUEPRINT[industry] : undefined;
  const real = latest ?? null;
  const sample = real
    ? null
    : ex
      ? { stars: ex.review.stars, text: ex.review.text, reply: ex.reply }
      : null;
  const shown = real ?? sample;
  return (
    <section aria-labelledby="reply-h" className={card}>
      <h2 id="reply-h" className="text-h3">
        The reply Kabsi would write
      </h2>
      {shown ? (
        <div className="mt-4 rounded-inner bg-surface-2 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-small font-bold">
              {real?.author ? `${real.author}, ${shown.stars} stars` : `${shown.stars} stars`}
            </p>
            {sample && <ExampleBadge />}
          </div>
          <p className="mt-1 text-body">{shown.text}</p>
          <div className="mt-3 flex items-start gap-2">
            <KabsiMark ring={false} className="mt-0.5 size-7 shrink-0" />
            <p className="min-w-0 flex-1 text-body">{shown.reply}</p>
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-body text-text-2">
        {real
          ? "Your latest review on Google, with a first reply. Once Kabsi is connected, each reply is written in your voice from your business facts, and nothing reaches Google until you say yes."
          : "Once Kabsi is connected, every review arrives with a reply like this, ready for your yes."}
      </p>
    </section>
  );
}

const MONTHLY = [
  "A reply to every new review, ready for your yes, and an alert the moment a bad one arrives.",
  "Your hours, phone, website and booking link checked every day, and holiday hours before each public holiday.",
  "Up to 2 posts a month and your phone photos, each waiting for your yes.",
  "A short summary every week and a full report every month.",
] as const;

export function MonthlyDo() {
  return (
    <section aria-labelledby="month-h" className={card}>
      <h2 id="month-h" className="text-h3">
        What Kabsi would do each month
      </h2>
      <ul className="mt-4 space-y-3">
        {MONTHLY.map((l) => (
          <li key={l} className="flex gap-3 text-body">
            <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
            {l}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-body text-text-2">
        Kabsi never contacts your customers and does not promise rankings.
      </p>
    </section>
  );
}

/** The one primary button, with the trial line next to it. */
export function StartCard({ onStart }: { onStart: () => void }) {
  return (
    <section
      aria-labelledby="trial-h"
      data-main-cta
      className="rounded-panel border border-text-1 bg-surface-1 p-5 shadow-lift sm:p-7"
    >
      <h2 id="trial-h" className="text-h3">
        Your next step
      </h2>
      <button type="button" onClick={onStart} className={cn(buttonClass("primary"), "mt-4 w-full")}>
        Start 14 days free
      </button>
      <p className="mt-3 text-body text-text-2">{TRIAL_LINE}</p>
    </section>
  );
}
