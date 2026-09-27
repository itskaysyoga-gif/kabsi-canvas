import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock3 } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, IconBadge, PageHero, Section } from "@/components/marketing/parts";
import { GUIDE_ICONS, GuidesVisual } from "@/components/marketing/visuals";
import { GUIDES, type Guide } from "@/lib/guides";
import { SiteImg } from "@/components/marketing/site-img";
import { SITE_URL, pageHead } from "@/lib/site";
import { cn } from "@/lib/utils";

// Guides index (D253, D256).
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
      <PageHero
        eyebrow="Guides"
        title="Look after your Google profile."
        sub="Short, practical how-tos with pictures, checked against Google's own help pages."
        visual={<GuidesVisual />}
        photo="heroGuides"
      />
      <Section>
        <ul data-stagger="" className="grid gap-5 md:grid-cols-2">
          {first ? <GuideCard g={first} featured /> : null}
          {rest.map((g) => (
            <GuideCard key={g.slug} g={g} />
          ))}
        </ul>
      </Section>
      <CtaBand />
    </PublicLayout>
  );
}

function GuideCard({ g, featured = false }: { g: Guide; featured?: boolean }) {
  return (
    <li className={cn(featured && "md:col-span-2")}>
      <Link
        to="/guides/$slug"
        params={{ slug: g.slug }}
        className={cn(
          "kb-lift group flex h-full flex-col overflow-hidden rounded-large border border-kb-hairline bg-kb-white hover:border-kb-black",
          featured && "md:grid md:grid-cols-[1.15fr_1fr]",
        )}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-kb-sand",
            featured ? "aspect-[16/9] md:aspect-auto md:h-full" : "aspect-[16/9]",
          )}
        >
          <SiteImg
            id={g.photo}
            sizes={featured ? "(min-width: 768px) 600px, 100vw" : "(min-width: 768px) 540px, 100vw"}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
          <IconBadge
            icon={GUIDE_ICONS[g.slug]}
            className="absolute bottom-4 left-4 size-12 shadow-[0_8px_20px_rgba(0,0,0,.25)] [&_svg]:size-6"
          />
        </div>
        <div className={cn("flex flex-1 flex-col p-6", featured && "md:justify-center md:p-9")}>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-kb-stone">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {g.minutes} min read
          </span>
          <span
            className={cn(
              "mt-2 font-bold leading-snug",
              featured
                ? "font-display text-[clamp(1.8rem,3vw,2.4rem)] font-normal leading-[1.05]"
                : "text-xl",
            )}
          >
            {g.title}
          </span>
          <span className="mt-3 flex-1 leading-7 text-kb-stone">{g.description}</span>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">
            Read the guide
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </li>
  );
}
