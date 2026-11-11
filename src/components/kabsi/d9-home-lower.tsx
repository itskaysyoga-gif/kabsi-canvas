// Home on Design 9 (Web 5 part B, master plan 30.24), below the hero and the four jobs (Polish 4 part D: the hero is in
// d9-home.tsx, which loads this file after the page paints). Home 2 (lane R R-158 item 4, 11 Nov 2026) put it in this
// order: the problem in owner words, what Kabsi does in four blocks (each with what you do and a small Example), you
// stay in control with a sample weekly report, how it starts, your kind of business, the plans with the launch price
// and the real count, five questions and the closing free check. Every business is an Example. CSS only: nothing moves
// on load. PhotoToPost, NearbyMap and AiAnswer stay here for the industry pages; HandlesGroups for How it works.
import {
  Check,
  CircleCheck,
  Clock,
  Images,
  KeyRound,
  MessageSquareText,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE, foundingPlacesLine } from "@/lib/site";
import { ExampleBadge, Faq, KabsiMark, WithWhatsAppMark } from "./ui";
import { Img, PHOTOS, type Photo } from "./photos";
import { Closing } from "./closing";
import { Look2Bubble, OwnerBubble } from "./look2";
import { Highlight, YellowNumber } from "./highlight";
import { SiteLink } from "./site-link";
import { PLANS } from "./plans";
import { useFoundingLeft } from "./founding-price";
import { RankDot } from "./map";
import { BAND_LABEL, type RankBand } from "./map-data";
import { D9Arrow, NumberedPoints, PictureButtons, YellowLabel, d9LinkCls } from "./d9-hero";
import {
  HOME2_CONTROL,
  HOME2_DOES,
  HOME2_DOES_MARK,
  HOME2_DOES_TITLE,
  HOME2_EXAMPLES,
  HOME2_FAQ,
  HOME2_JOBS,
  HOME2_PROBLEM,
  type JobId,
  HOME2_START,
  HOME2_THREAD,
  HOME2_THREAD_CAPTION,
  HOME2_TRADES,
} from "./home2-data";
import { D9_BUSINESS, D9_MAP_POINTS, D9_PHOTO, D9_REPORT, D9_SHOW_UP } from "./d9-data";
import { Marked } from "@/components/kabsi/highlight";

/** Design 9's section rhythm on Home: py-10 on phones (keeps Home under 9,200 px at 390), 18 from 640 px, 28 from 1024 px. */
const sectionY = "py-10 sm:py-18 lg:py-28";

/* ---------- Photo to post (the dark band) ---------- */

/** Industries 2: an industry page passes its tall photo and its own Example post. */
export type PhotoPostExample = { photo: Photo; owner: string; quote: string; alt?: string };

/**
 * Industry 1 (R-144): an industry page passes its own left column (its photos and posts) in place of Home's three
 * points, and the post's state list is left out there, so the band is the trade's own text.
 */
export function PhotoToPost({
  example,
  intro,
}: { example?: PhotoPostExample; intro?: ReactNode } = {}) {
  const p = D9_PHOTO;
  return (
    <section aria-labelledby="photo-h" className="theme-dark bg-band">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        {intro ?? (
          <div>
            <YellowLabel>{p.label}</YellowLabel>
            <h2 id="photo-h" className="mt-4 text-h2">
              {p.title} <span className="text-phrase">{p.titleMark}</span>
            </h2>
            <p className="mt-4 max-w-[34rem] text-body text-text-2 sm:text-lead">{p.line}</p>
            <NumberedPoints points={p.points} className="mt-6" />
          </div>
        )}
        <PhotoVisual example={example} states={!intro} />
      </div>
    </section>
  );
}

