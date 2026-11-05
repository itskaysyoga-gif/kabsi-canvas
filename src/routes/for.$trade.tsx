import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { HubPage, IndustryPage } from "@/components/kabsi/d8-industry";
import { pageHead } from "@/lib/site";
import { faqJsonLd } from "@/lib/faq";
import { LEGACY_INDUSTRY_MOVES } from "@/lib/industry-redirects";
import { getIndustryGuides } from "@/lib/guides-server";

// /for/<industry> or /for/<hub> (brief section 16, item 3). The old trade addresses move to the new ones.
// Lean 1 (speed): the route's loader and head stay in the shared bundle on every page, so the twelve industry texts load
// here, on demand, and the head reads what the loader returns (the crumbs and the index flag), never the content itself.
export const Route = createFileRoute("/for/$trade")({
  loader: async ({ params }) => {
    const { MOVED, crumbsFor, hub, hubIndexed, industry, industryIndexed } =
      await import("@/content/industries");
    const moved = MOVED[params.trade] ?? LEGACY_INDUSTRY_MOVES[params.trade];
    if (moved) throw redirect({ to: "/for/$trade", params: { trade: moved }, statusCode: 301 });
    // crumbsFor gives Businesses and the page; pageHead adds Home itself.
    const crumbs = (c: { name: string; to: string }[]) =>
      c.filter((x) => x.to !== "/").map((x) => ({ name: x.name, path: x.to }));
    const i = industry(params.trade);
    if (i)
      return {
        kind: "industry" as const,
        industry: i,
        crumbs: crumbs(crumbsFor(i)),
        indexed: industryIndexed(i),
        // Guides 3: the public guides that link to this page link back from it (decided on the server).
        guides: await getIndustryGuides({ data: i.slug }).catch(() => []),
      };
    const h = hub(params.trade);
    if (h)
      return {
        kind: "hub" as const,
        hub: h,
        crumbs: crumbs(crumbsFor(undefined, h)),
        indexed: hubIndexed(h.id),
      };
    throw notFound();
  },
  head: ({ loaderData: d }) => {
    if (!d) return {};
    return d.kind === "industry"
      ? pageHead({
          // docs/SEO-PLAN.md: the four Design 8 trades carry their own title and description.
          title:
            d.industry.d8?.seo.title ?? `Kabsi: Your ${d.industry.name} on Google. Taken care of.`,
          description: d.industry.d8?.seo.description ?? d.industry.lead,
          path: `/for/${d.industry.slug}`,
          image: "industry",
          crumbs: d.crumbs,
          // Only finished pages with a claim sheet are indexed; the template pages wait for Content 1 (master plan
          // 30.17), and the dental clinic page for its claim sheet (Fix 1).
          noindex: !d.indexed,
          ...(d.industry.faqs ? { jsonLd: [faqJsonLd(d.industry.faqs)] } : {}),
        })
      : pageHead({
          title: `Kabsi for ${d.hub.name.toLowerCase()}`,
          description: d.hub.lead,
          path: `/for/${d.hub.id}`,
          image: "industry",
          crumbs: d.crumbs,
          noindex: !d.indexed,
        });
  },
  component: function Trade() {
    const d = Route.useLoaderData();
    return (
      <SiteShell>
        {d.kind === "industry" ? (
          <IndustryPage industry={d.industry} guides={d.guides} />
        ) : (
          <HubPage hub={d.hub} />
        )}
      </SiteShell>
    );
  },
});
