// Pricing on Design 8 (Web 4b, lane R's approval of 1 Nov 2026; Polish 2 on 3 Nov: the calendar became one strip, each
// card names its four most valuable built things and help is a small line): the hero with the 14 days, who each plan
// is for, a comparison of built features only (PLAN_ROWS, Price 1), the trial from day 1 to cancelling, the launch
// price explained once (the real count only), and the billing questions. Every billing line is
// checked against knowledge/kabsi-facts.md (lane R decision 1; COPY.md 38).
import { ArrowRight, Check, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FOUNDING_PRICES,
  PAY_TODAY_LINE,
  PLAN_PRICES,
  PRICE_TAX_LINE,
  REFUND_LINE,
  TRIAL_LINE,
  WORKING_HOURS,
  foundingPlacesLine,
} from "@/lib/site";
import { ButtonLink, Faq, Segmented } from "./ui";
import { SiteLink } from "./site-link";
import { useSearchFlag } from "./page-signals";
import { PageHero, popCls, stagger } from "./page-hero";
import { Pill } from "./result-preview";
import { Closing } from "./closing";
import { StepsLine } from "./d9-hero";
import { FOUNDING_TOTAL, PLAN_CHECKS, PLANS, PLAN_ROWS, planChecks } from "./plans";
import { FoundingPriceLine, useFoundingLeft } from "./founding-price";
import { PRICING_HERO } from "./hero-lines";
import { BILLING_FAQ } from "./faq-data";
import { useStartFree } from "@/components/auth/use-start-free";
import { Marked } from "@/components/kabsi/highlight";
import { PHOTOS } from "./photos";
import { SectionPhoto } from "./section-photo";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

/** The trial in the order it happens (facts 4.3, 4.5 and the grace period). */
const TRIAL_STEPS = [
  {
    when: "Today",
    title: "Free check, then add Kabsi as a Manager",
    text: "No card. Waiting for Google access costs you nothing.",
  },
  {
    when: "Day 1",
    title: "Your 14 days of Pro start when access works",
    text: "Replies, details watched, posts, your weekly report. Everything waits for your yes.",
  },
  {
    when: "Day 14",
    title: "Choose a plan, or stop",
    text: "Nothing is charged by itself. For 7 more days Kabsi keeps watching and drafting, and publishes nothing.",
  },
  {
    when: "Any time",
    title: "Cancel any time",
    text: "Your plan runs to the end of the period you paid for. Yearly plans are refundable within 14 days.",
  },
] as const;

