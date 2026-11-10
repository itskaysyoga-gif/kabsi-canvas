// Home on Design 9 (Web 5 part B, master plan 30.24), below the first screen (Polish 4 part D: the hero is in
// d9-home.tsx, which loads this file after the page paints). Site 3a (master plan 30.50 item 10, R-150) put it in this
// order: one familiar problem (the profile watch), three steps, one WhatsApp demonstration in the Look 2 style, what
// Kabsi handles in four groups, you stay in control with a sample weekly report, the plans, four questions and the
// closing free check. Every business is an Example. CSS only: nothing moves on load. PhotoToPost, NearbyMap and
// AiAnswer stay here for the industry pages.
import { Check, CircleCheck, KeyRound, Star, Store, ThumbsUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TRIAL_LINE } from "@/lib/site";
import { ExampleBadge, Faq, KabsiMark, WithWhatsAppMark } from "./ui";
import { Img, PHOTOS, type Photo } from "./photos";
import { Closing } from "./closing";
import { Highlight, YellowNumber } from "./highlight";
import { SiteLink } from "./site-link";
import { PLANS } from "./plans";
import { useFoundingLeft } from "./founding-price";
import { RankDot } from "./map";
import { BAND_LABEL, type RankBand } from "./map-data";
import { FAQ, HOME_FAQ } from "./faq-data";
import { CONTROL_SHORT } from "./d8-data";
import { D9Arrow, NumberedPoints, PictureButtons, YellowLabel, d9LinkCls } from "./d9-hero";
import { HandlesGroups } from "./handles";
import {
  D9_BUSINESS,
  D9_DEMO,
  D9_MAP_POINTS,
  D9_PHOTO,
  D9_REPORT,
  D9_SHOW_UP,
  D9_THREE_STEPS,
  D9_WATCH,
  type Look2Message,
} from "./d9-data";
import { Marked } from "@/components/kabsi/highlight";

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
            <Marked text={w.title} mark="you choose." />
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
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="What Kabsi checks">
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
}: {
  example?: AiExample | undefined;
  /** Industry 1 (R-144): the assistant and the date as one line ("Asked ChatGPT on [date]", R-143), not three rows. */
  compact?: boolean;
} = {}) {
  const a = { ...D9_SHOW_UP.ai, ...(example ?? {}) };
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

/* ---------- Three steps (Site 3a) ---------- */

function ThreeSteps() {
  return (
    <section aria-labelledby="three-h" className="border-y border-line bg-surface-1">
      <div className={cn("container-kb", sectionY)}>
        <h2 id="three-h" className="text-h2">
          <Marked text="Kabsi works in three steps." mark="three steps." />
        </h2>
        <ol className="mt-6 grid gap-6 sm:mt-10 md:grid-cols-3 md:gap-8">
          {D9_THREE_STEPS.map((st, i) => (
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

/* ---------- The one WhatsApp demonstration, in the Look 2 style (Site 3a) ---------- */

const MARKERS: Record<Look2Message["marker"], LucideIcon> = { review: Star, done: CircleCheck };

/** One WhatsApp message in three blocks: marker and bold title, the facts (quote lines for the review and the draft),
 * then the status or question; the buttons under it, the yes first. A picture: its buttons are not controls. */
function Look2Bubble({ m }: { m: Look2Message }) {
  const Icon = MARKERS[m.marker];
  return (
    <li>
      <div className="relative ms-1.5 max-w-[95%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 pt-1.5 pb-1 text-chat text-wa-ink shadow-bubble">
        <span
          aria-hidden
          className="absolute -start-2 top-0 size-2.5 bg-wa-in [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
        <p className="flex items-center gap-1.5">
          <Icon
            className={cn(
              "size-4 shrink-0",
              m.marker === "review" ? "fill-current text-warn" : "text-kb-green-ink",
            )}
            aria-hidden
          />
          <span>
            <span className="font-bold">{m.title}</span> · {m.business}
          </span>
        </p>
        <div className="mt-2 space-y-0.5">
          {m.facts.map((f) =>
            f.quote ? (
              <p key={f.text} className="border-s-[3px] border-wa-divider ps-2 text-wa-time-out">
                {f.text}
              </p>
            ) : (
              <p key={f.text}>{f.text}</p>
            ),
          )}
        </div>
        <p className="mt-2">{m.status}</p>
        <p className="mt-0.5 text-end text-chat-meta text-wa-time-out">{m.time}</p>
      </div>
      {m.buttons && <PictureButtons labels={m.buttons} />}
    </li>
  );
}

function Look2Demo() {
  const d = D9_DEMO;
  return (
    <section aria-labelledby="demo-h" className="theme-dark bg-band">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <div>
          <YellowLabel>On WhatsApp</YellowLabel>
          <h2 id="demo-h" className="mt-4 text-h2">
            One message. <span className="text-phrase">Your yes. Done.</span>
          </h2>
          <p className="mt-4 max-w-[34rem] text-body text-text-2 sm:text-lead">{d.line}</p>
          <ol className="mt-6 space-y-2 text-small font-semibold" aria-label="Where the reply is">
            {d.states.map((st) => (
              <li key={st} className="flex items-center gap-2">
                <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
                {st}
              </li>
            ))}
          </ol>
        </div>
        <figure className="relative mx-auto w-[18.5rem] sm:w-[20rem] lg:me-0">
          <div className="rounded-[2.4rem] bg-kb-black p-[0.55rem] shadow-float ring-1 ring-line">
            <div className="overflow-hidden rounded-[1.9rem] bg-wa-chat">
              <div className="flex items-center gap-2 border-b border-wa-divider bg-wa-header px-3 pt-4 pb-2 text-wa-ink">
                <KabsiMark ring={false} className="size-8" />
                <p className="min-w-0 flex-1 truncate text-chat font-bold">Kabsi</p>
                <ExampleBadge className="shrink-0 text-wa-ink" />
              </div>
              <ol
                className="space-y-2.5 px-2.5 pt-3 pb-4"
                aria-label="Messages from Kabsi, Example"
              >
                <Look2Bubble m={d.alert} />
                <li className="ms-auto w-fit rounded-bubble rounded-se-none bg-wa-out px-3 py-1.5 text-chat text-wa-ink shadow-bubble">
                  {d.tap}
                </li>
                <Look2Bubble m={d.done} />
              </ol>
            </div>
          </div>
          <figcaption className="sr-only">{d.caption}</figcaption>
        </figure>
      </div>
    </section>
  );
}

/* ---------- You stay in control, with a sample weekly report (Site 3a) ---------- */

const CONTROL_ICONS: LucideIcon[] = [KeyRound, ThumbsUp, Store];

function ControlAndReport() {
  const r = D9_REPORT;
  return (
    <section aria-labelledby="control-h" className="border-t border-line bg-surface-1">
      <div
        className={cn(
          "container-kb grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16",
          sectionY,
        )}
      >
        <div>
          <h2 id="control-h" className="text-h2">
            <Marked text="You stay in control." mark="in control." />
          </h2>
          <ul className="mt-6 space-y-4">
            {CONTROL_SHORT.map((c, i) => {
              const Icon = CONTROL_ICONS[i] ?? Check;
              return (
                <li key={c.title} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-ok" aria-hidden />
                  <div>
                    <h3 className="text-body font-bold">{c.title}</h3>
                    <p className="text-small text-text-2">{c.text}</p>
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
        <figure className="rounded-panel border border-line bg-surface-0 p-5 shadow-lift sm:p-7">
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
            paying businesses.
          </p>
        )}
        <p className="mt-2 text-small text-text-2">
          Prices in US dollars, plus tax where it applies. Nothing to pay today.
        </p>
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
          <Marked text="Questions owners ask" mark="owners ask" />
        </h2>
        <Faq items={HOME_FAQ.map((i) => FAQ[i - 1]!)} />
      </div>
    </section>
  );
}

/**
 * Everything below Home's first screen (Polish 4 part D): its own chunk, loaded after the page paints (d9-home.tsx).
 * Site 3a (master plan 30.50 item 10): one familiar problem, three steps, one WhatsApp demonstration (Example, Look 2),
 * what Kabsi handles in four groups, control with a sample weekly report (Example), the plans, questions, the free check.
 */
export function D9HomeLowerSections() {
  return (
    <>
      <ProfileWatch />
      <ThreeSteps />
      <Look2Demo />
      <HandlesGroups />
      <ControlAndReport />
      <PricingPreview />
      <D9Questions />
      <Closing />
    </>
  );
}
