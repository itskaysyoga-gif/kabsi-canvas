import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { GuideClosing } from "@/components/marketing/guide-kit";
import { GuideImage, TopicPill } from "@/components/marketing/guide-photo";
import { longDate } from "@/components/marketing/guide-article";
import { Marked } from "@/components/kabsi/highlight";
import type { GuideMeta } from "@/content/guides/types";
import { GUIDE_GROUPS, guideLook, type GuideGroup } from "@/content/guides/look";
import { SITE_URL, pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";

// Guides index (Guides 3, Style 1 part A): only the guides that are public on this request, decided on the server, newest
// first. The newest is a large card with its photo; the rest are photo cards in a grid that never leaves a lone card in
// its last row (30.33 item 2: 3 columns from 1280 px, 2 from 768 px, 1 on a phone, the last row centred), with topic chips
// above it that filter the grid, then the closing band with the free check.
export const Route = createFileRoute("/guides/")({
  // Speed: the server function's client code loads with this page only.
  loader: async () => (await import("@/lib/guides-server")).getGuideList(),
  head: ({ loaderData }) =>
    pageHead({
      title: "Guides for Google Business Profile owners | Kabsi",
      description:
        "Plain guides for owners: your business on Google Maps, verification, hours and holidays, categories, photos, posts and Google reviews, each checked against Google's help.",
      path: "/guides",
      crumbs: [{ name: "Guides", path: "/guides" }],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Guides for Google Business Profile owners",
          url: `${SITE_URL}/guides`,
          mainEntity: {
            "@type": "ItemList",
            itemListElement: (loaderData?.guides ?? []).map((g, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: g.title,
              url: `${SITE_URL}/guides/${g.slug}`,
            })),
          },
        },
      ],
    }),
  component: Page,
});

/** "Reviews" reads "reviews" in a sentence; "AI answers" keeps its capitals. */
const lower = (g: string) => g.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase());

const cardBasis = "w-full md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)]";

function Page() {
  const { guides } = Route.useLoaderData();
  const [group, setGroup] = useState<GuideGroup | null>(null);
  const groups = GUIDE_GROUPS.filter((g) => guides.some((x) => guideLook(x.slug).group === g));
  const [first, ...rest] = guides;
  const shown = group ? guides.filter((g) => guideLook(g.slug).group === group) : rest;
  return (
    <PublicLayout>
      <section className="container-kb pt-10 sm:pt-16">
        <h1 className="max-w-[18em] font-display text-h2 font-bold sm:text-display text-balance text-text-1">
          <Marked text="Plain guides for your Google profile." mark="your Google profile." />
        </h1>
        <p className="mt-4 max-w-[38rem] text-lead text-text-2">
          Short answers, then the steps. Each one is checked against Google's own help pages, and
          dated.
        </p>
      </section>
      {first && !group ? (
        <section aria-label="Newest guide" className="container-kb mt-10">
          <Link
            to="/guides/$slug"
            params={{ slug: first.slug }}
            className="press group grid overflow-hidden rounded-panel border border-line bg-surface-1 shadow-rest hover:border-line-strong lg:grid-cols-[1fr_1.1fr] lg:items-center"
          >
            <GuideImage
              slug={first.slug}
              ratio="3/2"
              priority
              sizes="(min-width: 1024px) 600px, 100vw"
              className="lg:order-2 lg:h-full"
            />
            <div className="p-5 sm:p-8">
              <TopicPill>{guideLook(first.slug).group}</TopicPill>
              <h2 className="mt-3 font-display text-h2 font-bold text-balance text-text-1">
                {first.title}
              </h2>
              <p className="mt-3 max-w-xl text-lead text-text-2">{first.description}</p>
              <span className="mt-4 block">
                <Meta g={first} />
              </span>
              <span className="mt-4 inline-flex min-h-11 items-center gap-2 text-body font-bold text-text-1 underline decoration-text-3 underline-offset-4 group-hover:decoration-text-1">
                Read the guide <ArrowUpRight className="size-5" aria-hidden />
              </span>
            </div>
          </Link>
        </section>
      ) : null}
      <section aria-labelledby="more-guides" className="container-kb pt-14 pb-16 lg:pb-24">
        <h2 id="more-guides" className="font-display text-h3 font-bold text-text-1">
          {group ? (
            <Marked text={`Guides on ${lower(group)}`} mark={lower(group)} />
          ) : (
            <Marked text="More guides" mark="guides" />
          )}
        </h2>
        <div role="group" aria-label="Filter guides by topic" className="mt-5 flex flex-wrap gap-2">
          <Chip on={!group} onClick={() => setGroup(null)}>
            All guides
          </Chip>
          {groups.map((g) => (
            <Chip key={g} on={group === g} onClick={() => setGroup(group === g ? null : g)}>
              {g}
            </Chip>
          ))}
        </div>
        <ul className="mt-6 flex flex-wrap justify-center gap-4" data-testid="guide-grid">
          {shown.map((g) => (
            <li key={g.slug} className={cardBasis}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="press group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest hover:border-line-strong"
              >
                <GuideImage
                  slug={g.slug}
                  ratio="16/9"
                  sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
                />
                <span className="flex flex-1 flex-col p-5">
                  <TopicPill>{guideLook(g.slug).group}</TopicPill>
                  <span className="mt-3 text-title font-bold text-balance text-text-1">
                    {g.title}
                  </span>
                  <span className="mt-1 line-clamp-2 flex-1 text-small text-text-2">
                    {g.description}
                  </span>
                  <span className="mt-3">
                    <Meta g={g} />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <GuideClosing />
    </PublicLayout>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "press inline-flex min-h-11 items-center rounded-full border px-4 text-small font-bold",
        on
          ? "border-kb-ink bg-kb-ink text-kb-sand"
          : "border-line-strong bg-surface-1 text-text-1 hover:border-text-1",
      )}
    >
      {children}
    </button>
  );
}

function Meta({ g }: { g: GuideMeta }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-text-2">
      <span>{longDate(g.publishAt)}</span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="size-4" aria-hidden="true" />
        {g.minutes} min read
      </span>
    </span>
  );
}