function PhotoVisual({
  example,
  states = true,
}: {
  example?: PhotoPostExample | undefined;
  states?: boolean;
}) {
  const p = D9_PHOTO;
  const photo = example?.photo ?? PHOTOS.salonStudio;
  const owner = example?.owner ?? p.ownerLine;
  const quote = example?.quote ?? p.quote;
  return (
    <figure
      className={cn(
        "relative mx-auto grid w-full max-w-[20rem] gap-4",
        // Industries 2: on an industry page the trade's tall photo stands beside the chat at full 2:3 height.
        example
          ? "items-center sm:max-w-[38rem] sm:grid-cols-[1fr_1fr]"
          : "items-end sm:max-w-[34rem] sm:grid-cols-[0.8fr_1fr]",
      )}
    >
      <div
        className={cn(
          "relative hidden overflow-hidden rounded-panel sm:block",
          example ? "aspect-[2/3]" : "aspect-[3/4]",
        )}
      >
        <Img
          photo={photo}
          sizes="(min-width: 1024px) 19rem, 45vw"
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
          <p className="px-1 pt-1 text-chat">{owner}</p>
          {states && <p className="px-1 text-end text-chat-meta text-wa-time-out">12:31</p>}
        </div>
        <div className="mt-2 w-[92%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 py-1.5 text-chat shadow-bubble">
          {p.ready}
          <span className="mt-0.5 block italic">'{quote}'</span>
          {states && <span className="block text-end text-chat-meta text-wa-time-out">12:32</span>}
        </div>
        <div className="-ms-1.5 w-[96%]">
          <PictureButtons labels={p.buttons} />
        </div>
        {states && (
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
        )}
      </div>
      <figcaption className="sr-only">
        {example
          ? `Example: the owner sends a photo with the line '${owner}' on WhatsApp and Kabsi prepares the Google post '${quote}' with that photo, for the owner's yes.`
          : p.caption}
      </figcaption>
    </figure>
  );
}

/* ---------- Where you show up (one section) ---------- */

const BANDS: RankBand[] = ["top", "mid", "low", "none"];
const BAND_SAMPLE: Record<RankBand, number> = { top: 1, mid: 4, low: 14, none: 25 };

/** Industries 2: an industry page's own nearby line (Example). */
export type NearbyExample = { kind: string; term: string };

export function NearbyMap({ example }: { example?: NearbyExample | undefined } = {}) {
  const m = D9_SHOW_UP.map;
  return (
    <figure className="rounded-panel border border-line bg-surface-1 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title">{m.title}</h3>
          <p className="text-label text-text-2">
            {example ? `Searched: ${example.term}, 2 Nov 2026` : m.search}
          </p>
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
      {example && (
        <p className="mt-4 text-small">
          Near your {example.kind} you came up 2nd for '{example.term}'.
        </p>
      )}
      <p className={cn("text-small font-bold", example ? "mt-1" : "mt-4")}>{m.count}</p>
      <figcaption className="mt-2 text-label text-text-2">
        {m.shows} {m.sample}
      </figcaption>
    </figure>
  );
}

/** Industries 2: an industry page's own question and answer (Example). */
export type AiExample = {
  question: string;
  answer: string;
  sources: readonly string[];
  /** Industry 1: an industry page names its Example business in the title and the date line. */
  title?: string;
  date?: string;
};

