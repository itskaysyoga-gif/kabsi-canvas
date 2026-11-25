// Industries 2 (master plan 30.32): every industry page on one Design 9 template, as finished as Home, and /for as one
// flat, alphabetical list (Rashid: no categories). The template only lays out; every line about the trade is in its own
// content file (src/content/industries), so no two pages read the same (tests/website-industry.test.ts). Every business,
// person and number is an Example. Yellow: the key phrase of each light headline on the bar (Highlight), the label pills,
// the numbered markers and the main action; on the charcoal band the headline's second sentence is yellow text.
import { useMemo, useState } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOT_AFFILIATED } from "@/lib/site";
import { industriesAtoZ, type Industry } from "@/content/industries";
import { BLUEPRINT, READ } from "@/content/industries/blueprint";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { Band, Head, Lead, MarkRow } from "@/components/marketing/kit";
import { HERO_MARKS, HOME_FAQ } from "@/components/marketing/v31-data";
import { PriceCard, TrustLines } from "@/components/marketing/v31";
import { Img } from "./photos";
import { PubImg } from "@/components/marketing/life";
import { ProductScreens } from "@/components/marketing/screens-section";
import { TRADE_TILES } from "@/components/marketing/public-photos";
import { TRADE_WIDE } from "@/components/marketing/industry-photos";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import { Marked } from "./highlight";
import { YellowLabel, YellowNumber } from "./d9-hero";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";
/** Design 9's section rhythm (as Home). */
const sectionY = "py-12 sm:py-18 lg:py-24";

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

/** The line under the free check box (blueprint 3.1 section 3). */
export const FREE_CHECK_NOTE = "Free check. No card. 20 seconds.";

/** The three benefits, the same on every page (blueprint 3.1 section 2). */
const BENEFITS = [
  {
    title: "Every review answered",
    text: "A reply written in your voice for every review, and an alert the moment a bad one arrives.",
  },
  {
    title: "Your listing protected",
    text: "Hours, phone, website and booking link checked every day. One tap to fix what changed.",
  },
  {
    title: "Proof of the work",
    text: "A short summary every week and a full report every month.",
  },
] as const;

const TRUST = [
  "No Google password.",
  "Nothing is published without your yes.",
  "Kabsi never contacts your customers.",
  NOT_AFFILIATED,
] as const;

/* ---------- One trade: the one template (SITE-2, blueprint 3.1 section 5) ---------- */

/**
 * Every industry page is this page. Only three things change: the headline noun (`industry.name`), the example review
 * with Kabsi's reply, and one sourced fact (src/content/industries/blueprint.ts).
 */
