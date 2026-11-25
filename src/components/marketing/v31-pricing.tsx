// Pricing on blueprint 3.1 section 4 (SITE-1), on SITE-3's section system. SITE-4 moved it out of v31.tsx so Home's
// script does not carry it, and gave it a real photo, an Example month of work and Kabsi's own screens.
import { PRICE_MONTHLY_USD, TRIAL_DAYS } from "@/lib/offer";
import { YellowNumber } from "@/components/kabsi/highlight";
import { HERO_MARKS, HOME_HERO, PRICING, PRICING_FAQ, START, TRUST } from "./v31-data";
import { Band, Head, Lead, MarkRow, PageTop } from "./kit";
import { Faq } from "@/components/kabsi/ui";
import { ClosingBand, PriceCard, ReportSample, TrustLines } from "./v31";
import { PubImg } from "./life";
import { ProductScreens } from "./screens-section";
import { PUB } from "./public-photos";

/** SITE-4: the trial, day by day, in the words of TRIAL_LINE, the first-day line and the FAQ. */
const TRIAL_STEPS = [
  { when: "Day 1", text: START.firstDay },
  {
    when: `Day ${TRIAL_DAYS}`,
    text: `Your first payment of ${PRICE_MONTHLY_USD} US dollars, unless you cancel before. A card is needed to start.`,
  },
  { when: "Any day", text: "Cancel in one tap in Settings, or tell Kabsi on WhatsApp." },
] as const;

const PHOTO_SIZES = "(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw";

export function V31Pricing() {
  return (
    <>
      <PageTop
        title={PRICING.title}
        mark={PRICING.mark}
        line={PRICING.line}
        aside={
          <PubImg
            photo={PUB.barista}
            sizes={PHOTO_SIZES}
            priority
            className="aspect-[3/2] w-full rounded-panel bg-surface-3 object-cover shadow-lift"
          />
        }
      >
        <MarkRow items={HERO_MARKS} className="mt-6" />
      </PageTop>
      <Band id="plan" tone="warm" label="The plan">
        <PriceCard />
        <Lead className="mt-6">{PRICING.free}</Lead>
      </Band>
      <Band id="trial" tone="ivory">
        <Head id="trial" title={`How the ${TRIAL_DAYS} days work.`} />
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {TRIAL_STEPS.map((x, n) => (
            <li key={x.when} className="flex gap-4 border-t border-line pt-5">
              <YellowNumber n={n + 1} />
              <div>
                <h3 className="text-h3">{x.when}</h3>
                <p className="mt-2 text-read text-text-2">{x.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Band>
      <Band id="month" tone="warm">
        <div>
          <Head
            id="month"
            title="What one month looks like."
            line="One month at an example salon: the work Kabsi did, what it found and what Google shows."
          />
        </div>
        <ReportSample className="mt-8 lg:mt-10" />
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
