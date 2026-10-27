import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Clock3 } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { GuideClosing, GuidePhoto } from "@/components/marketing/guide-kit";
import { IconBadge } from "@/components/marketing/parts";
import { GUIDE_ICONS } from "@/components/marketing/visuals";
import { GUIDES, type Guide } from "@/lib/guides";
import { SectionHead } from "@/components/kabsi/ui";
import { SITE_URL, pageHead } from "@/lib/site";

// Guides index (D253, D256), in Design 2's guide template: the H1 and lead, the first guide large, the rest as cards,
// and the closing band with the free check.
export const Route = createFileRoute("/guides/")({
  head: () =>
    pageHead({
      title: "Guides for Google Business Profile owners | Kabsi",
      description:
        "Short, practical guides: replying to Google reviews, handling negative reviews, reporting reviews, adding a manager, and getting your review link.",
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
            itemListElement: GUIDES.map((g, i) => ({
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
  const [first, ...rest] = GUIDES;
  return (
    <PublicLayout>
      <section className="container-kb pt-10 sm:pt-16">
        <SectionHead
          as="h1"
          title="Plain guides for your Google profile."
          lead="Short answers, then the steps. Each one is checked against Google's own help pages."
        />
      </section>
      {first ? (
        <section className="container-kb mt-10">
          <Link
            to="/guides/$slug"
            params={{ slug: first.slug }}
            className="press group grid gap-6 rounded-panel border border-line bg-surface-1 p-5 shadow-rest hover:border-line-strong sm:p-8 lg:grid-cols-[1.2fr_1fr] lg:items-center"
          >
            <div>
              <ReadTime g={first} />
              <h2 className="mt-3 font-display text-h2 font-bold text-text-1">{first.title}</h2>
              <p className="mt-3 max-w-xl text-lead text-text-2">{first.description}</p>
              <ReadLink />
            </div>
            <GuidePhoto
              slug={first.slug}
              priority
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/3] w-full rounded-card object-cover"
            />
          </Link>
        </section>
      ) : null}
      <section aria-labelledby="more-guides" className="container-kb pt-14 pb-16 lg:pb-24">
        <h2 id="more-guides" className="font-display text-h3 font-bold text-text-1">
          More guides
        </h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {rest.map((g) => (
            <GuideCard key={g.slug} g={g} />
          ))}
        </ul>
      </section>
      <GuideClosing />
    </PublicLayout>
  );
}

function ReadTime({ g }: { g: Guide }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-small font-bold text-text-2">
      <Clock3 className="size-4" aria-hidden="true" />
      {g.minutes} min read
    </span>
  );
}

function ReadLink() {
  return (
    <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-body font-bold text-text-1 underline decoration-text-3 underline-offset-4 group-hover:decoration-text-1">
      Read the guide <ArrowUpRight className="size-5" aria-hidden />
    </span>
  );
}

function GuideCard({ g }: { g: Guide }) {
  return (
    <li>
      <Link
        to="/guides/$slug"
        params={{ slug: g.slug }}
        className="press group flex h-full gap-4 rounded-card border border-line bg-surface-1 p-5 shadow-rest hover:border-line-strong"
      >
        <IconBadge icon={GUIDE_ICONS[g.slug]} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-title font-bold text-text-1">{g.title}</span>
          <span className="mt-1 flex-1 text-small text-text-2">{g.description}</span>
          <span className="mt-3">
            <ReadTime g={g} />
          </span>
        </span>
      </Link>
    </li>
  );
}
