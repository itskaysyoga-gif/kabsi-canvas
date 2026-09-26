import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, Section } from "@/components/marketing/parts";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { ORG_LD, SITE_URL, pageHead } from "@/lib/site";

// One guide (D253). Content lives in src/lib/guides.tsx.
export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const g = guideBySlug(params.slug);
    if (!g) throw notFound();
    return { slug: g.slug };
  },
  head: ({ params }) => {
    const g = guideBySlug(params.slug);
    if (!g) return { meta: [{ title: "Guide not found | Kabsi" }] };
    return pageHead({
      title: `${g.title} | Kabsi`,
      description: g.description,
      path: `/guides/${g.slug}`,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          datePublished: g.updated,
          dateModified: g.updated,
          mainEntityOfPage: `${SITE_URL}/guides/${g.slug}`,
          author: { "@type": "Organization", name: "Kabsi", url: SITE_URL },
          publisher: ORG_LD,
        },
      ],
    });
  },
  component: Page,
});

function Page() {
  const { slug } = Route.useLoaderData();
  const g = guideBySlug(slug)!;
  const more = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);
  return (
    <PublicLayout>
      <Section className="max-w-3xl">
        <Link
          to="/guides"
          className="inline-flex items-center gap-2 text-sm font-bold text-kb-stone"
        >
          <ArrowLeft className="size-4" /> All guides
        </Link>
        <h1 className="mt-6 font-display text-[clamp(2.2rem,5.5vw,3.6rem)] leading-[1.02]">
          {g.title}
        </h1>
        <p className="mt-4 text-sm text-kb-stone">
          Updated{" "}
          {new Date(g.updated).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          · {g.minutes} min read
        </p>
        <article className="mt-8 space-y-5 text-lg leading-8 text-kb-ink [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_b]:font-bold [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-3xl [&_h2]:leading-tight [&_li]:mt-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
          {g.body}
        </article>
        <aside className="mt-12 border-t border-kb-hairline pt-6 text-sm text-kb-stone">
          <p className="font-bold text-kb-ink">Sources</p>
          <ul className="mt-2 space-y-1">
            {g.sources.map((s) => (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-4">Kabsi is independent and not affiliated with Google.</p>
        </aside>
        <div className="mt-12">
          <p className="font-bold">More guides</p>
          <ul className="mt-3 space-y-2">
            {more.map((m) => (
              <li key={m.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: m.slug }}
                  className="underline underline-offset-4"
                >
                  {m.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Section>
      <CtaBand
        title="Every Google review, answered. You just tap Post."
        sub="Kabsi emails you each new review with a reply drafted in your customer's language. Nothing is posted until you approve it."
      />
    </PublicLayout>
  );
}
