// The industry template (brief section 16, items 2 to 4): /for lists the nine hubs, /for/<hub> lists its industries,
// /for/<industry> lays out one content file (src/content/industries). The page adds headings and shared blocks only;
// every line about the trade comes from its own file. A section with no content in the file does not show.
import {
  ArrowRight,
  ArrowUpRight,
  Camera,
  CalendarDays,
  ChevronDown,
  Check,
  MessageSquareText,
  Search,
  Tag,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SCAN_LINE, TRIAL_LINE } from "@/lib/site";
import {
  HUBS,
  hubOf,
  industriesIn,
  industryCheck,
  INDUSTRIES,
  type ChatLine,
  type Hub,
  type Industry,
} from "@/content/industries";
import { GUIDE_TITLES } from "@/lib/guide-titles";
import { PageTop } from "./d2-parts";
import { PLANS } from "./plans";
import { FoundingBanner } from "./d5-founding";
import { NearbyPlaces } from "./nearby-places";
import { Img } from "./photos";
import { ScanBox } from "./scan-box";
import { SiteLink } from "./site-link";
import { ExampleBadge, Faq, KabsiMark, SectionHead } from "./ui";
import { Bubble, CLOCK } from "./whatsapp";

/** The one yellow phrase of an industry hero (brief section 16, item 2). */
export const YELLOW_PHRASE = "Taken care of.";

/* ---------- Breadcrumbs (and their BreadcrumbList data, in the route's head) ---------- */

export function crumbsFor(i?: Industry, h?: Hub) {
  const c = [{ name: "All businesses", to: "/for" }];
  const theHub = h ?? (i ? hubOf(i) : undefined);
  if (theHub) c.push({ name: theHub.name, to: `/for/${theHub.id}` });
  if (i) c.push({ name: i.plural, to: `/for/${i.slug}` });
  return c;
}

