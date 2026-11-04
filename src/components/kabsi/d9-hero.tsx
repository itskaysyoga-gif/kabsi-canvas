// Design 9 hero and the steps line (Web 5, master plan 30.24: treatment B). The hero sits at z-10, so the free check's
// suggestion list stays above the steps line that follows (check2-find-business.spec.ts). The H1 is one element of real, selectable
// text, painted at once: no entrance, no letter animation, no layout shift. "Taken care of." sits on the Kabsi-yellow
// bar (the d9-mark utility), once per page, in charcoal; yellow is never text on ivory or white.
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { WHATSAPP_LAUNCH_LINE, WHATSAPP_ON } from "@/lib/site";
import { ExampleBadge, KabsiMark } from "./ui";
import { Img, PHOTOS, type Photo } from "./photos";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import {
  D9_BUSINESS,
  D9_HERO_LINE,
  D9_HERO_STREAM,
  D9_STEPS,
  type D9Message,
  type StepId,
} from "./d9-data";

export const d9LinkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

export function D9Arrow() {
  return <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
}

/** "Your business on Google. Taken care of." becomes its two sentences; a one-sentence title stays whole. */
export function splitTitle(text: string): [string | null, string] {
  const m = text.match(/^(.+?\.)\s+(.+)$/);
  return m ? [m[1]!, m[2]!] : [null, text];
}

/** The inside of the one H1 in treatment B (the caller renders the <h1>, so there is always exactly one). */
export function D9Title({ text }: { text: string }) {
  const [first, second] = splitTitle(text);
  if (!first) return <>{text}</>;
  return (
    <>
      {first} <span className="d9-mark">{second}</span>
    </>
  );
}

/* ---------- Home hero ---------- */

export function D9Hero() {
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate z-10">
      <div className="container-kb grid gap-6 pt-6 pb-10 sm:gap-8 md:pt-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-12 lg:pt-14 lg:pb-20">
        <div className="max-w-[40rem]">
          <h1 id="hero-title" className="text-display text-balance">
            <D9Title text="Your business on Google. Taken care of." />
          </h1>
          <p className="mt-4 max-w-[36rem] text-lead text-text-2 sm:mt-6">{D9_HERO_LINE}</p>
          {!WHATSAPP_ON && (
            <p className="mt-2 text-label text-text-2 sm:text-small">{WHATSAPP_LAUNCH_LINE}</p>
          )}
          {/* relative z-10: the suggestion list opens above the hero phone that follows (Web 4 review). */}
          <div className="relative z-10 mt-5 max-w-[36rem] sm:mt-7">
            <ScanBox id="hero-scan" />
            <SiteLink to="/how-it-works" className={cn(d9LinkCls, "mt-1 text-body sm:mt-2")}>
              See how it works
              <D9Arrow />
            </SiteLink>
          </div>
        </div>
        <HeroPhone />
      </div>
    </section>
  );
}

/** The Example phone over the salon photo (from 768 px). On a phone it shows the first two messages only. */
function HeroPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[30rem] lg:me-0">
      <div
        aria-hidden
        className="absolute inset-y-[6%] start-[22%] end-0 -z-10 hidden overflow-hidden rounded-panel md:block"
      >
        <Img
          photo={PHOTOS.salonTablet}
          sizes="(min-width: 1024px) 28vw, 60vw"
          decorative
          className="absolute inset-0 size-full object-cover object-[60%_50%]"
        />
      </div>
      <D9Phone
        items={D9_HERO_STREAM}
        caption="Example messages from Kabsi to an invented salon: different hours on Google with Use my hours and Keep Google's, a post ready with the owner's photo, and a reply ready for a new review."
        phoneLimit={2}
      />
    </div>
  );
}

/* ---------- The Example phone (WhatsApp style, a picture: its buttons are not controls) ---------- */

export function D9Phone({
  items,
  caption,
  business = D9_BUSINESS,
  photo = PHOTOS.salonStudio,
  phoneLimit,
  children,
  className,
}: {
  items: D9Message[];
  caption: string;
  business?: string;
  photo?: Photo;
  /** Below 640 px show only this many messages, so the first screen stays short. */
  phoneLimit?: number;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn("relative mx-auto w-[18rem] sm:w-[19.5rem] md:ms-0", className)}>
      <div className="rounded-[2.4rem] bg-kb-black p-[0.55rem] shadow-float">
        <div className="overflow-hidden rounded-[1.9rem] bg-wa-chat">
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
              <PhoneBubble
                key={m.id}
                m={m}
                photo={photo}
                className={
                  phoneLimit !== undefined && i >= phoneLimit ? "max-sm:hidden" : undefined
                }
              />
            ))}
            {children}
          </ol>
        </div>
      </div>
      <figcaption className="sr-only">{caption}</figcaption>
    </figure>
  );
}

