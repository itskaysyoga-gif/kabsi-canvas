// Home for Design 6, round 2 (master plan 30.20 section 3, 30.21; ported by Web 3 from kabsi-design-studio 323df75,
// approved by lane R on 30 Oct 2026): light-led and editorial. Ivory reading areas, one
// near-black band for the product story, yellow only for the main action, WhatsApp green only for WhatsApp and
// done. The order is lane R's: the promise and the free check; the demonstration; four jobs; you stay in control;
// the nearby check explained; pick your business; pricing preview; Founding 25 with the founder; four questions;
// the closing free check. Every business, person and figure is an example.
import {
  ArrowRight,
  CalendarClock,
  Check,
  CircleAlert,
  FileText,
  KeyRound,
  MessageSquareText,
  Newspaper,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SCAN_LINE, TRIAL_LINE, WHATSAPP_LAUNCH_LINE, WHATSAPP_ON } from "@/lib/site";
import { useFoundingPlaces } from "@/lib/public-api";
import { ExampleBadge, Faq, SectionHead, StatusPill } from "./ui";
import { Img, FOUNDER, PHOTOS, type Photo } from "./photos";
import { ScanBox } from "./scan-box";
import { NearbyPlaces } from "./nearby-places";
import { SiteLink } from "./site-link";
import { FAQ, HOME_FAQ } from "./faq-data";
import { DemoProvider, DemoSteps, HeroDemo } from "./d6-demo";
import { HERO_LINE, DEMO } from "./d6-data";
import { PLANS } from "./plans";
import { FOUNDING25_TOTAL } from "./d5-founding";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

/* ---------- Hero ---------- */

export function D6Hero() {
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate overflow-hidden">
      <div className="container-kb grid gap-10 pt-28 pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-10 lg:pt-32 lg:pb-24">
        <div className="max-w-[36rem]">
          {/* The headline paints at once, with no entrance: it is the page's largest text, and a fade from opacity 0 keeps
              it out of the browser's LCP until the cookie bar arrives (Web 3 after-merge check, 31 Oct 2026). */}
          <h1 id="hero-title" className="text-display text-balance">
            Your business on Google. Taken care of.
          </h1>
          <p
            className="mt-6 animate-enter text-lead text-text-2"
            style={{ animationDelay: "60ms" }}
          >
            {HERO_LINE}
          </p>
          {/* Every "on WhatsApp" line says "at launch" while Kabsi's WhatsApp number is not set (the one switch). */}
          {!WHATSAPP_ON && (
            <p
              className="mt-3 animate-enter text-body text-text-2"
              style={{ animationDelay: "60ms" }}
            >
              {WHATSAPP_LAUNCH_LINE}
            </p>
          )}
          <div className="mt-8 animate-enter" style={{ animationDelay: "120ms" }}>
            <ScanBox id="hero-scan" />
            <a href="#demo" className={cn(linkCls, "mt-4 text-body")}>
              See how it works
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </a>
          </div>
          <ul className="mt-8 grid gap-2 border-t border-line pt-6 text-small font-semibold text-text-1 sm:grid-cols-2">
            {["You approve every change.", "You keep control of your Google profile."].map((l) => (
              <li key={l} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {l}
              </li>
            ))}
          </ul>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** The one phone on Home: the live demonstration, its status card beside it, and from 768 px the salon photo behind. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] lg:me-0">
      <div
        aria-hidden
        className="absolute inset-x-[6%] top-[10%] bottom-[6%] -z-10 hidden overflow-hidden rounded-panel md:block lg:start-[14%] lg:end-[-3rem]"
      >
        <Img
          photo={PHOTOS.salonWash}
          sizes="(min-width: 1024px) 40vw, 100vw"
          decorative
          className="absolute inset-0 size-full object-cover object-[30%_50%]"
        />
        <div className="absolute inset-0 bg-kb-black/15" />
      </div>
      {/* The card sits under the phone, as a row of three, until 1280 px; beside it from there, clear of the buttons. */}
      <HeroDemo cardClassName="relative z-10 mx-auto -mt-4 w-[min(86%,18.5rem)] xl:absolute xl:end-[-1.5rem] xl:bottom-[14%] xl:mt-0 xl:w-[13.5rem]" />
    </div>
  );
}

/* ---------- The dark band: the five steps follow the hero phone ---------- */

export function DemoBand() {
  return (
    <section id="demo" aria-labelledby="demo-h" className="theme-dark scroll-mt-16 bg-band">
      <div className="container-kb section-y">
        <SectionHead
          id="demo-h"
          title="From review to live, in five steps."
          lead="Tap Yes, Edit or Skip on the phone above. Each step shows here as it happens."
        />
        {/* The demo video goes here once a real one exists (30.21 section 2). No "Watch the demo" link until then. */}
        <div data-slot="demo-video" hidden />
        <DemoSteps className="mt-10" />
      </div>
    </section>
  );
}

