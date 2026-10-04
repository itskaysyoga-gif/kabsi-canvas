import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, MapPin, Package } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { CtaBand, Eyebrow, H2, PageHero, Section } from "@/components/marketing/parts";
import { CONTACT_PHONE, PRICES, pageHead } from "@/lib/site";

export const Route = createFileRoute("/lebanon")({
  head: () =>
    pageHead({
      title: "Kabsi in Lebanon | NFC review card and setup",
      description: `The Lebanon bundle: Kabsi Pro for 12 months, an NFC review card and in-person setup, $${PRICES.lebanonBundle}. Sold by our team in Lebanon.`,
      path: "/lebanon",
      crumbs: [{ name: "Lebanon", path: "/lebanon" }],
    }),
  component: Page,
});

const BUNDLE = [
  "Kabsi Pro for 12 months, with everything in Pro",
  "One NFC card with your review link on it",
  "In-person setup by our team in Lebanon",
  "Pay in cash, Whish, OMT or USDT",
];

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Lebanon"
        title="Kabsi, with a card and someone to set it up."
        sub="In Lebanon our team can visit, set up your Google Business Profile with you and give you an NFC card that opens your Google review page in one tap."
      />
      <Section tone="sand" className="grid gap-10 md:grid-cols-2">
        <div className="rounded-large bg-kb-white p-7 shadow-kb">
          <p className="flex items-center gap-3 font-bold">
            <Package className="size-5" aria-hidden="true" /> Lebanon bundle
          </p>
          <p className="mt-5 font-display text-6xl leading-none">${PRICES.lebanonBundle}</p>
          <p className="mt-2 text-sm text-kb-stone">a year, sold by our team in Lebanon</p>
          <ul className="mt-6 space-y-3">
            {BUNDLE.map((f) => (
              <Li key={f}>{f}</Li>
            ))}
          </ul>
          <Button asChild className="mt-8 w-full">
            <a href={`https://wa.me/${CONTACT_PHONE.replace(/\D/g, "")}`}>Message us on WhatsApp</a>
          </Button>
        </div>
        <div>
          <Eyebrow>Good to know</Eyebrow>
          <H2>The small print, in plain words</H2>
          <ul className="mt-6 space-y-3 text-lg leading-8 text-kb-stone">
            <Li>
              A card on its own is ${PRICES.card}. Extra cards: ${PRICES.extraCard} each, or $
              {PRICES.fiveCards} for five.
            </Li>
            <Li>
              Every customer sees the same Google review page. There is no rating screen and no
              filtering. Ask every customer the same way, as they visit. Never offer a reward.
            </Li>
            <Li>The card keeps working if your plan ends.</Li>
            <Li>
              Cards ship in Lebanon only. Elsewhere, Kabsi gives you a free review link and QR code
              you can also write onto any NFC tag you own.
            </Li>
            <Li>
              Kabsi works with a verified Google Business Profile for a business that meets
              customers in person or travels to them.
            </Li>
          </ul>
          <p className="mt-6 flex items-center gap-2 text-sm text-kb-stone">
            <MapPin className="size-4" aria-hidden="true" /> Outside Lebanon?{" "}
            <Link to="/pricing" className="inline-flex items-center gap-1 font-bold underline">
              See pricing <ArrowRight className="size-4" />
            </Link>
          </p>
        </div>
      </Section>
      <CtaBand />
    </PublicLayout>
  );
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3 leading-7">
      <Check className="mt-1.5 size-5 shrink-0 text-kb-green" aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}