function PhoneBubble({
  m,
  photo,
  className,
}: {
  m: D9Message;
  photo: Photo;
  className?: string | undefined;
}) {
  return (
    <li className={className}>
      <div className="relative ms-1.5 max-w-[95%] rounded-bubble rounded-ss-none bg-wa-in px-2.5 pt-1.5 pb-1 text-chat text-wa-ink shadow-bubble">
        <span
          aria-hidden
          className="absolute -start-2 top-0 size-2.5 bg-wa-in [clip-path:polygon(0_0,100%_0,100%_100%)]"
        />
        <p className="text-chat-meta font-bold text-wa-time-out">{m.label}</p>
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
        <p className="mt-0.5 text-end text-chat-meta text-wa-time-out">{m.time}</p>
      </div>
      {m.buttons && <PictureButtons labels={m.buttons} />}
    </li>
  );
}

/** WhatsApp reply buttons drawn as a picture: not focusable, hidden from screen readers. */
export function PictureButtons({ labels }: { labels: readonly string[] }) {
  return (
    <div
      className={cn(
        "ms-1.5 mt-1 grid max-w-[95%] gap-1",
        labels.length === 3 ? "grid-cols-3" : "grid-cols-2",
      )}
      aria-hidden
    >
      {labels.map((b) => (
        <span
          key={b}
          className="grid h-8 place-items-center rounded-bubble bg-wa-in px-1 text-center text-chat font-semibold text-wa-link shadow-bubble"
        >
          {b}
        </span>
      ))}
    </div>
  );
}

/* ---------- The whole job, in one line of steps ---------- */

/**
 * The same five steps everywhere they appear. On a phone they read as one sentence with numbered marks; from 768 px
 * each step also has its short line. `on` marks the steps a section is about.
 */
export function StepsLine({
  on,
  withText = true,
  id = "steps-h",
}: {
  on?: readonly StepId[];
  withText?: boolean;
  id?: string;
}) {
  return (
    <section aria-labelledby={id} className="border-y border-line bg-surface-1">
      <div className="container-kb py-7 sm:py-12 lg:py-14">
        <h2 id={id} className="sr-only">
          The whole job: Kabsi checks, prepares, asks you on WhatsApp, follows through, reports.
        </h2>
        <ol className="flex flex-wrap items-baseline gap-x-3 gap-y-2 md:grid md:grid-cols-5 md:gap-x-6">
          {D9_STEPS.map((s, i) => {
            const lit = !on || on.includes(s.id);
            return (
              <li key={s.id} className={cn("relative md:pt-10", !lit && "opacity-55")}>
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-3.5 start-0 hidden h-px bg-line-strong md:block",
                    i === D9_STEPS.length - 1 ? "w-8" : "w-[calc(100%+1.5rem)]",
                  )}
                />
                <span className="inline-flex items-baseline gap-2 md:block">
                  <span
                    aria-hidden
                    className="relative inline-grid size-7 shrink-0 translate-y-[-0.15em] place-items-center rounded-full bg-text-1 text-label font-bold text-surface-0 md:absolute md:top-0 md:translate-y-0"
                  >
                    {i + 1}
                  </span>
                  <span className="font-display text-h3 font-bold tracking-[-0.015em]">
                    {s.word}
                    {i < D9_STEPS.length - 1 ? <span className="md:hidden">,</span> : "."}
                  </span>
                </span>
                {withText && (
                  <p className="mt-1 hidden max-w-[15rem] text-small text-text-2 md:block">
                    {s.text}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

/** A small rail above a section: which of the five steps this part of the job is (screen readers hear the words). */
export function StepRail({ on, className }: { on: readonly StepId[]; className?: string }) {
  const words = D9_STEPS.filter((s) => on.includes(s.id)).map((s) => s.word);
  return (
    <p className={cn("flex items-center gap-3 text-label font-semibold text-text-2", className)}>
      <span aria-hidden className="flex items-center gap-1">
        {D9_STEPS.map((s) => (
          <span
            key={s.id}
            className={cn(
              "h-1.5 rounded-full",
              on.includes(s.id) ? "w-6 bg-text-1" : "w-1.5 bg-line-strong",
            )}
          />
        ))}
      </span>
      <span>
        <span className="sr-only">Steps: </span>
        {words
          .join(", ")
          .replace(/^kabsi /i, "Kabsi ")
          .replace(/^./, (c) => c.toUpperCase())}
      </span>
    </p>
  );
}
