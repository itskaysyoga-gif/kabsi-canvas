import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/offer";
import { ScanBox } from "./scan-box";
import { PageHero, popCls, stagger } from "./page-hero";
import { ExampleBadge } from "./ui";
import { BLUEPRINT } from "@/content/industries/blueprint";
import { CHECK_HERO } from "./hero-lines";
import { Marked, YellowLabel, YellowNumber } from "@/components/kabsi/highlight";
import salonTablet1600 from "@/assets/photos/salon-tablet-1600.webp";
import salonTablet800 from "@/assets/photos/salon-tablet-800.webp";

/**
 * The one free check's start page (master plan 30.16 section 4), on Design 8 (Web 4, lane R 1 Nov 2026): the hero with
 * the search box (Check 2's combobox, unchanged), "What the check looks at" beside it, then what you get back with the
 * Example result. /scan and /google-profile-check both open it. Every row says only what the check reads from Google's
 * public data (lane R decision 1; K-82: no review replies, holiday hours or post dates).
 */

/** SITE-2 (blueprint 3.1 section 5): what the check reads. Only public Google data; no score, no AI answer. */
const LOOKS_AT: { title: string; text: string }[] = [
  { title: "Your rating and reviews", text: "Beside 3 nearby businesses." },
  { title: "Your profile basics", text: "Hours, phone, website, category and photos." },
  { title: "Your links", text: "Whether your website and booking link work now." },
  { title: "Your latest review", text: "The reply Kabsi would write for it." },
];

const GET_BACK = [
  "About 20 seconds.",
  "No Google access needed, no password, no card.",
  "Kabsi asks for nothing before you see the result.",
] as const;

export function CheckLooksAtVisual() {
  // Scan 3 (30.34 item 2): yellow number markers and a short label pill (DESIGN.md, the highlight bar's other yellow uses).
  return (
    <figure className="relative rounded-panel border border-line bg-surface-1 p-5 shadow-float sm:p-6">
      <YellowLabel>About 20 seconds</YellowLabel>
      <p className="mt-3 text-title font-bold">What Kabsi checks</p>
      <p className="text-body text-text-2">On your public Google profile. No access needed.</p>
      <ol className="mt-5 space-y-2.5">
        {LOOKS_AT.map((r, i) => (
          <li
            key={r.title}
            className={cn("flex gap-3 rounded-inner bg-surface-2 px-3.5 py-3", popCls)}
            style={stagger(i, 250, 180)}
          >
            <YellowNumber n={i + 1} />
            <div>
              <p className="text-body font-bold">{r.title}</p>
              <p className="text-small text-text-2">{r.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <figcaption className="sr-only">
        What the free check reads on a public Google profile.
      </figcaption>
    </figure>
  );
}

/** The Example result: three nearby businesses and the reply Kabsi would write. Invented names, labelled Example. */
function ExampleResult({ className }: { className?: string }) {
  const ex = BLUEPRINT["hair-salon"]!;
  const rows = [
    { name: "Hollis Hair (you)", line: "4.8, 38 reviews", mine: true },
    { name: "Juniper Hair Studio", line: "4.6, 112 reviews", mine: false },
    { name: "Lark Salon", line: "4.7, 64 reviews", mine: false },
    { name: "Studio Nine", line: "4.4, 25 reviews", mine: false },
  ];
  return (
    <figure
      className={cn(
        "relative rounded-panel border border-line bg-surface-1 p-5 shadow-float sm:p-7",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-label font-bold text-text-2">Free check result</p>
        <ExampleBadge className="shrink-0" />
      </div>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((r) => (
          <li key={r.name} className="flex items-baseline justify-between gap-3 py-2.5 text-small">
            <span className={r.mine ? "font-bold" : ""}>{r.name}</span>
            <span className="text-end font-semibold">{r.line}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 border-t border-line pt-3">
        <p className="text-label font-bold text-text-2">The reply Kabsi would write</p>
        <p className="mt-1 text-small text-text-2">{`${ex.review.stars} stars: ${ex.review.text}`}</p>
        <p className="mt-1 text-small text-text-1">{ex.reply}</p>
      </div>
      <figcaption className="sr-only">
        An Example free check result for an invented salon: its rating and reviews beside three
        nearby businesses, and the reply Kabsi would write for a 5 star review.
      </figcaption>
    </figure>
  );
}

/** "What you get back" with the Example result: under the start page and under every state of the check. */
export function WhatYouGetBack({ photo = false }: { photo?: boolean }) {
  return (
    <section aria-labelledby="back-h" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <h2 id="back-h" className="text-h2">
            <Marked text="What you get back" mark="get back" />
          </h2>
          <p className="mt-4 max-w-[34rem] text-lead text-text-2">
            Your rating and reviews beside 3 nearby businesses, your profile basics, and whether
            your links work now. Then the reply Kabsi would write for your latest review, and what
            Kabsi would do each month.
          </p>
          <ul className="mt-6 space-y-2.5">
            {GET_BACK.map((l) => (
              <li key={l} className="flex gap-3 text-body">
                <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-body text-text-2">
            What Google shows about the business is shown to you and not kept.
          </p>
          <p className="mt-2 text-body text-text-2">{TRIAL_LINE}</p>
          {/* Scan 3 (30.34 item 2): a library photo on the empty /scan page (docs/PHOTOS.md, salon-tablet). */}
          {photo && (
            <img
              src={salonTablet800}
              srcSet={`${salonTablet800} 800w, ${salonTablet1600} 1600w`}
              sizes="(min-width: 1024px) 34rem, calc(100vw - 40px)"
              width={1600}
              height={1067}
              alt="A salon owner looking at a tablet in her salon"
              loading="lazy"
              decoding="async"
              className="mt-8 aspect-[3/2] w-full max-w-[34rem] rounded-panel bg-surface-2 object-cover"
            />
          )}
        </div>
        <ExampleResult className="lg:ms-auto lg:w-[30rem]" />
      </div>
    </section>
  );
}

/**
 * Design 8: every state of the check (searching, one match, several, none, checking, an error, the search again) sits
 * in the hero where the search box was, beside "What the check looks at", with "What you get back" under it.
 */
export function FreeCheckFrame({
  children,
  under = null,
  photo = false,
}: {
  children: ReactNode;
  under?: string | null;
  /** The empty /scan page shows a library photo under "What you get back". */
  photo?: boolean;
}) {
  return (
    <>
      <PageHero
        mark="free."
        hero={CHECK_HERO}
        under={under}
        action={<div>{children}</div>}
        visual={<CheckLooksAtVisual />}
      />
      <WhatYouGetBack photo={photo} />
    </>
  );
}

export function FreeCheckStart() {
  return (
    <FreeCheckFrame photo>
      <ScanBox id="check-scan" className="max-w-xl" />
    </FreeCheckFrame>
  );
}
