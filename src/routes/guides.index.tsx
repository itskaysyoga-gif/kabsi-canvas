import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { GuideClosing } from "@/components/marketing/guide-kit";
import { GuideCover, longDate } from "@/components/marketing/guide-article";
import type { GuideMeta } from "@/content/guides/types";
import { SectionHead } from "@/components/kabsi/ui";
import { SITE_URL, pageHead } from "@/lib/site";

// Guides index (Guides 3): only the guides that are public on this request, decided on the server, newest first. The
// newest is large with its cover, the rest as cards, then the closing band with the free check.
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

function Page() {
  const { guides } = Route.useLoaderData();
  const [first, ...rest] = guides;
  return (
    <PublicLayout>
      <section className="container-kb pt-10 sm:pt-16">
        <SectionHead
          as="h1"
          title="Plain guides for your Google profile."
          lead="Short answers, then the steps. Each one is checked against Google's own help pages, and dated."
        />
      </section>
      {first ? (
        <section className="container-kb mt-10">
          <Link
            to="/guides/$slug"
            params={{ slug: first.slug }}
            className="press group grid gap-6 rounded-panel border border-line bg-surface-1 p-5 shadow-rest hover:border-line-strong sm:p-8 lg:grid-cols-[1.1fr_1fr] lg:items-center"
          >
            <div>
              <Meta g={first} />
              <h2 className="mt-3 font-display text-h2 font-bold text-text-1">{first.title}</h2>
              <p className="mt-3 max-w-xl text-lead text-text-2">{first.description}</p>
              <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-body font-bold text-text-1 underline decoration-text-3 underline-offset-4 group-hover:decoration-text-1">
                Read the guide <ArrowUpRight className="size-5" aria-hidden />
              </span>
            </div>
            <GuideCover title={first.title} topic={first.topic} />
          </Link>
        </section>
      ) : null}
      <section aria-labelledby="more-guides" className="container-kb pt-14 pb-16 lg:pb-24">
        <h2 id="more-guides" className="font-display text-h3 font-bold text-text-1">
          More guides
        </h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rest.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="press group flex h-full flex-col rounded-card border border-line bg-surface-1 p-5 shadow-rest hover:border-line-strong"
              >
                <span className="text-label text-text-2">{g.topic}</span>
                <span className="mt-1 text-title font-bold text-text-1">{g.title}</span>
                <span className="mt-1 flex-1 text-small text-text-2">{g.description}</span>
                <span className="mt-3">
                  <Meta g={g} />
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
