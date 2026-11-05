// Industries 2 (master plan 30.32): every industry page on one Design 9 template, as finished as Home, and /for as one
// flat, alphabetical list (Rashid: no categories). The template only lays out; every line about the trade is in its own
// content file (src/content/industries), so no two pages read the same (tests/website-industry.test.ts). Every business,
// person and number is an Example. Yellow: the key phrase of each light headline on the bar (Highlight), the label pills,
// the numbered markers and the main action; on the charcoal band the headline's second sentence is yellow text.
import { useMemo, useState, type ReactNode } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_CTA } from "@/lib/site";
import { industriesAtoZ, type Industry } from "@/content/industries";
import { GUIDE_TITLES } from "@/lib/guide-titles";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { Img } from "./photos";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import { Closing } from "./closing";
import { Marked } from "./highlight";
import { PictureButtons, StepsLine, YellowLabel, YellowNumber } from "./d9-hero";
import { AiAnswer, NearbyMap, PhotoToPost, PricingPreview } from "./d9-home-lower";

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

/* ---------- One trade ---------- */

export function IndustryPage({
  industry: i,
  related,
  guides: published = [],
}: {
  industry: Industry;
  related: Industry[];
  /** Guides 3: the public guides that name this page, decided on the server (links both ways). */
  guides?: { slug: string; title: string }[];
}) {
  const p = i.page;
  const guides = [
    ...new Map(
      [
        ...(i.guides ?? [])
          .filter((s) => GUIDE_TITLES[s])
          .map((s) => ({ slug: s, title: GUIDE_TITLES[s]! })),
        ...published,
      ].map((g) => [g.slug, g]),
    ).values(),
  ].slice(0, 2);
  return (
    <>
      <TradeHero industry={i} />
      <StepsLine id="tsteps-h" />
      <Watch industry={i} />
      <PhotoToPost example={{ photo: i.photos[1], owner: p.post.owner, quote: p.post.quote }} />
      <Jobs industry={i} />
      <ShowUp industry={i} />
      <Reading industry={i} />
      <PricingPreview marked />
      {i.faqs && (
        <section aria-labelledby="tfaq-h" className="border-t border-line">
          <div
            className={cn("container-kb grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16", sectionY)}
          >
            <Headline id="tfaq-h" text={`Questions ${i.name} owners ask`} mark="Questions" />
            <Faq items={i.faqs} />
          </div>
        </section>
      )}
      <ReadNext guides={guides} related={related} />
      <Closing keyword={i.keyword} industry={i.slug} marked />
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
            <ScanBox id="hero-scan" keyword={i.keyword} industry={i.slug} />
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
            text={`What Kabsi watches for a ${i.name}`}
            mark="watches"
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
                <p className="text-label font-semibold text-text-2">What Google shows</p>
                <p className="mt-2 text-label text-text-2">{w.what}</p>
                <p className="font-display text-title font-bold break-words sm:text-h3">
                  {w.google}
                </p>
              </div>
              <div className="rounded-inner border-2 border-text-1 p-3 sm:p-4">
                <p className="text-label font-semibold text-text-2">What you told Kabsi</p>
                <p className="mt-2 text-label text-text-2">{w.what}</p>
                <p className="font-display text-title font-bold break-words sm:text-h3">
                  {w.owner}
                </p>
              </div>
            </div>
            <div className="mt-3 rounded-inner wa-ground p-3">
              <div className="flex items-start gap-2">
                <KabsiMark ring={false} className="mt-0.5 size-7" />
                <div className="min-w-0 flex-1">
                  <div className="rounded-bubble rounded-ss-none bg-wa-in px-2.5 py-1.5 text-chat text-wa-ink shadow-bubble">
                    {w.message}
                    <span className="mt-0.5 block text-end text-chat-meta text-wa-time-out">
                      08:02
                    </span>
                  </div>
                  <div className="-ms-1.5">
                    <PictureButtons labels={["Keep my information", "Google is right"]} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <figcaption className="sr-only">
            {`Example: for an invented ${i.name}, Google shows ${w.what.toLowerCase()} as ${w.google}, the owner told Kabsi ${w.owner}, and Kabsi asks on WhatsApp with Keep my information and Google is right. Nothing changes without the owner's yes.`}
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
          text="Google jobs that come back."
          mark="come back."
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

/** Where you show up: the trade's nearby line and AI answer, both Examples. */
function ShowUp({ industry: i }: { industry: Industry }) {
  const p = i.page;
  return (
    <section aria-labelledby="tshow-h">
      <div className={cn("container-kb", sectionY)}>
        <div className="max-w-[40rem]">
          <Headline id="tshow-h" text="Where you show up" mark="show up" />
          <p className="mt-3 text-body text-text-2">
            Two checks Kabsi runs, shown as they are. No score.
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-2 lg:gap-6">
          <NearbyMap example={p.nearby} />
          <AiAnswer example={p.ai} />
        </div>
      </div>
    </section>
  );
}

/** The long reading blocks (30.29 item 2, B-014: exempt from the section rule): searches, then the owner's guide. */
function Reading({ industry: i }: { industry: Industry }) {
  const d = i.d8;
  return (
    <>
      <section aria-labelledby="search-h" className="border-t border-line bg-surface-1">
        <div className={cn("container-kb grid gap-10 lg:grid-cols-2 lg:gap-16", sectionY)}>
          <div>
            <Headline id="search-h" text="What people search for" mark="search for" />
            <p className="measure mt-4 text-body sm:text-lead">{i.page.answer}</p>
            {d && <p className="measure mt-4 text-body text-text-2">{d.searchText}</p>}
          </div>
          <div>
            <ul className="flex flex-wrap gap-2" aria-label="Searches like these">
              {i.searches.map((s) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface-0 px-4 py-2 text-small font-semibold"
                >
                  <Search className="size-4 text-text-3" aria-hidden />
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-small text-text-2">
              Searches like these. On Pro, Kabsi shows the words people searched on Google to find
              you.
            </p>
            <SiteLink to="/scan" className={cn(linkCls, "mt-3 text-body")}>
              {MAIN_CTA}
              <Arrow />
            </SiteLink>
          </div>
        </div>
      </section>
      <section aria-labelledby="guide-h" className="border-t border-line">
        <div className={cn("container-kb", sectionY)}>
          <Headline
            id="guide-h"
            text={`Your Google profile, as a ${i.name} owner`}
            mark="Your Google profile"
          />
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            {guideBlocks(i).map((b) => (
              <article key={b.title}>
                <h3 className="text-h3">{b.title}</h3>
                <div className="measure mt-4 space-y-4 text-body text-text-2">{b.body}</div>
              </article>
            ))}
          </div>
          <p className="mt-8 flex flex-wrap gap-x-6 text-body">
            <SiteLink to="/how-it-works" className={linkCls}>
              See how it works
              <Arrow />
            </SiteLink>
            <SiteLink to="/pricing" className={linkCls}>
              See the plans
              <Arrow />
            </SiteLink>
          </p>
        </div>
      </section>
    </>
  );
}

/** The owner's guide: the trade's two written sections, or its Content 1 sections (each line has its claim sheet row). */
function guideBlocks(i: Industry): { title: string; body: ReactNode }[] {
  if (i.d8)
    return i.d8.guide.map((g) => ({
      title: g.title,
      body: g.paras.map((p) => <p key={p.slice(0, 32)}>{p}</p>),
    }));
  const blocks: { title: string; body: ReactNode }[] = [];
  if (i.tasks?.length)
    blocks.push({
      title: `The Google work of a ${i.name}`,
      body: (
        <ul className="space-y-4">
          {i.tasks.map((t) => (
            <li key={t.title}>
              <h4 className="text-title text-text-1">{t.title}</h4>
              <p className="mt-1">{t.text}</p>
            </li>
          ))}
        </ul>
      ),
    });
  if (i.reviewThemes)
    blocks.push({
      title: "What customers write about",
      body: (
        <ul className="space-y-4">
          {i.reviewThemes.map((r) => (
            <li key={r.theme}>
              <h4 className="text-title text-text-1">{r.theme}</h4>
              <p className="mt-1">{r.text}</p>
            </li>
          ))}
        </ul>
      ),
    });
  if (i.categories)
    blocks.push({
      title: "Google categories that fit",
      body: (
        <>
          <p>
            <span className="font-bold text-text-1">First category:</span> {i.categories.primary}
          </p>
          {i.categories.more.length > 0 && (
            <p>
              <span className="font-bold text-text-1">Also:</span> {i.categories.more.join(", ")}
            </p>
          )}
          <p>{i.categories.note}</p>
        </>
      ),
    });
  if (i.holidays)
    blocks.push({
      title: "Holidays and busy dates",
      body: (
        <dl className="space-y-4">
          {i.holidays.map((h) => (
            <div key={h.when}>
              <dt className="text-title text-text-1">{h.when}</dt>
              <dd className="mt-1">{h.text}</dd>
            </div>
          ))}
        </dl>
      ),
    });
  if (i.photoTips || i.posts)
    blocks.push({
      title: "Photos and posts",
      body: (
        <>
          {i.photoTips && (
            <ul className="space-y-4">
              {i.photoTips.map((p) => (
                <li key={p.title}>
                  <h4 className="text-title text-text-1">{p.title}</h4>
                  <p className="mt-1">{p.text}</p>
                </li>
              ))}
            </ul>
          )}
          {i.posts && (
            <>
              <h4 className="text-title text-text-1">Post ideas</h4>
              <ul className="list-disc space-y-1 ps-5">
                {i.posts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ),
    });
  return blocks;
}

/** Two related guides and two related trades. */
function ReadNext({
  guides,
  related,
}: {
  guides: { slug: string; title: string }[];
  related: Industry[];
}) {
  if (!guides.length && !related.length) return null;
  return (
    <section aria-labelledby="tnext-h" className="border-t border-line bg-surface-1">
      <div className={cn("container-kb grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16", sectionY)}>
        <div>
          <Headline id="tnext-h" text="Read next." mark="next." />
          {guides.length > 0 && (
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {guides.map((g) => (
                <li key={g.slug}>
                  <SiteLink
                    to={`/guides/${g.slug}`}
                    className="press flex min-h-14 items-center justify-between gap-3 py-3 text-body font-semibold hover:underline"
                  >
                    {g.title}
                    <Arrow />
                  </SiteLink>
                </li>
              ))}
            </ul>
          )}
        </div>
        {related.length > 0 && (
          <div>
            <h3 className="text-title">Businesses like yours</h3>
            <ul className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
              {related.map((r) => (
                <li key={r.slug}>
                  <TradeCard industry={r} sizes="(min-width: 1024px) 18rem, 45vw" />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

/** One trade as a photo card: the wide photo, its name and one line. */
function TradeCard({
  industry: i,
  sizes,
  priority,
}: {
  industry: Industry;
  sizes: string;
  priority?: boolean;
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
        <span className="mt-1 text-small text-text-2">{i.page.card}</span>
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
        <div className="container-kb pt-6 pb-10 md:pt-10 lg:pt-14 lg:pb-14">
          <div className="max-w-[40rem]">
            <h1 id="hero-title" className="text-display text-balance">
              <Marked text={FOR_HERO.h1} mark={FOR_HERO.mark} />
            </h1>
            <p className="mt-4 text-lead text-text-2 sm:mt-5">{FOR_HERO.line}</p>
            <div className="relative z-10 mt-5 sm:mt-7">
              <ScanBox id="hero-scan" />
            </div>
          </div>
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
          <ul
            id="for-list"
            className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
          >
            {all.map((i, n) => (
              <li key={i.slug} hidden={!shown.includes(i)}>
                <TradeCard
                  industry={i}
                  sizes="(min-width: 1024px) 18rem, (min-width: 768px) 30vw, 45vw"
                  priority={n < 2}
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
      <section aria-labelledby="any-h">
        <div className={cn("container-kb", sectionY)}>
          <div className="mx-auto max-w-[44rem]">
            <h2 id="any-h" className="text-h2 text-balance">
              <Marked text="Not on the list?" mark="the list?" />
            </h2>
            <p className="mt-3 text-lead text-text-2">
              Kabsi works for any local business with a Google profile.
            </p>
            <ScanBox id="closing-scan" className="mt-6" />
          </div>
        </div>
      </section>
    </>
  );
}
