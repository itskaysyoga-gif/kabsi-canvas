import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard, Minus, Plus } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import {
  CtaBand,
  Eyebrow,
  FaqList,
  H2,
  IconBadge,
  PageHero,
  Section,
  SoonPill,
} from "@/components/marketing/parts";
import { BookingLink } from "@/components/shared/booking-link";
import { faqJsonLd } from "@/lib/faq";
import {
  CTA_CHECK,
  PLAN_PRICES,
  PRODUCT_LD,
  SETUP_CALL_MINUTES,
  TAX_NOTE,
  pageHead,
} from "@/lib/site";
import {
  ESSENTIALS_FOR,
  PAYMENT_LINE,
  PRO_FOR,
  TRIAL_BOX,
  planButton,
  planGrid,
  pricingFaq,
  type PlanItem,
} from "@/lib/website";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: `Kabsi pricing | Essentials from $${PLAN_PRICES.essentialsMonthly} a month`,
      description: `Kabsi Essentials is $${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year and Pro is $${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year. Try Pro free for 14 days, no card.`,
      path: "/pricing",
      crumbs: [{ name: "Pricing", path: "/pricing" }],
      jsonLd: [PRODUCT_LD, faqJsonLd(pricingFaq())],
    }),
  component: Page,
});

const LOCATION_MAX = 20;

function Page() {
  const [yearly, setYearly] = useState(false);
  const [locations, setLocations] = useState(1);
  const grid = planGrid();
  const extra = Math.max(0, locations - 1);
  const per = yearly ? "year" : "month";
  const extraPrice = yearly ? PLAN_PRICES.extraLocationYearly : PLAN_PRICES.extraLocationMonthly;
  const essentials = yearly ? PLAN_PRICES.essentialsYearly : PLAN_PRICES.essentialsMonthly;
  const pro = yearly ? PLAN_PRICES.proYearly : PLAN_PRICES.proMonthly;
  const btn = planButton();

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Pricing"
        title="Two plans. Try Pro free first."
        sub="Try Pro free for 14 days, with no card. Your trial and your plan start when Kabsi's access to your Google profile works, so waiting for access costs you nothing. Same price in every country."
      >
        <span className="mt-6 inline-flex rounded-pill bg-kb-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-kb-stone-on-dark ring-1 ring-kb-white/15">
          Early access pricing
        </span>
      </PageHero>

      <Section tone="sand">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div
            role="group"
            aria-label="Billing period"
            className="inline-flex w-fit rounded-pill bg-kb-white p-1 text-sm font-bold ring-1 ring-kb-hairline"
          >
            {[false, true].map((y) => (
              <button
                key={String(y)}
                type="button"
                aria-pressed={yearly === y}
                onClick={() => setYearly(y)}
                className={cn(
                  "min-h-10 whitespace-nowrap rounded-pill px-5",
                  yearly === y ? "bg-kb-black text-kb-white" : "text-kb-stone",
                )}
              >
                {y ? "Yearly, 2 months free" : "Monthly"}
              </button>
            ))}
          </div>
          <p className="text-sm text-kb-stone">
            US dollars, {TAX_NOTE}. {PAYMENT_LINE}
          </p>
        </div>

        <div data-stagger="" className="mt-8 grid gap-5 lg:grid-cols-2">
          <Plan
            name="Essentials"
            blurb={ESSENTIALS_FOR}
            price={essentials}
            per={per}
            items={grid.essentials}
            label="Everything Essentials includes"
            buttonTo={btn.to}
            buttonLabel={btn.label}
          />
          <Plan
            name="Pro"
            blurb={PRO_FOR}
            price={pro}
            per={per}
            items={grid.proAdds}
            label="Everything in Essentials, and"
            highlight
            buttonTo={btn.to}
            buttonLabel={btn.label}
          />
        </div>

        <div className="mt-6 rounded-large border-l-4 border-kb-yellow bg-kb-white p-6 shadow-kb">
          <p className="font-bold">{TRIAL_BOX}</p>
          <p className="mt-2 text-kb-stone">
            Your review link and QR code stay free, and so does the Google Profile Check.
          </p>
        </div>

        <div className="mt-6 rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
          <h2 className="font-display text-3xl">More than one location</h2>
          <p className="mt-2 text-kb-stone">
            One plan covers one Google profile. Each extra location is $
            {PLAN_PRICES.extraLocationMonthly} a month or ${PLAN_PRICES.extraLocationYearly} a year.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3" role="group" aria-label="Number of locations">
              <Button
                variant="outline"
                size="icon"
                aria-label="One fewer location"
                disabled={locations <= 1}
                onClick={() => setLocations((n) => Math.max(1, n - 1))}
              >
                <Minus />
              </Button>
              <span className="min-w-24 text-center font-bold" aria-live="polite">
                {locations} {locations === 1 ? "location" : "locations"}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="One more location"
                disabled={locations >= LOCATION_MAX}
                onClick={() => setLocations((n) => Math.min(LOCATION_MAX, n + 1))}
              >
                <Plus />
              </Button>
            </div>
            <dl className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-kb-stone">Essentials</dt>
                <dd className="font-bold">
                  ${essentials + extra * extraPrice} a {per}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-kb-stone">Pro</dt>
                <dd className="font-bold">
                  ${pro + extra * extraPrice} a {per}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </Section>

      <Section className="grid gap-10 md:grid-cols-2">
        <div>
          <Eyebrow>Paying</Eyebrow>
          <H2>Cards through Creem</H2>
          <div className="mt-6 flex gap-4 text-lg leading-8 text-kb-stone">
            <IconBadge icon={<CreditCard />} tone="sand" />
            <p>
              <b className="text-kb-ink">By card, in US dollars, and nothing else.</b> Card payments
              are coming. Until they open there is nothing to pay, and the trial needs no card.
            </p>
          </div>
        </div>
        <div>
          <Eyebrow>Good to know</Eyebrow>
          <H2>The small print, in plain words</H2>
          <ul className="mt-6 space-y-3 text-lg leading-8 text-kb-stone">
            <Fact>
              The trial is 14 days and needs no card. It starts when Kabsi's access to your Google
              profile works.
            </Fact>
            <Fact>
              Monthly plans cancel any time. Yearly plans are refunded in full within 14 days of the
              plan starting.
            </Fact>
            <Fact>
              When a trial ends without a plan, or a plan ends, watching and drafting stop. Your
              review link and QR code keep working, and the free tools stay free.
            </Fact>
            <Fact>Paying early adds the new period after the current one. You lose no days.</Fact>
            <Fact>
              Kabsi works with a verified Google Business Profile for a business that meets
              customers in person or travels to them.
            </Fact>
            <Fact>
              Setting up and not sure? Book a free {SETUP_CALL_MINUTES}-minute setup call and we
              guide you, you click.{" "}
              <BookingLink kind="setup" className="text-kb-ink">
                Book a free setup call
              </BookingLink>
            </Fact>
          </ul>
        </div>
      </Section>

      <Section tone="sand">
        <Eyebrow>Questions</Eyebrow>
        <H2>About plans and paying.</H2>
        <div className="mt-10">
          <FaqList items={pricingFaq()} />
        </div>
        <p className="mt-6">
          <Link to="/faq" className="font-bold underline underline-offset-4">
            All questions
          </Link>
        </p>
      </Section>

      <CtaBand cta={{ to: "/google-profile-check", label: CTA_CHECK }} />
    </PublicLayout>
  );
}