/* ---------- Four jobs ---------- */

const JOBS: { icon: LucideIcon; title: string; text: string; visual: ReactNode }[] = [
  {
    icon: MessageSquareText,
    title: "Reply to every review",
    text: "Kabsi drafts a reply to each new review in your voice. You read it, then say Yes, Edit or Skip.",
    visual: (
      <MiniCard>
        <p className="text-small font-bold">5-star review from Omar H.</p>
        <p className="mt-1 text-small text-text-2">'Quick, friendly and on time.'</p>
        <StatusPill tone="info" className="mt-3">
          Reply ready
        </StatusPill>
      </MiniCard>
    ),
  },
  {
    icon: CalendarClock,
    title: "Keep your details right",
    text: "Hours, holidays, phone and website. Kabsi checks them every day and tells you when anything changes.",
    visual: (
      <MiniCard>
        <p className="flex items-start gap-2 text-small font-bold">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          Google shows a new phone number for {DEMO.business}.
        </p>
        <p className="mt-1 text-small text-text-2">Kabsi changed nothing. You choose.</p>
      </MiniCard>
    ),
  },
  {
    icon: Newspaper,
    title: "Post when something changes",
    text: "A new service, new hours, a quiet week. Kabsi writes the post, gets your photo ready and asks for your yes.",
    visual: (
      <MiniCard>
        <p className="text-small font-bold">Post ready</p>
        <p className="mt-1 text-small text-text-2">
          'Keratin treatments are here. Ask about them at your next visit.'
        </p>
      </MiniCard>
    ),
  },
  {
    icon: FileText,
    title: "See the work, every Monday",
    text: "Your Results Report: what Kabsi did, what waits for your yes, and one next step.",
    visual: (
      <MiniCard>
        <ul className="space-y-1.5 text-small">
          {[
            ["What Kabsi did", "6 replies, 2 posts"],
            ["Waiting for your yes", "1 post"],
            ["One next step", "Add 3 photos"],
          ].map(([a, b]) => (
            <li key={a}>
              <span className="block text-label text-text-2">{a}</span>
              <span className="font-bold">{b}</span>
            </li>
          ))}
        </ul>
      </MiniCard>
    ),
  },
];

function MiniCard({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-inner border border-line bg-surface-0 p-4" aria-hidden>
      {children}
    </div>
  );
}

