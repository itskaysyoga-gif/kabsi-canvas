import { createFileRoute } from "@tanstack/react-router";
import { Check, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  PAY_TODAY_LINE,
  PRICE_TAX_LINE,
  PRODUCT_LD,
  REFUND_LINE,
  TRIAL_LINE,
  WORKING_HOURS,
  foundingPlacesLine,
  pageHead,
} from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { useSearchFlag } from "@/components/kabsi/page-signals";
import { Badge, ButtonLink, Faq, SectionHead, Segmented } from "@/components/kabsi/ui";
import { FOUNDING_TOTAL, MORE_LATER, PLANS, PLAN_ROWS } from "@/components/kabsi/plans";
import { FoundingPriceLine, useFoundingLeft } from "@/components/kabsi/founding-price";
import { FoundingBanner } from "@/components/kabsi/d5-founding";
import { FAQ, PRICING_FAQ } from "@/components/kabsi/faq-data";
import { Img, PHOTOS } from "@/components/kabsi/photos";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Kabsi pricing: Simple plans. Free for 14 days.",
      description:
        "Each plan does the Google work for one business, and you approve every change. Prices in US dollars, plus tax where it applies.",
      path: "/pricing",
      image: "pricing",
      crumbs: [{ name: "Pricing", path: "/pricing" }],
      jsonLd: [PRODUCT_LD, faqJsonLd(PRICING_FAQ.map((i) => FAQ[i - 1]!))],
    }),
  component: Pricing,
});

type Period = "monthly" | "yearly";

function Pricing() {
  const periodFlag = useSearchFlag("period");
  const [period, setPeriod] = useState<Period>("monthly");
  useEffect(() => {
    if (periodFlag === "yearly") setPeriod("yearly");
  }, [periodFlag]);
  // The real count of founding price places (session 10). The block stays hidden at 0 or while the count is unknown.
  const left = useFoundingLeft();

  return (
    <SiteShell>
      <section className="container-kb pt-28 lg:pt-36">
        <SectionHead
          as="h1"
          title="Simple plans. Free for 14 days."
          lead="Each plan does the Google work for one business, and you approve every change. Prices in US dollars, plus tax where it applies."
        />
        <Segmented
          className="mt-8"
          label="Billing period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly, 2 months free" },
          ]}
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2" data-main-cta>
          {PLANS.map((p) => {
            const pro = p.id === "pro";
            return (
              <article
                key={p.id}
                aria-labelledby={`plan-${p.id}`}
                className={cn(
                  "flex flex-col rounded-panel border bg-surface-1 p-6 sm:p-8",
                  pro ? "border-2 border-text-1 shadow-lift" : "border-line",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 id={`plan-${p.id}`} className="text-h3">
                    {p.name}
                  </h2>
                  {p.badge && <Badge>{p.badge}</Badge>}
                </div>
                <p className="mt-5" aria-live="polite">
                  <span className="font-display text-display font-bold">
                    ${period === "monthly" ? p.monthly : p.yearly}
                  </span>
                  <span className="ms-2 text-body text-text-2">
                    {period === "monthly" ? "a month" : "a year"}
                  </span>
                </p>
                <FoundingPriceLine plan={p.id} yearly={period === "yearly"} left={left} />
                <p className="mt-4 text-body text-text-2">{p.line}</p>
                <ul className="mt-6 space-y-3 border-t border-line pt-6">
                  {p.work.map((w) => (
                    <li key={w} className="flex gap-3 text-body text-text-1">
                      <Check
                        className="mt-1 size-4 shrink-0 text-ok"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      {w}
                    </li>
                  ))}
                </ul>
                <p className="mt-6 rounded-inner bg-surface-2 p-4 text-small">
                  <span className="block font-bold text-text-1">{p.help}</span>
                  <span className="mt-1 block text-text-2">{WORKING_HOURS}</span>
                </p>
                <div className="mt-auto pt-8">
                  <ButtonLink to="/get-started" full variant={pro ? "primary" : "secondary"}>
                    Start free
                  </ButtonLink>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-5 grid max-w-2xl gap-2 text-small text-text-2">
          <p>{TRIAL_LINE} Your trial starts when Kabsi's access to your Google profile works.</p>
          <p>{PAY_TODAY_LINE}</p>
          <p>{PRICE_TAX_LINE}</p>
          <p>{REFUND_LINE}</p>
        </div>

        {left !== null && left > 0 && (
          <div className="mt-8 flex flex-col gap-4 rounded-panel border border-line bg-surface-1 p-5 sm:flex-row sm:items-center sm:p-6">
            <div
              className="grid size-16 shrink-0 place-items-center rounded-full bg-surface-2 font-display text-h3 font-bold"
              aria-hidden
            >
              {left}
            </div>
            <div className="flex-1">
              <p className="text-body font-semibold text-text-1">
                Founding price for the first {FOUNDING_TOTAL} paying businesses, kept while you stay
                subscribed. {foundingPlacesLine(left)}
              </p>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3"
                role="img"
                aria-label={`${FOUNDING_TOTAL - left} of ${FOUNDING_TOTAL} places taken`}
              >
                <div
                  className="h-full rounded-full bg-kb-green"
                  style={{ width: `${((FOUNDING_TOTAL - left) / FOUNDING_TOTAL) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <p className="mt-6 text-body text-text-1">
          Each extra location is $15 a month or $150 a year, on the same plan.
        </p>
      </section>

      <FoundingBanner className="mt-16 lg:mt-20" />

      <section aria-labelledby="rows-h" className="container-kb section-y">
        <h2 id="rows-h" className="sr-only">
          What each plan includes
        </h2>
        <div className="overflow-hidden rounded-panel border border-line">
          <div className="hidden grid-cols-[1.4fr_1fr_1fr] gap-4 bg-surface-1 px-6 py-4 text-small font-bold md:grid">
            <span />
            <span>Essentials</span>
            <span>Pro</span>
          </div>
          <dl className="divide-y divide-line">
            {PLAN_ROWS.map(([k, e, p]) => (
              <div
                key={k}
                className="grid grid-cols-2 gap-x-4 gap-y-2 px-5 py-4 md:grid-cols-[1.4fr_1fr_1fr] md:px-6"
              >
                <dt className="col-span-2 text-body font-semibold text-text-1 md:col-span-1">
                  {k}
                </dt>
                <Cell plan="Essentials" value={e} />
                <Cell plan="Pro" value={p} />
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-4 text-small text-text-2">{MORE_LATER}</p>
      </section>

      <section aria-labelledby="pfaq-h" className="border-t border-line">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <SectionHead id="pfaq-h" title="Questions owners ask" />
            <div className="mt-8 hidden overflow-hidden rounded-panel lg:block">
              <Img
                photo={PHOTOS.phoneShop}
                sizes="30vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
          <Faq items={PRICING_FAQ.map((i) => FAQ[i - 1]!)} />
        </div>
      </section>
    </SiteShell>
  );
}

function Cell({ plan, value }: { plan: string; value: string }) {
  const icon =
    value === "Yes" ? (
      <Check className="size-4 text-ok" strokeWidth={2.5} aria-hidden />
    ) : value === "No" ? (
      <Minus className="size-4 text-text-3" aria-hidden />
    ) : null;
  return (
    <dd className="text-small text-text-2">
      <span className="block text-label font-bold text-text-3 md:hidden">{plan}</span>
      <span className="inline-flex items-center gap-1.5">
        {icon}
        {value}
      </span>
    </dd>
  );
}