/** The trial in one strip (Polish 2, lane R decision 5: the 14-day calendar became one compact strip). */
function TrialStrip() {
  return (
    <figure className="relative rounded-panel border border-line bg-surface-1 p-5 shadow-float sm:p-7">
      <p className="text-title font-bold">Your 14 days of Pro</p>
      <div className="mt-4 flex items-center gap-2 text-label font-bold" aria-hidden>
        <span className="rounded-full bg-kb-black px-2.5 py-1 text-kb-white">Day 1</span>
        <span className={cn("h-1.5 flex-1 rounded-full bg-surface-3", popCls)} style={stagger(0)} />
        <span className="rounded-full bg-kb-black px-2.5 py-1 text-kb-white">Day 14</span>
      </div>
      <ul className="mt-4 space-y-1.5 text-small">
        {TRIAL_STRIP.map((t) => (
          <li key={t} className="flex gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
            {t}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <p className="flex-1 rounded-inner bg-surface-2 px-3 py-2 text-small">
          <span className="block font-bold">Essentials</span>${PLAN_PRICES.essentialsMonthly} a
          month
        </p>
        <p className="flex-1 rounded-inner bg-surface-2 px-3 py-2 text-small">
          <span className="block font-bold">Pro</span>${PLAN_PRICES.proMonthly} a month
        </p>
      </div>
    </figure>
  );
}

/** The three facts of the trial (facts 4.3 and 4.6). */
const TRIAL_STRIP = [
  "Day 1 is the day Kabsi's access to your Google profile works.",
  "No card.",
  "On day 14 choose a plan or stop. Nothing is charged by itself.",
] as const;

function Cell({ v }: { v: string }) {
  if (v === "Yes")
    return (
      <td className="p-3 sm:p-4">
        <Check className="size-5 text-ok" strokeWidth={2.5} aria-hidden />
        <span className="sr-only">Yes</span>
      </td>
    );
  if (v === "No")
    return (
      <td className="p-3 text-text-3 sm:p-4">
        <Minus className="size-5" aria-hidden />
        <span className="sr-only">No</span>
      </td>
    );
  return <td className="p-3 text-text-1 sm:p-4">{v}</td>;
}

export function D8Pricing() {
  // Signed in already (App 4, 30.31 item 1): Start free opens the dashboard, not the find-your-business step.
  // Launch 2 part C (30.36 item 8): one door to sign-up.
  const door = useStartFree();
  const periodFlag = useSearchFlag("period");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  useEffect(() => {
    if (periodFlag === "yearly") setPeriod("yearly");
  }, [periodFlag]);
  const yearly = period === "yearly";
  const unit = yearly ? "a year" : "a month";
  // The real counts only (lane R decision 2): nothing shows while a count is unknown.
  const left = useFoundingLeft();

  return (
    <>
      <PageHero hero={PRICING_HERO} under={TRIAL_LINE} visual={<TrialStrip />} />
      {/* Design 9 (Web 5 part D): the whole job in one line under the hero. */}
      <StepsLine id="pricing-steps-h" />

      <section aria-labelledby="plans-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="plans-h" className="text-h2">
              <Marked text="Who each plan is for" mark="each plan" />
            </h2>
            <Segmented
              label="Billing period"
              value={period}
              onChange={setPeriod}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "yearly", label: "Yearly, 2 months free" },
              ]}
            />
          </div>
          <ul className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
            {PLANS.map((p) => {
              const pro = p.id === "pro";
              return (
                <li
                  key={p.id}
                  aria-labelledby={`plan-${p.id}`}
                  className={cn(
                    "flex flex-col rounded-panel border bg-surface-0 p-6 sm:p-8",
                    pro ? "border-text-1 shadow-lift" : "border-line",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 id={`plan-${p.id}`} className="text-h3">
                      {p.name}
                    </h3>
                    {p.badge && <Pill>{p.badge}</Pill>}
                  </div>
                  <p className="mt-2 text-title text-text-1">{p.line}</p>
                  <p className="mt-5" aria-live="polite">
                    <span className="font-display text-display font-bold">
                      ${yearly ? p.yearly : p.monthly}
                    </span>
                    <span className="ms-1.5 text-body text-text-2">{unit}</span>
                  </p>
                  <FoundingPriceLine
                    plan={p.id}
                    yearly={yearly}
                    left={left}
                    className="mt-1 text-small text-text-2"
                  />
                  {/* Polish 2 (decision 5): the four most valuable built things; help is a small line. */}
                  {p.lead && <p className="mt-6 text-small font-bold">{p.lead}</p>}
                  <ul className={cn("space-y-2.5", p.lead ? "mt-2" : "mt-6")}>
                    {p.top.map((t) => (
                      <li key={t} className="flex gap-2.5 text-body">
                        <Check
                          className="mt-1 size-4 shrink-0 text-ok"
                          strokeWidth={2.5}
                          aria-hidden
                        />
                        {t}
                      </li>
                    ))}
                  </ul>
                  {/* Fix 2: the nearby check and the AI answer, with this plan's allowance from plan_limits(). */}
                  <div className="mt-5 border-t border-line pt-4">
                    <p className="text-small font-bold">Where you show up</p>
                    <ul className="mt-2 space-y-1.5">
                      {planChecks(p.id).map((c) => (
                        <li key={c.name} className="text-small text-text-2">
                          <span className="text-text-1">{c.name}:</span> {c.value}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Site 2 (30.34 item 4): the help line and the working hours are two lines, each under 25 words. */}
                  <p className="mt-5 text-label text-text-2">{p.help}</p>
                  <p className="mt-1 text-label text-text-2">{WORKING_HOURS}</p>
                  <div className="mt-auto pt-6">
                    <ButtonLink
                      to={door.to}
                      search={door.search}
                      full
                      variant={pro ? "primary" : "dark"}
                    >
                      Start free
                    </ButtonLink>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 space-y-1.5 text-small text-text-2">
            <p>{PAY_TODAY_LINE}</p>
            <p>{PRICE_TAX_LINE}</p>
            <p>{REFUND_LINE}</p>
            <p>
              Each extra location is ${PLAN_PRICES.extraLocationMonthly} a month or $
              {PLAN_PRICES.extraLocationYearly} a year, on the same plan.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="compare-h" className="border-t border-line">
        <div className="container-kb section-y">
          <h2 id="compare-h" className="text-h2">
            <Marked text="Compare the plans" mark="the plans" />
          </h2>
          <div className="mt-8 overflow-hidden rounded-panel border border-line bg-surface-1">
            <table className="w-full table-fixed text-start text-small sm:text-body">
              <caption className="sr-only">What each plan includes</caption>
              <thead>
                <tr className="border-b border-line bg-surface-2">
                  <th scope="col" className="p-3 text-start font-bold sm:p-4">
                    <span className="sr-only">What Kabsi does</span>
                  </th>
                  <th scope="col" className="w-[28%] p-3 text-start font-bold sm:p-4">
                    Essentials
                  </th>
                  <th scope="col" className="w-[28%] p-3 text-start font-bold sm:p-4">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {PLAN_ROWS.map(([row, e, p]) => (
                  <tr key={row}>
                    <th scope="row" className="p-3 text-start font-semibold break-words sm:p-4">
                      {row}
                    </th>
                    <Cell v={e} />
                    <Cell v={p} />
                  </tr>
                ))}
                {[PLAN_CHECKS.nearby, PLAN_CHECKS.ai].map((c) => (
                  <tr key={c.name}>
                    <th scope="row" className="p-3 text-start font-semibold break-words sm:p-4">
                      {c.name}
                    </th>
                    <Cell v={c.essentials} />
                    <Cell v={c.pro} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-small text-text-2">
            Only what Kabsi does today. More checks come later.
          </p>
        </div>
      </section>

      <section aria-labelledby="trial-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="trial-h" className="text-h2">
            <Marked text="The trial, what happens after it, and cancelling" mark="The trial" />
          </h2>
          <SectionPhoto photo={PHOTOS.cafeCounter} className="mt-8" />
          <ol className="mt-8 grid gap-6 md:grid-cols-2 md:gap-5 xl:grid-cols-4">
            {TRIAL_STEPS.map((s) => (
              <li key={s.when} className="border-t-2 border-text-1 pt-4">
                <p className="inline-flex rounded-full bg-kb-yellow px-3 py-1 text-label font-bold text-kb-black">
                  {s.when}
                </p>
                <h3 className="mt-3 text-title">{s.title}</h3>
                <p className="mt-1 text-body text-text-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The launch price shows only while places remain, with the real count (facts, Price 1). Founding 25 is private (Founding 1). */}
      {left !== null && left > 0 && (
        <section aria-labelledby="offers-h" className="border-t border-line">
          <div className="container-kb section-y">
            <div className="max-w-3xl rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
              <h2 id="offers-h" className="sr-only">
                The launch price
              </h2>
              <p className="inline-flex rounded-full bg-kb-yellow px-3 py-1 text-label font-bold text-kb-black">
                The launch price
              </p>
              <p className="mt-2 font-display text-h3 font-bold">
                The first {FOUNDING_TOTAL} paying businesses pay less.
              </p>
              <p className="mt-3 text-body text-text-2">
                They pay the launch price and keep it while they stay subscribed.
              </p>
              <p className="mt-2 text-body text-text-2">
                Essentials ${FOUNDING_PRICES.essentialsMonthly} a month or $
                {FOUNDING_PRICES.essentialsYearly} a year. Pro ${FOUNDING_PRICES.proMonthly} a month
                or ${FOUNDING_PRICES.proYearly} a year.
              </p>
              <p className="mt-3 text-small font-bold">{foundingPlacesLine(left)}</p>
            </div>
          </div>
        </section>
      )}

      <section aria-labelledby="pfaq-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <h2 id="pfaq-h" className="text-h2">
            <Marked text="Billing questions" mark="Billing" />
          </h2>
          <Faq items={BILLING_FAQ} />
        </div>
      </section>
      <Closing />
    </>
  );
}
