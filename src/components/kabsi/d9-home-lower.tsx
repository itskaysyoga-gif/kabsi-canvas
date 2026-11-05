// Home on Design 9 (Web 5 part B, master plan 30.24), below the first screen (Polish 4 part D: the hero and the steps
// line are in d9-home.tsx, which loads this file after the page paints): the profile watch; a
// photo to a Google post; reviews, holiday hours and the weekly report as one compact row; Where you show up (the
// nearby map and one AI answer); you stay in control; pick your business; the pricing
// preview; the founder with Founding 25; four questions; the closing free check. Every business is an Example. CSS
// only: nothing moves on load.
import {
  CalendarDays,
  Check,
  CircleCheck,
  KeyRound,
  MessageSquareText,
  Store,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CONTACT_EMAIL, TRIAL_LINE } from "@/lib/site";
import { useFoundingPlaces } from "@/lib/public-api";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { FOUNDER, Img, PHOTOS, type Photo } from "./photos";
import { Closing } from "./closing";
import { SiteLink } from "./site-link";
import { PLANS } from "./plans";
import { useFoundingLeft } from "./founding-price";
import { FOUNDING25_TOTAL } from "./founding-total";
import { RankDot } from "./map";
import { BAND_LABEL, type RankBand } from "./map-data";
import { FAQ, HOME_FAQ } from "./faq-data";
import { CONTROL_SHORT } from "./d8-data";
import { D9Arrow, NumberedPoints, PictureButtons, YellowLabel, d9LinkCls } from "./d9-hero";
import {
  D9_BUSINESS,
  D9_MAP_POINTS,
  D9_PHOTO,
  D9_REPORT,
  D9_SHOW_UP,
  D9_SUPPORT,
  D9_SUPPORT_TITLE,
  D9_WATCH,
} from "./d9-data";

/** Design 9's section rhythm on Home: py-10 on phones (keeps Home under 9,200 px at 390), 18 from 640 px, 28 from 1024 px. */
const sectionY = "py-10 sm:py-18 lg:py-28";

/* ---------- Profile watch ---------- */

function ProfileWatch() {
  const w = D9_WATCH;
  return (
    <section aria-labelledby="watch-h">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <div>
          <h2 id="watch-h" className="text-h2">
            {w.title}
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-text-2 sm:text-lead">{w.line}</p>
        </div>
        <WatchVisual />
      </div>
    </section>
  );
}

