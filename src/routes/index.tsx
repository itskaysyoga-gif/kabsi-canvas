import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import {
  ArrowRight,
  Check,
  Clock3,
  FileText,
  ImagePlus,
  Languages,
  Link2,
  MailCheck,
  Newspaper,
  QrCode,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { InboxDemo } from "@/components/marketing/inbox-demo";
import { CtaBand, Eyebrow, FaqList, H2, Section } from "@/components/marketing/parts";
import { FAQ } from "@/lib/faq";
import { ORG_LD, PRICES, PRODUCT_LD, WEBSITE_LD, pageHead } from "@/lib/site";

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () =>
    pageHead({
      title: "Kabsi | AI local SEO for your Google Business Profile",
      description:
        "Grounded AI replies to every Google review, weekly keyword posts and a listing guard that watches your profile. Nothing goes on Google until you approve it.",
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
            <p className="inline-flex items-center gap-2 rounded-pill border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-kb-yellow">
              <Sparkles className="size-4" aria-hidden="true" />
              AI local SEO and profile growth engine
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,6.6vw,5.2rem)] leading-[0.95]">
              Build maximum local visibility on Google Maps.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-kb-stone-on-dark">
              Grounded AI replies to every review, weekly search-optimized posts, and a listing
              guard that watches your profile around the clock. You approve everything with one tap.
            </p>
            <div className="mt-9 grid gap-3 sm:flex">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/start">
                  Start growing your profile <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"
              >
                <a href="#demo">Try the 1-click demo</a>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-kb-stone-on-dark">
              {["Built for Google Business Profiles", "Set up in minutes", "NFC card optional"].map(
                (t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-kb-yellow" aria-hidden="true" />
                    {t}
                  </li>
                ),
              )}
            </ul>
          </div>
          <div id="demo" className="flex scroll-mt-24 justify-center lg:justify-end">
            <InboxDemo />
          </div>
        </div>
      </section>

      {/* 1. Review command center */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>AI review command center</Eyebrow>
            <H2>Every review answered, in your customer's language.</H2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
              Each new Google review reaches your email with a reply already drafted. Drafts only
              use the facts you gave Kabsi, so nothing is made up. Read it, change it if you like,
              and tap Post.
            </p>
          </div>
          <ul data-stagger="" className="grid gap-4 self-center">
            <Point icon={<Languages />} title="Arabic, English, French and more">
              Replies match the reviewer's language. Hard reviews get a calm, careful draft.
            </Point>
            <Point icon={<FileText />} title="Grounded in your facts">
              Hours, phone, what you want mentioned, your answers to common questions. Nothing else.
            </Point>
            <Point icon={<MailCheck />} title="One-tap approval">
              Nothing goes on Google until you tap Post. Urgent reviews reach you straight away.
            </Point>
          </ul>
        </div>
      </Section>

      {/* 2. Maps visibility engine */}
      <Section tone="sand">
        <Eyebrow>Google Maps visibility engine</Eyebrow>
        <H2>A fresh, keyword-rich post every week.</H2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-kb-stone">
          Kabsi drafts one Google post a week from your facts, using the words customers use for
          businesses like yours: your category and area, what reviews mention most, and once
          connected, the searches that found you. The strongest phrase goes in the first line, where
          Google shows it.
        </p>
        <div data-stagger="" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Search />} title="Search phrases built in">
            Like "bakery in Hamra", written as normal speech, never keyword lists.
          </Feature>
          <Feature icon={<Newspaper />} title="Action buttons">
            Call, Book, Order online, Shop, Learn more or Sign up, on every post you choose.
          </Feature>
          <Feature icon={<ImagePlus />} title="Photos, checked">
            Add a photo from your phone. Kabsi checks it's clear and fits Google's rules first.
          </Feature>
          <Feature icon={<Clock3 />} title="Special hours">
            Holidays and closures in a minute, so customers don't find a closed door.
          </Feature>
        </div>
        <p className="mt-6 text-sm text-kb-stone">
          Posts go out at the time that suits your trade: shops and restaurants before the weekend,
          clinics and offices early in the week. Every draft waits for your approval.
        </p>
      </Section>

      {/* 3. Listing Shield */}
      <Section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>Listing Shield</Eyebrow>
          <H2>A profile guard that never sleeps.</H2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
            Google sometimes accepts edits from the public. Kabsi watches your name, phone, address,
            hours, website and category, emails you when something changes, and puts yours back with
            one tap.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-kb-stone">
            Nobody can lock a Google listing. Kabsi tells you fast and restores it when you say so.
          </p>
        </div>
        <div className="rounded-large bg-kb-carbon p-6 text-kb-white shadow-kb">
          <p className="flex items-center gap-2 text-sm font-bold text-kb-yellow">
            <ShieldCheck className="size-5" aria-hidden="true" /> Example alert
          </p>
          <p className="mt-4 text-lg font-bold">Your phone number changed on Google</p>
          <div className="mt-4 grid gap-2 text-sm">
            <p className="rounded-card bg-white/5 px-4 py-3">
              <span className="text-kb-stone-on-dark">Before </span>+961 1 234 567
            </p>
            <p className="rounded-card bg-white/5 px-4 py-3">
              <span className="text-kb-stone-on-dark">Now </span>+961 1 000 000
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="rounded-card bg-kb-yellow px-4 py-2.5 text-sm font-bold text-kb-black">
              Put mine back
            </span>
            <span className="text-sm font-bold underline underline-offset-4">Keep the new one</span>
          </div>
        </div>
      </Section>

      {/* 4. Optional physical touchpoints */}
      <Section tone="sand" className="grid items-center gap-12 md:grid-cols-2">
        <div className="order-2 md:order-1">
          <img
            src="/images/nfc-cards.webp"
            alt="Two acrylic NFC review cards, one black and one blue, each with tap and QR code areas"
            width={900}
            height={776}
            loading="lazy"
            decoding="async"
            className="w-full rounded-large shadow-kb"
          />
          <p className="mt-3 text-xs text-kb-stone">
            Current card designs. Kabsi-branded cards are on the way.
          </p>
        </div>
        <div className="order-1 md:order-2">
          <Eyebrow>Optional physical touchpoints</Eyebrow>
          <H2>One tap opens your Google review page.</H2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
            Put an acrylic NFC card on your counter, door or table. Customers tap it with their
            phone or scan the QR code. Every customer sees the same Google review page: there's no
            rating screen and no filtering.
          </p>
          <ul className="mt-6 space-y-3 text-kb-ink">
            <li className="flex gap-3">
              <QrCode className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> Works with iPhone and
              Android, by tap or by scan
            </li>
            <li className="flex gap-3">
              <Link2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> No card? Use Kabsi
              100% digitally with your own review link and printable QR code
            </li>
            <li className="flex gap-3">
              <Check className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> ${PRICES.card} on its
              own, included with Kabsi Pro, and keeps working if your plan ends
            </li>
          </ul>
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <Eyebrow>How it works</Eyebrow>
        <H2>Set up in minutes. The last step is always yours.</H2>
        <ol data-stagger="" className="mt-12 grid gap-5 md:grid-cols-3">
          <Step n={1} icon={<UserPlus />} title="Add Kabsi to your Google profile">
            Invite hello@kabsi.co as a Manager, like you'd add a staff member. You can remove it any
            time.
          </Step>
          <Step n={2} icon={<FileText />} title="Tell Kabsi your facts">
            How you sign off, your hours, what you want mentioned. Replies and posts only use these.
          </Step>
          <Step n={3} icon={<MailCheck />} title="Approve with one tap">
            Replies and posts arrive ready. Edit, skip or post. Nothing goes on Google without you.
          </Step>
        </ol>
      </Section>

      {/* Pricing summary */}
      <Section tone="sand">
        <Eyebrow>Upfront pricing</Eyebrow>
        <H2>Paid once, upfront. No monthly bills.</H2>
        <div data-stagger="" className="mt-12 grid gap-4 md:grid-cols-3">
          <Price
            amount={PRICES.pro12}
            name="Kabsi Pro, 12 months"
            line="$10 a month · NFC card included"
            highlight
          />
          <Price
            amount={PRICES.pro6}
            name="Kabsi Pro, 6 months"
            line="$12.50 a month · NFC card included"
          />
          <Price
            amount={PRICES.card}
            name="NFC card only"
            line="One tap to your Google review page"
          />
        </div>
        <p className="mt-6 text-kb-stone">
          Pro is refundable within 14 days.{" "}
          <Link to="/pricing" className="font-bold text-kb-ink underline underline-offset-4">
            See pricing and payment
          </Link>
        </p>
      </Section>

      {/* Honesty + FAQ */}
      <Section>
        <Eyebrow>Questions</Eyebrow>
        <H2>Straight answers.</H2>
        <p className="mt-5 max-w-2xl leading-7 text-kb-stone">
          Google decides local results by relevance, distance and prominence. Kabsi does the parts
          you control: complete, accurate details, replies to every review, and regular updates. We
          don't promise rankings, and nobody honest can.{" "}
          <a
            href="https://support.google.com/business/answer/7091"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-kb-ink underline underline-offset-4"
          >
            Google's guidance
          </a>
        </p>
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

function Point({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="kb-lift flex gap-4 rounded-large border-2 border-kb-hairline bg-kb-white p-5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5">
        {icon}
      </span>
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 leading-7 text-kb-stone">{children}</p>
      </div>
    </li>
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
    <li className="kb-lift rounded-large border-2 border-kb-hairline bg-kb-white p-6">
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
    <div className="kb-lift rounded-large bg-kb-white p-6 shadow-kb">
      <span className="grid size-11 place-items-center rounded-full bg-kb-yellow text-kb-black [&_svg]:size-5">
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
