import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, IconBadge, PageHero, Photo, Section } from "@/components/marketing/parts";
import { GUIDE_ICONS, GuidesVisual } from "@/components/marketing/visuals";
import { GUIDES } from "@/lib/guides";
import { pageHead } from "@/lib/site";

// Guides index (D253).
export const Route = createFileRoute("/guides/")({
  head: () =>
    pageHead({
      title: "Guides for Google Business Profile owners | Kabsi",
      description:
        "Short, practical guides: replying to Google reviews, handling negative reviews, reporting reviews, adding a manager, and getting your review link.",
      path: "/guides",
    }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Guides"
        title="Look after your Google profile."
        sub="Short, practical how-tos, checked against Google's own help pages."
        visual={<GuidesVisual />}
      />
      <Section>
        <Photo
          id="street"
          sizes="(min-width: 1152px) 1088px, 100vw"
          className="mb-10 aspect-[21/9]"
        />
        <ul data-stagger="" className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="kb-lift group flex h-full flex-col rounded-large border-2 border-kb-hairline bg-kb-white p-6 hover:border-kb-black"
              >
                <span className="flex items-center justify-between">
                  <IconBadge icon={GUIDE_ICONS[g.slug]} />
                  <span className="text-xs font-bold uppercase tracking-wider text-kb-stone">
                    {g.minutes} min read
                  </span>
                </span>
                <span className="mt-5 text-xl font-bold">{g.title}</span>
                <span className="mt-2 flex-1 leading-7 text-kb-stone">{g.description}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                  Read{" "}
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </PublicLayout>
  );
}
