// Home on Design 7 and Design 8 (Web 4, lane R's approval of 1 Nov 2026): the whole job, not one review. Order: the
// hero and the free check; what your free check shows; the work Kabsi does; three beats; you stay in control; pick
// your business; two plans; the founder and Founding 25; four questions; the closing free check. The hero phone is
// server-rendered HTML and CSS (the interactive demonstration lives on How it works). CSS motion only: the messages
// arrive one by one once; reduced motion shows the last frame at once.
import {
  ArrowRight,
  BotMessageSquare,
  CalendarDays,
  Check,
  ClipboardList,
  ImageIcon,
  MapPinned,
  MessageSquareText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { SCAN_LINE, TRIAL_LINE, WHATSAPP_LAUNCH_LINE, WHATSAPP_ON } from "@/lib/site";
import { useFoundingPlaces } from "@/lib/public-api";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { Pill, ResultPreview } from "./result-preview";
import { FOUNDER, Img, PHOTOS, type Photo } from "./photos";
import { ScanBox } from "./scan-box";
import { Closing, Control } from "./closing";
import { SiteLink } from "./site-link";
import { PLANS } from "./plans";
import { useFoundingLeft } from "./founding-price";
import { FOUNDING25_TOTAL } from "./founding-total";
import { FAQ, HOME_FAQ } from "./faq-data";
import {
  BEATS,
  CHECK_SHOWS,
  HERO_BUSINESS,
  HERO_STREAM,
  HOME_LINE,
  JOBS,
  type StreamItem,
} from "./d8-data";

export const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

function Arrow() {
  return <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
}

/* ---------- Hero ---------- */

function Hero() {
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate">
      <div className="container-kb grid gap-8 pt-6 pb-14 md:pt-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:pt-16 lg:pb-24">
        <div className="max-w-[36rem]">
          {/* The headline paints with no entrance animation, so it is the LCP at once (Web 3's fix). */}
          <h1 id="hero-title" className="text-display text-balance">
            Your business on Google. Taken care of.
          </h1>
          <p
            className="mt-4 animate-enter text-lead text-text-2 sm:mt-5"
            style={{ animationDelay: "60ms" }}
          >
            {HOME_LINE}
          </p>
          {!WHATSAPP_ON && (
            <p className="mt-2 text-label text-text-2 sm:text-small">{WHATSAPP_LAUNCH_LINE}</p>
          )}
          {/* relative z-10: the suggestion list opens above the hero phone that follows (Web 4 review). */}
          <div
            className="relative z-10 mt-5 animate-enter sm:mt-7"
            style={{ animationDelay: "120ms" }}
          >
            <ScanBox id="hero-scan" />
            <SiteLink to="/how-it-works" className={cn(linkCls, "mt-1 text-body sm:mt-3")}>
              See how it works
              <Arrow />
            </SiteLink>
          </div>
        </div>
        <HeroVisual />
      </div>
    </section>
  );
}

/** One phone over a workplace photo from 768 px. Four different jobs arrive in turn. */
function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem] lg:me-0">
      <div
        aria-hidden
        className="absolute inset-y-[8%] start-[18%] end-0 -z-10 hidden overflow-hidden rounded-panel md:block"
      >
        <Img
          photo={PHOTOS.salonTablet}
          sizes="(min-width: 1024px) 28vw, 60vw"
          decorative
          className="absolute inset-0 size-full object-cover object-[60%_50%]"
        />
        <div className="absolute inset-0 bg-kb-black/20" />
      </div>
      <HeroStream />
    </div>
  );
}

export { Pill, ResultPreview };

