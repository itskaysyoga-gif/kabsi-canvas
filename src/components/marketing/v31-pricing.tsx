// Pricing on blueprint 3.1 section 4 (SITE-1), on SITE-3's section system. SITE-4 moved it out of v31.tsx so Home's
// script does not carry it, and gave it a real photo, an Example month of work and Kabsi's own screens.
import { HERO_MARKS, HOME_HERO, PRICING, PRICING_FAQ, TRUST } from "./v31-data";
import { Band, Head, Lead, MarkRow, PageTop } from "./kit";
import { Faq } from "@/components/kabsi/ui";
import { ClosingBand, PriceCard, ReportSample, TrustLines } from "./v31";
import { PubImg } from "./life";
import { ProductScreens } from "./screens-section";
import { PUB } from "./public-photos";

const PHOTO_SIZES = "(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw";

export function V31Pricing() {
  return (
    <>
      <PageTop
        title={PRICING.title}
        mark={PRICING.mark}
        line={PRICING.line}
        aside={
          // From 1024 px the photo stands beside the H1; on a phone the price card comes first and the photo waits
          // for the month below.
          <PubImg
            photo={PUB.barista}
            sizes={PHOTO_SIZES}
            className="hidden aspect-[3/2] w-full rounded-panel bg-surface-3 object-cover shadow-lift lg:block"
          />
        }
      >
        <MarkRow items={HERO_MARKS} className="mt-6" />
      </PageTop>
      <Band id="plan" tone="warm" label="The plan">
        <PriceCard />
        <Lead className="mt-6">{PRICING.free}</Lead>
      </Band>
      <Band id="month" tone="ivory">
        <div>
          <Head
            id="month"
            title="What one month looks like."
            line="An Example month: the work Kabsi did, what it found and what Google shows."
          />
          <PubImg
            photo={PUB.barista}
            sizes={PHOTO_SIZES}
            className="mt-8 aspect-[3/2] w-full rounded-panel bg-surface-3 object-cover shadow-lift lg:hidden"
          />
        </div>
        <ReportSample className="mt-8 lg:mt-10" />
      </Band>
      <ProductScreens title="What you get, every week." className="bg-tint-warm" />
      <Band id="trust" tone="ivory">
        <Head id="trust" title={TRUST.title} />
        <TrustLines />
      </Band>
      <Band id="questions" tone="ivory" inner="pt-0 sm:pt-0 lg:pt-0">
        <Head id="questions" title="Questions about the plan." />
        <Faq items={PRICING_FAQ.map((f) => ({ q: f.q, a: f.a }))} className="mt-8" />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}
