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
  MapPin,
  MousePointerClick,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { InboxDemo } from "@/components/marketing/inbox-demo";
import { CtaBand, Eyebrow, FaqList, H2, HeroBackdrop, Section } from "@/components/marketing/parts";
import { BusinessGrid } from "@/components/marketing/business-grid";
import { FAQ } from "@/lib/faq";
import { ELIGIBLE, GUIDELINES_URL, NOT_ELIGIBLE } from "@/lib/eligibility";
import {
  BRAND_EXPLAINER,
  BRAND_LINE,
  CTA_PRIMARY,
  CTA_SECONDARY,
  ORG_LD,
  PRICES,
  PRODUCT_LD,
  TRIAL_LINE,
  WEBSITE_LD,
  pageHead,
} from "@/lib/site";
import { useIsLebanon } from "@/lib/region";

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () =>
    pageHead({
      title: `Kabsi | ${BRAND_LINE}`,
      description: BRAND_EXPLAINER,
      path: "/",
      jsonLd: [ORG_LD, WEBSITE_LD, PRODUCT_LD],
    }),
  component: HomePage,
});

function HomePage() {
  const { sticker } = Route.useSearch();
  const isLebanon = useIsLebanon();
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
      <section className="relative isolate overflow-hidden bg-kb-carbon text-kb-white">
        <HeroBackdrop photo="heroHome" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 max-md:-mt-6 max-md:pt-0 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-28">
          <div>
            <p className="inline-flex items-center gap-2 rounded-pill border border-white/15 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-kb-yellow">
              <MapPin className="size-4" aria-hidden="true" />
              For local businesses on Google Maps
            </p>
            <h1 className="mt-6 font-display text-[clamp(2.7rem,6.6vw,5.2rem)] leading-[0.95]">
              {BRAND_LINE}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-kb-stone-on-dark">
              {BRAND_EXPLAINER}
            </p>
            <div className="mt-9 grid gap-3 sm:flex">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/start">
                  {CTA_PRIMARY} <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"
              >
                <a href="#demo">{CTA_SECONDARY}</a>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-kb-stone-on-dark">
              {[
                "You approve everything",
                "Replies in your customer's language",
                "Remove Kabsi any time",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="size-4 text-kb-yellow" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div id="demo" className="flex scroll-mt-24 justify-center lg:justify-end">
            <InboxDemo />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <Section tone="sand">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Made for local businesses</Eyebrow>
            <H2>If customers find you on Google Maps, Kabsi is for you.</H2>
          </div>
          <p className="max-w-sm leading-7 text-kb-stone md:text-right">
            Cafés, clinics, salons, garages and hotels, in any country and any language.
          </p>
        </div>
        <BusinessGrid className="mt-10" />
        <p className="mt-6 text-[15px]">
          <Link
            to="/for"
            className="inline-flex items-center gap-2 font-bold underline underline-offset-4"
          >
            What Kabsi does for each kind of business{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </p>
      </Section>

      {/* 1. Reviews */}
      <Section>
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <Eyebrow>Reviews</Eyebrow>
            <H2>Never wonder what to reply again.</H2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
              Each new Google review reaches your email with a reply already drafted. Drafts only
              use the facts you gave Kabsi, so nothing is made up. Read it, change it if you like,
              and approve it.
            </p>
          </div>
          <ul data-stagger="" className="grid gap-4 self-center">
            <Point icon={<Languages />} title="English, Spanish, Arabic, French and more">
              Replies match the reviewer's language. Hard reviews get a calm, careful draft.
            </Point>
            <Point icon={<FileText />} title="Written from your facts">
              Hours, phone, what you want mentioned, your answers to common questions. Nothing else.
            </Point>
            <Point icon={<MailCheck />} title="One-tap approval">
              Nothing is published until you approve it. Urgent reviews reach you straight away.
            </Point>
          </ul>
        </div>
      </Section>

      {/* 2. Keep the profile fresh */}
      <Section tone="sand">
        <Eyebrow>Keep your profile fresh</Eyebrow>
        <H2>Updates, photos and hours, ready for your OK.</H2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-kb-stone">
          Kabsi prepares fresh posts from what you told it, in the words customers use for
          businesses like yours. Add a photo from your phone and Kabsi checks it first. Set holiday
          hours in a minute. You don't have to write any of it yourself.
        </p>
        <div data-stagger="" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Feature icon={<Newspaper />} title="Written like a person">
            Like "our bakery in Brooklyn", as normal speech, never a list of keywords.
          </Feature>
          <Feature icon={<MousePointerClick />} title="Action buttons">
            Call, Book, Order online, Shop, Learn more or Sign up, on every post you choose.
          </Feature>
          <Feature icon={<ImagePlus />} title="Photos, checked">
            Add a photo from your phone. Kabsi checks it's clear and fits Google's rules first.
          </Feature>
          <Feature icon={<Clock3 />} title="Special hours">
            Holidays and closures in a minute, so customers don't find a closed door.
          </Feature>
        </div>
        <p className="mt-6 max-w-3xl text-sm leading-6 text-kb-stone">
          Drafts arrive at the time that suits your trade: shops and restaurants before the weekend,
          clinics and offices early in the week. Updates keep customers informed; Google doesn't say
          they change your ranking, so we don't either.
        </p>
      </Section>

      {/* 3. Google Protection */}
      <Section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>Google Protection</Eyebrow>
          <H2>Know when something changes on Google.</H2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
            Google sometimes accepts edits from the public. Kabsi quietly watches your name, phone,
            address, hours, website and category. If one changes, you get an email with before and
            after, and your details go back only if you say so.
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-kb-stone">
            Most weeks nothing changes, and that's the point. Nobody can lock a Google listing;
            Kabsi tells you fast.
          </p>
        </div>
        <div className="rounded-large bg-kb-carbon p-6 text-kb-white shadow-kb">
          <p className="flex items-center gap-2 text-sm font-bold text-kb-yellow">
            <ShieldCheck className="size-5" aria-hidden="true" /> Example alert
          </p>
          <p className="mt-4 text-lg font-bold">Your phone number changed on Google</p>
          <div className="mt-4 grid gap-2 text-sm">
            <p className="rounded-card bg-white/5 px-4 py-3">
              <span className="text-kb-stone-on-dark">Before </span>+1 (555) 010-0142
            </p>
            <p className="rounded-card bg-white/5 px-4 py-3">
              <span className="text-kb-stone-on-dark">Now </span>+1 (555) 010-0199
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <span className="rounded-card bg-kb-yellow px-4 py-2.5 text-sm font-bold text-kb-black">
              Keep my information
            </span>
            <span className="text-sm font-bold underline underline-offset-4">Google is right</span>
          </div>
        </div>
      </Section>

      {/* 4. Reviews link */}
      <Section tone="sand" className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>Make reviewing easy</Eyebrow>
          <H2>Your own review link and QR code.</H2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
            Kabsi makes the link that opens your Google review page, and a QR code to print. Already
            have an NFC tag or sticker? Write the same link on it. Every customer sees the same
            Google review page: there's no rating screen and no filtering. Ask every customer the
            same way, as they visit. Never offer a reward.
          </p>
          <ul className="mt-6 space-y-3 text-kb-ink">
            <li className="flex gap-3">
              <QrCode className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> Free in every
              country, by link or by scan
            </li>
            <li className="flex gap-3">
              <Link2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> Use it on a printed
              table card, a receipt or your own NFC tag
            </li>
            <li className="flex gap-3">
              <Check className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> Keeps working if your
              plan ends
            </li>
          </ul>
          {isLebanon ? (
            <p className="mt-6 max-w-xl text-[15px]">
              In Lebanon we also supply ready NFC cards.{" "}
              <Link to="/lebanon" className="font-bold underline underline-offset-4">
                See the Lebanon offer
              </Link>
            </p>
          ) : null}
        </div>
        <div className="rounded-large bg-kb-white p-6 shadow-kb">
          <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">
            Who Kabsi is for
          </p>
          <ul className="mt-4 space-y-3 leading-7">
            {ELIGIBLE.map((t) => (
              <li key={t} className="flex gap-3">
                <Check className="mt-1 size-4 shrink-0" aria-hidden="true" /> {t}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm leading-6 text-kb-stone">
            Not eligible on Google: {NOT_ELIGIBLE.join(" ").toLowerCase()}{" "}
            <a
              href={GUIDELINES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-kb-ink underline underline-offset-4"
            >
              Google's guidelines
            </a>
          </p>
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <Eyebrow>How it works</Eyebrow>
        <H2>Invite Kabsi, then approve every reply.</H2>
        <ol data-stagger="" className="mt-12 grid gap-5 md:grid-cols-3">
          <Step n={1} icon={<UserPlus />} title="Add Kabsi to your Google profile">
            Invite the Kabsi group ID 5481006796 as a Manager, like you'd add a staff member. You
            can remove it any time. We accept your invite and email you as soon as we do.
          </Step>
          <Step n={2} icon={<FileText />} title="Tell Kabsi your facts">
            How you sign off, your hours, what you want mentioned. Replies and posts only use these.
          </Step>
          <Step n={3} icon={<MailCheck />} title="Approve with one tap">
            Replies and updates arrive ready. Edit, skip or approve. Every Monday, a short email
            shows your week.
          </Step>
        </ol>
      </Section>

      {/* Pricing summary */}
      <Section tone="sand">
        <Eyebrow>Pricing</Eyebrow>
        <H2>Start free. Pay when it is worth it.</H2>
        <p className="mt-3 text-lg text-kb-stone">{TRIAL_LINE}.</p>
        <div data-stagger="" className="mt-10 grid gap-4 md:grid-cols-2">
          <Price amount={0} name="Free" line="Review link, QR code and a printable table card" />
          <Price
            amount={PRICES.proMonthly}
            name="Kabsi Pro"
            line={`a month, or $${PRICES.proYearly} a year`}
            highlight
          />
        </div>
        <p className="mt-6 text-kb-stone">
          Your review link and QR code are free in every country.
        </p>
        <p className="mt-6 text-kb-stone">
          Yearly plans are refundable within 14 days.{" "}
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
