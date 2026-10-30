import { Check, CircleAlert, MapPin, Store } from "lucide-react";
import { TRIAL_LINE } from "@/lib/site";
import { ToolTabs } from "./d2-parts";
import { ScanBox } from "./scan-box";
import { ExampleBadge } from "./ui";

/**
 * The one free check (master plan 30.16 section 4): the public profile facts and the nearby check together, shown
 * before Kabsi asks for anything. /scan and /google-profile-check both open it.
 */
export function FreeCheckStart() {
  return (
    <>
      <section className="container-kb pt-28 lg:pt-36">
        <ToolTabs current="/scan" />
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)] lg:gap-16">
          <div>
            <h1 className="max-w-2xl text-display">Check your business on Google, free.</h1>
            <p className="mt-5 max-w-xl text-lead text-text-2">
              See your public Google profile and what to do first. Kabsi asks for nothing before you
              see the result.
            </p>
            <ScanBox className="mt-8 max-w-xl" />
            <ul className="mt-10 grid max-w-xl gap-4 sm:grid-cols-2">
              <li className="rounded-card border border-line bg-surface-1 p-5 shadow-rest">
                <Store className="size-5 text-text-2" aria-hidden />
                <p className="mt-3 text-title">Your Google profile</p>
                <p className="mt-1 text-small text-text-2">
                  Rating, reviews without a reply, hours, photos, phone and booking link, and what
                  is missing.
                </p>
              </li>
              <li className="rounded-card border border-line bg-surface-1 p-5 shadow-rest">
                <MapPin className="size-5 text-text-2" aria-hidden />
                <p className="mt-3 flex flex-wrap items-center gap-2 text-title">
                  Where you come up nearby
                  <span className="rounded-full border border-line-strong px-2 py-0.5 text-label font-semibold text-text-2">
                    Opens at launch
                  </span>
                </p>
                <p className="mt-1 text-small text-text-2">
                  Three places near you, who came first there, and one count from 49 places.
                </p>
              </li>
            </ul>
            <p className="mt-8 max-w-xl text-small text-text-2">{TRIAL_LINE}</p>
          </div>
          <ResultPreview />
        </div>
      </section>
      <div className="pb-20 lg:pb-28" />
    </>
  );
}

/* What the result looks like, before anyone types (Design 6, Web 3). Every value is an example. */
const FACTS: { label: string; value: string; ok: boolean }[] = [
  { label: "Rating", value: "4.8 from 126 reviews", ok: true },
  { label: "Hours", value: "Set, holidays missing", ok: false },
  { label: "Photos", value: "14", ok: true },
  { label: "Website", value: "Set", ok: true },
  { label: "Phone", value: "Set", ok: true },
  { label: "Booking link", value: "Missing", ok: false },
];

function ResultPreview() {
  return (
    <figure className="rounded-panel border border-line bg-surface-1 p-5 shadow-lift sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label font-bold text-text-2">Free check, 25 October 2026</p>
          <p className="mt-1 font-display text-h3 font-bold">Rose Lane Salon</p>
        </div>
        <ExampleBadge />
      </div>
      <div className="mt-5 rounded-inner bg-surface-2 p-4">
        <p className="text-label font-bold text-text-2">What to do first</p>
        <p className="mt-1 text-body font-semibold">Add your booking link.</p>
        <p className="mt-1 text-small text-text-2">
          A booking link lets customers book straight from your Google profile.
        </p>
      </div>
      <dl className="mt-4 divide-y divide-line">
        {FACTS.map((f) => (
          <div key={f.label} className="flex items-center justify-between gap-3 py-2.5">
            <dt className="text-small text-text-2">{f.label}</dt>
            <dd className="flex items-center gap-1.5 text-small font-semibold">
              {f.ok ? (
                <Check className="size-4 text-ok" strokeWidth={2.5} aria-hidden />
              ) : (
                <CircleAlert className="size-4 text-warn" aria-hidden />
              )}
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <figcaption className="mt-3 text-label text-text-3">
        Shown live from Google. Kabsi does not store it.
      </figcaption>
    </figure>
  );
}