export function HeroStream({
  items = HERO_STREAM,
  business = HERO_BUSINESS,
  photo = PHOTOS.salonStudio,
  caption = "Example messages from Kabsi to an invented salon: different opening hours on Google, a reply ready for a review, a post ready with a photo, and the Monday receipt.",
}: {
  items?: StreamItem[];
  business?: string;
  photo?: Photo;
  caption?: string;
}) {
  return (
    <figure className="relative mx-auto w-[18rem] sm:w-[19.5rem] md:ms-0">
      <div className="rounded-[2.4rem] bg-kb-black p-[0.55rem] shadow-float">
        <div className="overflow-hidden rounded-[1.9rem] bg-wa-chat-bg">
          <div className="flex items-center gap-2 border-b border-wa-divider bg-wa-header px-3 pt-4 pb-2 text-wa-ink">
            <KabsiMark ring={false} className="size-8" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-chat font-bold">Kabsi</p>
              <p className="truncate text-chat-meta text-wa-time-out">For {business}</p>
            </div>
            <ExampleBadge className="shrink-0" />
          </div>
          <ol className="space-y-2.5 px-2.5 pt-3 pb-4" aria-label="Messages from Kabsi, Example">
            {items.map((m, i) => (
              <StreamBubble key={m.id} m={m} photo={photo} delay={250 + i * 650} />
            ))}
          </ol>
        </div>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

function StreamBubble({ m, delay, photo }: { m: StreamItem; delay: number; photo: Photo }) {
  return (
    <li
      className="animate-pop [animation-delay:var(--d)] motion-reduce:[animation-delay:0ms]"
      style={{ "--d": `${delay}ms` } as CSSProperties}
    >
      <div className="relative ms-1.5 max-w-[95%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 pt-1.5 pb-1 text-chat text-wa-ink shadow-bubble">
        <span
          aria-hidden
          className="absolute -start-2 top-0 size-2.5 bg-wa-in [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
        <p className="flex items-center justify-between gap-2 text-chat-meta font-bold tracking-wide text-wa-time uppercase">
          {m.label}
          <span className="font-semibold normal-case">Example</span>
        </p>
        <div className={cn("mt-1", m.photo && "flex gap-2")}>
          {m.photo && (
            <Img
              photo={photo}
              sizes="64px"
              decorative
              className="h-16 w-12 shrink-0 rounded-[0.375rem] object-cover"
            />
          )}
          <p>
            {m.text}
            {m.quote && <span className="mt-0.5 block italic">'{m.quote}'</span>}
          </p>
        </div>
        <p className="mt-0.5 text-end text-chat-meta text-wa-time">{m.time}</p>
      </div>
      {m.buttons && (
        <div
          className={cn(
            "ms-1.5 mt-1 grid max-w-[95%] gap-1",
            m.buttons.length === 3 ? "grid-cols-3" : "grid-cols-2",
          )}
          aria-hidden
        >
          {m.buttons.map((b) => (
            <span
              key={b}
              className="grid h-8 place-items-center rounded-bubble bg-wa-in text-chat font-semibold text-wa-link shadow-bubble"
            >
              {b}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}

/* ---------- What your free check shows (Design 8) ---------- */

function CheckShows() {
  return (
    <section aria-labelledby="shows-h" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
        <div>
          <h2 id="shows-h" className="text-h2">
            What your free check shows
          </h2>
          <ul className="mt-6 hidden space-y-5 sm:block">
            {CHECK_SHOWS.map((c, i) => (
              <li key={c.title} className="flex gap-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line-strong text-small font-bold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-title">{c.title}</h3>
                  <p className="mt-0.5 text-body text-text-2">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-body text-text-2 sm:hidden">
            The one thing to fix first, what customers see today, and what Kabsi would do from day
            one.
          </p>
          <SiteLink to="/scan" className={cn(linkCls, "mt-4 text-body sm:mt-6")}>
            Check my business free
            <Arrow />
          </SiteLink>
        </div>
        <ResultPreview className="lg:ms-auto lg:w-[30rem]" />
      </div>
    </section>
  );
}

/* ---------- The work Kabsi does ---------- */

const JOB_ICONS: LucideIcon[] = [
  ShieldCheck,
  MessageSquareText,
  ImageIcon,
  CalendarDays,
  ClipboardList,
  MapPinned,
  BotMessageSquare,
];

export function Work({ photo = PHOTOS.barberShave }: { photo?: Photo }) {
  return (
    <section aria-labelledby="work-h" className="border-t border-line">
      <div className="container-kb section-y grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <div>
          <h2 id="work-h" className="text-h2">
            The work your Google profile needs, every week.
          </h2>
          <p className="mt-4 hidden max-w-[34rem] text-lead text-text-2 sm:block">
            What a business should do on Google, done for you and brought to you for a yes.
          </p>
          <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-panel lg:block">
            <Img
              photo={photo}
              sizes="40vw"
              decorative
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {JOBS.map((j, i) => {
            const Icon = JOB_ICONS[i] ?? Check;
            return (
              <li key={j.title} className="flex gap-4 py-4 sm:py-5">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="flex flex-wrap items-center gap-x-3 gap-y-1 text-title">
                    {j.title}
                    {j.atLaunch && <Pill>At launch</Pill>}
                  </h3>
                  <p className="mt-1 text-body text-text-2">{j.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Three beats (the dark band) ---------- */

export function Beats() {
  return (
    <section aria-labelledby="beats-h" className="theme-dark bg-band">
      <div className="container-kb section-y">
        <h2 id="beats-h" className="sr-only">
          How Kabsi works
        </h2>
        {/* The product video goes here once a real one exists (docs/VIDEO-PLAN.md in the design studio). */}
        <div data-slot="product-video" hidden />
        <ol className="grid gap-8 md:grid-cols-3 md:gap-6">
          {BEATS.map((b, i) => (
            <li key={b.title} className="relative md:pt-8">
              <span
                aria-hidden
                className={cn(
                  "absolute start-0 top-3 hidden h-px bg-line-strong md:block",
                  i === BEATS.length - 1 ? "w-24" : "w-full",
                )}
              />
              <span
                aria-hidden
                className="absolute start-0 top-1.5 hidden size-3.5 rounded-full border-2 border-kb-paper bg-band md:block"
              />
              <p className="font-display text-h2 font-bold text-text-1">{b.title}</p>
              <p className="mt-2 max-w-[22rem] text-body text-text-2">{b.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- You stay in control ---------- */

/* ---------- Pick your business: only the finished trades, each with a photo (lane R decision 4) ---------- */

export const TRADE_CARDS: { to: string; label: string; photo: Photo; focus: string }[] = [
  { to: "/for/hair-salon", label: "Hair salons", photo: PHOTOS.salonStudio, focus: "50% 30%" },
  { to: "/for/barbershop", label: "Barbershops", photo: PHOTOS.barberCut, focus: "50% 35%" },
  { to: "/for/nail-salon", label: "Nail salons", photo: PHOTOS.nailTechnician, focus: "50% 50%" },
  {
    to: "/for/restaurant",
    label: "Restaurants",
    photo: PHOTOS.restaurantDining,
    focus: "50% 55%",
  },
];

export function PickBusiness() {
  return (
    <section aria-labelledby="pick-h" className="border-t border-line bg-surface-1">
      <div className="container-kb section-y">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="pick-h" className="text-h2">
            Pick your business
          </h2>
          <SiteLink to="/for" className={cn(linkCls, "text-body")}>
            Every kind of business
            <Arrow />
          </SiteLink>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 lg:grid-cols-4 lg:gap-4">
          {TRADE_CARDS.map((t) => (
            <li key={t.label}>
              <SiteLink
                to={t.to}
                className="press group relative block aspect-[4/5] overflow-hidden rounded-card bg-surface-3"
              >
                <Img
                  photo={t.photo}
                  sizes="(min-width: 1024px) 24vw, 50vw"
                  decorative
                  className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
                  style={{ objectPosition: t.focus }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgb(0_0_0/0.75))]"
                />
                <span className="absolute inset-x-3 bottom-3 text-title font-bold text-kb-white">
                  {t.label}
                </span>
              </SiteLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Two plans ---------- */

function TwoPlans() {
  // The founding price shows only while founding places remain (the real count; nothing while it loads).
  const left = useFoundingLeft();
  return (
    <section aria-labelledby="plans-h" className="border-t border-line">
      <div className="container-kb section-y">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 id="plans-h" className="text-h2">
              Two plans. The work comes first.
            </h2>
            <p className="mt-3 text-body text-text-2">{TRIAL_LINE}</p>
          </div>
          <SiteLink to="/pricing" className={cn(linkCls, "text-body")}>
            Compare the plans
            <Arrow />
          </SiteLink>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
          {PLANS.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex flex-col rounded-panel border bg-surface-1 p-4 sm:p-7",
                p.id === "pro" ? "border-text-1" : "border-line",
              )}
            >
              <h3 className="text-title sm:text-h3">{p.name}</h3>
              <p className="mt-2">
                <span className="font-display text-h2 font-bold">${p.monthly}</span>
                <span className="ms-1 text-small text-text-2">a month</span>
              </p>
              {left !== null && left > 0 && (
                <p className="mt-1 text-label text-text-2 sm:text-small">
                  Founding price ${p.foundingMonthly} for the first 30 paying businesses.
                </p>
              )}
              <p className="mt-3 text-small text-text-1 sm:text-body">{p.line}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-small text-text-2">
          Prices in US dollars, plus tax where it applies. Nothing to pay today.
        </p>
      </div>
    </section>
  );
}

/* ---------- The founder and Founding 25 ---------- */

export function Founder() {
  // The real count only: no number while it is unknown (lane R decision 2).
  const places = useFoundingPlaces();
  return (
    <section aria-labelledby="f25-h" className="theme-dark bg-band">
      <div className="container-kb section-y grid items-center gap-8 md:grid-cols-[auto_1fr] md:gap-12">
        <img
          src={FOUNDER.large}
          width={FOUNDER.w}
          height={FOUNDER.h}
          alt={FOUNDER.alt}
          loading="lazy"
          decoding="async"
          className="size-28 rounded-full object-cover md:size-44"
        />
        <div className="max-w-[40rem]">
          <p data-qa-mask className="mb-2 min-h-6 text-small font-bold text-text-2">
            {places
              ? places.left > 0
                ? `${places.left} of ${places.total || FOUNDING25_TOTAL} places left.`
                : "All 25 places are taken."
              : null}
          </p>
          <h2 id="f25-h" className="text-h2">
            Founding 25: three months of Kabsi Pro, free.
          </h2>
          <p className="mt-3 text-lead text-text-2">
            Rashid Abou Hamzy, founder of Kabsi, reads every application himself. Kabsi does the
            Google work; you tell Rashid what to make better.
          </p>
          <p className="mt-3 text-small text-text-2">
            By application. No card. After 90 days, choose a plan or stop, nothing is charged by
            itself.
          </p>
          <SiteLink to="/founding" className={cn(linkCls, "mt-3 text-body")}>
            Apply for a place
            <Arrow />
          </SiteLink>
        </div>
      </div>
    </section>
  );
}

/* ---------- Four questions and the closing free check ---------- */

function Questions() {
  return (
    <section aria-labelledby="faq-h">
      <div className="container-kb section-y grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
        <h2 id="faq-h" className="text-h2">
          Questions owners ask
        </h2>
        <Faq items={HOME_FAQ.map((i) => FAQ[i - 1]!)} />
      </div>
    </section>
  );
}

export function D8Home() {
  return (
    <>
      <Hero />
      <CheckShows />
      <Work />
      <Beats />
      <Control />
      <PickBusiness />
      <TwoPlans />
      <Founder />
      <Questions />
      <Closing />
    </>
  );
}

// Industry pages import the closing from here (Web 4); it lives in closing.tsx.
export { Closing, Control };
