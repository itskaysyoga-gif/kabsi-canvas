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
import { TRADE_WORK } from "@/content/industries/trade-work";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { Band, Head, Lead, MarkRow } from "@/components/marketing/kit";
import { HERO_MARKS, HOME_FAQ } from "@/components/marketing/v31-data";
import { PriceCard, TrustLines } from "@/components/marketing/v31";
import { Img, PHOTOS } from "./photos";
import { PubImg } from "@/components/marketing/life";
import { HERO_LIBRARY, TRADE_SECOND, TRADE_WIDE } from "@/components/marketing/industry-photos";
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
            {/* SITE-7: "Taken care of." stays on one line, so the bar never splits into two blocks. */}
            <h1
              id="hero-title"
              className="mt-4 text-display text-balance [&_.d9-mark]:whitespace-nowrap"
            >
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
                {HERO_LIBRARY[i.slug] === undefined && TRADE_WIDE[i.slug] ? (
                  <PubImg
                    photo={TRADE_WIDE[i.slug]!}
                    sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 100vw"
                    priority
                    className="aspect-[3/2] w-full object-cover"
                  />
                ) : (
                  <Img
                    photo={i.photos[HERO_LIBRARY[i.slug] ?? 0]!}
                    sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 100vw"
                    priority
                    style={{ objectPosition: i.focus ?? "50% 50%" }}
                    className="aspect-[3/2] w-full object-cover"
                  />
                )}
              </div>
              <div className="relative mx-3 -mt-16 rounded-panel border border-line bg-surface-1 p-4 shadow-float sm:mx-6 sm:-mt-20 sm:p-6 lg:-mt-10">
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

      <TradeWorkBand industry={i} />

      <PhotoPost industry={i} />

      {b && (
        <Band id="fact" tone="warm" inner="py-12 sm:py-16 lg:py-20">
          {/* SITE-4: the sourced fact as a quiet note, not a full headline over one sentence. */}
          <div className="mx-auto max-w-[52rem] border-s-4 border-kb-yellow ps-5 sm:ps-7">
            <h2 id="fact-h" className="text-title text-text-2">
              From Google's own help pages
            </h2>
            <p className="mt-3 text-h3 text-text-1">{b.fact.text}</p>
            <p className="mt-4 text-read text-text-2">
              {"Source: "}
              <a href={b.fact.source.url} rel="noreferrer" className="underline underline-offset-4">
                {b.fact.source.title}
              </a>
              {`, read on ${READ_US}.`}
            </p>
          </div>
        </Band>
      )}

      <Band id="price" tone="ivory" inner="pt-10 pb-8 sm:pt-12 sm:pb-10 lg:pt-16 lg:pb-12">
        <Head id="price" title="One price." />
        {/* The price card of Home and Pricing: TRIAL_LINE beside the button, the included list, the not included line. */}
        <PriceCard className="mt-8" />
        {/* SITE-5: what to know first sits under the price, not on a band of its own. */}
        <TrustLines />
      </Band>

      <Band id="questions" tone="ivory" inner="pt-8 sm:pt-10 lg:pt-12">
        <Head id="questions" title="Questions." />
        {/* SITE-5: three questions of this trade first, then three that every owner asks. */}
        <Faq
          items={[...(TRADE_WORK[i.slug]?.faq ?? []), ...GENERAL_FAQ].map((f) => ({
            q: f.q,
            a: f.a,
          }))}
          className="mt-8"
        />
        <SiteLink to="/for" className={cn(linkCls, "mt-8 text-read")}>
          See every business
          <Arrow />
        </SiteLink>
      </Band>

      <Band id="closing" tone="dark">
        <div className="mx-auto max-w-[44rem] text-center">
          <h2 id="closing-h" className="text-h2 text-balance">
            Start with a free check.
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

/** SITE-5: the questions every owner asks, after the trade's own three (Do I have to do anything, customers, password). */
const GENERAL_FAQ = [HOME_FAQ[1]!, HOME_FAQ[3]!, HOME_FAQ[4]!];

/**
 * SITE-5 (lane R decision 2): "What Kabsi does for a <trade>": three examples true for this trade, beside Kabsi's own
 * Home screen for the trade's Example business (SITE-6: public/screens/trade-<slug>-560.webp, scripts/site-screens.mjs
 * --trades), with the same hours, post and reply waiting for a yes.
 */
