import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, PageHero, Section } from "@/components/marketing/parts";
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
      />
      <Section>
        <ul className="grid gap-4 md:grid-cols-2">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                to="/guides/$slug"
                params={{ slug: g.slug }}
                className="flex h-full flex-col rounded-large border-2 border-kb-hairline p-6 transition-colors hover:border-kb-black"
              >
                <span className="text-xs font-bold uppercase tracking-wider text-kb-stone">
                  {g.minutes} min read
                </span>
                <span className="mt-2 text-xl font-bold">{g.title}</span>
                <span className="mt-2 flex-1 leading-7 text-kb-stone">{g.description}</span>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                  Read <ArrowRight className="size-4" />
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
