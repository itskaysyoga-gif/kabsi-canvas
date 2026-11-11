// Home 2 (lane R R-158 item 4, 11 Nov 2026): Home's hero, in its own file, out of d9-hero.tsx (Pricing, the free check
// and Log in share that). Speed gate: Home's hero rides in the code every page loads (Nora's widget preloads Home's
// static modules), so it is kept small: the WhatsApp picture and the four jobs' strip are in the lower sections' code
// (d9-home-lower.tsx), whose server HTML shows at once. The H1
// is one element of real, selectable text, painted at once; its last sentence ("Taken care of through WhatsApp.") sits
// on the Kabsi-yellow bar (D9Title). The hero sits at z-10, so the free check's suggestion list stays above what follows.
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/site";
import { memo } from "react";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import { D9Title } from "./d9-title";
import { D9Arrow, d9LinkCls } from "./d9-hero";
import { lowerNow } from "./home-lower-loader";
import { HOME2_H1, HOME2_HERO_LINE } from "./home2-hero-data";

/* ---------- Home hero (Home 2, lane R R-158 item 4) ---------- */

/**
 * Home 2: the H1, the line that says what Kabsi is, the free check as the one action with TRIAL_LINE beside it, "See how
 * it works", and one WhatsApp day (Example, Look 2 style) as the picture: beside the text from 1024 px, under it on a
 * phone. The four jobs follow in a strip (JobsStrip, d9-home-lower.tsx). Lines and sources: docs/site4/home.md.
 */
export function D9Hero() {
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate z-10">
      <div className="container-kb grid gap-8 pt-6 pb-10 md:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12 lg:pt-14 lg:pb-16">
        <div className="max-w-[40rem]">
          <h1 id="hero-title" className="text-display text-balance">
            <D9Title text={HOME2_H1} />
          </h1>
          <p className="mt-4 max-w-[36rem] text-lead text-text-2 sm:mt-6">{HOME2_HERO_LINE}</p>
          {/* relative z-10: the suggestion list opens above what follows (Web 4 review). */}
          <div className="relative z-10 mt-5 max-w-[36rem] sm:mt-7">
            <ScanBox id="hero-scan" note={TRIAL_LINE} />
            <SiteLink to="/how-it-works" className={cn(d9LinkCls, "mt-1 text-body sm:mt-2")}>
              See how it works
              <D9Arrow />
            </SiteLink>
          </div>
        </div>
        <HeroPicture />
      </div>
    </section>
  );
}

/**
 * The hero's picture: one day on WhatsApp (Example). A picture with nothing to press, so its code is in the lower
 * sections' chunk (d9-home-lower.tsx, HeroThread): the server renders it in full, and a first visit in the browser keeps
 * that server HTML as it is (React leaves an element whose inner HTML it was given). A visit to Home from another page
 * has the code already (the route's loader awaits it) and draws it at once. Memo with no props: never redrawn.
 */
const HeroPicture = memo(function HeroPicture() {
  const lower = lowerNow();
  if (lower) {
    const { HeroThread } = lower;
    return (
      <div data-hero-picture>
        <HeroThread />
      </div>
    );
  }
  return (
    <div data-hero-picture suppressHydrationWarning dangerouslySetInnerHTML={{ __html: "" }} />
  );
});
