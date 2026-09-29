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
import {
  CardShippingNote,
  CtaBand,
  Eyebrow,
  FaqList,
  H2,
  HeroBackdrop,
  Section,
} from "@/components/marketing/parts";
import { BusinessGrid } from "@/components/marketing/business-grid";
import { FAQ } from "@/lib/faq";
import { ORG_LD, PRICES, PRODUCT_LD, WEBSITE_LD, pageHead } from "@/lib/site";
import { useIsLebanon } from "@/lib/region";

export const Route = createFileRoute("/")({
  // go.kabsi.co sends switched-off cards here with ?sticker=disabled
  validateSearch: z.object({ sticker: z.enum(["disabled"]).optional().catch(undefined) }),
  head: () =>
    pageHead({
      title: "Kabsi | Your Google Business Profile, taken care of",
      description:
        "Every Google review gets a reply drafted in your customer's language. Kabsi keeps your profile fresh and flags changes. Nothing is posted until you approve.",
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
              Your Google Business Profile, taken care of.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-kb-stone-on-dark">
              Kabsi drafts a reply to every Google review in your customer's language, keeps your
              profile fresh, and tells you when your details change. Nothing goes on Google until
              you tap approve.
            </p>
            <div className="mt-9 grid gap-3 sm:flex">
              <Button asChild className="w-full sm:w-auto">
                <Link to="/start">
                  Get started <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"
              >
                <a href="#demo">Try the demo</a>
              </Button>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-kb-stone-on-dark">
              {["You approve everything", "We email you when access works", "Any language"].map((t) => (
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
              and tap Post.
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
              Nothing goes on Google until you tap Post. Urgent reviews reach you straight away.
            </Point>
          </ul>
        </div>
      </Section>

      {/* 2. Keep the profile fresh */}
      <Section tone="sand">
        <Eyebrow>Keep your profile fresh</Eyebrow>
        <H2>Updates, photos and hours, ready for your OK.</H2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-kb-stone">
          Kabsi drafts one short Google update a week from what you told it, in the words customers
          use for businesses like yours. Add a photo from your phone and Kabsi checks it first. Set
          holiday hours in a minute. You don't have to write any of it yourself.
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

      {/* 3. Listing Shield */}
      <Section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>Listing Shield</Eyebrow>
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
          <Eyebrow>Make reviewing easy</Eyebrow>
          <H2>One tap opens your Google review page.</H2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
            Put an acrylic NFC card on your counter, door or table. Customers tap it with their
            phone or scan the QR code. Every customer sees the same Google review page: there's no
            rating screen and no filtering. Ask everyone the same way, and never offer a reward for
            a review: Google doesn't allow it.
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
              <Check className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> Keeps working if your
              plan ends
            </li>
          </ul>
          <CardShippingNote className="mt-6 max-w-xl" isLebanon={isLebanon} />
        </div>
      </Section>

      {/* How it works */}
      <Section>
        <Eyebrow>How it works</Eyebrow>
        <H2>Invite Kabsi, then approve every reply.</H2>
        <ol data-stagger="" className="mt-12 grid gap-5 md:grid-cols-3">
          <Step n={1} icon={<UserPlus />} title="Add Kabsi to your Google profile">
            Invite hello@kabsi.co as a Manager, like you'd add a staff member. You can remove it any
            time. We accept your invite and email you as soon as we do.
          </Step>
          <Step n={2} icon={<FileText />} title="Tell Kabsi your facts">
            How you sign off, your hours, what you want mentioned. Replies and posts only use these.
          </Step>
          <Step n={3} icon={<MailCheck />} title="Approve with one tap">
            Replies and updates arrive ready. Edit, skip or post. Every Monday, a short email shows
            your week.
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
            line={isLebanon ? "$10 a month · card included in Lebanon" : "$10 a month"}
            highlight
          />
          <Price
            amount={PRICES.pro6}
            name="Kabsi Pro, 6 months"
            line={isLebanon ? "$12.50 a month · card included in Lebanon" : "$12.50 a month"}
          />
          {isLebanon ? (
            <Price amount={PRICES.card} name="NFC card only" line="Shipped in Lebanon only" />
          ) : null}
        </div>
        {!isLebanon ? (
          <p className="mt-6 text-kb-stone">
            Your review link and QR code are free in every country.
          </p>
        ) : null}
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