export function IndustryPage({ industry: i }: { industry: Industry }) {
  const b = BLUEPRINT[i.slug];
  const h1 = `Your ${i.name} on Google. Taken care of.`;
  // SITE-3 (R-164 item 7): the page is built from the same sections as Home and Pricing (marketing/kit.tsx). The H1 is
  // the only yellow bar; the example review sits beside the hero on a computer, so no section leaves half the width empty.
  return (
    <>
      <section
        aria-labelledby="hero-title"
        data-hero
        className="relative isolate z-10 bg-surface-0"
      >
        <div className="container-kb grid gap-10 pt-6 pb-14 md:pt-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16 lg:pt-14 lg:pb-20">
          <div className="max-w-[40rem]">
            <Breadcrumb current={i.plural} />
            <h1 id="hero-title" className="mt-4 text-display text-balance">
              <Marked text={h1} mark="Taken care of." />
            </h1>
            <Lead className="mt-4 sm:mt-5">
              Kabsi answers your reviews, protects your listing and keeps your profile fresh. You
              approve and make changes from WhatsApp or email.
            </Lead>
            <div className="relative z-10 mt-6 max-w-[34rem] sm:mt-8">
              <ScanBox
                id="hero-scan"
                keyword={i.keyword}
                keywordHint={false}
                industry={i.slug}
                note={FREE_CHECK_NOTE}
              />
              <MarkRow items={HERO_MARKS} className="mt-4" />
            </div>
          </div>
          {b && (
            <figure aria-labelledby="review-h" data-nora-avoid>
              {/* SITE-4: a real photo of the trade, with the example review card over its lower edge. */}
              <div className="overflow-hidden rounded-panel bg-surface-3 shadow-lift">
                {TRADE_WIDE[i.slug] ? (
                  <PubImg
                    photo={TRADE_WIDE[i.slug]!}
                    sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 100vw"
                    priority
                    className="aspect-[3/2] w-full object-cover"
                  />
                ) : (
                  <Img
                    photo={i.photos[0]}
                    sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 100vw"
                    priority
                    style={{ objectPosition: i.focus ?? "50% 50%" }}
                    className="aspect-[3/2] w-full object-cover"
                  />
                )}
              </div>
              <div className="relative mx-3 -mt-16 rounded-panel border border-line bg-surface-1 p-4 shadow-float sm:mx-6 sm:-mt-20 sm:p-6">
                <h2 id="review-h" className="text-small font-bold text-text-2">
                  {`A review at ${i.example.business}, and the reply Kabsi writes`}
                </h2>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-small font-bold">{`${b.review.name}, ${b.review.stars} stars`}</p>
                  <ExampleBadge />
                </div>
                <p className="mt-2 text-read">{b.review.text}</p>
                <div className="mt-4 rounded-inner bg-surface-2 p-3 sm:p-4">
                  <div className="flex items-start gap-2">
                    <KabsiMark ring={false} className="mt-0.5 size-7 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-label font-semibold text-text-2">Kabsi's reply, ready</p>
                      <p className="mt-1 text-read">{b.reply}</p>
                      <div className="mt-3 grid grid-cols-2 gap-2" aria-hidden>
                        <span className="grid min-h-10 place-items-center rounded-pill bg-kb-ink px-2 text-center text-label font-bold text-kb-white">
                          Approve
                        </span>
                        <span className="grid min-h-10 place-items-center rounded-pill border border-line-strong bg-surface-0 px-2 text-center text-label font-bold">
                          Change it
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <figcaption className="mt-3 text-small text-text-2">
                Kabsi writes the reply from the facts you gave it. It waits for your yes before
                anything reaches Google.
              </figcaption>
            </figure>
          )}
        </div>
      </section>

      <Band id="benefits" tone="soft">
        <Head id="benefits" title="What Kabsi does without being asked." />
        <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
          {BENEFITS.map((x, n) => (
            <li key={x.title} className="flex gap-4 md:block">
              <YellowNumber n={n + 1} />
              <div className="md:mt-4">
                <h3 className="text-h3">{x.title}</h3>
                <p className="mt-2 text-read text-text-2">{x.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </Band>

      <ProductScreens only={["report", "email"]} />

      {b && (
        <Band
          id="fact"
          tone="soft"
          inner="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
        >
          <Head id="fact" title={`One thing Google says about ${i.plural.toLowerCase()}.`} />
          <div className="mt-6 lg:mt-0">
            <p className="max-w-[60ch] text-lead text-text-1">{b.fact.text}</p>
            <p className="mt-4 max-w-[60ch] text-read text-text-2">
              {"Source: "}
              <a href={b.fact.source.url} rel="noreferrer" className="underline underline-offset-4">
                {b.fact.source.title}
              </a>
              {`, read on ${READ}.`}
            </p>
          </div>
        </Band>
      )}

      <Band id="price" tone="ivory">
        <Head id="price" title="One price." />
        {/* The price card of Home and Pricing: TRIAL_LINE beside the button, the included list, the not included line. */}
        <PriceCard className="mt-8" />
      </Band>

      <Band id="trust" tone="soft" inner="py-10 sm:py-14 lg:py-16">
        <h2 id="trust-h" className="text-title text-text-2">
          What to know first
        </h2>
        <TrustLines />
        <SiteLink to="/for" className={cn(linkCls, "mt-6 text-read")}>
          See every business
          <Arrow />
        </SiteLink>
      </Band>

      <Band id="questions" tone="ivory">
        <Head id="questions" title="Questions." />
        <Faq items={HOME_FAQ.map((f) => ({ q: f.q, a: f.a }))} className="mt-8" />
      </Band>

      <Band id="closing" tone="dark">
        <div className="mx-auto max-w-[44rem] text-center">
          <h2 id="closing-h" className="text-h2 text-balance">
            Check your business, free.
          </h2>
          <ScanBox
            id="closing-scan"
            keyword={i.keyword}
            keywordHint={false}
            industry={i.slug}
            className="mt-8 text-start"
            note={FREE_CHECK_NOTE}
          />
        </div>
      </Band>
    </>
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
      className="press kb-lift group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-0 shadow-rest"
    >
      <span className="relative block aspect-[3/2] overflow-hidden bg-surface-3">
        {TRADE_WIDE[i.slug] ? (
          <PubImg
            photo={TRADE_WIDE[i.slug]!}
            sizes={sizes}
            decorative
            priority={priority}
            className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <Img
            photo={i.photos[0]}
            sizes={sizes}
            decorative
            priority={priority}
            style={{ objectPosition: i.focus ?? "50% 50%" }}
            className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        )}
      </span>
      <span className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="text-body font-bold sm:text-title">{i.plural}</span>
        {line && <span className="mt-1 text-body text-text-2">{i.page.card}</span>}
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
const COLLAGE = ["hair-salon", "restaurant", "barbershop", "auto-repair"] as const;
/** SITE-4: the trade's new 4:5 photo, where it has one. */
const tileOf = (slug: string) => TRADE_TILES.find((t) => t.slug === slug)?.photo;

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
            {tileOf(i.slug) ? (
              <PubImg
                photo={tileOf(i.slug)!}
                sizes="(min-width: 1024px) 15rem, 45vw"
                priority={n < 2}
                className="aspect-[4/3] w-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100 lg:aspect-[4/5]"
              />
            ) : (
              <Img
                photo={i.photos[0]}
                sizes="(min-width: 1024px) 15rem, 45vw"
                priority={n < 2}
                style={{ objectPosition: i.focus ?? "50% 50%" }}
                className="aspect-[4/3] w-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100 lg:aspect-[4/5]"
              />
            )}
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
            <Lead className="mt-4 sm:mt-5">{FOR_HERO.line}</Lead>
            <div className="relative z-10 mt-5 sm:mt-7">
              <ScanBox id="hero-scan" note={FREE_CHECK_NOTE} />
            </div>
          </div>
          <ForCollage all={all} />
        </div>
      </section>
      <section aria-labelledby="list-h" className="border-t border-line bg-surface-1">
        <div className={cn("container-kb", sectionY)}>
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <h2 id="list-h" className="text-h2 text-balance">
              Pick your business.
            </h2>
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
      <Band id="any" tone="dark">
        <div className="mx-auto max-w-[44rem] text-center">
          <h2 id="any-h" className="text-h2 text-balance">
            Not on the list?
          </h2>
          <Lead className="mx-auto mt-4">
            Kabsi works for any local business with a Google profile.
          </Lead>
          <ScanBox id="closing-scan" className="mt-8 text-start" note={FREE_CHECK_NOTE} />
        </div>
      </Band>
    </>
  );
}
