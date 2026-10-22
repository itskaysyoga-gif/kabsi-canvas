import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { IndustryLinks } from "@/components/marketing/business-grid";
import { EligibilityBlock } from "@/components/marketing/eligibility-block";
import { PublicLayout } from "@/components/layouts/public-layout";
import {
  ArrowRight,
  CalendarClock,
  Camera,
  Check,
  Eye,
  FileBarChart,
  KeyRound,
  Megaphone,
  MousePointerClick,
  NotebookPen,
  PenLine,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  CtaBand,
  Eyebrow,
  FeatureCard,
  H2,
  IconBadge,
  PageHero,
  Section,
} from "@/components/marketing/parts";
import { FlowVisual } from "@/components/marketing/visuals";
import { Button } from "@/components/ui/button";
import { CTA_CHECK, KABSI_GROUP_ID, pageHead } from "@/lib/site";
import { LOOP, CAN, CANNOT } from "@/lib/website";

export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: "How Kabsi works | You approve every change",
      description:
        "Kabsi watches your Google profile, prepares replies and updates from facts you gave it, asks you, publishes only what you approve, and reports. Nothing is published without you.",
      path: "/how-it-works",
      crumbs: [{ name: "How it works", path: "/how-it-works" }],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to set up Kabsi for your Google Business Profile",
          description:
            "Check your profile, give Kabsi Manager access, tell it about your business, then approve each reply and change.",
          step: [
            [
              "Check your profile",
              "Run the free Google Profile Check to see what customers see on Google.",
            ],
            [
              "Give Kabsi access",
              `Add the Kabsi group ID ${KABSI_GROUP_ID} as a Manager on your Google Business Profile.`,
            ],
            [
              "Tell Kabsi about your business",
              "Hours, services and anything Kabsi should never say. Drafts only use these facts.",
            ],
            [
              "Approve what Kabsi prepares",
              "A reply is drafted for every new review and each update is prepared from your facts. Nothing is written to Google until you approve it.",
            ],
          ].map(([name, text], i) => ({ "@type": "HowToStep", position: i + 1, name, text })),
        },
      ],
    }),
  component: Page,
});

const LOOP_ICONS = [
  <Eye key="w" />,
  <PenLine key="p" />,
  <MousePointerClick key="a" />,
  <Check key="d" />,
  <FileBarChart key="r" />,
];

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="How it works"
        title="Kabsi prepares. You approve."
        sub="Kabsi looks after your reviews and your listing on Google and prepares every change. Here is the loop it follows, and the one thing it never does: change anything you have not approved."
        visual={<FlowVisual />}
      >
        <div className="mt-9">
          <Button asChild>
            <Link to="/google-profile-check">
              {CTA_CHECK} <ArrowRight />
            </Link>
          </Button>
        </div>
      </PageHero>

      <Section>
        <Eyebrow>The loop</Eyebrow>
        <H2>Watch, prepare, ask, publish, report.</H2>
        <ol data-stagger="" className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {LOOP.map((l, i) => (
            <li
              key={l.title}
              className="kb-lift rounded-large border-2 border-kb-hairline bg-kb-white p-6"
            >
              <IconBadge icon={LOOP_ICONS[i]} />
              <h3 className="mt-5 text-xl font-bold">{l.title}</h3>
              <p className="mt-2 leading-7 text-kb-stone">{l.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="sand">
        <Eyebrow>Getting started</Eyebrow>
        <H2>Two things from you, then Kabsi gets to work.</H2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <Step icon={<KeyRound />} title="Give Kabsi access to your Google profile">
            <p>
              On your Google Business Profile, open <b>People and access</b> and add the Kabsi group
              ID <b>{KABSI_GROUP_ID}</b> as a <b>Manager</b>. That is the same access you would give
              a staff member. Kabsi tells you by email when it is connected.
            </p>
            <p>
              You stay the owner. You can remove Kabsi at any time from the same screen, without
              asking us.
            </p>
          </Step>
          <Step icon={<NotebookPen />} title="Tell Kabsi about your business">
            <p>
              A short form: how you sign your replies, your tone, your phone number, your hours
              note, anything you would like mentioned, and anything Kabsi must never say. Replies
              and posts use only these facts. If a fact is missing, it is left out instead of
              guessed.
            </p>
          </Step>
        </div>
      </Section>

      <Section>
        <Eyebrow>What Kabsi can and cannot do</Eyebrow>
        <H2>The plain rules.</H2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-large border-2 border-kb-hairline bg-kb-white p-6 sm:p-8">
            <p className="font-display text-2xl">Kabsi can</p>
            <ul className="mt-4 space-y-3">
              {CAN.map((t) => (
                <li key={t} className="flex gap-3 leading-7">
                  <Check className="mt-1 size-5 shrink-0 text-kb-green" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-large border-2 border-kb-black bg-kb-white p-6 sm:p-8">
            <p className="font-display text-2xl">Kabsi cannot</p>
            <ul className="mt-4 space-y-3">
              {CANNOT.map((t) => (
                <li key={t} className="flex gap-3 leading-7">
                  <X className="mt-1 size-5 shrink-0 text-kb-red" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="sand">
        <Eyebrow>The rest of your profile</Eyebrow>
        <H2>One rule: you approve.</H2>
        <div data-stagger="" className="mt-10 grid gap-4 md:grid-cols-2">
          <Card icon={<ShieldCheck />} title="Google Protection">
            Kabsi watches your business name, phone, address, hours, website and categories. If
            something changes that you did not approve, you see the before and after, and you choose{" "}
            <b>Keep my information</b> or <b>Google is right</b>. Nothing changes unless you say so.
            It cannot lock your listing or stop people suggesting edits to Google.
          </Card>
          <Card icon={<Megaphone />} title="Posts, prepared for you">
            Kabsi prepares short Google posts from your facts, with a button like Call or Book. You
            approve a post, change it, or skip it, and drafts can be switched off. Posts are part of
            Pro.
          </Card>
          <Card icon={<Camera />} title="Photos">
            Upload a photo from your phone. Kabsi checks that it is clear and fits Google's photo
            rules, and waits for your approval.
          </Card>
          <Card icon={<CalendarClock />} title="Holiday hours">
            Five days before a public holiday Kabsi asks what you will do. Closed or custom hours go
            to Google only after you confirm them.
          </Card>
          <Card icon={<FileBarChart />} title="Weekly Care Report">
            Every Monday: your Google rating and its change, new reviews, how many got a reply, and
            review link activity. Facts only, nothing estimated.
          </Card>
          <Card icon={<MousePointerClick />} title="Hard reviews">
            A review of 1 or 2 stars, or anything about health, safety, staff or legal matters, gets
            a calm draft and no quick Approve button. You open it and read it first.
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
            Your dashboard gives you a review link and a printable QR code. Put them on a table card
            or a receipt. It works with your own QR codes and NFC cards. It is the same page for
            every customer: no rating screen, no filter. Ask every customer the same way, as they
            visit. Never offer a reward. Kabsi counts opens, never who opened, and shows them in
            your report.
          </p>
        </div>
      </Section>

      <Section className="py-10 sm:py-14">
        <IndustryLinks title="See it for your kind of business" />
      </Section>

      <CtaBand cta={{ to: "/google-profile-check", label: CTA_CHECK }} />
    </PublicLayout>
  );
}

function Step({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
      <IconBadge icon={icon} />
      <h3 className="mt-5 text-xl font-bold">{title}</h3>
      <div className="mt-3 space-y-3 leading-7 text-kb-stone [&_b]:text-kb-ink">{children}</div>
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