export function Jobs() {
  return (
    <section aria-labelledby="jobs-h" className="container-kb section-y">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {/* The lead is hidden on a phone: "Nothing goes live without your yes" opens the next section. */}
        <SectionHead
          id="jobs-h"
          title="The work your Google profile needs, done."
          lead="What a business should do on Google, every week. Kabsi does it, and nothing goes live without your yes."
          leadClassName="hidden sm:block"
        />
        {/* The examples are the small cards, which show from 640 px. */}
        <ExampleBadge className="hidden text-text-2 sm:inline-flex" />
      </div>
      {/* On a phone: a plain list, the icon beside the words. From 640 px: cards with an example each. */}
      <ul className="mt-8 grid divide-y divide-line sm:mt-12 sm:grid-cols-2 sm:gap-4 sm:divide-y-0 lg:grid-cols-4">
        {JOBS.map((j) => (
          <li
            key={j.title}
            className="flex gap-4 py-4 first:pt-0 last:pb-0 sm:flex-col sm:gap-0 sm:rounded-panel sm:border sm:border-line sm:bg-surface-1 sm:p-5 sm:shadow-rest sm:first:pt-5 sm:last:pb-5"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-text-1">
              <j.icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-title sm:mt-4 sm:text-h3">{j.title}</h3>
              <p className="mt-1 flex-1 text-body text-text-2 sm:mt-2">{j.text}</p>
              <div className="mt-5 hidden sm:block">{j.visual}</div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- You stay in control ---------- */

const CONTROL: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: Check,
    title: "Nothing goes live without your yes.",
    text: "Every reply, post and change comes to you first, with the exact words.",
  },
  {
    icon: KeyRound,
    title: "No password. You stay the owner.",
    text: "Kabsi never asks for your Google password. You add Kabsi as a Manager and can remove it any time.",
  },
  {
    icon: ShieldCheck,
    title: "Reviews the right way.",
    text: "No fake reviews, no rewards for reviews, no asking only happy customers. Ever.",
  },
  {
    icon: UserRound,
    title: "Software you control.",
    text: "Kabsi is a subscription you control, not an agency. You decide what happens, every time.",
  },
];

export function Control() {
  return (
    <section aria-labelledby="control-h" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
        <div>
          <SectionHead
            id="control-h"
            title="You stay in control."
            lead="The free check needs no access. When you start, you add Kabsi as a Manager on your Google profile."
            leadClassName="hidden sm:block"
          />
          <SiteLink to="/security" className={cn(linkCls, "mt-4 text-body")}>
            You can remove Kabsi any time. See how on Security
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </SiteLink>
        </div>
        <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 sm:gap-y-8">
          {CONTROL.map((c) => (
            <li key={c.title} className="flex gap-4 sm:block">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong">
                <c.icon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="text-title sm:mt-4">{c.title}</h3>
                <p className="mt-1 text-body text-text-2">{c.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- The nearby check, explained ---------- */

export function Nearby() {
  // On a phone: the heading, two lines, "Opens at launch" and the three places, without the drawn map.
  const lines: { text: string; phone: boolean }[] = [
    { text: "It is part of the free check once it opens. No access needed.", phone: false },
    { text: "Each number is where you came up. 1 is first.", phone: true },
    { text: "It shows where you stand. It never promises a place.", phone: true },
  ];
  return (
    <section aria-labelledby="nearby-h" className="container-kb section-y">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div>
          <h2 id="nearby-h" className="text-h2">
            Where you come up nearby.
          </h2>
          <p className="mt-4 hidden max-w-[40rem] text-lead text-text-2 sm:block">
            Kabsi searches Google Maps from places around you, like a customer standing there. You
            see three places, who came first there, and one count from the 49 places Kabsi checked.
          </p>
          <p className="mt-4 inline-flex rounded-full border border-line-strong px-3 py-1 text-label font-semibold text-text-2">
            Opens at launch
          </p>
          <ul className="mt-5 space-y-3 text-body sm:mt-6">
            {lines.map((l) => (
              <li key={l.text} className={cn("gap-3", l.phone ? "flex" : "hidden sm:flex")}>
                <Check className="mt-1 size-4 shrink-0 text-ok" strokeWidth={2.5} aria-hidden />
                {l.text}
              </li>
            ))}
          </ul>
        </div>
        <NearbyPlaces title="p" details={false} sketchClassName="hidden sm:block" />
      </div>
    </section>
  );
}

/* ---------- Pick your business: a row of real workplaces ---------- */

const TRADES: { to: string; label: string; photo: Photo }[] = [
  { to: "/for/hair-salon", label: "Hair salons", photo: PHOTOS.salonStudio },
  { to: "/for/barbershop", label: "Barbershops", photo: PHOTOS.barberCut },
  { to: "/for/restaurant", label: "Restaurants", photo: PHOTOS.restaurantDining },
  { to: "/for/cafe", label: "Cafes", photo: PHOTOS.cafeBarista },
  { to: "/for/dental-clinic", label: "Dental clinics", photo: PHOTOS.dentistPatient },
  { to: "/for/auto-repair", label: "Garages", photo: PHOTOS.autoGarage },
  { to: "/for/gym-and-fitness", label: "Gyms", photo: PHOTOS.gymTraining },
  { to: "/for/nail-salon", label: "Nail salons", photo: PHOTOS.nailTechnician },
];

export function PickBusiness() {
  return (
    <section aria-labelledby="pick-h" className="border-t border-line">
      <div className="container-kb section-y">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead
            id="pick-h"
            title="Pick your business"
            lead="Each page shows the Google jobs that come back for that kind of business."
          />
          <SiteLink to="/for" className={cn(linkCls, "text-body")}>
            Every kind of business
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </SiteLink>
        </div>
        {/* On a phone: one row to swipe, the next tile peeking. From 640 px: two rows of four. */}
        <ul className="-mx-5 mt-8 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:mt-10 sm:grid sm:snap-none sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:gap-4">
          {TRADES.map((t) => (
            <li key={t.label} className="w-[42%] shrink-0 snap-start sm:w-auto">
              <SiteLink
                to={t.to}
                className="press group relative block aspect-square overflow-hidden rounded-card sm:aspect-[4/5] bg-surface-3 focus-visible:outline-offset-2"
              >
                <Img
                  photo={t.photo}
                  sizes="(min-width: 768px) 25vw, 50vw"
                  decorative
                  className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.03]"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(0_0_0/0.72))]"
                />
                <span className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-title font-bold text-kb-white">
                  {t.label}
                  <ArrowRight className="size-5 shrink-0 rtl:-scale-x-100" aria-hidden />
                </span>
              </SiteLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Pricing preview ---------- */

export function PricingPreview() {
  return (
    <section aria-labelledby="price-h" className="theme-dark bg-band">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-16">
        <div>
          <SectionHead
            id="price-h"
            title="Two plans. The work comes first."
            lead="Prices in US dollars. Free for 14 days once Kabsi is connected, with no card."
          />
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 lg:flex-col lg:items-start">
            <SiteLink to="/pricing" className={cn(linkCls, "text-body")}>
              Compare the plans
              <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
            </SiteLink>
          </div>
        </div>
        <ul className="grid gap-4 md:grid-cols-2">
          {PLANS.map((p) => (
            <li
              key={p.id}
              className={cn(
                "rounded-panel border bg-surface-1 p-6",
                p.id === "pro" ? "border-line-strong" : "border-line",
              )}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-h3">{p.name}</h3>
                <p>
                  <span className="font-display text-h3 font-bold">${p.monthly}</span>
                  <span className="ms-1 text-small text-text-2">a month</span>
                </p>
              </div>
              <p className="mt-2 text-small text-text-2">{p.line}</p>
              {/* On a phone: Pro's list only, what it adds; the full lists are on Pricing. */}
              {p.lead && <p className="mt-5 text-small font-bold">{p.lead}</p>}
              <ul className={cn("space-y-2.5", p.lead ? "mt-3" : "mt-5 hidden sm:block")}>
                {(p.id === "pro" ? [...p.work, p.help] : p.work.slice(0, 3)).map((f) => (
                  <li
                    key={f}
                    className={cn(
                      "flex gap-3 text-small text-text-1",
                      f === p.help && "hidden sm:flex",
                    )}
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-ok"
                      strokeWidth={2.5}
                      aria-hidden
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Founding 25, with the founder ---------- */

export function FoundingWithFounder() {
  // The real count (GET programs/founding); while it has not loaded, or did not load, no number shows.
  const places = useFoundingPlaces();
  const left = places?.left ?? null;
  return (
    <section aria-labelledby="f25-h" className="container-kb section-y">
      {/* On a phone the founder and the places left share the first row; the words follow. */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-5 gap-y-6 rounded-panel border border-line bg-surface-1 p-6 shadow-rest sm:gap-8 sm:p-10 lg:grid-cols-[auto_1fr_auto] lg:gap-12">
        <img
          src={FOUNDER.large}
          width={FOUNDER.w}
          height={FOUNDER.h}
          alt={FOUNDER.alt}
          loading="lazy"
          decoding="async"
          className="size-20 rounded-full object-cover sm:size-36"
        />
        <div className="order-3 col-span-2 lg:order-none lg:col-span-1">
          <h2 id="f25-h" className="text-h2">
            Founding 25: three months of Kabsi Pro, free.
          </h2>
          <p className="mt-3 text-lead text-text-2">
            Rashid Abou Hamzy, founder of Kabsi, reads every application himself.
          </p>
          <p className="mt-4 text-small text-text-2">
            By application. No card. After 90 days, choose a plan or stop, nothing is charged by
            itself.
          </p>
          <SiteLink to="/founding" className={cn(linkCls, "mt-3 text-body lg:hidden")}>
            Apply for a place
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </SiteLink>
        </div>
        <div className="order-2 lg:order-none lg:text-end">
          {left !== null && (
            <>
              <p className="font-display text-h2 font-bold">
                {left} of {places?.total ?? FOUNDING25_TOTAL}
              </p>
              <p className="text-small text-text-2">places left.</p>
            </>
          )}
          <SiteLink to="/founding" className={cn(linkCls, "mt-2 hidden text-body lg:inline-flex")}>
            Apply for a place
            <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />
          </SiteLink>
        </div>
      </div>
    </section>
  );
}

/* ---------- Four questions and the close ---------- */

export function Questions() {
  return (
    <section aria-labelledby="faq-h" className="border-t border-line">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr]">
        <SectionHead id="faq-h" title="Questions owners ask" />
        <Faq items={HOME_FAQ.map((i) => FAQ[i - 1]!)} />
      </div>
    </section>
  );
}

export function Closing() {
  return (
    <section aria-labelledby="closing-title" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y">
        <div className="mx-auto max-w-[44rem]">
          <h2 id="closing-title" className="text-h2">
            Start with a free check.
          </h2>
          {/* Hidden on a phone: the line under the check box says the same. */}
          <p className="mt-4 hidden text-lead text-text-2 sm:block">
            The quick check shows in about 10 seconds. Kabsi asks for nothing before you see the
            result.
          </p>
          <ScanBox id="closing-scan" className="mt-6 sm:mt-8" note={SCAN_LINE} />
          <p className="mt-2 text-small text-text-2">{TRIAL_LINE}</p>
        </div>
      </div>
    </section>
  );
}

export function D6Home() {
  return (
    <>
      <DemoProvider>
        <D6Hero />
        <DemoBand />
      </DemoProvider>
      <Jobs />
      <Control />
      <Nearby />
      <PickBusiness />
      <PricingPreview />
      <FoundingWithFounder />
      <Questions />
      <Closing />
    </>
  );
}
