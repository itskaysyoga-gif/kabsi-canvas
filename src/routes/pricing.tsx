import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarRange, Check, Globe, MapPin, Nfc, Sparkles } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import {
  CardShippingNote,
  CtaBand,
  Eyebrow,
  H2,
  IconBadge,
  PageHero,
  Section,
} from "@/components/marketing/parts";
import { PricingVisual } from "@/components/marketing/visuals";
import { CONTACT_PHONE, PRICES, PRODUCT_LD, pageHead } from "@/lib/site";
import { useIsLebanon } from "@/lib/region";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () =>
    pageHead({
      title: "Kabsi pricing | Pro from $75, no monthly bills",
      description: `Kabsi Pro: $${PRICES.pro6} for 6 months or $${PRICES.pro12} for 12 months, paid once, refundable within 14 days. NFC cards ship in Lebanon only.`,
      path: "/pricing",
      crumbs: [{ name: "Pricing", path: "/pricing" }],
      jsonLd: [PRODUCT_LD],
    }),
  component: Page,
});

const PRO = [
  "A reply drafted for every new Google review, in the reviewer's language",
  "One-tap approval from your email or dashboard",
  "A weekly Google update drafted for you, with an action button",
  "Listing Shield: change alerts and one-tap revert",
  "Photos checked and special hours set in a minute",
  "Profile health on your dashboard and a Monday report",
  "Review link and printable QR code, anywhere",
  "One NFC card included in Lebanon",
];

function Page() {
  const isLebanon = useIsLebanon();
  const proFeatures = isLebanon ? PRO : PRO.filter((feature) => !feature.includes("NFC card"));

  return (
    <PublicLayout>
      <PageHero
        eyebrow="Pricing"
        title="Paid once, upfront. No monthly bills."
        sub="Same price in every country. Your plan starts when payment is confirmed and Kabsi's access to your Google profile works, so waiting for access costs you nothing."
        visual={<PricingVisual />}
        photo="heroPricing"
      />

      <Section tone="sand">
        <div
          data-stagger=""
          className={cn("grid gap-5", isLebanon ? "lg:grid-cols-3" : "lg:grid-cols-2")}
        >
          <Plan
            name="Kabsi Pro, 12 months"
            icon={<Sparkles />}
            price={PRICES.pro12}
            per="$10 a month"
            features={proFeatures}
            highlight
          />
          <Plan
            name="Kabsi Pro, 6 months"
            icon={<CalendarRange />}
            price={PRICES.pro6}
            per="$12.50 a month"
            features={proFeatures}
          />
          {isLebanon ? (
            <Plan
              name="NFC card only"
              icon={<Nfc />}
              price={PRICES.card}
              per="One-time"
              features={[
                "Acrylic card with NFC chip and QR code",
                "Opens your Google review page in one tap",
                "Same page for every customer, no filtering",
                "Keeps working for good",
                "Shipped in Lebanon only",
              ]}
            />
          ) : null}
        </div>
        {isLebanon ? (
          <p className="mt-6 text-kb-stone">
            Extra cards in Lebanon: ${PRICES.extraCard} each, or ${PRICES.fiveCards} for five.
          </p>
        ) : null}
        <CardShippingNote
          className="mt-4 max-w-3xl bg-kb-white"
          isLebanon={isLebanon}
        />
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
          <img
            src="/images/nfc-cards.webp"
            alt="Two acrylic NFC review cards, one black and one blue, each with tap and QR code areas"
            width={900}
            height={776}
            loading="lazy"
            decoding="async"
            className="mt-10 w-full max-w-md rounded-large shadow-kb"
          />
          <p className="mt-2 text-xs text-kb-stone">Current card designs.</p>
        </div>
        <div>
          <Eyebrow>Good to know</Eyebrow>
          <H2>The small print, in plain words</H2>
          <ul className="mt-6 space-y-3 text-lg leading-8 text-kb-stone">
            <Fact>
              Kabsi Pro is refundable in full within 14 days of the plan starting. Cards aren't.
            </Fact>
            <Fact>
              When a plan ends, reply drafts, weekly posts, Listing Shield and reports stop. Your
              card and review link keep working.
            </Fact>
            <Fact>
              Renewing early adds the new period after the current one. You don't lose days.
            </Fact>
            <Fact>One plan covers one Google profile.</Fact>
            <Fact>
              The NFC card is optional. You can use Kabsi fully with a review link and QR code.
              Outside Lebanon, Kabsi Pro is the same price and works the same way; only the card
              comes from a partner or from any NFC card you buy online.
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
}: {
  name: string;
  icon: ReactNode;
  price: number;
  per: string;
  features: string[];
  highlight?: boolean;
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