function Plan({
  name,
  blurb,
  price,
  per,
  items,
  label,
  highlight = false,
  buttonTo,
  buttonLabel,
}: {
  name: string;
  blurb: string;
  price: number;
  per: string;
  items: PlanItem[];
  label: string;
  highlight?: boolean;
  buttonTo: "/google-profile-check" | "/start";
  buttonLabel: string;
}) {
  return (
    <div
      className={cn(
        "kb-lift flex flex-col rounded-large bg-kb-white p-7 shadow-kb",
        highlight && "ring-2 ring-kb-black",
      )}
    >
      <p className="font-display text-3xl">{name}</p>
      <p className="mt-1 text-kb-stone">{blurb}</p>
      <p className="mt-5 font-display text-6xl leading-none">${price}</p>
      <p className="mt-2 text-sm text-kb-stone">a {per}</p>
      <Button asChild className="mt-6 w-full" variant={highlight ? "default" : "outline"}>
        <Link to={buttonTo}>{buttonLabel}</Link>
      </Button>
      <p className="mt-6 text-sm font-bold uppercase tracking-wider text-kb-stone">{label}</p>
      <ul className="mt-4 flex-1 space-y-3">
        {items.map((f) => (
          <li key={f.text} className="flex gap-3 text-[15px] leading-6">
            <Check className="mt-0.5 size-5 shrink-0 text-kb-green" aria-hidden="true" />
            <span>
              {f.text}
              {f.soon ? <SoonPill className="ml-2" /> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Fact({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Check className="mt-1.5 size-5 shrink-0 text-kb-green" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
