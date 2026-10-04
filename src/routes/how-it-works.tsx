import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IndustryLinks } from "@/components/marketing/business-grid";
import { EligibilityBlock } from "@/components/marketing/eligibility-block";
import { PublicLayout } from "@/components/layouts/public-layout";
import {
  CalendarClock,
  Camera,
  FileBarChart,
  KeyRound,
  ListChecks,
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
import { useIsLebanon } from "@/lib/region";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How Kabsi works | You approve every change",
      description:
        "Add Kabsi as a Manager on your Google profile. Kabsi drafts a reply for every review and prepares each update from facts you gave it. You approve everything. Nothing is published without you.",
      path: "/how-it-works",
      crumbs: [{ name: "How it works", path: "/how-it-works" }],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to set up Kabsi for your Google Business Profile",
          description:
            "Give Kabsi Manager access, tell it about your business, then approve each drafted change and reply.",
          step: [
            [
              "Give Kabsi access",
              "Add the Kabsi group ID 5481006796 as a Manager on your Google Business Profile.",
            ],
            [
              "Tell Kabsi about your business",
              "Hours, services and anything Kabsi should never say. Drafts only use these facts.",
            ],
            [
              "See what needs attention",
              "Kabsi lists the next improvements for your profile as Urgent, Recommended or Nice to have, each with a ready draft where it can write one.",
            ],
            [
              "A reply is drafted for every new review",
              "Written in the reviewer's language and checked before it reaches you.",
            ],
            [
              "It reaches you by email",
              "Each new review arrives with its draft, or in a daily digest for 4 and 5 star reviews.",
            ],
            ["You approve, edit or skip", "Nothing is written to Google until you approve it."],
          ].map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })),
        },
      ],
    }),
  component: Page,
});

function Page() {
  const isLebanon = useIsLebanon();

  return (
    <PublicLayout>
      <PageHero
        eyebrow="How it works"
        title="Kabsi prepares. You approve."
        sub="Kabsi looks after your business on Google and prepares every change. Here is everything it does, and the one thing it never does: change anything you haven't approved."
        visual={<FlowVisual />}
        photo="heroHow"
      />

      <Section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
          <Block n="1" icon={<KeyRound />} title="Give Kabsi access to your Google profile">
            <p>
              On your Google Business Profile, open <b>People and access</b> and add the Kabsi group
              ID <b>5481006796</b> as a <b>Manager</b>. That's the same access you'd give a staff
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

          <Block n="3" icon={<ListChecks />} title="See what to improve, with a draft for each">
            <p>
              Your dashboard opens with a short list of what needs attention on your Google profile,
              marked <b>Urgent</b>, <b>Recommended</b> or <b>Nice to have</b>. Each item says why it
              matters and comes with a ready draft where Kabsi can write one. You do it, put it off
              for 3 days, or skip it for 30 days.
            </p>
            <p>
              Kabsi does not give your profile a score and does not predict how you rank. Nobody
              honest can.
            </p>
          </Block>

          <Block n="4" icon={<PenLine />} title="A reply is drafted for every new review">
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

          <Block n="5" icon={<Mail />} title="It reaches you by email">
            <ul>
              <li>Reviews of 3 stars or less: one email each, as they arrive.</li>
              <li>
                4 and 5 star reviews: gathered into one email a day at the hour you choose, each
                with its own <b>Approve</b>, <b>Edit</b> and <b>Skip</b>.
              </li>
              <li>
                Hard reviews (1 or 2 stars, or anything about health, safety, staff or legal
                matters): a calm draft and no quick Approve button. You open it and read it first.
              </li>
            </ul>
          </Block>

          <Block n="6" icon={<MousePointerClick />} title="You approve, edit or skip">
            <p>
              Before anything goes to Google you see the exact words. After you approve, Kabsi
              checks with Google and tells you if the reply is live or held for review. Kabsi never
              publishes or changes anything by itself.
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
        <Eyebrow>The rest of your profile</Eyebrow>
        <H2>One rule: you approve.</H2>
        <div data-stagger="" className="mt-10 grid gap-4 md:grid-cols-2">
          <Card icon={<ShieldCheck />} title="Google Protection">
            Kabsi watches your business name, phone, address, hours, website and categories. If
            something changes that you didn't approve, you get one email with the before and after
            and two buttons: <b>Keep my information</b> and <b>Google is right</b>. Nothing changes
            unless you say so. It can't lock your listing or stop people suggesting edits to Google,
            and we won't pretend it can.
          </Card>
          <Card icon={<Megaphone />} title="Fresh posts, drafted for you">
            Kabsi drafts short Google posts from your facts, in the words customers use for
            businesses like yours, with a button like Call or Book. They arrive by email. You can
            also say what's new in a sentence any day. You approve a post, change it, or skip it.
            Drafts can be switched off.
          </Card>
          <Card icon={<Camera />} title="Photos">
            Upload a photo from your phone. Kabsi checks that it's clear and fits Google's photo
            rules, suggests where it belongs, and waits for your approval.
          </Card>
          <Card icon={<CalendarClock />} title="Special hours">
            Closed for a holiday or open late? Set the dates once, approve them, and they go to
            Google.
          </Card>
          <Card icon={<FileBarChart />} title="Weekly Care Report">
            Every Monday morning: your Google rating and its change, new reviews, how many got a
            reply, and review link activity. Facts only, no advice, nothing estimated.
          </Card>
          <Card icon={<LayoutDashboard />} title="Your dashboard">
            Everything in one place: what needs attention, replies waiting and your week. Nora,
            Kabsi's assistant, is there to answer questions and help fill in your business facts.
          </Card>
        </div>
      </Section>

      <Section>
        <div className="max-w-3xl">
          <Eyebrow>Who can use Kabsi</Eyebrow>
          <H2>A verified profile for a business people can visit or that visits them.</H2>
          <p className="mt-5 text-lg leading-8 text-kb-stone">
            Kabsi follows Google's Business Profile guidelines, so it works only where Google does.
            If your profile is not verified yet, verify it on Google first. It is free.
          </p>
        </div>
        <div className="mt-8">
          <EligibilityBlock />
        </div>
      </Section>

      <Section tone="sand">
        <div className="max-w-3xl">
          <Eyebrow>Get Reviews</Eyebrow>
          <H2>One tap or scan to your Google review page.</H2>
          <p className="mt-5 text-lg leading-8 text-kb-stone">
            Your dashboard gives you a review link and a printable QR code. Put them on a table
            card, a receipt or any NFC tag you already own. It's the same page for every customer:
            no rating screen, no filter. Ask every customer the same way, as they visit. Never offer
            a reward. Kabsi counts opens (never who opened) and shows them in your report.
          </p>
          {isLebanon ? (
            <p className="mt-4 text-[15px]">
              In Lebanon we also supply ready NFC cards.{" "}
              <Link to="/lebanon" className="font-bold underline underline-offset-4">
                See the Lebanon offer
              </Link>
            </p>
          ) : null}
        </div>
      </Section>

      <Section className="py-10 sm:py-14">
        <IndustryLinks title="See it for your kind of business" />
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
