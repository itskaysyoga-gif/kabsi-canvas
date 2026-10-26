import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { HubPage, IndustryPage, crumbsFor } from "@/components/kabsi/d5-industry";
import { MOVED, hub, hubIndexed, industry } from "@/content/industries";
import { pageHead } from "@/lib/site";
import { LEGACY_INDUSTRY_MOVES } from "@/lib/industry-redirects";

// /for/<industry> or /for/<hub> (brief section 16, item 3). The old trade addresses move to the new ones.
export const Route = createFileRoute("/for/$trade")({
  loader: ({ params }) => {
    const moved = MOVED[params.trade] ?? LEGACY_INDUSTRY_MOVES[params.trade];
    if (moved) throw redirect({ to: "/for/$trade", params: { trade: moved }, statusCode: 301 });
    const i = industry(params.trade);
    if (i) return { kind: "industry" as const, industry: i };
    const h = hub(params.trade);
    if (h) return { kind: "hub" as const, hub: h };
    throw notFound();
  },
  head: ({ loaderData: d }) => {
    if (!d) return {};
    // crumbsFor gives Home, the hub and the page; pageHead adds Home itself.
    const crumbs = (d.kind === "industry" ? crumbsFor(d.industry) : crumbsFor(undefined, d.hub))
      .filter((c) => c.to !== "/")
      .map((c) => ({ name: c.name, path: c.to }));
    return d.kind === "industry"
      ? pageHead({
          title: `Kabsi: Your ${d.industry.name} on Google. Taken care of.`,
          description: d.industry.lead,
          path: `/for/${d.industry.slug}`,
          image: "industry",
          crumbs,
          // Only finished pages are indexed; the template pages wait for Content 1 (master plan 30.17).
          noindex: !d.industry.finished,
        })
      : pageHead({
          title: `Kabsi for ${d.hub.name.toLowerCase()}`,
          description: d.hub.lead,
          path: `/for/${d.hub.id}`,
          image: "industry",
          crumbs,
          noindex: !hubIndexed(d.hub.id),
        });
  },
  component: function Trade() {
    const d = Route.useLoaderData();
    return (
      <SiteShell>
        {d.kind === "industry" ? <IndustryPage industry={d.industry} /> : <HubPage hub={d.hub} />}
      </SiteShell>
    );
  },
});
