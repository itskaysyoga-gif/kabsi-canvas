import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { IndustryPage } from "@/components/kabsi/d9-industry";
import { ORG_LD, SITE_URL, pageHead } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { LEGACY_INDUSTRY_MOVES } from "@/lib/industry-redirects";

// /for/<industry> (brief section 16, item 3; Industries 2: every page on Design 9, no group pages). The old addresses move
// to the new ones; an old group address goes to /for (vercel.json answers those first with a 301).
// Lean 1 (speed): the route's loader and head stay in the shared bundle on every page, so the industry texts load here, on
// demand, and the head reads what the loader returns, never the content module itself.
export const Route = createFileRoute("/for/$trade")({
  loader: async ({ params }) => {
    const { MOVED, OLD_GROUPS, crumbsFor, industry, industryIndexed } =
      await import("@/content/industries");
    const moved = MOVED[params.trade] ?? LEGACY_INDUSTRY_MOVES[params.trade];
    if (moved === "" || (OLD_GROUPS as readonly string[]).includes(params.trade))
      throw redirect({ to: "/for", statusCode: 301 });
    if (moved) throw redirect({ to: "/for/$trade", params: { trade: moved }, statusCode: 301 });
    const i = industry(params.trade);
    if (!i) throw notFound();
    return {
      industry: i,
      // crumbsFor gives Businesses and the page; pageHead adds Home itself.
      crumbs: crumbsFor(i).map((x) => ({ name: x.name, path: x.to })),
      indexed: industryIndexed(i),
      related: i.page.related
        .map((s) => industry(s))
        .filter((r) => r && industryIndexed(r))
        .map((r) => r!),
      // Guides 3: the public guides that link to this page link back from it (decided on the server).
      guides: await import("@/lib/guides-server")
        .then((m) => m.getIndustryGuides({ data: i.slug }))
        .catch(() => []),
    };
  },
  head: ({ loaderData: d }) => {
    if (!d) return {};
    const i = d.industry;
    const url = `${SITE_URL}/for/${i.slug}`;
    return pageHead({
      title: i.page.title,
      description: i.page.description,
      path: `/for/${i.slug}`,
      image: "industry",
      crumbs: d.crumbs,
      // Only finished pages with a claim sheet are indexed.
      noindex: !d.indexed,
      jsonLd: [
        ORG_LD,
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": `${url}#service`,
          name: `${i.plural}: Google Business Profile help`,
          serviceType: "Google Business Profile management",
          description: i.page.description,
          url,
          provider: { "@id": ORG_LD["@id"] },
          audience: { "@type": "BusinessAudience", name: i.plural },
        },
        ...(i.faqs ? [faqJsonLd(i.faqs)] : []),
      ],
    });
  },
  component: function Trade() {
    const d = Route.useLoaderData();
    return (
      <SiteShell>
        <IndustryPage industry={d.industry} related={d.related} guides={d.guides} />
      </SiteShell>
    );
  },
});