function Crumbs({ items }: { items: { name: string; to: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="container-kb pt-24 lg:pt-28">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-text-2">
        {items.map((c, n) => (
          <li key={c.to} className="flex items-center gap-2">
            {n > 0 && <span aria-hidden>/</span>}
            {n === items.length - 1 ? (
              <span aria-current="page" className="font-semibold text-text-1">
                {c.name}
              </span>
            ) : (
              <SiteLink
                to={c.to}
                className="inline-flex min-h-11 items-center underline-offset-4 hover:underline"
              >
                {c.name}
              </SiteLink>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* ---------- One industry ---------- */

export function IndustryPage({ industry: i }: { industry: Industry }) {
  const check = industryCheck(i.example, i.keyword);
  // Only guides that exist on kabsi.co are linked (a missing one is left out, never a dead link).
  const guides = (i.guides ?? [])
    .filter((s) => GUIDE_TITLES[s])
    .map((s) => ({ slug: s, title: GUIDE_TITLES[s]! }));
  const [hero, second] = [i.photos[0], i.photos[1]];
  return (
    <>
      <Crumbs items={crumbsFor(i)} />
      <section className="container-kb grid items-center gap-10 pt-6 pb-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-20">
        <div>
          <h1 className="text-display">
            Your {i.name} on Google. <span className="text-kb-yellow">{YELLOW_PHRASE}</span>
          </h1>
          <p className="mt-5 max-w-[38rem] text-lead text-text-2">{i.lead}</p>
          <ScanBox keyword={i.keyword} industry={i.slug} className="mt-8" id="industry-scan" />
          <p className="mt-2 text-small text-text-2">{TRIAL_LINE}</p>
        </div>
        <div className="overflow-hidden rounded-panel">
          <Img
            photo={hero}
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>

      <FoundingBanner />

      {i.story && (
        <section
          aria-labelledby="ind-story"
          className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_minmax(0,26rem)] lg:items-center lg:gap-16"
        >
          <SectionHead id="ind-story" title={i.story.title} lead={i.story.lead} />
          <StoryCard lines={i.story.lines} />
        </section>
      )}

      <section
        aria-labelledby="ind-tasks"
        className={cn("theme-light", !i.story && "mt-16 lg:mt-24")}
      >
        <div className="container-kb section-y">
          <SectionHead
            id="ind-tasks"
            title="Five jobs that come back every month"
            lead="Kabsi prepares each one. You reply Yes on WhatsApp."
          />
          <ol className="mt-10 grid gap-x-12 border-t border-line md:grid-cols-2">
            {i.tasks.map((t, n) => (
              <li
                key={t.title}
                className="grid grid-cols-[2.5rem_1fr] gap-3 border-b border-line py-6"
              >
                <span className="font-display text-h3 font-bold text-text-3" aria-hidden>
                  {n + 1}
                </span>
                <div>
                  <h3 className="text-title">{t.title}</h3>
                  <p className="mt-2 text-body text-text-2">{t.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {i.reviewThemes && (
        <section aria-labelledby="ind-reviews" className="border-t border-line">
          <div className="container-kb section-y">
            <IconTitle icon={MessageSquareText} id="ind-reviews" big>
              What customers write about
            </IconTitle>
            <ul className="mt-10 grid gap-x-12 gap-y-8 sm:grid-cols-2">
              {i.reviewThemes.map((r) => (
                <li key={r.theme}>
                  <h3 className="text-title">{r.theme}</h3>
                  <p className="mt-2 text-body text-text-2">{r.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Brief section 17.4: four smaller parts in one fold, open from 1024 px, in the HTML either way. */}
      <MoreFold title={`More for ${i.plural.toLowerCase()}`}>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <IconTitle icon={Search} level="h3">
              What customers search
            </IconTitle>
            <ul className="mt-6 flex flex-wrap gap-2">
              {i.searches.map((s) => (
                <li
                  key={s}
                  className="rounded-full border border-line-strong px-4 py-2 text-small font-semibold"
                >
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-small text-text-3">
              Searches like these. Kabsi checks the ones your customers use in your area.
            </p>
          </div>
          {i.categories && (
            <div>
              <IconTitle icon={Tag} level="h3">
                Google categories that fit
              </IconTitle>
              <p className="mt-6 text-body">
                <span className="font-bold">First category:</span> {i.categories.primary}
              </p>
              {i.categories.more.length > 0 && (
                <p className="mt-2 text-body text-text-2">
                  <span className="font-bold text-text-1">Also:</span>{" "}
                  {i.categories.more.join(", ")}
                </p>
              )}
              <p className="mt-4 text-small text-text-2">{i.categories.note}</p>
            </div>
          )}
        </div>
        {(i.posts || i.photoTips) && (
          <div className="mt-12 grid gap-12 border-t border-line pt-12 lg:grid-cols-2 lg:gap-16">
            {i.posts && (
              <div>
                <IconTitle icon={CalendarDays} level="h3">
                  Post ideas
                </IconTitle>
                <ul className="mt-6 space-y-3">
                  {i.posts.map((p) => (
                    <li key={p} className="flex gap-3 text-body text-text-1">
                      <Check
                        className="mt-1 size-4 shrink-0 text-ok"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {i.photoTips && (
              <div>
                <IconTitle icon={Camera} level="h3">
                  Photos that matter
                </IconTitle>
                <ul className="mt-6 space-y-5">
                  {i.photoTips.map((p) => (
                    <li key={p.title}>
                      <h4 className="text-title">{p.title}</h4>
                      <p className="mt-1 text-body text-text-2">{p.text}</p>
                    </li>
                  ))}
                </ul>
                {second && (
                  <Img
                    photo={second}
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="mt-8 aspect-[16/10] w-full rounded-panel object-cover"
                  />
                )}
              </div>
            )}
          </div>
        )}
        {i.holidays && (
          <div className="mt-12 border-t border-line pt-12">
            <IconTitle icon={CalendarDays} level="h3">
              Holidays and busy dates
            </IconTitle>
            <dl className="mt-6 grid gap-x-12 gap-y-6 sm:grid-cols-2">
              {i.holidays.map((h) => (
                <div key={h.when}>
                  <dt className="text-title">{h.when}</dt>
                  <dd className="mt-1 text-body text-text-2">{h.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </MoreFold>

      <section aria-labelledby="ind-nearby" className="border-t border-line">
        <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_minmax(0,30rem)] lg:gap-16">
          <SectionHead
            id="ind-nearby"
            title="Where you come up nearby"
            lead={`The free check searches '${i.keyword}' from places around you, like a customer standing there. ${SCAN_LINE}`}
          />
          <NearbyPlaces check={check} />
        </div>
      </section>

      <PricingStrip />

      {i.faqs && (
        <section aria-labelledby="ind-faq" className="border-t border-line">
          <div className="container-kb section-y grid gap-10 lg:grid-cols-[1fr_1.6fr]">
            <SectionHead id="ind-faq" title="Questions owners ask" />
            <Faq items={i.faqs} />
          </div>
        </section>
      )}

      <section aria-labelledby="ind-more" className="border-t border-line">
        <div className="container-kb py-10 lg:py-14">
          <h2 id="ind-more" className="text-h3">
            Keep reading
          </h2>
          <ul className="mt-5 grid gap-3 md:grid-cols-2">
            <MoreLink to={`/for/${i.hub}`}>{hubOf(i).name}: every kind of business</MoreLink>
            {guides.map((g) => (
              <MoreLink key={g.slug} to={`/guides/${g.slug}`}>
                {g.title}
              </MoreLink>
            ))}
            <MoreLink to="/scan">The free check</MoreLink>
          </ul>
        </div>
      </section>
    </>
  );
}

/** Pricing in one band (brief section 17.4 asks for pages under 9,000 px at 390). Home and Pricing show the cards. */
function PricingStrip() {
  return (
    <section aria-labelledby="ind-price" className="border-t border-line">
      <div className="container-kb py-12 lg:py-16">
        <h2 id="ind-price" className="text-h3">
          Two plans. The work comes first.
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {PLANS.map((p) => (
            <li key={p.id} className="rounded-card border border-line bg-surface-1 p-5">
              <p className="flex items-baseline justify-between gap-3">
                <span className="text-title">{p.name}</span>
                <span>
                  <span className="font-display text-h3 font-bold">${p.monthly}</span>
                  <span className="ms-1 text-small text-text-2">a month</span>
                </span>
              </p>
              <p className="mt-2 text-small text-text-2">
                {p.work[0]}. {p.work[2]}.
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-small text-text-2">{TRIAL_LINE}</p>
        <SiteLink
          to="/pricing"
          className="mt-2 inline-flex min-h-11 items-center gap-1 text-body font-semibold underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
        >
          Compare the plans
          <ArrowRight className="size-4" aria-hidden />
        </SiteLink>
      </div>
    </section>
  );
}

/** A details fold that starts open on wide screens. Its content is in the HTML either way. */
function MoreFold({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 1024px)").matches) ref.current.open = true;
  }, []);
  return (
    <section className="border-t border-line">
      <details ref={ref} className="group container-kb py-10 lg:py-16">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <h2 className="text-h2">{title}</h2>
          <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong transition-colors duration-150 group-open:bg-text-1 group-open:text-surface-0">
            <ChevronDown
              className="size-5 transition-transform duration-200 ease-kb group-open:rotate-180"
              aria-hidden
            />
          </span>
        </summary>
        <div className="pt-10">{children}</div>
      </details>
    </section>
  );
}

function IconTitle({
  icon: I,
  children,
  id,
  big,
  level: H = "h2",
}: {
  icon: typeof Search;
  children: ReactNode;
  id?: string;
  big?: boolean;
  level?: "h2" | "h3";
}) {
  return (
    <H id={id} className={cn("flex items-center gap-3", big ? "text-h2" : "text-h3")}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line-strong">
        <I className="size-5" aria-hidden />
      </span>
      {children}
    </H>
  );
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <SiteLink
        to={to}
        className="press flex min-h-14 items-center justify-between gap-3 rounded-card border border-line px-5 py-3 text-body font-semibold hover:border-line-strong hover:bg-surface-1"
      >
        {children}
        <ArrowRight className="size-5 shrink-0 text-text-2" aria-hidden />
      </SiteLink>
    </li>
  );
}

/** The trade's own WhatsApp story, drawn like the demo on Home. It publishes nothing. */
export function StoryCard({ lines }: { lines: ChatLine[] }) {
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

/* ---------- A hub ---------- */

export function HubPage({ hub: h }: { hub: Hub }) {
  const list = industriesIn(h.id);
  return (
    <>
      <Crumbs items={crumbsFor(undefined, h)} />
      <PageTop title={`${h.name}.`} lead={h.lead} className="pt-6 lg:pt-8" />
      <section className="container-kb mt-12 pb-16">
        {list.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((i) => (
              <li key={i.slug}>
                <IndustryCard industry={i} />
              </li>
            ))}
          </ul>
        )}
        {h.coming.length > 0 && (
          <div className={cn(list.length > 0 && "mt-12")}>
            <h2 className="text-h3">Pages on the way</h2>
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
          </div>
        )}
      </section>
      <FoundingBanner className="pb-20 lg:pb-28" />
    </>
  );
}

function IndustryCard({ industry: i }: { industry: Industry }) {
  return (
    <SiteLink
      to={`/for/${i.slug}`}
      className="press group block overflow-hidden rounded-panel border border-line bg-surface-1 shadow-rest hover:border-line-strong"
    >
      <Img
        photo={i.photos[0]}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
        className="aspect-[4/3] w-full object-cover"
      />
      <span className="flex items-center justify-between gap-3 p-5">
        <span className="text-h3">{i.plural}</span>
        <ArrowUpRight className="size-5 text-text-2 group-hover:text-text-1" aria-hidden />
      </span>
    </SiteLink>
  );
}

/* ---------- /for: every hub ---------- */

export function AllBusinesses() {
  return (
    <>
      <PageTop
        title="Kabsi for every local business."
        lead="Kabsi works for any business with a Google profile. Pick yours to see the Google work it brings and what Kabsi sends you."
      />
      <section className="container-kb mt-12 pb-16">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HUBS.map((h) => {
            const list = industriesIn(h.id);
            const cover = list[0]?.photos[0];
            return (
              <li key={h.id}>
                <SiteLink
                  to={`/for/${h.id}`}
                  className="press group flex h-full flex-col overflow-hidden rounded-panel border border-line bg-surface-1 shadow-rest hover:border-line-strong"
                >
                  {cover ? (
                    <Img
                      photo={cover}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="grid aspect-[16/9] w-full place-items-center bg-surface-2"
                    >
                      <KabsiMark className="size-12" />
                    </span>
                  )}
                  <span className="flex flex-1 flex-col p-5">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-h3">{h.name}</span>
                      <ArrowUpRight
                        className="size-5 shrink-0 text-text-2 group-hover:text-text-1"
                        aria-hidden
                      />
                    </span>
                    <span className="mt-2 text-small text-text-2">
                      {[...list.map((i) => i.plural), ...h.coming].join(", ")}
                    </span>
                  </span>
                </SiteLink>
              </li>
            );
          })}
        </ul>
        <p className="mt-10 text-small text-text-2">
          {INDUSTRIES.length} kinds of business so far, with more every month.
        </p>
      </section>
      <FoundingBanner className="pb-20 lg:pb-28" />
    </>
  );
}