/** Before and after: what Google shows against what the owner told Kabsi, then the question. */
function WatchVisual() {
  const w = D9_WATCH;
  return (
    <figure className="relative">
      <div className="rounded-panel border border-line bg-surface-1 p-4 shadow-lift sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-small font-bold">{D9_BUSINESS}</p>
          <ExampleBadge />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="rounded-inner border-2 border-dashed border-line-strong p-3 sm:p-4">
            <p className="text-label font-semibold text-text-2">{w.google.label}</p>
            <p className="mt-2 text-label text-text-2">{w.google.day}</p>
            <p className="font-display text-h3 font-bold">{w.google.value}</p>
          </div>
          <div className="rounded-inner border-2 border-text-1 p-3 sm:p-4">
            <p className="text-label font-semibold text-text-2">{w.owner.label}</p>
            <p className="mt-2 text-label text-text-2">{w.owner.day}</p>
            <p className="font-display text-h3 font-bold">{w.owner.value}</p>
          </div>
        </div>
        <div className="mt-3 rounded-inner wa-ground p-3">
          <div className="flex items-start gap-2">
            <KabsiMark ring={false} className="mt-0.5 size-7" />
            <div className="min-w-0 flex-1">
              <div className="rounded-bubble rounded-ss-none bg-wa-in px-2.5 py-1.5 text-chat text-wa-ink shadow-bubble">
                {w.message}
                <span className="mt-0.5 block text-end text-chat-meta text-wa-time-out">08:02</span>
              </div>
              <div className="-ms-1.5">
                <PictureButtons labels={w.buttons} />
              </div>
            </div>
          </div>
        </div>
        <ul className="mt-4 hidden flex-wrap gap-1.5 sm:flex" aria-label="What Kabsi checks">
          {w.watched.map((d) => (
            <li
              key={d}
              className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-label font-semibold"
            >
              <Check className="size-3.5 text-ok" aria-hidden />
              {d}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="sr-only">{w.caption}</figcaption>
    </figure>
  );
}

/* ---------- Photo to post (the dark band) ---------- */

export function PhotoToPost() {
  const p = D9_PHOTO;
  return (
    <section aria-labelledby="photo-h" className="theme-dark bg-band">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <div>
          <YellowLabel>{p.label}</YellowLabel>
          <h2 id="photo-h" className="mt-4 text-h2">
            {p.title} <span className="text-phrase">{p.titleMark}</span>
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-text-2 sm:text-lead">{p.line}</p>
          <NumberedPoints points={p.points} className="mt-6" />
        </div>
        <PhotoVisual />
      </div>
    </section>
  );
}

function PhotoVisual({ photo = PHOTOS.salonStudio }: { photo?: Photo }) {
  const p = D9_PHOTO;
  return (
    <figure className="relative mx-auto grid w-full max-w-[20rem] items-end gap-4 sm:max-w-[34rem] sm:grid-cols-[0.8fr_1fr]">
      <div className="relative hidden aspect-[3/4] overflow-hidden rounded-panel sm:block">
        <Img
          photo={photo}
          sizes="(min-width: 1024px) 18vw, 40vw"
          decorative
          className="absolute inset-0 size-full object-cover object-[50%_30%]"
        />
      </div>
      <div className="rounded-[1.5rem] bg-wa-chat p-2.5 text-wa-ink shadow-float sm:p-3">
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <p className="text-chat font-bold">Kabsi</p>
          <ExampleBadge className="text-wa-ink" />
        </div>
        {/* The owner's own message: the photo and a line. */}
        <div className="ms-auto w-[88%] rounded-bubble rounded-se-none bg-wa-out p-1.5 shadow-bubble">
          <Img
            photo={photo}
            sizes="160px"
            decorative
            className="aspect-[4/3] w-full rounded-[0.375rem] object-cover object-[50%_30%]"
          />
          <p className="px-1 pt-1 text-chat">{p.ownerLine}</p>
          <p className="px-1 text-end text-chat-meta text-wa-time-out">12:31</p>
        </div>
        <div className="mt-2 w-[92%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 py-1.5 text-chat shadow-bubble">
          {p.ready}
          <span className="mt-0.5 block italic">'{p.quote}'</span>
          <span className="block text-end text-chat-meta text-wa-time-out">12:32</span>
        </div>
        <div className="-ms-1.5 w-[96%]">
          <PictureButtons labels={p.buttons} />
        </div>
        <ol
          className="mt-2.5 space-y-1 rounded-bubble bg-wa-in p-2 text-chat-meta font-bold"
          aria-label="Where the post is"
        >
          {p.states.map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <CircleCheck className="size-3.5 text-kb-green-ink" aria-hidden />
              {s}
            </li>
          ))}
        </ol>
      </div>
      <figcaption className="sr-only">{p.caption}</figcaption>
    </figure>
  );
}

/* ---------- The supporting row: reviews, holiday hours, the weekly report ---------- */

const SUPPORT_ICONS: Record<string, LucideIcon> = {
  reviews: MessageSquareText,
  holiday: CalendarDays,
};

function SupportRow() {
  const r = D9_REPORT;
  return (
    <section aria-labelledby="support-h" className="border-b border-line bg-surface-1">
      <div className="container-kb py-10 sm:py-16 lg:py-20">
        <h2 id="support-h" className="text-h2">
          {D9_SUPPORT_TITLE}
        </h2>
        <div className="mt-6 grid gap-6 sm:mt-8 md:grid-cols-[1fr_1fr_1.2fr] md:gap-8">
          {D9_SUPPORT.map((s) => {
            const Icon = SUPPORT_ICONS[s.id] ?? Check;
            return (
              <div key={s.id} className="flex gap-3 md:block">
                <Icon className="mt-0.5 size-6 shrink-0" aria-hidden />
                <div className="md:mt-4">
                  <h3 className="text-title">{s.title}</h3>
                  <p className="mt-1 text-small text-text-2 sm:text-body">{s.text}</p>
                </div>
              </div>
            );
          })}
          <figure className="rounded-panel border border-line bg-surface-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-label font-semibold text-text-2">{r.when}</p>
                <h3 className="text-title">{r.title}</h3>
              </div>
              <ExampleBadge />
            </div>
            <ul className="mt-3 grid grid-cols-1 gap-1 text-small font-semibold min-[400px]:grid-cols-3 md:grid-cols-1">
              {r.done.map((d) => (
                <li key={d} className="flex items-center gap-1.5">
                  <Check className="size-4 shrink-0 text-ok" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-line pt-3 text-small">
              <span className="font-bold">One next step:</span> {r.next}
            </p>
          </figure>
        </div>
      </div>
    </section>
  );
}

/* ---------- Where you show up (one section) ---------- */

const BANDS: RankBand[] = ["top", "mid", "low", "none"];
const BAND_SAMPLE: Record<RankBand, number> = { top: 1, mid: 4, low: 14, none: 25 };

function WhereYouShowUp() {
  const s = D9_SHOW_UP;
  return (
    <section aria-labelledby="show-h">
      <div className={cn("container-kb", sectionY)}>
        <div className="max-w-[40rem]">
          <h2 id="show-h" className="text-h2">
            {s.title}
          </h2>
          <p className="mt-3 text-body text-text-2">{s.line}</p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <NearbyMap />
          <AiAnswer />
        </div>
      </div>
    </section>
  );
}

function NearbyMap() {
  const m = D9_SHOW_UP.map;
  return (
    <figure className="rounded-panel border border-line bg-surface-1 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title">{m.title}</h3>
          <p className="text-label text-text-2">{m.search}</p>
        </div>
        <ExampleBadge />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_11rem] sm:items-center">
        <div className="relative aspect-[16/10] overflow-hidden rounded-inner bg-map-ground sm:aspect-square">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full"
            aria-hidden
          >
            <g fill="var(--map-block)">
              {[0, 1, 2, 3].map((r) =>
                [0, 1, 2, 3].map((c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={3 + c * 25}
                    y={3 + r * 25}
                    width="19"
                    height="19"
                    rx="2"
                  />
                )),
              )}
            </g>
            <path
              d="M0 50 C 30 46, 64 56, 100 50"
              stroke="var(--map-street)"
              strokeWidth="3.5"
              fill="none"
            />
            <path
              d="M48 0 C 45 34, 54 66, 50 100"
              stroke="var(--map-street)"
              strokeWidth="3"
              fill="none"
            />
            <path d="M0 88 C 30 82, 60 96, 100 86 L100 100 L0 100 Z" fill="var(--map-water)" />
          </svg>
          {D9_MAP_POINTS.map((p) => (
            <span
              key={`${p.x}-${p.y}`}
              aria-hidden
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <RankDot rank={p.rank} />
            </span>
          ))}
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden>
            <KabsiMark className="size-9 shadow-lift" />
          </span>
        </div>
        <ul
          className="grid grid-cols-2 gap-x-3 gap-y-2 text-label sm:grid-cols-1"
          aria-label="What each mark means"
        >
          <li className="col-span-2 flex items-center gap-2 sm:col-span-1">
            <KabsiMark className="size-6" />
            Your business
          </li>
          {BANDS.map((b) => (
            <li key={b} className="flex items-center gap-2">
              <RankDot rank={BAND_SAMPLE[b]} size="sm" />
              {BAND_LABEL[b]}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-small font-bold">{m.count}</p>
      <figcaption className="mt-2 text-label text-text-2">
        {m.shows} {m.sample}
      </figcaption>
    </figure>
  );
}

function AiAnswer() {
  const a = D9_SHOW_UP.ai;
  return (
    <figure className="flex flex-col rounded-panel border border-line bg-surface-1 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title">{a.title}</h3>
          <p className="text-label text-text-2">{a.label2}</p>
        </div>
        <ExampleBadge />
      </div>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
        <dt className="text-text-2">Question</dt>
        <dd className="font-semibold">{a.question}</dd>
        <dt className="text-text-2">Assistant</dt>
        <dd>{a.assistant}</dd>
        <dt className="text-text-2">Asked on</dt>
        <dd>{a.date}</dd>
      </dl>
      <blockquote className="mt-4 rounded-inner bg-surface-2 p-4 font-display text-title font-semibold">
        {a.answer}
      </blockquote>
      <div className="mt-3 hidden text-small sm:block">
        <p className="text-text-2">Sources it cited</p>
        <ul className="mt-1 flex flex-wrap gap-1.5">
          {a.sources.map((s) => (
            <li
              key={s}
              className="rounded-full border border-line-strong px-2.5 py-0.5 text-label font-semibold"
            >
              {s}
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="mt-auto pt-4 text-label text-text-2">{a.label}</figcaption>
    </figure>
  );
}

/* ---------- You stay in control (the approved lines, d8-data CONTROL) ---------- */

const CONTROL_ICONS: LucideIcon[] = [KeyRound, ThumbsUp, Store];

function D9Control() {
  return (
    <section aria-labelledby="control-h" className="border-t border-line bg-surface-1">
      <div className={cn("container-kb grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16", sectionY)}>
        <div>
          <h2 id="control-h" className="text-h2">
            You stay in control.
          </h2>
          <SiteLink to="/security" className={cn(d9LinkCls, "mt-3 text-body")}>
            See how to remove Kabsi on Security
            <D9Arrow />
          </SiteLink>
        </div>
        <ul className="grid gap-x-8 gap-y-3 sm:grid-cols-3 sm:gap-y-4">
          {CONTROL_SHORT.map((c, i) => {
            const Icon = CONTROL_ICONS[i] ?? Check;
            return (
              <li key={c.title} className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                <div>
                  <h3 className="text-body font-bold">{c.title}</h3>
                  <p className="hidden text-small text-text-2 sm:block">{c.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Pick your business (the four finished trades, photo cards; shorter on a phone) ---------- */

const TRADES: { to: string; label: string; photo: Photo; focus: string }[] = [
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

function D9PickBusiness() {
  return (
    <section aria-labelledby="pick-h" className="border-t border-line">
      <div className={cn("container-kb", sectionY)}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="pick-h" className="text-h2">
            Pick your business
          </h2>
          <SiteLink to="/for" className={cn(d9LinkCls, "text-body")}>
            Every kind of business
            <D9Arrow />
          </SiteLink>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 lg:grid-cols-4 lg:gap-4">
          {TRADES.map((t) => (
            <li key={t.label}>
              <SiteLink
                to={t.to}
                className="press group relative block aspect-[4/3] overflow-hidden rounded-card bg-surface-3 sm:aspect-[4/5]"
              >
                <Img
                  photo={t.photo}
                  sizes="(min-width: 1024px) 24vw, 50vw"
                  decorative
                  className="absolute inset-0 size-full object-cover"
                  style={{ objectPosition: t.focus }}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgb(0_0_0/0.78))]"
                />
                <span className="absolute inset-x-3 bottom-2.5 text-body font-bold text-kb-white sm:text-title">
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

/* ---------- Pricing preview (the founding price line only while founding places remain) ---------- */

function PricingPreview() {
  const left = useFoundingLeft();
  return (
    <section aria-labelledby="plans-h" className="border-t border-line">
      <div className={cn("container-kb", sectionY)}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 id="plans-h" className="text-h2">
              Two plans. The work comes first.
            </h2>
            <p className="mt-3 text-body text-text-2">{TRIAL_LINE}</p>
          </div>
          <SiteLink to="/pricing" className={cn(d9LinkCls, "text-body")}>
            Compare the plans
            <D9Arrow />
          </SiteLink>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-4">
          {PLANS.map((p) => (
            <li
              key={p.id}
              className={cn(
                "flex flex-col rounded-panel border bg-surface-1 p-4 sm:p-7",
                p.id === "pro" ? "border-2 border-text-1" : "border-line",
              )}
            >
              <h3 className="text-title sm:text-h3">{p.name}</h3>
              <p className="mt-2">
                <span className="font-display text-h2 font-bold">${p.monthly}</span>
                <span className="ms-1 text-small text-text-2">a month</span>
              </p>
              <p className="mt-3 text-small text-text-1 sm:text-body">{p.line}</p>
            </li>
          ))}
        </ul>
        {left !== null && left > 0 && (
          <p className="mt-4 text-small font-semibold">
            Founding price {PLANS.map((p) => `$${p.foundingMonthly}`).join(" and ")} for the first
            30 paying businesses.
          </p>
        )}
        <p className="mt-2 text-small text-text-2">
          Prices in US dollars, plus tax where it applies. Nothing to pay today.
        </p>
      </div>
    </section>
  );
}

/* ---------- The founder and Founding 25 (the real count only) ---------- */

function FounderBand() {
  const places = useFoundingPlaces();
  return (
    <section aria-labelledby="founder-h" className="theme-dark bg-band">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <figure className="flex gap-5 sm:gap-6">
          <img
            src={FOUNDER.large}
            width={FOUNDER.w}
            height={FOUNDER.h}
            alt={FOUNDER.alt}
            loading="lazy"
            decoding="async"
            className="size-20 shrink-0 rounded-full object-cover sm:size-32"
          />
          <div>
            <h2 id="founder-h" className="text-h3 sm:text-h2">
              From the founder
            </h2>
            <blockquote className="mt-3 max-w-[36rem] text-body text-text-2 sm:text-lead">
              <p>A Google profile needs work every week. I built Kabsi to do that work for you.</p>
            </blockquote>
            <figcaption className="mt-3 text-small">
              <span className="font-bold">Rashid Abou Hamzy</span>, founder of Kabsi.{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>
            </figcaption>
          </div>
        </figure>
        <div className="rounded-panel border border-line-strong p-5 sm:p-7">
          <p data-qa-mask className="min-h-6 text-small font-bold text-text-2">
            {places
              ? places.left > 0
                ? `${places.left} of ${places.total || FOUNDING25_TOTAL} places left.`
                : "All 25 places are taken."
              : null}
          </p>
          <h3 className="mt-1 text-h3">
            Founding 25. <span className="text-phrase">Three months of Kabsi Pro, free.</span>
          </h3>
          <p className="mt-2 text-small text-text-2 sm:text-body">
            By application, no card. After 90 days you choose a plan or stop. Nothing is charged by
            itself.
          </p>
          <SiteLink to="/founding" className={cn(d9LinkCls, "mt-2 text-body")}>
            Apply for a place
            <D9Arrow />
          </SiteLink>
        </div>
      </div>
    </section>
  );
}

/* ---------- Four questions (the shared FAQ's Home four, their current wording) ---------- */

function D9Questions() {
  return (
    <section aria-labelledby="faq-h" className="border-t border-line">
      <div className={cn("container-kb grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16", sectionY)}>
        <h2 id="faq-h" className="text-h2">
          Questions owners ask
        </h2>
        <Faq items={HOME_FAQ.map((i) => FAQ[i - 1]!)} />
      </div>
    </section>
  );
}

/** Everything below Home's first screen (Polish 4 part D): its own chunk, loaded after the page paints (d9-home.tsx). */
export function D9HomeLowerSections() {
  return (
    <>
      <ProfileWatch />
      <PhotoToPost />
      {/* Fix 2 (master plan 30.27 item 2): Where you show up straight after photo to post, before the supporting row. */}
      <WhereYouShowUp />
      <SupportRow />
      <D9Control />
      <D9PickBusiness />
      <PricingPreview />
      <FounderBand />
      <D9Questions />
      <Closing />
    </>
  );
}
