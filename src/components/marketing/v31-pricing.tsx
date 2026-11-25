// Pricing on blueprint 3.1 section 4 (SITE-1), on SITE-3's section system. SITE-4 moved it out of v31.tsx so Home's
// script does not carry it, and gave it a photo and Kabsi's own screens.
import { HERO_MARKS, HOME_HERO, PRICE, PRICING, PRICING_FAQ, TRUST } from "./v31-data";
import { Band, Head, Lead, MarkRow, PageTop } from "./kit";
import { Faq } from "@/components/kabsi/ui";
import { ClosingBand, PriceCard, TrustLines } from "./v31";
import { PubImg } from "./life";
import { ProductScreens } from "./screens-section";
import { PUB } from "./public-photos";

/* ---------- Pricing ---------- */

/** SITE-4: two owners in their café, with the one price over the photo's corner. */
function PricingPhoto() {
  return (
    <div className="relative pb-8">
      <PubImg
        photo={PUB.cafeOwners}
        sizes="(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw"
        priority
        className="aspect-[4/3] w-full rounded-panel bg-surface-3 object-cover shadow-lift"
      />
      <div className="absolute start-4 bottom-0 rounded-card border border-line bg-surface-1 px-5 py-3 shadow-float">
        <p className="font-display text-h3 font-bold text-text-1">{PRICE.amount}</p>
        <p className="text-small text-text-2">{PRICE.per}</p>
      </div>
    </div>
  );
}

export function V31Pricing() {
  return (
    <>
      <PageTop
        title={PRICING.title}
        mark={PRICING.mark}
        line={PRICING.line}
        aside={<PricingPhoto />}
      >
        <MarkRow items={HERO_MARKS} className="mt-6" />
      </PageTop>
      <Band id="plan" tone="warm" label="The plan">
        <PriceCard />
        <Lead className="mt-6">{PRICING.free}</Lead>
      </Band>
      <ProductScreens title="What you get, every week." />
      <Band id="trust" tone="warm">
        <Head id="trust" title={TRUST.title} />
        <TrustLines />
      </Band>
      <Band id="questions" tone="ivory">
        <Head id="questions" title="Questions about the plan." />
        <Faq items={PRICING_FAQ.map((f) => ({ q: f.q, a: f.a }))} className="mt-8" />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}
