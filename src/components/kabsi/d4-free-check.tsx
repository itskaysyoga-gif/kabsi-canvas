import { Check, CircleCheck, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/site";
import { ScanBox } from "./scan-box";
import { PageHero, popCls, stagger } from "./page-hero";
import { Pill, ResultPreview } from "./result-preview";
import { CHECK_HERO } from "./hero-lines";

/**
 * The one free check's start page (master plan 30.16 section 4), on Design 8 (Web 4, lane R 1 Nov 2026): the hero with
 * the search box (Check 2's combobox, unchanged), "What the check looks at" beside it, then what you get back with the
 * Example result. /scan and /google-profile-check both open it. Every row says only what the check reads from Google's
 * public data (lane R decision 1; K-82: no review replies, holiday hours or post dates).
 */

const LOOKS_AT: { title: string; text: string; atLaunch?: boolean }[] = [
  { title: "Your hours", text: "The opening hours Google shows customers." },
  { title: "Your reviews", text: "How many there are, and your rating." },
  { title: "Photos and links", text: "Photos, your website and your phone." },
  { title: "Your category", text: "What Google calls your business." },
  {
    title: "What ChatGPT says",
    text: "Whether its answer about you matches your Google profile.",
    atLaunch: true,
  },
];

const GET_BACK = [
  "About 10 seconds.",
  "No Google access needed, no password, no card.",
  "Kabsi asks for nothing before you see the result.",
] as const;

export function CheckLooksAtVisual() {
  return (
    <figure className="relative rounded-panel border border-line bg-surface-1 p-5 shadow-float sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-full bg-surface-2">
          <Search className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-title font-bold">What the check looks at</p>
          <p className="text-small text-text-2">About 10 seconds. No access needed.</p>
        </div>
      </div>
      <ul className="mt-5 space-y-2.5">
        {LOOKS_AT.map((r, i) => (
          <li
            key={r.title}
            className={cn("flex gap-3 rounded-inner bg-surface-2 px-3.5 py-3", popCls)}
            style={stagger(i, 250, 180)}
          >
            <CircleCheck className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
            <div>
              <p className="flex flex-wrap items-center gap-2 text-small font-bold">
                {r.title}
                {r.atLaunch && <Pill className="py-0">At launch</Pill>}
              </p>
              <p className="text-label text-text-2">{r.text}</p>
            </div>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">
        What the free check reads on a public Google profile.
      </figcaption>
    </figure>
  );
}

/** "What you get back" with the Example result: under the start page and under every state of the check. */
export function WhatYouGetBack() {
  return (
    <section aria-labelledby="back-h" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <h2 id="back-h" className="text-h2">
            What you get back
          </h2>
          <p className="mt-4 max-w-[34rem] text-lead text-text-2">
            The most important thing to fix, in plain words and why it matters. Then what customers
            see today, and what Kabsi would do from day one.
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
}: {
  children: ReactNode;
  under?: string | null;
}) {
  return (
    <>
      <PageHero
        hero={CHECK_HERO}
        under={under}
        action={<div>{children}</div>}
        visual={<CheckLooksAtVisual />}
      />
      <WhatYouGetBack />
    </>
  );
}

export function FreeCheckStart() {
  return (
    <FreeCheckFrame>
      <ScanBox id="check-scan" className="max-w-xl" />
    </FreeCheckFrame>
  );
}
