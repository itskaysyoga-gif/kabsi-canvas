import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import {
  CalendarClock,
  Camera,
  FileBarChart,
  KeyRound,
  LayoutDashboard,
  Mail,
  Megaphone,
  MousePointerClick,
  NotebookPen,
  PenLine,
  ShieldCheck,
} from "lucide-react";
import {
  CtaBand,
  Eyebrow,
  FeatureCard,
  H2,
  IconBadge,
  PageHero,
  Photo,
  Section,
} from "@/components/marketing/parts";
import { FlowVisual } from "@/components/marketing/visuals";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How Kabsi works | Reply drafts you approve",
      description:
        "Add Kabsi as a Manager on your Google profile. Every new review reaches you with a drafted reply. You tap Post, Edit or Skip. Nothing is posted without you.",
      path: "/how-it-works",
    }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="How it works"
        title="Kabsi prepares. You approve."
        sub="Here is everything Kabsi does, and the one thing it never does: post anything you haven't approved."
        visual={<FlowVisual />}
        photo="heroHow"
      />

      <Section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Block n="1" icon={<KeyRound />} title="Give Kabsi access to your Google profile">
            <p>
              On your Google Business Profile, open <b>People and access</b> and add{" "}
              <b>hello@kabsi.co</b> as a <b>Manager</b>. That's the same access you'd give a staff
              member. Kabsi accepts the invite and tells you by email when it's connected.
            </p>
            <p>
              You stay the owner. You can remove Kabsi at any time from the same screen, without
              asking us.
            </p>
          </Block>

          <Block n="2" icon={<NotebookPen />} title="Tell Kabsi about your business">
            <p>
              A short form: how you sign your replies, your tone, your phone number, your hours
              note, anything you'd like mentioned, and the names of staff it may thank. Later you
              can add answers to the questions customers ask. Replies and posts only use these
              facts. If a fact is missing, it's left out instead of guessed.
            </p>
          </Block>

          <Block n="3" icon={<PenLine />} title="A reply is drafted for every new review">
            <ul>
              <li>
                <b>In the reviewer's language:</b> English, Spanish, Arabic, French and many more,
                matched to the way the customer wrote.
              </li>
              <li>
                <b>Short and warm:</b> two to four sentences, no emojis, no promises you didn't
                make.
              </li>
              <li>
                <b>Checked before it reaches you:</b> no discounts, refunds or admissions of fault,
                and never a reviewer's personal details.
              </li>
            </ul>
          </Block>

          <Block n="4" icon={<Mail />} title="It reaches you by email">
            <ul>
              <li>Reviews of 3 stars or less: one email each, as they arrive.</li>
              <li>
                4 and 5 star reviews: one email a day at the hour you choose, with <b>Post all</b>{" "}
                or <b>Review each</b>.
              </li>
              <li>
                Hard reviews (1 or 2 stars, or anything about health, safety, staff or legal
                matters): a calm draft and no quick Post button. You open it and read it first.
              </li>
            </ul>
          </Block>

          <Block n="5" icon={<MousePointerClick />} title="You tap Post, Edit or Skip">
            <p>
              Before anything is posted you see the exact words that will go on Google. After you
              post, Kabsi checks with Google and tells you if the reply is live or held for review.
            </p>
          </Block>
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-28 space-y-4">
            <Photo id="cafe" sizes="300px" className="aspect-[4/5]" />
            <Photo id="dentist" sizes="300px" className="aspect-[4/3]" />
            <p className="text-sm leading-6 text-kb-stone">
              Made for cafés, bakeries, clinics and shops. Kabsi works from your email and your
              phone's browser, with nothing to install.
            </p>
          </div>
        </aside>
      </Section>

      <Section tone="sand">
        <Eyebrow>Beyond replies</Eyebrow>
        <H2>The rest of your profile, same rule.</H2>
        <div data-stagger="" className="mt-10 grid gap-4 md:grid-cols-2">
          <Card icon={<ShieldCheck />} title="Listing Shield">
            Kabsi watches your business name, phone, address, hours, website and categories. If
            something changes that you didn't approve, you get one email with <b>Put mine back</b>{" "}
            and <b>Keep the new one</b>. It can't lock your listing or stop people suggesting edits
            to Google, and we won't pretend it can.
          </Card>
          <Card icon={<Megaphone />} title="A weekly update, drafted for you">
            Once a week Kabsi drafts a short Google update from your facts, in the words customers
            use for businesses like yours, with a button like Call or Book. It arrives by email:
            shops and restaurants on Thursday morning, clinics and offices on Tuesday. You can also
            say what's new in a sentence any day. You post it, change it, or skip it. Weekly drafts
            can be switched off.
          </Card>
          <Card icon={<Camera />} title="Photos">
            Upload a photo from your phone. Kabsi checks that it's clear and fits Google's photo
            rules, suggests where it belongs, and waits for you to post it.
          </Card>
          <Card icon={<CalendarClock />} title="Special hours">
            Closed for a holiday or open late? Set the dates once and post them to Google.
          </Card>
          <Card icon={<FileBarChart />} title="Monday report">
            Every Monday morning: your Google rating and its change, new reviews, how many got a
            reply, and card taps. Facts only, no advice, nothing estimated.
          </Card>
          <Card icon={<LayoutDashboard />} title="Your dashboard">
            Everything in one place: replies waiting, your week, and profile health (reviews
            answered, when you last posted, your listing guard and review link taps).
          </Card>
        </div>
      </Section>

      <Section className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <Eyebrow>Cards and links</Eyebrow>
          <H2>One tap to your Google review page.</H2>
          <p className="mt-5 text-lg leading-8 text-kb-stone">
            The optional NFC card has a chip and a QR code. Tap or scan, and your Google review page
            opens. It's the same page for every customer: no rating screen, no filter. No card? Your
            dashboard gives you a review link and a printable QR code that do the same. Kabsi counts
            taps (never who tapped) and shows them in your report.
          </p>
        </div>
        <div className="flex justify-center">
          <img
            src="/images/nfc-card-closeup.webp"
            alt="An acrylic NFC review card with a tap area and a QR code"
            width={640}
            height={640}
            loading="lazy"
            decoding="async"
            className="w-full max-w-sm rounded-large shadow-kb"
          />
        </div>
      </Section>

      <CtaBand />
    </PublicLayout>
  );
}

function Block({
  n,
  icon,
  title,
  children,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="relative grid gap-4 border-b border-kb-hairline py-10 first:pt-0 last:border-0 last:pb-0 md:grid-cols-[120px_1fr]">
      <div className="flex items-center gap-4 md:flex-col md:items-start">
        <span className="font-display text-6xl leading-none text-kb-yellow [-webkit-text-stroke:1.5px_#000]">
          {n}
        </span>
        <IconBadge icon={icon} tone="sand" />
      </div>
      <div>
        <h2 className="font-display text-[clamp(1.8rem,3.5vw,2.4rem)] leading-tight">{title}</h2>
        <div className="mt-4 max-w-3xl space-y-4 text-lg leading-8 text-kb-stone [&_b]:text-kb-ink [&_li]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <FeatureCard icon={icon} title={title}>
      <p>{children}</p>
    </FeatureCard>
  );
}
