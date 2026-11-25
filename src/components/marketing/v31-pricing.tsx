// Pricing on blueprint 3.1 section 4 (SITE-1), on SITE-3's section system. SITE-4 moved it out of v31.tsx so Home's
// script does not carry it. SITE-5 (lane R decision 3): Pricing has content of its own and repeats nothing from Home:
// the price with its terms, "Your first 14 days" day by day, the included and not included lists, cancel and refunds in
// plain words, and six billing questions. Words in v31-data.ts.
import { CalendarCheck, CalendarX2, Check, ShieldCheck, Undo2, X } from "lucide-react";
import { PRIMARY_CTA } from "@/lib/offer";
import { ButtonLink, Faq } from "@/components/kabsi/ui";
import { HOME_HERO, PRICE } from "./v31-data";
import { Band, Head } from "./kit";
import { PageTop, Ticks } from "./kit-pages";
import { ClosingBand } from "./v31";
import { DeviceShot, PubImg } from "./life";
import { PUB } from "./public-photos";
import { BILLING_QUESTIONS, FIRST_DAYS, LEAVING, PLAN_LISTS, PRICING } from "./v31-more";
import { MORE_SCREENS } from "./screens-section";

/** SITE-8: the icons of LEAVING, in its order: one tap, the 14 days, the paid month, your profile. */
const LEAVING_ICONS = [Undo2, CalendarX2, CalendarCheck, ShieldCheck];

const PHOTO_SIZES = "(min-width: 1280px) 500px, (min-width: 1024px) 40vw, 100vw";

export function V31Pricing() {
  return (
    <>
      <PageTop
        title={PRICING.title}
        mark={PRICING.mark}
        line={PRICING.line}
        aside={
          /* SITE-5: the photo with Kabsi's own Reviews screen in front, the work the price pays for. */
          <div data-nora-avoid className="relative sm:pb-28 lg:pb-16">
            <PubImg
              photo={PUB.pricingHero}
              sizes={PHOTO_SIZES}
              priority
              className="hidden aspect-[4/3] w-[88%] rounded-panel bg-surface-3 object-cover shadow-lift sm:block lg:aspect-[3/5] lg:w-[64%]"
            />
            {/* SITE-7: on a phone the screen stands alone at a size people can read (the photo shows from 640 px), as on
                How it works. */}
            <div className="mx-auto w-full max-w-[16rem] pt-8 sm:absolute sm:end-0 sm:bottom-0 sm:mx-0 sm:w-[44%] sm:max-w-[13rem] sm:pt-0 lg:top-[16%] lg:bottom-auto lg:w-[46%] lg:max-w-[15rem]">
              <DeviceShot
                shot={MORE_SCREENS.reviews}
                className="max-w-none sm:max-w-none lg:max-w-none"
              />
            </div>
          </div>
        }
      >
        {/* The price and its terms at the top, with the one button. */}
        <div className="mt-8 max-w-[34rem] rounded-panel border border-line bg-surface-1 p-5 shadow-rest sm:p-6">
          <p className="font-display text-h2 font-bold text-text-1">{PRICE.amount}</p>
          <p className="text-read text-text-2">{PRICE.per}</p>
          {/* SITE-8 (R-167 rule 2): the trial terms in full, a short bold line each. */}
          <ul className="mt-4 grid gap-1.5">
            {PRICE.termLines.map((l) => (
              <li key={l} className="flex gap-2 text-read font-semibold text-text-1">
                <Check className="mt-1 size-5 shrink-0 text-ok" aria-hidden />
                {l}
              </li>
            ))}
          </ul>
          <div data-main-cta className="mt-5 max-w-[22rem]">
            <ButtonLink to="/scan" full>
              {PRIMARY_CTA}
            </ButtonLink>
          </div>
        </div>
      </PageTop>

      <Band id="days" tone="warm">
        <Head id="days" title={FIRST_DAYS.title} />
        <ol className="kb-days mt-10">
          {FIRST_DAYS.steps.map((s, n) => (
            <li key={s.when} data-last={n === FIRST_DAYS.steps.length - 1 || undefined}>
              <span className="kb-days-dot" aria-hidden>
                {n + 1}
              </span>
              <p className="text-label font-bold text-text-2">{s.when}</p>
              <h3 className="mt-1 text-h3">{s.title}</h3>
              <p className="mt-2 text-read text-text-2">{s.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-[60ch] border-s-4 lg:max-w-none border-kb-yellow ps-4 text-read font-semibold text-text-1">
          {FIRST_DAYS.starts}
        </p>
      </Band>

      <Band id="includes" tone="ivory">
        <Head id="includes" title={PLAN_LISTS.title} />
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] lg:gap-8">
          <div className="rounded-panel border border-line bg-surface-1 p-6 shadow-rest sm:p-8">
            <p className="text-small font-bold text-text-2">Included, for one location</p>
            <Ticks items={PRICING.included} cols className="mt-4" />
          </div>
          <div className="rounded-panel border border-line p-6 sm:p-8">
            <p className="text-small font-bold text-text-2">{PLAN_LISTS.notTitle}</p>
            <ul className="mt-4 grid gap-3">
              {PLAN_LISTS.not.map((t) => (
                <li key={t} className="flex gap-3 text-read text-text-1">
                  <X className="mt-1 size-5 shrink-0 text-text-3" aria-hidden />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-6 max-w-[60ch] text-read text-text-2">{PRICING.free}</p>
      </Band>

      <Band id="leaving" tone="warm">
        <Head id="leaving" title={LEAVING.title} />
        <dl className="mt-8 grid gap-4 md:grid-cols-2">
          {/* SITE-8: an icon per point, as cards in a 2x2 grid. */}
          {LEAVING.points.map((x, n) => {
            const Icon = LEAVING_ICONS[n] ?? ShieldCheck;
            return (
              // A <dl> may hold only <div> groups of <dt> and <dd>, so the icon sits inside the <dt> (QA-FIX-3).
              <div
                key={x.title}
                className="rounded-card border border-line bg-surface-1 p-5 shadow-rest"
              >
                <dt className="flex items-center gap-4 text-title font-bold">
                  <span
                    aria-hidden
                    className="grid size-10 shrink-0 place-items-center rounded-inner bg-surface-2 text-text-1"
                  >
                    <Icon className="size-5" strokeWidth={1.75} />
                  </span>
                  {x.title}
                </dt>
                <dd className="mt-1 pl-14 text-read text-text-2">{x.text}</dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-8 border-t border-line pt-5 text-read font-semibold text-text-1">
          {LEAVING.law}
        </p>
      </Band>

      <Band id="questions" tone="ivory">
        <Head id="questions" title="Billing questions." />
        <Faq items={BILLING_QUESTIONS.map((f) => ({ q: f.q, a: f.a }))} className="mt-8" />
      </Band>
      <ClosingBand under={HOME_HERO.under} />
    </>
  );
}
