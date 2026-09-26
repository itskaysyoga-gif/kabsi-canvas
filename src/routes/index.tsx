import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  ArrowRight,
  Clock3,
  FileText,
  ImagePlus,
  Languages,
  MailCheck,
  Newspaper,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { InboxDemo } from "@/components/marketing/inbox-demo";
import { CardRender, CtaBand, Eyebrow, FaqList, H2, Section } from "@/components/marketing/parts";
import { FAQ } from "@/lib/faq";
import { ORG_LD, PRICES, PRODUCT_LD, WEBSITE_LD, pageHead } from "@/lib/site";

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () =>
    pageHead({
      title: "Kabsi — Every Google review answered, with your approval",
      description:
        "Every new Google review reaches you by email with a reply already drafted in the reviewer's language. Read it, change it if you like, and tap Post. Nothing goes on Google without you.",
      path: "/",
      jsonLd: [ORG_LD, WEBSITE_LD, PRODUCT_LD],
    }),
  component: HomePage,
});

function HomePage() {
  const { sticker } = Route.useSearch();
  return (
    <PublicLayout>
      {sticker === "disabled" ? (
        <div
          role="status"
          className="bg-kb-yellow px-5 py-3 text-center text-sm font-bold text-kb-black"
        >
          This Kabsi card isn't active. Please ask the staff for help.
        </div>
      ) : null}

      {/* Hero */}
      <section className="bg-kb-carbon text-kb-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-24">
          <div>
            <div className="mb-7 h-1.5 w-16 rounded-pill bg-kb-yellow" />
            <h1 className="font-display text-[clamp(2.9rem,7vw,5.6rem)] leading-[0.95]">
              Every Google review, answered. You just tap Post.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-kb-stone-on-dark">
              New reviews arrive by email with a reply already written in your customer's language.
              Read it, change it if you like, and tap Post. Nothing goes on Google without you.
            </p>
            <div className="mt-9 grid gap-3 sm:flex">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/start">
                  Get set up <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"
              >
                <Link to="/how-it-works">See how it works</Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <InboxDemo />
          </div>
        </div>
      </section>

      {/* How it works */}
      <Section>
        <Eyebrow>How it works</Eyebrow>
        <H2>Three steps, and the last one is yours.</H2>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          <Step n={1} icon={<UserPlus />} title="Add Kabsi to your Google profile">
            Invite hello@kabsi.co as a Manager, like you'd add a staff member. You can remove it any
            time.
          </Step>
          <Step n={2} icon={<Languages />} title="Every new review gets a draft">
            Written in the reviewer's language, using only the facts you gave Kabsi. It arrives in
            your email.
          </Step>
          <Step n={3} icon={<MailCheck />} title="You tap Post">
            Or edit it, or skip it. You see the exact words first. Nothing goes on Google without
            you.
          </Step>
        </ol>
      </Section>

      {/* More than replies */}
      <Section tone="sand">
        <Eyebrow>Also in Kabsi Pro</Eyebrow>
        <H2>Your Google profile, looked after.</H2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-kb-stone">
          Everything below works the same way: Kabsi prepares it, you approve it.
        </p>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<ShieldCheck />} title="Listing Shield">
            If your name, phone, address, hours, website or categories change without you, you get
            an email. One tap puts yours back.
          </Feature>
          <Feature icon={<Newspaper />} title="Google posts">
            Tell Kabsi what's new. It drafts a short post for your profile. You read it, then post
            it.
          </Feature>
          <Feature icon={<ImagePlus />} title="Photos">
            Add a photo from your phone. Kabsi checks it's clear and fits Google's rules before you
            post it.
          </Feature>
          <Feature icon={<Clock3 />} title="Special hours">
            Holidays and closures, set in a minute, so customers don't find a closed door.
          </Feature>
          <Feature icon={<FileText />} title="Monday report">
            Your rating, new reviews, replies and card taps for the week. Facts only, in one short
            email.
          </Feature>
          <div className="flex flex-col justify-between rounded-large bg-kb-carbon p-6 text-kb-white">
            <p className="text-lg font-bold leading-7">
              Nothing is posted until you approve it. Not a reply, not a photo, not a phone number.
            </p>
            <Link
              to="/how-it-works"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-kb-yellow"
            >
              How approval works <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </Section>

      {/* The card */}
      <Section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>The Kabsi card</Eyebrow>
          <H2>One tap opens your Google review page.</H2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
            Put it on your counter, door or table. Customers tap it with their phone or scan the QR
            code, and your Google review page opens. Every customer sees the same page: there's no
            rating screen and no filtering.
          </p>
          <ul className="mt-6 space-y-2 text-kb-ink">
            <li>· Works with iPhone and Android, by tap or by scan</li>
            <li>· ${PRICES.card} on its own, or included with Kabsi Pro</li>
            <li>· Keeps working even if your plan ends</li>
          </ul>
        </div>
        <div className="flex justify-center">
          <CardRender />
        </div>
      </Section>

      {/* Pricing summary */}
      <Section tone="sand">
        <Eyebrow>Pricing</Eyebrow>
        <H2>Paid once, upfront. No monthly bills.</H2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Price
            amount={PRICES.pro12}
            name="Kabsi Pro, 12 months"
            line="$10 a month · card included"
            highlight
          />
          <Price
            amount={PRICES.pro6}
            name="Kabsi Pro, 6 months"
            line="$12.50 a month · card included"
          />
          <Price amount={PRICES.card} name="Card only" line="One tap to your Google review page" />
        </div>
        <p className="mt-6 text-kb-stone">
          Pro is refundable within 14 days.{" "}
          <Link to="/pricing" className="font-bold text-kb-ink underline underline-offset-4">
            See pricing and payment
          </Link>
        </p>
      </Section>

      {/* FAQ */}
      <Section>
        <Eyebrow>Questions</Eyebrow>
        <H2>Straight answers.</H2>
        <div className="mt-10">
          <FaqList items={FAQ.slice(0, 5)} />
        </div>
        <Link
          to="/faq"
          className="mt-6 inline-flex items-center gap-2 font-bold underline-offset-4 hover:underline"
        >
          All questions <ArrowRight className="size-4" />
        </Link>
      </Section>

      <CtaBand />
    </PublicLayout>
  );
}

function Step({
  n,
  icon,
  title,
  children,
}: {
  n: number;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="rounded-large border-2 border-kb-hairline p-6">
      <div className="flex items-center justify-between">
        <span className="grid size-11 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5">
          {icon}
        </span>
        <span className="font-display text-4xl leading-none text-kb-hairline">{n}</span>
      </div>
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-kb-stone">{children}</p>
    </li>
  );
}

function Feature({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-large bg-kb-white p-6 shadow-kb">
      <span className="grid size-11 place-items-center rounded-card bg-kb-sand [&_svg]:size-5">
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <p className="mt-2 leading-7 text-kb-stone">{children}</p>
    </div>
  );
}

function Price({
  amount,
  name,
  line,
  highlight = false,
}: {
  amount: number;
  name: string;
  line: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-large bg-kb-white p-6 shadow-kb ring-2 ring-kb-black"
          : "rounded-large bg-kb-white p-6 shadow-kb"
      }
    >
      <p className="font-display text-5xl leading-none">${amount}</p>
      <p className="mt-3 font-bold">{name}</p>
      <p className="mt-1 text-sm text-kb-stone">{line}</p>
    </div>
  );
}
