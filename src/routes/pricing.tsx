import { useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Gift, Globe, MapPin, Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { CtaBand, Eyebrow, H2, IconBadge, PageHero, Section } from "@/components/marketing/parts";
import { PricingVisual } from "@/components/marketing/visuals";
import { BookingLink } from "@/components/shared/booking-link";
import {
  CONTACT_PHONE,
  CTA_PRIMARY,
  PRICES,
  PRODUCT_LD,
  SETUP_CALL_MINUTES,
  TRIAL_LINE,
  pageHead,
} from "@/lib/site";
import { useIsLebanon } from "@/lib/region";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Kabsi pricing | Pro from $19 a month",
      description: `Kabsi Pro is $${PRICES.proMonthly} a month or $${PRICES.proYearly} a year. Start with a 14-day free trial, no card.`,
      path: "/pricing",
      crumbs: [{ name: "Pricing", path: "/pricing" }],
      jsonLd: [PRODUCT_LD],
    }),
  component: Page,
});

type Feature = { text: string; early?: boolean };

const FREE: Feature[] = [
  { text: "Review link for your Google review page" },
  { text: "QR code you can download and print" },
  { text: "Printable table card and a message to share" },
  { text: "Keeps working whatever plan you are on" },
];

// Plain outcomes (design review, "Pricing page"). A feature that is not live yet carries "Early access".
const PRO: Feature[] = [
  { text: "A reply ready for every new review" },
  { text: "Know when Google changes your details", early: true },
  { text: "Photos and updates prepared for you", early: true },
  { text: "Holiday hours reminders", early: true },
  { text: "Weekly Care Report", early: true },
  { text: "A person to talk to" },
];

function Page() {
  const isLebanon = useIsLebanon();
  const [yearly, setYearly] = useState(false);

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Pricing"
        title="Start free. Pay when it is worth it."
        sub={`${TRIAL_LINE}. Same price in every country. Your trial and your plan start when Kabsi's access to your Google profile works, so waiting for access costs you nothing.`}
        visual={<PricingVisual />}
        photo="heroPricing"
      />

      <Section tone="sand">
        <div data-stagger="" className={"grid gap-5 lg:grid-cols-2"}>
          <Plan
            name="Free"
            icon={<Gift />}
            price={0}
            per="Get Reviews"
            features={FREE}
            cta={CTA_PRIMARY}
          />
          <Plan
            name="Kabsi Pro"
            icon={<Sparkles />}
            price={yearly ? PRICES.proYearly : PRICES.proMonthly}
            per={yearly ? "a year · two months free" : "a month · cancel any time"}
            features={PRO}
            highlight
            cta={CTA_PRIMARY}
            note={`${TRIAL_LINE}. Extra locations: $${PRICES.extraLocationMonthly} a month or $${PRICES.extraLocationYearly} a year.`}
            toggle={
              <div
                role="group"
                aria-label="Billing period"
                className="mt-5 inline-flex rounded-pill bg-kb-sand p-1 text-sm font-bold"
              >
                {[false, true].map((y) => (
                  <button
                    key={String(y)}
                    type="button"
                    aria-pressed={yearly === y}
                    onClick={() => setYearly(y)}
                    className={cn(
                      "min-h-9 rounded-pill px-4",
                      yearly === y ? "bg-kb-black text-kb-white" : "text-kb-stone",
                    )}
                  >
                    {y ? "Yearly" : "Monthly"}
                  </button>
                ))}
              </div>
            }
          />
        </div>
        {isLebanon ? (
          <p className="mt-6 text-kb-stone">
            In Lebanon we also sell a bundle with an NFC card and setup.{" "}
            <Link to="/lebanon" className="font-bold text-kb-ink underline underline-offset-4">
              See the Lebanon offer
            </Link>
          </p>
        ) : null}
      </Section>

      <Section className="grid gap-10 md:grid-cols-2">
        <div>
          <Eyebrow>Paying</Eyebrow>
          <H2>How to pay</H2>
          <div className="mt-6 space-y-4 text-lg leading-8 text-kb-stone">
            <div className="flex gap-4">
              <IconBadge icon={<Globe />} tone="sand" />
              <p>
                <b className="text-kb-ink">Anywhere:</b> USDT, on TRC20 or with Binance Pay. After
                paying, paste the transaction ID in Kabsi and we confirm it.
              </p>
            </div>
            <div className="flex gap-4">
              <IconBadge icon={<MapPin />} tone="sand" />
              <p>
                <b className="text-kb-ink">In Lebanon:</b> also Whish, OMT or cash. Message{" "}
                {CONTACT_PHONE} or hello@kabsi.co and we'll arrange it.
              </p>
            </div>
          </div>
        </div>
        <div>
          <Eyebrow>Good to know</Eyebrow>
          <H2>The small print, in plain words</H2>
          <ul className="mt-6 space-y-3 text-lg leading-8 text-kb-stone">
            <Fact>
              The trial is 14 days and needs no card (30 days if a partner sent you). It starts when
              Kabsi's access to your Google profile works.
            </Fact>
            <Fact>
              Monthly plans can be cancelled at any time. Yearly plans are refundable in full within
              14 days of the plan starting. Cards aren't.
            </Fact>
            <Fact>
              When a trial or plan ends, Reviews, Google Profile, Google Protection and the Weekly
              Care Report stop. Get Reviews keeps working.
            </Fact>
            <Fact>
              Paying early adds the new period after the current one. You don't lose days.
            </Fact>
            <Fact>
              One plan covers one Google profile. Extra locations are ${PRICES.extraLocationMonthly}{" "}
              a month or ${PRICES.extraLocationYearly} a year.
            </Fact>
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

      <Section
        tone="sand"
        className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold">
            Sell NFC cards or look after businesses' Google profiles?
          </h2>
          <p className="mt-2 text-kb-stone">
            Partners pay a monthly wholesale rate and set their own price.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/partners">
            Partner pricing <ArrowRight />
          </Link>
        </Button>
      </Section>

      <CtaBand />
    </PublicLayout>
  );
}

function Plan({
  name,
  icon,
  price,
  per,
  features,
  highlight = false,
  cta,
  note,
  toggle,
}: {
  name: string;
  icon: ReactNode;
  price: number;
  per: string;
  features: Feature[];
  highlight?: boolean;
  cta: string;
  note?: string;
  toggle?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "kb-lift flex flex-col rounded-large bg-kb-white p-7 shadow-kb",
        highlight && "ring-2 ring-kb-black",
      )}
    >
      <div className="flex items-center gap-3">
        <IconBadge icon={icon} tone={highlight ? "yellow" : "sand"} className="size-10" />
        <p className="font-bold">{name}</p>
      </div>
      <p className="mt-5 font-display text-6xl leading-none">${price}</p>
      <p className="mt-2 text-sm text-kb-stone">{per}</p>
      {toggle}
      {note ? <p className="mt-3 text-sm font-medium text-kb-ink">{note}</p> : null}
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f.text} className="flex gap-3 text-[15px] leading-6">
            <Check className="mt-0.5 size-5 shrink-0 text-kb-green" />
            <span>
              {f.text}
              {f.early ? (
                <span className="ml-2 rounded-pill bg-kb-sand px-2 py-0.5 text-xs font-bold">
                  Early access
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      <Button asChild className="mt-8 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/start">{cta}</Link>
      </Button>
    </div>
  );
}

function Fact({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <Check className="mt-1.5 size-5 shrink-0 text-kb-green" />
      <span>{children}</span>
    </li>
  );
}
