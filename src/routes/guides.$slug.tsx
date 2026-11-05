import { Suspense, use } from "react";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { GuideArticle } from "@/components/marketing/guide-article";
import { guideDocPromise } from "@/content/guides/load";
import { ORG_LD, SITE_URL, pageHead } from "@/lib/site";

// One guide (Guides 3). The server decides on each request whether the guide is public (getGuidePage, the server's own
// clock): a guide whose day has not come answers 404 like any unknown address. Only this guide's content file loads.

export const Route = createFileRoute("/guides/$slug")({
  loader: async ({ params }) => {
    // Speed: the server function's client code loads with the guide pages only, never in the shared bundle.
    const { getGuidePage } = await import("@/lib/guides-server");
    const data = await getGuidePage({ data: params.slug });
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData: d, params }) => {
    if (!d) return { meta: [{ title: "Guide not found | Kabsi" }] };
    const g = d.guide;
    const title = `${g.title} | Kabsi`.length < 60 ? `${g.title} | Kabsi` : g.title;
    const url = `${SITE_URL}/guides/${params.slug}`;
    const image = `guides/${g.slug}` as const;
    return pageHead({
      title,
      description: g.description,
      path: `/guides/${params.slug}`,
      type: "article",
      image,
      crumbs: [
        { name: "Guides", path: "/guides" },
        { name: g.title, path: `/guides/${g.slug}` },
      ],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          image: [`${SITE_URL}/og/${image}.jpg`],
          datePublished: g.publishAt.slice(0, 10),
          dateModified: g.updated,
          mainEntityOfPage: url,
          inLanguage: "en",
          author: { "@type": "Organization", name: "Kabsi", url: SITE_URL },
          publisher: ORG_LD,
        },
        ...(g.faqs?.length
          ? [
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                mainEntity: g.faqs.map((f) => ({
                  "@type": "Question",
                  name: f.q,
                  acceptedAnswer: { "@type": "Answer", text: f.a },
                })),
              },
            ]
          : []),
      ],
    });
  },
  component: Page,
});

function Page() {
  const d = Route.useLoaderData();
  return (
    <PublicLayout>
      <Suspense fallback={null}>
        <Article slug={d.guide.slug} />
      </Suspense>
    </PublicLayout>
  );
}

function Article({ slug }: { slug: string }) {
  const d = Route.useLoaderData();
  const doc = use(guideDocPromise(slug));
  if (!doc) return null;
  return (
    <GuideArticle
      doc={doc}
      meta={d.guide}
      related={d.related}
      industries={d.industries}
      publicSlugs={d.publicSlugs}
    />
  );
}