function TradeWorkBand({ industry: i }: { industry: Industry }) {
  const w = TRADE_WORK[i.slug];
  if (!w) return null;
  return (
    <Band
      id="trade"
      tone="ivory"
      inner="lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16"
    >
      <div>
        <Head id="trade" title={`What Kabsi does for a ${i.name}.`} />
        <ol className="mt-8 grid gap-6 sm:gap-8">
          {w.does.map((x, n) => (
            <li key={x.title} className="flex gap-4">
              <YellowNumber n={n + 1} />
              <div>
                <h3 className="text-h3">{x.title}</h3>
                <p className="mt-1.5 max-w-[56ch] text-read text-text-2">{x.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <figure className="mx-auto mt-10 w-full max-w-[18rem] lg:mt-0 lg:max-w-[18rem]">
        <div className="kb-shot lg:max-w-[18rem]">
          <img
            src={`/screens/trade-${i.slug}-560.webp`}
            alt={`Kabsi's Home screen for ${i.example.business}, an example business: ${w.hours}, this week's post and a review reply, each waiting for a yes`}
            width={560}
            height={1212}
            loading="lazy"
            decoding="async"
          />
          <ExampleBadge />
        </div>
        <figcaption className="mt-3 text-center text-small text-balance text-text-2">
          {`${i.example.business} this week: new hours, a post and a reply, each waiting for one tap.`}
        </figcaption>
      </figure>
    </Band>
  );
}

/** The date the facts were read, as a US reader writes it (November 24, 2026). */
const READ_US = new Date(`${READ}T12:00:00Z`).toLocaleDateString("en-US", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const POST_STEPS = [
  "You send a photo from your phone.",
  "Kabsi writes the post for it.",
  "You tap yes. It goes live on Google.",
] as const;

/**
 * SITE-4: "Send a photo. Get a Google post." on the charcoal band, with the trade's own second photo and an Example post
 * card over it. Every word is the same on every page apart from the example business.
 */
/** SITE-5: a library photo that fits the trade's Example post better than its second photo (cooks for a special). */
const POST_LIBRARY: Record<string, (typeof PHOTOS)[keyof typeof PHOTOS]> = {
  restaurant: PHOTOS.restaurantCooks,
};

function PhotoPost({ industry: i }: { industry: Industry }) {
  return (
    <Band
      id="post"
      tone="dark"
      inner="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16"
    >
      <div>
        <h2 id="post-h" className="max-w-[22ch] text-h2 text-balance">
          Send a photo. <span className="text-phrase">Get a Google post.</span>
        </h2>
        <p className="mt-4 max-w-[52ch] text-read text-text-2">
          Take a photo at work and send it to Kabsi with a few words. Kabsi writes the post and
          waits for your yes.
        </p>
        <ol className="mt-8 grid gap-5">
          {POST_STEPS.map((t, n) => (
            <li key={t} className="flex items-center gap-4 text-read text-text-1">
              <YellowNumber n={n + 1} />
              {t}
            </li>
          ))}
        </ol>
      </div>
      <figure className="relative mt-10 lg:mt-0">
        {TRADE_SECOND[i.slug] ? (
          <PubImg
            photo={TRADE_SECOND[i.slug]!}
            sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, 100vw"
            className="aspect-[4/5] w-full rounded-panel object-cover shadow-float sm:aspect-[4/3]"
          />
        ) : (
          <Img
            photo={POST_LIBRARY[i.slug] ?? i.photos[1]}
            sizes="(min-width: 1280px) 560px, (min-width: 1024px) 45vw, 100vw"
            className="aspect-[4/5] w-full rounded-panel object-cover shadow-float sm:aspect-[4/3]"
          />
        )}
        <figcaption className="theme-light relative mx-3 -mt-20 max-w-[24rem] rounded-panel border border-line bg-surface-1 p-4 text-text-1 shadow-float sm:mx-6 sm:p-5">
          <span className="flex items-center gap-2">
            <KabsiMark ring={false} className="size-7" />
            <span className="flex-1 text-small font-bold">Post ready</span>
            <ExampleBadge className="text-text-2" />
          </span>
          <span className="mt-2 block text-read">
            {TRADE_WORK[i.slug]?.post ??
              `A new photo from this week at ${i.example.business}. Book your next visit with us.`}
          </span>
          <span className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-pill bg-ok-soft px-3 text-label font-bold text-ok">
            <Check className="size-3.5" aria-hidden />
            Live on Google after your yes
          </span>
        </figcaption>
      </figure>
    </Band>
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

/** SITE-7: a card photo other than the trade's first photo, where the first does not read as the trade at card size. */
const CARD_LIBRARY: Record<string, (typeof PHOTOS)[keyof typeof PHOTOS]> = {
  restaurant: PHOTOS.restaurantDining,
  "nail-salon": PHOTOS.nailTechnician,
  "spa-and-massage": PHOTOS.spaFacial,
};

/** One trade as a photo card: the wide photo, its name and one line. */
function TradeCard({
  industry: i,
  sizes,
  priority,
  line = true,
  row = false,
}: {
  industry: Industry;
  sizes: string;
  priority?: boolean;
  /** SITE-6: on a phone the /for cards are one column, the photo beside the words. */
  row?: boolean;
  /** Industry 1 (R-144): the related cards on an industry page show the name only; /for shows the line. */
  line?: boolean;
}) {
  return (
    <SiteLink
      to={`/for/${i.slug}`}
      className={cn(
        "press kb-lift group flex h-full overflow-hidden rounded-card border border-line bg-surface-0 shadow-rest",
        row ? "min-h-24 flex-row sm:flex-col" : "flex-col",
      )}
    >
      <span
        className={cn(
          "relative block overflow-hidden bg-surface-3",
          row ? "w-28 shrink-0 sm:aspect-[3/2] sm:w-auto" : "aspect-[3/2]",
        )}
      >
        {TRADE_WIDE[i.slug] && !CARD_LIBRARY[i.slug] ? (
          <PubImg
            photo={TRADE_WIDE[i.slug]!}
            sizes={sizes}
            decorative
            priority={priority}
            className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        ) : (
          <Img
            photo={CARD_LIBRARY[i.slug] ?? i.photos[0]}
            sizes={sizes}
            decorative
            priority={priority}
            style={{ objectPosition: CARD_LIBRARY[i.slug] ? "50% 50%" : (i.focus ?? "50% 50%") }}
            className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
          />
        )}
      </span>
      <span className="flex flex-1 flex-col p-3 sm:p-4">
        <span className="font-display text-body font-semibold sm:text-title">{i.plural}</span>
        {line && <span className="mt-1 text-small text-text-2 sm:text-body">{i.page.card}</span>}
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

function ForCollage({ all }: { all: Industry[] }) {
  const picks = COLLAGE.map((s) => all.find((i) => i.slug === s)).filter((i): i is Industry => !!i);
  return (
    <ul className="grid grid-cols-2 gap-3 pb-6 sm:gap-4">
      {picks.map((i, n) => (
        <li key={i.slug} className={cn(n % 2 === 1 && "sm:translate-y-6")}>
          <SiteLink
            to={`/for/${i.slug}`}
            className="press group relative block overflow-hidden rounded-panel bg-surface-3 shadow-float"
          >
            {/* SITE-6: never the photo the card below shows for the same trade (the card takes TRADE_WIDE, else
                the trade's first photo), so the collage and the list do not repeat each other. */}
            <Img
              photo={TRADE_WIDE[i.slug] ? i.photos[0] : i.photos[1]}
              sizes="(min-width: 1024px) 15rem, 45vw"
              priority={n < 2}
              style={{ objectPosition: TRADE_WIDE[i.slug] ? (i.focus ?? "50% 50%") : "50% 40%" }}
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
            <Lead className="mt-4 sm:mt-5">{FOR_HERO.line}</Lead>
            <div className="relative z-10 mt-5 sm:mt-7">
              <ScanBox id="hero-scan" note={FREE_CHECK_NOTE} />
            </div>
          </div>
          <ForCollage all={all} />
        </div>
      </section>
      <section aria-labelledby="list-h" className="border-t border-line bg-tint-soft">
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
                  className="h-11 w-full rounded-full border border-line bg-surface-1 ps-9 pe-4 text-body shadow-rest placeholder:text-text-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                />
              </div>
            </div>
          </div>
          <p className="sr-only" aria-live="polite">
            {q ? `${shown.length} of ${all.length} kinds of business shown.` : ""}
          </p>
          {/* Industries 3: 4 columns from 1024 px, 2 below (no 3 column step); a filtered count that does not fill
              its last row centres it (the no-lone-card rule, 30.33 item 2). SITE-6: 22 kinds fill 11 rows of 2 on a
              phone, so the "Any other local business" card is gone (the band under the list says it). */}
          <ul id="for-list" className="mt-8 flex flex-wrap justify-center gap-3 sm:gap-4">
            {all.map((i) => (
              <li
                key={i.slug}
                hidden={!shown.includes(i)}
                className="w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]"
              >
                <TradeCard
                  industry={i}
                  sizes="(min-width: 1024px) 18rem, (min-width: 640px) 45vw, 8rem"
                  row
                />
              </li>
            ))}
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
