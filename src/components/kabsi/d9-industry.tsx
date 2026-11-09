// Industries 2 (master plan 30.32): every industry page on one Design 9 template, as finished as Home, and /for as one
// flat, alphabetical list (Rashid: no categories). The template only lays out; every line about the trade is in its own
// content file (src/content/industries), so no two pages read the same (tests/website-industry.test.ts). Every business,
// person and number is an Example. Yellow: the key phrase of each light headline on the bar (Highlight), the label pills,
// the numbered markers and the main action; on the charcoal band the headline's second sentence is yellow text.
import { useMemo, useState } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_CTA, TRIAL_LINE } from "@/lib/site";
import { industriesAtoZ, type Card, type Industry } from "@/content/industries";
import { GuideImage, TopicPill } from "@/components/marketing/guide-photo";
import { guideLook } from "@/content/guides/look";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { Img } from "./photos";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import { Closing } from "./closing";
import { Marked } from "./highlight";
import { YellowLabel, YellowNumber } from "./d9-hero";
import { AiAnswer, PhotoToPost } from "./d9-home-lower";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";
/** Design 9's section rhythm (as Home). */
const sectionY = "py-12 sm:py-18 lg:py-24";
/** "a salon", "an optician": the article that goes before a trade name. */
const withArticle = (name: string) => `${/^[aeiou]/i.test(name) ? "an" : "a"} ${name}`;

function Arrow() {
  return <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
}

/** A light section's headline with its key phrase on the yellow bar, and an optional charcoal-on-yellow label above. */
function Headline({
  id,
  text,
  mark,
  label,
  className,
}: {
  id: string;
  text: string;
  mark: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {label && <YellowLabel className="mb-4">{label}</YellowLabel>}
      <h2 id={id} className="text-h2 text-balance">
        <Marked text={text} mark={mark} />
      </h2>
    </div>
  );
}

/* ---------- One trade ---------- */

export function IndustryPage({
  industry: i,
  related,
  guides = [],
}: {
  industry: Industry;
  related: Industry[];
  /** Industries 3: three public guides chosen by the page's jobs, decided on the server (getIndustryGuides). */
  guides?: ReadGuide[];
}) {
  const p = i.page;
  return (
    <>
      <TradeHero industry={i} />
      <HowItWorks industry={i} />
      <Watch industry={i} />
      <PhotoToPost
        example={{ photo: i.photos[1], owner: p.post.owner, quote: p.post.quote }}
        intro={<PhotoCards industry={i} />}
      />
      <Jobs industry={i} />
      <ShowUp industry={i} />
      <Reading industry={i} />
      <PlanLine industry={i} />
      {i.faqs && (
        <section aria-labelledby="tfaq-h" className="border-t border-line">
          <div
            className={cn("container-kb grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16", sectionY)}
          >
            <Headline id="tfaq-h" text={`Questions ${i.name} owners ask`} mark="Questions" />
            <div>
              <Faq items={i.faqs} />
              {/* Industry 1 (R-144): price, trial, cancelling, approvals and data are answered once, on /faq. */}
              <SiteLink to="/faq" className={cn(linkCls, "mt-4 text-body")}>
                More questions
                <Arrow />
              </SiteLink>
            </div>
          </div>
        </section>
      )}
      <ReadNext guides={guides} related={related} plural={i.plural} />
      <Closing keyword={i.keyword} industry={i.slug} marked />
    </>
  );
}

/**
 * Industry 1 (R-144): How Kabsi works, in three short lines and a link, in place of the five steps every page repeated.
 * The first line names the trade.
 */
function HowItWorks({ industry: i }: { industry: Industry }) {
  const lines = [
    `Kabsi checks your ${i.name}'s Google profile every day.`,
    `It prepares the replies, posts and fixes ${withArticle(i.name)} needs, and asks you on WhatsApp.`,
    `Nothing reaches your ${i.name}'s Google profile until you say yes.`,
  ];
  return (
    <section aria-labelledby="thow-h" className="border-y border-line bg-surface-1">
      <div className="container-kb flex flex-col gap-4 py-7 sm:py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <h2 id="thow-h" className="sr-only">
          {`How Kabsi works for ${withArticle(i.name)}`}
        </h2>
        <ol className="grid gap-3 md:grid-cols-3 md:gap-6">
          {lines.map((t, n) => (
            <li key={t} className="flex items-start gap-3 text-body font-semibold">
              <YellowNumber n={n + 1} className="shrink-0" />
              {t}
            </li>
          ))}
        </ol>
        <SiteLink to="/how-it-works" className={cn(linkCls, "shrink-0 text-body")}>
          See how it works
          <Arrow />
        </SiteLink>
      </div>
    </section>
  );
}

