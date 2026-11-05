import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/site";
import { ScanBox } from "./scan-box";
import { PageHero, popCls, stagger } from "./page-hero";
import { ResultPreview } from "./result-preview";
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

/** "What ChatGPT says" is the AI answer (open from 5 Nov 2026, Go live 1). */
const LOOKS_AT: { title: string; text: string }[] = [
  { title: "Your hours", text: "The opening hours Google shows customers." },
  { title: "Your reviews", text: "How many there are, and your rating." },
  { title: "Photos and links", text: "Photos, your website and your phone." },
  { title: "Your category", text: "What Google calls your business." },
  {
    title: "What ChatGPT says",
    text: "Whether its answer about you matches your Google profile.",
  },
];

const GET_BACK = [
  "About 10 seconds.",
  "No Google access needed, no password, no card.",
  "Kabsi asks for nothing before you see the result.",
] as const;

export function CheckLooksAtVisual() {
  // Scan 3 (30.34 item 2): yellow number markers and a short label pill (DESIGN.md, the highlight bar's other yellow uses).
  return (
    <figure className="relative rounded-panel border border-line bg-surface-1 p-5 shadow-float sm:p-6">
      <YellowLabel>About 10 seconds</YellowLabel>
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
            The most important thing to fix, and why it matters. Then what customers see today, and
            what Kabsi would do from day one.
          </p>
          <ul className="mt-6 space-y-2.5">
            {GET_BACK.map((l) => (
              <li key={l} className="flex gap-3 text-body">
                <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {l}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-small text-text-2">
            What Google shows about the business is shown to you and not kept.
          </p>
          <p className="mt-2 text-small text-text-2">{TRIAL_LINE}</p>
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
        <ResultPreview className="lg:ms-auto lg:w-[30rem]" />
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