export function AiAnswer({
  example,
  compact = false,
  bare = false,
}: {
  example?: AiExample | undefined;
  /** Industry 1 (R-144): the assistant and the date as one line ("Asked ChatGPT on [date]", R-143), not three rows. */
  compact?: boolean;
  /** Home 2: inside a block that carries its own frame and Example label: the question, the date, the answer, the note. */
  bare?: boolean;
} = {}) {
  const a = { ...D9_SHOW_UP.ai, ...(example ?? {}) };
  if (bare)
    return (
      <div className="text-small">
        <p className="font-semibold">{a.question}</p>
        <p className="mt-1 text-text-2">{`Asked ${a.assistant} on ${a.date}.`}</p>
        <blockquote className="mt-3 rounded-inner bg-surface-1 p-3 font-semibold">
          {a.answer}
        </blockquote>
        <p className="mt-3 text-label text-text-2">{a.label}</p>
      </div>
    );
  return (
    <figure className="flex flex-col rounded-panel border border-line bg-surface-1 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-title">{a.title}</h3>
          {!compact && <p className="text-label text-text-2">{a.label2}</p>}
        </div>
        <ExampleBadge />
      </div>
      {compact ? (
        <div className="mt-4 text-small">
          <p className="font-semibold">{a.question}</p>
          <p className="mt-1 text-text-2">{`Asked ${a.assistant} on ${a.date}.`}</p>
        </div>
      ) : (
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-small">
          <dt className="text-text-2">Question</dt>
          <dd className="font-semibold">{a.question}</dd>
          <dt className="text-text-2">Assistant</dt>
          <dd>{a.assistant}</dd>
          <dt className="text-text-2">Asked on</dt>
          <dd>{a.date}</dd>
        </dl>
      )}
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

/* ---------- 1. The hero's picture (rendered inside the hero, home2-hero.tsx) ---------- */

/** One day on WhatsApp at the Example salon: a review, "Closed Monday" to hours, a photo to a post. A picture. */
export function HeroThread() {
  return (
    <figure className="relative mx-auto w-full max-w-[20rem] sm:max-w-[21rem] lg:me-0">
      <div className="rounded-[2.4rem] bg-kb-black p-[0.55rem] shadow-float">
        <div className="overflow-hidden rounded-[1.9rem] bg-wa-chat">
          <div className="flex items-center gap-2 border-b border-wa-divider bg-wa-header px-3 pt-3 pb-2 text-wa-ink">
            <KabsiMark ring={false} className="size-8" />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-chat font-bold">Kabsi</p>
              <p className="truncate text-chat-meta text-wa-time-out">Today</p>
            </div>
            <ExampleBadge className="shrink-0" />
          </div>
          <ol className="space-y-2 px-2.5 pt-3 pb-4" aria-label="Messages from Kabsi, Example">
            {HOME2_THREAD.map((m) =>
              "owner" in m ? (
                <OwnerBubble
                  key={m.id}
                  text={m.text}
                  time={m.time}
                  photo={m.photo ? PHOTOS.salonStudio : undefined}
                />
              ) : (
                <Look2Bubble key={m.id} m={m} />
              ),
            )}
          </ol>
        </div>
      </div>
      <figcaption className="sr-only">{HOME2_THREAD_CAPTION}</figcaption>
    </figure>
  );
}

/* ---------- 2. The four jobs under the hero: an icon and a few words each (Home 2) ---------- */

function JobsStrip() {
  return (
    <section aria-labelledby="jobs-h" className="border-y border-line bg-surface-1">
      <div className="container-kb py-6 sm:py-8">
        <h2 id="jobs-h" className="sr-only">
          What Kabsi does for you
        </h2>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-4 lg:gap-x-8">
          {HOME2_JOBS.map((j) => {
            const Icon = DOES_ICONS[j.id];
            return (
              <li key={j.id} className="flex items-center gap-3 text-body font-bold">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2">
                  <Icon className="size-5 text-text-1" aria-hidden />
                </span>
                {j.title}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 3. The problem, in owner words (Home 2) ---------- */

const SEEN_ICONS: Record<(typeof HOME2_PROBLEM.seen)[number]["id"], LucideIcon> = {
  stars: Star,
  hours: Clock,
  photos: Images,
  ai: Sparkles,
};

function Problem() {
  const p = HOME2_PROBLEM;
  return (
    // data-wake: the lower sections' code loads when this comes into view (d9-home.tsx); it sits below a phone's first
    // screen, so a first visit's measurement reads only the hero's code.
    <section aria-labelledby="problem-h" data-wake>
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <div>
          <h2 id="problem-h" className="text-h2">
            <Marked text={p.title} mark={p.mark} />
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-text-2 sm:text-lead">{p.line}</p>
        </div>
        <div>
          <h3 className="text-small font-semibold text-text-2">{p.label}</h3>
          <ul className="mt-3 grid grid-cols-2 gap-3">
            {p.seen.map((x) => {
              const Icon = SEEN_ICONS[x.id];
              return (
                <li key={x.id} className="rounded-card border border-line bg-surface-1 p-4">
                  <Icon className="size-5 text-text-1" aria-hidden />
                  <p className="mt-3 text-body font-bold">{x.title}</p>
                  <p className="mt-0.5 text-small text-text-2">{x.text}</p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- 4. What Kabsi does: four blocks, each with what you do and a small Example ---------- */

function JobExample({ id }: { id: JobId }) {
  const e = HOME2_EXAMPLES;
  if (id === "reviews")
    return (
      <div className="space-y-2 text-small">
        <p className="flex items-center gap-1" aria-label={`${e.review.stars} stars`}>
          {Array.from({ length: 5 }, (_, i) => (
            <Star
              key={i}
              aria-hidden
              className={cn(
                "size-4",
                i < e.review.stars ? "fill-current text-warn" : "text-line-strong",
              )}
            />
          ))}
          <span className="ms-1 font-semibold">{e.review.from}</span>
        </p>
        <p className="border-s-[3px] border-line-strong ps-2 text-text-2">{e.review.text}</p>
        <p className="font-semibold">Kabsi's reply</p>
        <p className="border-s-[3px] border-text-1 ps-2">{e.review.reply}</p>
      </div>
    );
  if (id === "listing")
    return (
      <div className="grid grid-cols-2 gap-2">
        {[e.listing.google, e.listing.owner].map((x, i) => (
          <div
            key={x.label}
            className={cn(
              "rounded-inner border-2 p-3",
              i === 0 ? "border-dashed border-line-strong" : "border-text-1",
            )}
          >
            <p className="text-label font-semibold text-text-2">{x.label}</p>
            <p className="mt-1.5 text-label text-text-2">{x.day}</p>
            <p className="font-display text-title font-bold">{x.value}</p>
          </div>
        ))}
      </div>
    );
  if (id === "posts")
    return (
      <div className="grid grid-cols-[5.5rem_1fr] items-start gap-3 text-small">
        <Img
          photo={PHOTOS.salonStudio}
          sizes="88px"
          decorative
          className="aspect-[3/4] w-full rounded-inner object-cover object-[50%_30%]"
        />
        <div className="space-y-2">
          <p className="w-fit rounded-bubble bg-surface-1 px-2 py-1 text-text-2">{e.post.owner}</p>
          <p className="font-semibold">Post ready for Google</p>
          <p className="border-s-[3px] border-text-1 ps-2">{e.post.post}</p>
        </div>
      </div>
    );
  return <AiAnswer compact bare />;
}

const DOES_ICONS: Record<JobId, LucideIcon> = {
  reviews: MessageSquareText,
  listing: Store,
  posts: Images,
  ai: Sparkles,
};

function WhatKabsiDoes() {
  return (
    <section aria-labelledby="does-home-h" className="border-t border-line bg-surface-1">
      <div className={cn("container-kb", sectionY)}>
        <h2 id="does-home-h" className="text-h2">
          <Marked text={HOME2_DOES_TITLE} mark={HOME2_DOES_MARK} />
        </h2>
        <ul className="mt-6 grid gap-4 sm:mt-10 lg:grid-cols-2 lg:gap-6">
          {HOME2_DOES.map((j) => {
            const Icon = DOES_ICONS[j.id];
            return (
              <li
                key={j.id}
                className="flex flex-col rounded-panel border border-line bg-surface-0 p-5 sm:p-7"
              >
                <h3 className="flex items-center gap-3 text-h3 font-bold">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-1">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {j.title}
                </h3>
                <dl className="mt-4 space-y-3">
                  <div>
                    <dt className="text-label font-semibold text-text-2">Kabsi</dt>
                    <dd className="text-body">{j.kabsi}</dd>
                  </div>
                  <div>
                    <dt className="text-label font-semibold text-text-2">You</dt>
                    <dd className="flex items-center gap-2 text-body font-bold">
                      <ThumbsUp className="size-4 shrink-0 text-ok" aria-hidden />
                      {j.you}
                    </dd>
                  </div>
                </dl>
                {j.plan && <p className="mt-3 text-small text-text-2">{j.plan}</p>}
                {j.note && <p className="mt-2 text-small font-semibold">{j.note}</p>}
                <figure className="mt-5 rounded-inner bg-surface-2 p-4">
                  <div className="mb-3 flex justify-end">
                    <ExampleBadge />
                  </div>
                  <JobExample id={j.id} />
                </figure>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- The four jobs on How it works (its first section; Home 2 aligned it with Home's four jobs) ---------- */

export function HandlesGroups({
  id = "handles-h",
  title = "What Kabsi does",
  mark = "does",
  className,
}: {
  id?: string;
  title?: string;
  mark?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={cn("border-t border-line", className)}>
      <div className="container-kb py-10 sm:py-18 lg:py-24">
        <h2 id={id} className="text-h2">
          <Marked text={title} mark={mark} />
        </h2>
        <ul className="mt-6 grid gap-x-8 gap-y-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
          {HOME2_DOES.map((h) => {
            const Icon = DOES_ICONS[h.id];
            return (
              <li key={h.id} className="border-t-2 border-text-1 pt-4">
                <h3 className="flex items-center gap-2 text-title">
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {h.title}
                </h3>
                <p className="mt-1 text-body text-text-2">{h.kabsi}</p>
                <p className="mt-2 text-small font-semibold">You: {h.you}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

/* ---------- 5. You stay in control, with a sample weekly report ---------- */

const CONTROL_ICONS: LucideIcon[] = [KeyRound, ThumbsUp, Store];

function ControlAndReport() {
  const r = D9_REPORT;
  const c = HOME2_CONTROL;
  return (
    <section aria-labelledby="control-h" className="border-t border-line">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <div>
          <h2 id="control-h" className="text-h2">
            <Marked text={c.title} mark={c.mark} />
          </h2>
          <p className="mt-4 text-body text-text-2 sm:text-lead">{c.line}</p>
          <ul className="mt-6 space-y-4">
            {c.points.map((pt, i) => {
              const Icon = CONTROL_ICONS[i] ?? Check;
              return (
                <li key={pt.title} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                  <div>
                    <h3 className="text-body font-bold">{pt.title}</h3>
                    <p className="text-small text-text-2">{pt.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <SiteLink to="/security" className={cn(d9LinkCls, "mt-4 text-body")}>
            See how to remove Kabsi on Security
            <D9Arrow />
          </SiteLink>
        </div>
        <figure className="rounded-panel border border-line bg-surface-1 p-5 shadow-lift sm:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-label font-semibold text-text-2">{r.when}</p>
              <h3 className="text-title">{r.title}</h3>
            </div>
            <ExampleBadge />
          </div>
          <p className="mt-1 text-small text-text-2">{D9_BUSINESS}</p>
          <ul className="mt-4 space-y-1.5 text-small font-semibold">
            {r.done.map((d) => (
              <li key={d} className="flex items-center gap-2">
                <Check className="size-4 shrink-0 text-ok" aria-hidden />
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-4 text-small">
            <span className="font-bold">One next step:</span> {r.next}
          </p>
          <figcaption className="mt-3 text-label text-text-2">{r.line}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------- 6. How it starts: three steps ---------- */

function HowItStarts() {
  const h = HOME2_START;
  return (
    <section aria-labelledby="start-h" className="border-y border-line bg-surface-1">
      <div className={cn("container-kb", sectionY)}>
        <h2 id="start-h" className="text-h2">
          <Marked text={h.title} mark={h.mark} />
        </h2>
        <ol className="mt-6 grid gap-6 sm:mt-10 md:grid-cols-3 md:gap-8">
          {h.steps.map((st, i) => (
            <li key={st.title} className="flex gap-4 md:block">
              <YellowNumber n={i + 1} className="size-9 shrink-0 text-small" />
              <div className="md:mt-4">
                <h3 className="text-title">
                  <WithWhatsAppMark text={st.title} />
                </h3>
                <p className="mt-1 text-body text-text-2">{st.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ---------- 7. For your kind of business ---------- */

const chipCls =
  "press inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface-1 px-4 text-small font-semibold hover:border-text-1";

function ForYourBusiness() {
  const t = HOME2_TRADES;
  return (
    <section aria-labelledby="trades-h">
      <div className={cn("container-kb", sectionY)}>
        <h2 id="trades-h" className="text-h2">
          <Marked text={t.title} mark={t.mark} />
        </h2>
        <p className="mt-4 max-w-[40rem] text-body text-text-2 sm:text-lead">{t.line}</p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {t.chips.map((c) => (
            <li key={c.slug}>
              <SiteLink to={`/for/${c.slug}`} className={chipCls}>
                {c.label}
              </SiteLink>
            </li>
          ))}
          <li>
            <SiteLink to="/for" className={cn(chipCls, "gap-1.5 border-text-1")}>
              {t.all}
              <D9Arrow />
            </SiteLink>
          </li>
        </ul>
      </div>
    </section>
  );
}

/* ---------- Pricing preview (the launch price line only while launch places remain) ---------- */

/** Industries 2: an industry page puts the headline's key phrase on the yellow bar. */
export function PricingPreview({ marked = true }: { marked?: boolean } = {}) {
  const left = useFoundingLeft();
  return (
    <section aria-labelledby="plans-h" className="border-t border-line">
      <div className={cn("container-kb", sectionY)}>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <div>
            <h2 id="plans-h" className="text-h2">
              {marked ? (
                <>
                  Two plans. <Highlight>The work comes first.</Highlight>
                </>
              ) : (
                "Two plans. The work comes first."
              )}
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
            Launch price {PLANS.map((p) => `$${p.foundingMonthly}`).join(" and ")} for the first 30
            paying businesses.{" "}
            <span data-qa-mask className="font-normal text-text-2">
              {foundingPlacesLine(left)}
            </span>
          </p>
        )}
        <p className="mt-2 text-small text-text-2">
          Prices in US dollars, plus tax where it applies. Nothing to pay today.
        </p>
      </div>
    </section>
  );
}

/* ---------- 9. Five questions (Home 2) ---------- */

function Home2Questions() {
  return (
    <section aria-labelledby="faq-h" className="border-t border-line">
      <div className={cn("container-kb grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16", sectionY)}>
        <h2 id="faq-h" className="text-h2">
          <Marked text="Questions owners ask" mark="owners ask" />
        </h2>
        <Faq items={[...HOME2_FAQ]} />
      </div>
    </section>
  );
}

/**
 * Everything below Home's hero and four jobs (Polish 4 part D): its own chunk, loaded after the page paints
 * (d9-home.tsx). Home 2 (lane R R-158 item 4, docs/site4/home.md): the four jobs, the problem in owner words, what Kabsi does in four
 * blocks, you stay in control with a sample weekly report, how it starts, your kind of business, the plans, five
 * questions and the free check again.
 */
export function D9HomeLowerSections() {
  return (
    <>
      <JobsStrip />
      <Problem />
      <WhatKabsiDoes />
      <ControlAndReport />
      <HowItStarts />
      <ForYourBusiness />
      <PricingPreview />
      <Home2Questions />
      <Closing />
    </>
  );
}
