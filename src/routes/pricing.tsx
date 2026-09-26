import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { CtaBand, Eyebrow, H2, PageHero, Section } from "@/components/marketing/parts";
import { CONTACT_PHONE, PRICES, PRODUCT_LD, pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Pricing — Kabsi",
      description: `Kabsi Pro: $${PRICES.pro6} for 6 months or $${PRICES.pro12} for 12 months, card included. Card only: $${PRICES.card}. Paid once, refundable within 14 days.`,
      path: "/pricing",
      jsonLd: [PRODUCT_LD],
    }),
  component: Page,
});

const PRO = [
  "A drafted reply for every new Google review, in the reviewer's language",
  "Post, edit or skip from your email or dashboard",
  "Listing Shield: alert and one-tap revert",
  "Google posts, photos and special hours, drafted for you",
  "Monday report",
  "One Kabsi card included",
];

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Pricing"
        title="Paid once, upfront. No monthly bills."
        sub="Same price in every country. Your plan starts when payment is confirmed and Kabsi's access to your Google profile works, so waiting for access costs you nothing."
      />

      <Section tone="sand">
        <div className="grid gap-5 lg:grid-cols-3">
          <Plan
            name="Kabsi Pro, 12 months"
            price={PRICES.pro12}
            per="$10 a month"
            features={PRO}
            highlight
          />
          <Plan
            name="Kabsi Pro, 6 months"
            price={PRICES.pro6}
            per="$12.50 a month"
            features={PRO}
          />
          <Plan
            name="Card only"
            price={PRICES.card}
            per="One-time"
            features={[
              "NFC chip and QR code",
              "Opens your Google review page in one tap",
              "Same page for every customer, no filtering",
              "Keeps working for good",
            ]}
          />
        </div>
        <p className="mt-6 text-kb-stone">
          Extra cards: ${PRICES.extraCard} each, or ${PRICES.fiveCards} for five.
        </p>
      </Section>

      <Section className="grid gap-10 md:grid-cols-2">
        <div>
          <Eyebrow>Paying</Eyebrow>
          <H2>How to pay</H2>
          <div className="mt-6 space-y-4 text-lg leading-8 text-kb-stone">
            <p>
              <b className="text-kb-ink">Anywhere:</b> USDT, on TRC20 or with Binance Pay. After
              paying, paste the transaction ID in Kabsi and we confirm it.
            </p>
            <p>
              <b className="text-kb-ink">In Lebanon:</b> also Whish, OMT or cash. Message{" "}
              {CONTACT_PHONE} or hello@kabsi.co and we'll arrange it.
            </p>
          </div>
        </div>
        <div>
          <Eyebrow>Good to know</Eyebrow>
          <H2>The small print, in plain words</H2>
          <ul className="mt-6 space-y-3 text-lg leading-8 text-kb-stone">
            <Fact>
              Kabsi Pro is refundable in full within 14 days of the plan starting. Cards aren't.
            </Fact>
            <Fact>
              When a plan ends, reply drafts, Listing Shield and reports stop. Your card keeps
              working.
            </Fact>
            <Fact>
              Renewing early adds the new period after the current one. You don't lose days.
            </Fact>
            <Fact>One plan covers one Google profile.</Fact>
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
  price,
  per,
  features,
  highlight = false,
}: {
  name: string;
  price: number;
  per: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-large bg-kb-white p-7 shadow-kb",
        highlight && "ring-2 ring-kb-black",
      )}
    >
      <p className="font-bold">{name}</p>
      <p className="mt-4 font-display text-6xl leading-none">${price}</p>
      <p className="mt-2 text-sm text-kb-stone">{per}</p>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((f) => (
          <li key={f} className="flex gap-3 text-[15px] leading-6">
            <Check className="mt-0.5 size-5 shrink-0 text-kb-green" />
            {f}
          </li>
        ))}
      </ul>
      <Button asChild className="mt-8 w-full" variant={highlight ? "default" : "outline"}>
        <Link to="/start">Get set up</Link>
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
