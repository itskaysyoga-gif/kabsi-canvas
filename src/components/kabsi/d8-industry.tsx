// The Businesses hub and the industry pages on Design 8 (Web 4c, lane R's approval of 1 Nov 2026). One layout; each
// trade brings its own hero photo and message, its own five jobs, searches, free check example, owner guide, questions
// and related trades (src/content/industries), so no two pages read the same. The four Design 8 trades carry `d8`; the
// other finished pages lay out their Content 1 text (each line has its row in docs/claims) on the same template.
// Example businesses only. The free check example shows only what the check reads from Google's public data (K-82).
import type { ReactNode } from "react";
import { ArrowRight, CircleAlert, CircleCheck, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { MAIN_CTA } from "@/lib/site";
import {
  HUBS,
  INDUSTRIES,
  hubIndexed,
  industriesIn,
  industryIndexed,
  industry as industryBySlug,
  type ChatLine,
  type Hub,
  type Industry,
  type TradeCard,
} from "@/content/industries";
import { GUIDE_TITLES } from "@/lib/guide-titles";
import { ExampleBadge, Faq, KabsiMark } from "./ui";
import { Img } from "./photos";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import { PageHero, popCls, stagger } from "./page-hero";
import { PhotoToPost } from "./d9-home-lower";
import { Closing, Control } from "./closing";
import { HUB_HERO } from "./hero-lines";
import { Bubble, CLOCK } from "./whatsapp";

const linkCls =
  "press inline-flex min-h-11 items-center gap-1.5 font-semibold text-text-1 underline decoration-text-3 decoration-1 underline-offset-4 hover:decoration-text-1";

function Arrow() {
  return <ArrowRight className="size-4 rtl:-scale-x-100" aria-hidden />;
}

/** The four trades written for Design 8, in the order of the header's Businesses menu. */
export const D8_TRADE_ORDER = ["hair-salon", "barbershop", "nail-salon", "restaurant"] as const;
const d8Trades = () =>
  D8_TRADE_ORDER.map((s) => industryBySlug(s)).filter((i): i is Industry => !!i?.finished);

/** What the free check reads, for a page with no Example result of its own. */
const CHECK_READS = [
  "Your opening hours",
  "Your reviews and your rating",
  "Your photos, website and phone",
  "Your Google category",
];
const ONCE_CONNECTED = "Replies, holiday hours and posts are what Kabsi checks once connected.";

/** The hero message: the trade's own, or the first Kabsi line of its story. */
function cardOf(i: Industry): TradeCard | null {
  if (i.d8) return i.d8.card;
  const first = i.story?.lines.find((l) => l.from === "kabsi");
  return first
    ? { label: "Message", text: first.text, buttons: first.buttons ?? [], time: CLOCK }
    : null;
}

/** Two related finished trades: the page's own pick, else others from the same group, else the Design 8 four. */
function relatedOf(i: Industry): Industry[] {
  const own = (i.d8?.related ?? []).map((s) => industryBySlug(s)).filter(Boolean) as Industry[];
  if (own.length) return own.filter(industryIndexed).slice(0, 2);
  const pool = [...industriesIn(i.hub), ...d8Trades()].filter(
    (r) => industryIndexed(r) && r.slug !== i.slug,
  );
  return [...new Map(pool.map((r) => [r.slug, r])).values()].slice(0, 2);
}

/* ---------- One trade ---------- */

export function IndustryPage({ industry: i }: { industry: Industry }) {
  const d = i.d8;
  const card = cardOf(i);
  const business = d?.business ?? `${i.example.business}, ${i.example.city}`;
  const related = relatedOf(i);
  const guides = (i.guides ?? [])
    .filter((s) => GUIDE_TITLES[s])
    .map((s) => ({ slug: s, title: GUIDE_TITLES[s]! }));
  return (
    <>
      <PageHero
        hero={{ title: `Your ${i.name} on Google. Taken care of.`, line: i.lead }}
        eyebrow={
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <SiteLink
                  to="/"
                  className="-mx-1 -my-3.5 inline-block px-1 py-3.5 underline underline-offset-4"
                >
                  Home
                </SiteLink>
              </li>
              <li aria-hidden>/</li>
              <li>
                <SiteLink
                  to="/for"
                  className="-mx-1 -my-3.5 inline-block px-1 py-3.5 underline underline-offset-4"
                >
                  Businesses
                </SiteLink>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page">{i.plural}</li>
            </ol>
          </nav>
        }
        under={null}
        action={<ScanBox id="hero-scan" keyword={i.keyword} industry={i.slug} />}
        visual={<TradeVisual industry={i} card={card} business={business} />}
      />
      {/* Design 9 (Web 5 part D): the hair salon page carries the photo story under the hero. */}
      {i.slug === "hair-salon" && <PhotoToPost />}

      <section aria-labelledby="tjobs-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <h2 id="tjobs-h" className="text-h2">
              {d?.jobsTitle ?? "Google jobs that come back."}
            </h2>
            {i.photos[1] && (
              <div className="relative mt-8 hidden aspect-[4/3] overflow-hidden rounded-panel sm:block">
                <Img
                  photo={i.photos[1]}
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="absolute inset-0 size-full object-cover"
                />
              </div>
            )}
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {i.tasks.map((j, n) => (
              <li key={j.title} className="flex gap-4 py-5">
                <span className="w-6 shrink-0 font-display text-title font-bold text-text-2">
                  {n + 1}
                </span>
                <div>
                  <h3 className="text-title">{j.title}</h3>
                  <p className="mt-1 text-body text-text-2">{j.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {!d && i.story && (
        <section aria-labelledby="tstory-h" className="border-t border-line">
          <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-16">
            <div>
              <h2 id="tstory-h" className="text-h2">
                {i.story.title}
              </h2>
              <p className="mt-4 text-lead text-text-2">{i.story.lead}</p>
            </div>
            <StoryCard lines={i.story.lines} />
          </div>
        </section>
      )}

      <section aria-labelledby="search-h" className="border-t border-line">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 id="search-h" className="text-h2">
              What people search for
            </h2>
            {d && <p className="mt-4 text-lead text-text-2">{d.searchText}</p>}
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Searches like these">
              {i.searches.map((s) => (
                <li
                  key={s}
                  className="inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-small font-semibold"
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
          </div>
          <div className="rounded-panel border border-line bg-surface-1 p-5 shadow-rest sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-h3">What the free check shows for a {i.name}</h2>
              {d && <ExampleBadge className="shrink-0" />}
            </div>
            {d ? (
              <>
                <p className="mt-2 text-small text-text-2">{d.checkText}</p>
                <ul className="mt-4 divide-y divide-line">
                  {d.check.map((c) => (
                    <li key={c.label} className="py-2 text-small">
                      <div className="flex min-h-8 items-center gap-3">
                        {c.tone === "ok" ? (
                          <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
                        ) : (
                          <CircleAlert className="size-4 shrink-0 text-warn" aria-hidden />
                        )}
                        <span className="flex-1">{c.label}</span>
                        <span className="text-end font-semibold">{c.value}</span>
                      </div>
                      {/* Polish 2: every problem leads to a next step Kabsi can do today. */}
                      {c.next && <p className="mt-1 ps-7 text-text-2">{c.next}</p>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul className="mt-4 divide-y divide-line">
                {CHECK_READS.map((c) => (
                  <li key={c} className="flex min-h-12 items-center gap-3 py-2 text-small">
                    <CircleCheck className="size-4 shrink-0 text-ok" aria-hidden />
                    {c}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-small text-text-2">{ONCE_CONNECTED}</p>
            <SiteLink to="/scan" className={cn(linkCls, "mt-3 text-body")}>
              {MAIN_CTA}
              <Arrow />
            </SiteLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="guide-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="guide-h" className="text-h2">
            Your Google profile, as a {i.name} owner
          </h2>
          {d ? (
            <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
              {d.guide.map((g) => (
                <article key={g.title}>
                  <h3 className="text-h3">{g.title}</h3>
                  {g.paras.map((p) => (
                    <p key={p.slice(0, 32)} className="measure mt-4 text-body text-text-2">
                      {p}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          ) : (
            <ContentGuide industry={i} />
          )}
          <p className="mt-8 flex flex-wrap gap-x-6 text-body">
            <SiteLink to="/how-it-works" className={linkCls}>
              See how it works
              <Arrow />
            </SiteLink>
            <SiteLink to="/pricing" className={linkCls}>
              See the plans
              <Arrow />
            </SiteLink>
            {guides.map((g) => (
              <SiteLink key={g.slug} to={`/guides/${g.slug}`} className={linkCls}>
                {g.title}
                <Arrow />
              </SiteLink>
            ))}
          </p>
        </div>
      </section>

      <Control />

      {i.faqs && (
        <section aria-labelledby="tfaq-h" className="border-t border-line">
          <div className="container-kb section-y grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <h2 id="tfaq-h" className="text-h2">
              Questions from {i.name} owners
            </h2>
            <Faq items={i.faqs} />
          </div>
        </section>
      )}

      <section aria-labelledby="related-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 id="related-h" className="text-h2">
              Related trades
            </h2>
            <SiteLink to="/for" className={cn(linkCls, "text-body")}>
              Every kind of business
              <Arrow />
            </SiteLink>
          </div>
          <ul className="mt-6 grid grid-cols-2 gap-3 lg:max-w-[40rem] lg:gap-4">
            {related.map((r) => (
              <li key={r.slug}>
                <PhotoCard
                  industry={r}
                  sizes="(min-width: 1024px) 20rem, 50vw"
                  ratio="aspect-[4/3]"
                />
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Closing keyword={i.keyword} industry={i.slug} />
    </>
  );
}

/** A finished page's Content 1 sections, in Design 8's guide band. Each line has its row in the page's claim sheet. */
function ContentGuide({ industry: i }: { industry: Industry }) {
  const blocks: { title: string; body: ReactNode }[] = [];
  if (i.reviewThemes)
    blocks.push({
      title: "What customers write about",
      body: (
        <ul className="space-y-4">
          {i.reviewThemes.map((r) => (
            <li key={r.theme}>
              <h4 className="text-title">{r.theme}</h4>
              <p className="mt-1 text-body text-text-2">{r.text}</p>
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
          <p className="text-body">
            <span className="font-bold">First category:</span> {i.categories.primary}
          </p>
          {i.categories.more.length > 0 && (
            <p className="mt-2 text-body text-text-2">
              <span className="font-bold text-text-1">Also:</span> {i.categories.more.join(", ")}
            </p>
          )}
          <p className="mt-3 text-body text-text-2">{i.categories.note}</p>
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
              <dt className="text-title">{h.when}</dt>
              <dd className="mt-1 text-body text-text-2">{h.text}</dd>
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
                  <h4 className="text-title">{p.title}</h4>
                  <p className="mt-1 text-body text-text-2">{p.text}</p>
                </li>
              ))}
            </ul>
          )}
          {i.posts && (
            <>
              <h4 className={cn("text-title", i.photoTips && "mt-6")}>Post ideas</h4>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-body text-text-2">
                {i.posts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </>
          )}
        </>
      ),
    });
  return (
    <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
      {blocks.map((b) => (
        <article key={b.title}>
          <h3 className="text-h3">{b.title}</h3>
          <div className="measure mt-4">{b.body}</div>
        </article>
      ))}
    </div>
  );
}

/** The trade's own photo with the one Kabsi message most typical of its week (Example). */
function TradeVisual({
  industry: i,
  card,
  business,
}: {
  industry: Industry;
  card: TradeCard | null;
  business: string;
}) {
  return (
    <figure className="relative pb-16 sm:pb-10">
      <div className="relative aspect-[4/5] overflow-hidden rounded-panel bg-surface-3 sm:aspect-[5/6]">
        <Img
          photo={i.photos[0]}
          sizes="(min-width: 1024px) 30rem, 100vw"
          priority
          decorative
          style={{ objectPosition: i.focus ?? "50% 50%" }}
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      {card && (
        <div
          className={cn(
            "absolute inset-x-4 bottom-0 rounded-card bg-wa-in p-3.5 text-wa-ink shadow-float sm:start-auto sm:-end-4 sm:w-[19rem]",
            popCls,
          )}
          style={stagger(0, 500)}
        >
          <div className="flex items-center gap-2">
            <KabsiMark ring={false} className="size-7" />
            <p className="min-w-0 flex-1 truncate text-chat font-bold">Kabsi, for {business}</p>
            <span className="text-chat-meta text-wa-time">{card.time}</span>
          </div>
          <p className="mt-2 text-chat-meta font-bold tracking-wide text-wa-time uppercase">
            {card.label} <span className="font-semibold normal-case">Example</span>
          </p>
          <p className="mt-1 text-chat">
            {card.text}
            {card.quote && <span className="mt-0.5 block italic">'{card.quote}'</span>}
          </p>
          {card.buttons.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-1" aria-hidden>
              {card.buttons.slice(0, 3).map((b) => (
                <span
                  key={b}
                  className="grid h-8 place-items-center rounded-bubble border border-wa-divider text-chat font-semibold text-wa-link"
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <figcaption className="sr-only">
        {`${i.photos[0].alt}.${card ? ` An Example message from Kabsi to an invented ${i.name}: ${card.text}${card.quote ? ` '${card.quote}'` : ""}` : ""}`}
      </figcaption>
    </figure>
  );
}

function StoryCard({ lines }: { lines: ChatLine[] }) {
  return (
    <div className="overflow-hidden rounded-panel border border-line bg-surface-1 shadow-lift">
      <div className="flex items-center gap-3 border-b border-wa-divider bg-wa-header px-4 py-3 text-wa-ink">
        <KabsiMark ring={false} className="size-9" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-small font-bold">Kabsi</p>
          <p className="text-label text-wa-time-out">On WhatsApp</p>
        </div>
        <ExampleBadge />
      </div>
      <div className="wa-ground space-y-2 px-1 py-4">
        {lines.map((l, n) =>
          l.from === "owner" ? (
            <Bubble key={n} out read time={CLOCK} enter={false}>
              {l.text}
            </Bubble>
          ) : (
            <Bubble key={n} enter={false} buttons={l.buttons}>
              {l.text}
            </Bubble>
          ),
        )}
      </div>
      <p className="border-t border-line px-4 py-3 text-label text-text-3">
        A sample conversation. Every business here is an example.
      </p>
    </div>
  );
}

/** A finished page as a photo card (industry cards only with a photo, lane R decision 4). */
function PhotoCard({
  industry: i,
  sizes,
  ratio,
  priority,
}: {
  industry: Industry;
  sizes: string;
  ratio: string;
  priority?: boolean;
}) {
  return (
    <SiteLink
      to={`/for/${i.slug}`}
      className={cn("press group relative block overflow-hidden rounded-card bg-surface-3", ratio)}
    >
      <Img
        photo={i.photos[0]}
        sizes={sizes}
        decorative
        priority={priority}
        style={{ objectPosition: i.focus ?? "50% 50%" }}
        className="absolute inset-0 size-full object-cover transition-transform duration-400 ease-kb group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,transparent_45%,rgb(0_0_0/0.78))]"
      />
      <span className="absolute inset-x-3 bottom-3 text-title font-bold text-kb-white">
        {i.plural}
      </span>
    </SiteLink>
  );
}

/* ---------- /for: the Businesses hub ---------- */

export function AllBusinesses() {
  const four = d8Trades();
  // Go live 1 (B-013): a page that is noindex and out of the sitemap (no claim sheet yet) is not linked either.
  const more = INDUSTRIES.filter(
    (i) => industryIndexed(i) && !(D8_TRADE_ORDER as readonly string[]).includes(i.slug),
  );
  const groups = HUBS.filter((h) => hubIndexed(h.id));
  return (
    <>
      <PageHero
        hero={HUB_HERO}
        visual={
          <ul className="grid grid-cols-2 gap-3" aria-label="Pages by trade">
            {four.map((t, n) => (
              <li key={t.slug} className={popCls} style={stagger(n, 150, 120)}>
                <PhotoCard
                  industry={t}
                  sizes="(min-width: 1024px) 15rem, 45vw"
                  ratio="aspect-[4/5]"
                  priority={n < 2}
                />
              </li>
            ))}
          </ul>
        }
      />

      <section aria-labelledby="trades-h" className="border-t border-line bg-surface-1">
        <div className="container-kb section-y">
          <h2 id="trades-h" className="text-h2">
            Four trades, four different weeks
          </h2>
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {four.map((t) => (
              <li key={t.slug} className="grid gap-4 py-6 sm:grid-cols-[10rem_1fr] sm:gap-8">
                <div className="relative aspect-[4/3] overflow-hidden rounded-card sm:aspect-square">
                  <Img
                    photo={t.photos[0]}
                    sizes="(min-width: 640px) 10rem, 100vw"
                    decorative
                    style={{ objectPosition: t.focus ?? "50% 50%" }}
                    className="absolute inset-0 size-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-h3">{t.plural}</h3>
                  <p className="mt-2 text-body text-text-2">{t.lead}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {t.tasks.slice(0, 3).map((j) => (
                      <li
                        key={j.title}
                        className="rounded-full border border-line-strong px-3 py-1 text-small"
                      >
                        {j.title}
                      </li>
                    ))}
                  </ul>
                  <SiteLink to={`/for/${t.slug}`} className={cn(linkCls, "mt-2 text-body")}>
                    The Google work for {t.plural.toLowerCase()}
                    <Arrow />
                  </SiteLink>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="more-h" className="border-t border-line">
        <div className="container-kb section-y">
          <h2 id="more-h" className="text-h2">
            More kinds of business
          </h2>
          <p className="mt-3 max-w-[40rem] text-body text-text-2">
            Kabsi works for any business with a verified Google profile that customers visit, or
            that travels to them.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {more.map((m) => (
              <li key={m.slug}>
                <PhotoCard
                  industry={m}
                  sizes="(min-width: 1024px) 18rem, 45vw"
                  ratio="aspect-[4/3]"
                />
              </li>
            ))}
          </ul>
          {groups.length > 0 && (
            <>
              <h3 className="mt-12 text-h3">By kind of business</h3>
              <ul className="mt-4 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((h) => (
                  <li key={h.id} className="border-b border-line">
                    <SiteLink
                      to={`/for/${h.id}`}
                      className="press flex min-h-13 items-center justify-between gap-3 text-body font-semibold hover:underline"
                    >
                      {h.name}
                      <Arrow />
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>
      <Closing />
    </>
  );
}

/* ---------- /for/<group> ---------- */

export function HubPage({ hub: h }: { hub: Hub }) {
  const list = industriesIn(h.id).filter(industryIndexed);
  return (
    <>
      <PageHero
        hero={{ title: `${h.name}.`, line: h.lead }}
        eyebrow={
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <SiteLink
                  to="/"
                  className="-mx-1 -my-3.5 inline-block px-1 py-3.5 underline underline-offset-4"
                >
                  Home
                </SiteLink>
              </li>
              <li aria-hidden>/</li>
              <li>
                <SiteLink
                  to="/for"
                  className="-mx-1 -my-3.5 inline-block px-1 py-3.5 underline underline-offset-4"
                >
                  Businesses
                </SiteLink>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page">{h.name}</li>
            </ol>
          </nav>
        }
        visual={
          list.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3" aria-label="Pages in this group">
              {list.slice(0, 4).map((t, n) => (
                <li key={t.slug} className={popCls} style={stagger(n, 150, 120)}>
                  <PhotoCard
                    industry={t}
                    sizes="(min-width: 1024px) 15rem, 45vw"
                    ratio="aspect-[4/5]"
                    priority={n < 2}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <span
              aria-hidden
              className="grid aspect-[4/3] place-items-center rounded-panel bg-surface-2"
            >
              <KabsiMark className="size-16" />
            </span>
          )
        }
      />
      {(list.length > 4 || h.coming.length > 0) && (
        <section aria-labelledby="group-more-h" className="border-t border-line bg-surface-1">
          <div className="container-kb section-y">
            <h2 id="group-more-h" className="text-h2">
              {list.length > 4 ? `More ${h.name.toLowerCase()}` : "Pages on the way"}
            </h2>
            {list.length > 4 && (
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {list.slice(4).map((m) => (
                  <li key={m.slug}>
                    <PhotoCard
                      industry={m}
                      sizes="(min-width: 1024px) 18rem, 45vw"
                      ratio="aspect-[16/10]"
                    />
                  </li>
                ))}
              </ul>
            )}
            {h.coming.length > 0 && (
              <>
                {list.length > 4 && <h3 className="mt-10 text-h3">Pages on the way</h3>}
                <ul className="mt-4 flex flex-wrap gap-2">
                  {h.coming.map((c) => (
                    <li
                      key={c}
                      className="rounded-full border border-line px-4 py-2 text-small text-text-2"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 max-w-[38rem] text-body text-text-2">
                  Kabsi works for any business with a Google profile. Start with the free check.
                </p>
              </>
            )}
          </div>
        </section>
      )}
      <Closing />
    </>
  );
}