/** The left column of the photo band: the trade's own photos and posts (Industry 1, R-144). */
function PhotoCards({ industry: i }: { industry: Industry }) {
  return (
    <div>
      <YellowLabel>{`For ${i.plural.toLowerCase()}`}</YellowLabel>
      <h2 id="photo-h" className="mt-4 text-h2 text-balance">
        Photos <span className="text-phrase">{`that work for ${withArticle(i.name)}.`}</span>
      </h2>
      <ol className="mt-6 space-y-4">
        {(i.photoCards ?? []).map((c, n) => (
          <li key={c.title} className="flex gap-3">
            <YellowNumber n={n + 1} className="shrink-0" />
            <div>
              <h3 className="text-title">{c.title}</h3>
              <p className="mt-1 text-body text-text-2" data-line>
                {c.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Industry 1 (R-144): the plans in one line and a link, in place of the plan cards. */
function PlanLine({ industry: i }: { industry: Industry }) {
  return (
    <section aria-label="Plans" className="border-t border-line">
      <div className="container-kb flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-8 sm:py-10">
        <p className="text-body">{`Two plans for your ${i.name}, Essentials and Pro. ${TRIAL_LINE}`}</p>
        <SiteLink to="/pricing" className={cn(linkCls, "text-body")}>
          See the plans
          <Arrow />
        </SiteLink>
      </div>
    </section>
  );
}

function Breadcrumb({ current }: { current: string }) {
  const cls = "-mx-1 -my-3.5 inline-block px-1 py-3.5 underline underline-offset-4";
  return (
    <nav aria-label="Breadcrumb" className="text-label font-bold text-text-2">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <SiteLink to="/" className={cls}>
            Home
          </SiteLink>
        </li>
        <li aria-hidden>/</li>
        <li>
          <SiteLink to="/for" className={cls}>
            Businesses
          </SiteLink>
        </li>
        <li aria-hidden>/</li>
        <li aria-current="page">{current}</li>
      </ol>
    </nav>
  );
}

/** The hero: H1 with its phrase on the bar, the line, the free check with the trade's search, and the wide photo. */
function TradeHero({ industry: i }: { industry: Industry }) {
  const p = i.page;
  return (
    <section aria-labelledby="hero-title" data-hero className="relative isolate z-10">
      <div className="container-kb grid gap-6 pt-6 pb-10 sm:gap-8 md:pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:pt-14 lg:pb-16">
        <div className="max-w-[38rem]">
          <Breadcrumb current={i.plural} />
          <h1 id="hero-title" className="mt-4 text-display text-balance">
            <Marked text={p.h1} mark={p.mark} />
          </h1>
          <p className="mt-4 max-w-[34rem] text-lead text-text-2 sm:mt-5">{p.line}</p>
          <div className="relative z-10 mt-5 max-w-[34rem] sm:mt-7">
            <ScanBox id="hero-scan" keyword={i.keyword} industry={i.slug} trialSeparate />
          </div>
        </div>
        <figure className="relative">
          <div className="relative aspect-[3/2] overflow-hidden rounded-panel bg-surface-3">
            <Img
              photo={i.photos[0]}
              sizes="(min-width: 1280px) 37rem, (min-width: 1024px) 46vw, calc(100vw - 2rem)"
              priority
              style={{ objectPosition: i.focus ?? "50% 50%" }}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </figure>
      </div>
    </section>
  );
}

/** "What Kabsi watches for a <trade>": the trade's own details, and one Example where Google shows something else. */
function Watch({ industry: i }: { industry: Industry }) {
  const w = i.page.watch;
  return (
    <section aria-labelledby="watch-h">
      <div
        className={cn("container-kb grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16", sectionY)}
      >
        <div>
          <Headline
            id="watch-h"
            label="Profile watch"
            text={`What Kabsi watches for ${withArticle(i.name)}`}
            mark={`watches for ${withArticle(i.name)}`}
          />
          <p className="mt-4 max-w-[34rem] text-body text-text-2 sm:text-lead">{w.line}</p>
          <ul className="mt-6 flex flex-wrap gap-1.5" aria-label="Details Kabsi checks every day">
            {w.fields.map((d) => (
              <li
                key={d}
                className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5 text-small font-semibold"
              >
                <Check className="size-4 text-ok" aria-hidden />
                {d}
              </li>
            ))}
          </ul>
        </div>
        <figure>
          <div className="rounded-panel border border-line bg-surface-1 p-4 shadow-lift sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-small font-bold">{w.business}</p>
              <ExampleBadge />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="rounded-inner border-2 border-dashed border-line-strong p-3 sm:p-4">
                {/* Industry 1 (R-144): the label and the detail in one line. */}
                <p className="text-label font-semibold text-text-2">{`On Google: ${w.what}`}</p>
                <p className="font-display text-title font-bold break-words sm:text-h3">
                  {w.google}
                </p>
              </div>
              <div className="rounded-inner border-2 border-text-1 p-3 sm:p-4">
                <p className="text-label font-semibold text-text-2">{`You told Kabsi: ${w.what}`}</p>
                <p className="font-display text-title font-bold break-words sm:text-h3">
                  {w.owner}
                </p>
              </div>
            </div>
            {/* The independent check of 5 Nov: Keep my information and Google is right are the choice on kabsi.co (facts 04,
                Google Protection); WhatsApp's Put it back covers hours and website only, so the Example is not a chat. */}
            <div className="mt-3 rounded-inner bg-surface-2 p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <KabsiMark ring={false} className="mt-0.5 size-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-label font-semibold text-text-2">
                    {`${i.example.business}'s Google profile, on kabsi.co`}
                  </p>
                  <p className="mt-1 text-small">{w.message}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden>
                    <span className="grid min-h-10 place-items-center rounded-pill bg-kb-ink px-2 text-center text-label font-bold text-kb-white">
                      Keep my information
                    </span>
                    <span className="grid min-h-10 place-items-center rounded-pill border border-line-strong bg-surface-0 px-2 text-center text-label font-bold">
                      Google is right
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <figcaption className="sr-only">
            {`Example: for an invented ${i.name}, Google shows ${w.what.toLowerCase()} as ${w.google}, the owner told Kabsi ${w.owner}, and Kabsi asks the owner to choose Keep my information or Google is right, so nothing changes without the owner's yes.`}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

/** Three jobs that come back for this trade. */
function Jobs({ industry: i }: { industry: Industry }) {
  return (
    <section aria-labelledby="tjobs-h" className="border-b border-line bg-surface-1">
      <div className={cn("container-kb", sectionY)}>
        <Headline
          id="tjobs-h"
          label={`For ${i.plural.toLowerCase()}`}
          text={`Google jobs that come back for ${withArticle(i.name)}.`}
          mark={`come back for ${withArticle(i.name)}.`}
        />
        <ol className="mt-8 grid gap-6 md:grid-cols-3 md:gap-8">
          {i.page.jobs.map((j, n) => (
            <li key={j.title} className="flex gap-3 md:block">
              <YellowNumber n={n + 1} />
              <div className="md:mt-4">
                <h3 className="text-title">{j.title}</h3>
                <p className="mt-1 text-body text-text-2">{j.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Industry 1 (R-144): where the trade shows up, in one section: the first answer, what people search for and the AI
 * answer Example. The nearby map every page repeated is on Home and How it works.
 */
function ShowUp({ industry: i }: { industry: Industry }) {
  const p = i.page;
  return (
    <section aria-labelledby="tshow-h">
      <div className={cn("container-kb grid gap-8 lg:grid-cols-2 lg:gap-16", sectionY)}>
        <div>
          <Headline
            id="tshow-h"
            text={`How people find ${withArticle(i.name)}`}
            mark={`find ${withArticle(i.name)}`}
          />
          <p className="mt-4 max-w-[34rem] text-body sm:text-lead">{p.answer}</p>
          <Chips items={i.searches} label="Searches like these" icon="search" className="mt-6" />
          <p className="mt-4 text-small text-text-2">
            {`Searches like these for ${withArticle(i.name)}: on Pro, Kabsi shows the words people searched on Google to find you.`}
          </p>
          <SiteLink to="/scan" className={cn(linkCls, "mt-3 text-body")}>
            {MAIN_CTA}
            <Arrow />
          </SiteLink>
        </div>
        <AiAnswer
          example={{
            ...p.ai,
            title: `What AI says about ${i.example.business}.`,
            date: `2 Nov 2026, about ${i.example.business}`,
          }}
          compact
        />
      </div>
    </section>
  );
}

/**
 * Industries 3 (master plan 30.33 item 2): no reading block on a public page. Each group is a headline, at most one line
 * of up to 25 words, then chips or cards with a short title and one line of at most 15 words
 * (tests/industries3.test.ts and the public e2e suite count them). Industry 1 (R-144): each group's headline names the
 * trade, and the posts group is new.
 */
function Reading({ industry: i }: { industry: Industry }) {
  const a = withArticle(i.name);
  return (
    <section aria-labelledby="guide-h" className="border-t border-line bg-surface-1">
      <div className={cn("container-kb space-y-12 sm:space-y-16", sectionY)}>
        <div>
          <Headline
            id="guide-h"
            text={`Your Google profile, as ${a} owner`}
            mark="Your Google profile"
          />
          <CardGrid items={i.profile} className="mt-8" />
        </div>
        <div>
          {i.categories && (
            <>
              <h3 id="tcats-h" className="text-h3">
                {`Google categories for ${a}`}
              </h3>
              <Chips
                items={[i.categories.primary, ...i.categories.more]}
                label={`Google categories, ${i.categories.primary} first`}
                first="First category"
                className="mt-4"
              />
              <p className="mt-4 max-w-[40rem] text-body text-text-2">{i.categories.line}</p>
            </>
          )}
          {/* Industry 1 (R-144): the services the trade lists, as chips. */}
          <h3 id="tservices-h" className={cn("text-h3", i.categories && "mt-10")}>
            {`What ${a} can list`}
          </h3>
          <Chips items={i.services} label="Services" className="mt-4" />
        </div>
        {i.reviews && (
          <CardGroup id="treviews-h" title={`What customers write about ${a}`} items={i.reviews} />
        )}
        {i.posts && <CardGroup id="tposts-h" title={`Posts ${a} can make`} items={i.posts} />}
        {i.holidays && (
          <CardGroup id="tdays-h" title={`Hours and holidays at ${a}`} items={i.holidays} />
        )}
      </div>
    </section>
  );
}

/** Chips: the searches (with a search icon) or the categories (the first one marked). */
function Chips({
  items,
  label,
  icon,
  first,
  className,
}: {
  items: string[];
  label: string;
  icon?: "search";
  first?: string;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label={label}>
      {items.map((s, n) => (
        <li
          key={s}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-small font-semibold",
            first && n === 0 ? "border-text-1 bg-surface-0" : "border-line-strong bg-surface-0",
          )}
        >
          {icon === "search" ? (
            <Search className="size-4 text-text-3" aria-hidden />
          ) : first && n === 0 ? (
            <Check className="size-4 text-ok" aria-hidden />
          ) : null}
          {s}
        </li>
      ))}
    </ul>
  );
}

/**
 * The no-lone-card rule (30.33 item 2): a count that fills its rows gets the columns that divide it, and a count that
 * does not (a filtered /for list) centres its last row, because the rows wrap and are centred.
 */
function gridCols(n: number): string {
  if (n % 4 === 0) return "sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]";
  if (n % 3 === 0) return "md:w-[calc((100%-2rem)/3)]";
  return "sm:w-[calc((100%-1rem)/2)]";
}

function CardGrid({ items, className }: { items: Card[]; className?: string }) {
  const w = gridCols(items.length);
  return (
    <ul className={cn("flex flex-wrap justify-center gap-4", className)} data-cards={items.length}>
      {items.map((c) => (
        <li
          key={c.title}
          className={cn(
            "w-full rounded-card border border-line bg-surface-0 p-4 shadow-rest sm:p-5",
            w,
          )}
        >
          <h4 className="text-title">{c.title}</h4>
          <p className="mt-1 text-body text-text-2" data-line>
            {c.text}
          </p>
        </li>
      ))}
    </ul>
  );
}

function CardGroup({ id, title, items }: { id: string; title: string; items: Card[] }) {
  return (
    <div>
      <h3 id={id} className="text-h3">
        {title}
      </h3>
      <CardGrid items={items} className="mt-4" />
    </div>
  );
}

export type ReadGuide = { slug: string; title: string; topic: string };

/**
 * Read next (30.33 item 2): three guides as photo cards (the guide's photo and group, Style 1), then six
 * related businesses as photo cards, 3 by 2 (2 by 3 on a phone), and "See every business".
 */
function ReadNext({
  guides,
  related,
  plural,
}: {
  guides: ReadGuide[];
  related: Industry[];
  plural: string;
}) {
  if (!guides.length && !related.length) return null;
  return (
    <section aria-labelledby="tnext-h" className="border-t border-line bg-surface-1">
      <div className={cn("container-kb space-y-12 sm:space-y-16", sectionY)}>
        <Headline id="tnext-h" text={`More for ${plural.toLowerCase()}`} mark="More" />
        {guides.length > 0 && (
          <div>
            <h3 className="text-h3">{`Guides for ${plural.toLowerCase()}`}</h3>
            <ul className="mt-4 flex flex-wrap justify-center gap-4" data-cards={guides.length}>
              {guides.map((g) => (
                <li key={g.slug} className={cn("w-full", gridCols(guides.length))}>
                  <SiteLink
                    to={`/guides/${g.slug}`}
                    className="press group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-0 shadow-rest"
                  >
                    <GuideImage
                      slug={g.slug}
                      ratio="3/2"
                      sizes="(min-width: 768px) 24rem, calc(100vw - 2rem)"
                    />
                    <span className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                      <TopicPill>{guideLook(g.slug).group}</TopicPill>
                      <span className="flex items-start justify-between gap-3 text-body font-bold">
                        {g.title}
                        <Arrow />
                      </span>
                    </span>
                  </SiteLink>
                </li>
              ))}
            </ul>
          </div>
        )}
        {related.length > 0 && (
          <div>
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <h3 className="text-h3">{`Businesses like ${plural.toLowerCase()}`}</h3>
              <SiteLink to="/for" className={cn(linkCls, "text-body")}>
                See every business
                <Arrow />
              </SiteLink>
            </div>
            <ul
              className="mt-4 flex flex-wrap justify-center gap-3 sm:gap-4"
              data-cards={related.length}
            >
              {related.map((r) => (
                <li key={r.slug} className={relatedCols(related.length)}>
                  <TradeCard industry={r} sizes="(min-width: 768px) 24rem, 45vw" line={false} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/** Six related businesses: 2 by 3 on a phone, 3 by 2 from 768 px (a count that does not divide centres its last row). */
function relatedCols(n: number) {
  return n % 3 === 0
    ? "w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1rem)/2)] md:w-[calc((100%-2rem)/3)]"
    : "w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1rem)/2)]";
}

/** One trade as a photo card: the wide photo, its name and one line. */
function TradeCard({
  industry: i,
  sizes,
  priority,
  line = true,
}: {
  industry: Industry;
  sizes: string;
  priority?: boolean;
  /** Industry 1 (R-144): the related cards on an industry page show the name only; /for shows the line. */
  line?: boolean;
}) {
  return (
    <SiteLink
      to={`/for/${i.slug}`}
      className="press group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-0 shadow-rest"
    >
      <span className="relative block aspect-[3/2] overflow-hidden bg-surface-3">
        <Img
          photo={i.photos[0]}
          sizes={sizes}
          decorative
          priority={priority}
          style={{ objectPosition: i.focus ?? "50% 50%" }}
          className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
        />
      </span>
      <span className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="text-body font-bold sm:text-title">{i.plural}</span>
        {line && <span className="mt-1 text-small text-text-2">{i.page.card}</span>}
      </span>
    </SiteLink>
  );
}

/* ---------- /for: every kind of business, one list ---------- */

/** Lower case, no accents or punctuation, for the filter. */
const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ");

export const FOR_HERO = {
  h1: "Your kind of business, taken care of.",
  mark: "taken care of.",
  line: "Each kind of local business has its own Google work. Find yours, or start with the free check.",
} as const;

/**
 * Site 2 (master plan 30.34 item 4): the /for hero shows four kinds of business from their own photos, so the page
 * opens with real trades at work. Each photo links to its page; the alt text is the photo's own (docs/PHOTOS.md).
 */
const COLLAGE = ["hair-salon", "restaurant", "dental-clinic", "auto-repair"] as const;

function ForCollage({ all }: { all: Industry[] }) {
  const picks = COLLAGE.map((s) => all.find((i) => i.slug === s)).filter((i): i is Industry => !!i);
  return (
    <ul className="grid grid-cols-2 gap-3 pb-6 sm:gap-4">
      {picks.map((i, n) => (
        <li key={i.slug} className={cn(n % 2 === 1 && "translate-y-6")}>
          <SiteLink
            to={`/for/${i.slug}`}
            className="press group relative block overflow-hidden rounded-panel bg-surface-3 shadow-float"
          >
            <Img
              photo={i.photos[0]}
              sizes="(min-width: 1024px) 15rem, 45vw"
              priority={n < 2}
              style={{ objectPosition: i.focus ?? "50% 50%" }}
              className="aspect-[4/3] w-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100 lg:aspect-[4/5]"
            />
            <span className="absolute start-2 bottom-2 rounded-full bg-surface-0 px-3 py-1 text-label font-semibold text-text-1 shadow-rest">
              {i.plural}
            </span>
          </SiteLink>
        </li>
      ))}
    </ul>
  );
}

export function ForIndex() {
  const all = useMemo(() => industriesAtoZ(), []);
  const [q, setQ] = useState("");
  const words = fold(q).split(/\s+/).filter(Boolean);
  const shown = all.filter((i) => {
    const hay = fold([i.plural, i.name, i.keyword, i.page.query, ...i.searches].join(" "));
    return words.every((w) => hay.includes(w));
  });
  return (
    <>
      <section aria-labelledby="hero-title" data-hero className="relative isolate z-10">
        <div className="container-kb grid gap-8 pt-6 pb-10 md:pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-14 lg:pb-14">
          <div className="max-w-[40rem]">
            <h1 id="hero-title" className="text-display text-balance">
              <Marked text={FOR_HERO.h1} mark={FOR_HERO.mark} />
            </h1>
            <p className="mt-4 text-lead text-text-2 sm:mt-5">{FOR_HERO.line}</p>
            <div className="relative z-10 mt-5 sm:mt-7">
              <ScanBox id="hero-scan" trialSeparate />
            </div>
          </div>
          <ForCollage all={all} />
        </div>
      </section>
      <section aria-labelledby="list-h" className="border-t border-line bg-surface-1">
        <div className={cn("container-kb", sectionY)}>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <Headline
              id="list-h"
              label="Businesses"
              text="Pick your business"
              mark="your business"
            />
            <div className="w-full sm:w-[20rem]">
              <label htmlFor="for-filter" className="text-label font-semibold text-text-2">
                Find your kind of business
              </label>
              <div className="relative mt-1">
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-3"
                  aria-hidden
                />
                <input
                  id="for-filter"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="For example, florist"
                  autoComplete="off"
                  aria-controls="for-list"
                  className="h-12 w-full rounded-input border border-line-strong bg-surface-0 ps-9 pe-3 text-body placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
              </div>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {q ? `${shown.length} of ${all.length} kinds of business shown.` : ""}
          </p>
          {/* Industries 3: 4 columns from 1024 px, 2 below (no 3 column step); a filtered count that does not fill
              its last row centres it (the no-lone-card rule, 30.33 item 2). */}
          <ul id="for-list" className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
            {all.map((i) => (
              <li
                key={i.slug}
                hidden={!shown.includes(i)}
                className="w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
              >
                <TradeCard industry={i} sizes="(min-width: 1024px) 18rem, 45vw" />
              </li>
            ))}
            {/* Site 2 (30.34 item 4): with 21 kinds of business, this card keeps the last row from holding one card
                alone on a phone (22 cards: 11 rows of 2; 5 rows of 4 and a centred row of 2). Hidden while filtering. */}
            <li
              hidden={!!q}
              className="w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
            >
              <SiteLink
                to="/scan"
                className="press theme-dark flex h-full min-h-40 flex-col justify-end rounded-card bg-band p-3 text-text-1 shadow-rest sm:p-4"
              >
                <span className="text-body font-bold sm:text-title">Any other local business</span>
                <span className="mt-1 text-small text-text-2">
                  Kabsi works for any business with a Google profile. Check yours free.
                </span>
              </SiteLink>
            </li>
          </ul>
          {shown.length === 0 && (
            <p className="mt-8 text-body text-text-2">
              No match for '{q.trim()}'. Kabsi works for any local business with a Google profile.
            </p>
          )}
        </div>
      </section>
      <section aria-labelledby="any-h">
        <div className={cn("container-kb", sectionY)}>
          <div className="mx-auto max-w-[44rem]">
            <h2 id="any-h" className="text-h2 text-balance">
              <Marked text="Not on the list?" mark="the list?" />
            </h2>
            <p className="mt-3 text-lead text-text-2">
              Kabsi works for any local business with a Google profile.
            </p>
            <ScanBox id="closing-scan" className="mt-6" trialSeparate />
          </div>
        </div>
      </section>
    </>
  );
}
