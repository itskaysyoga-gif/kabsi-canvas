import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { HubPage, IndustryPage } from "@/components/kabsi/d5-industry";
import { pageHead } from "@/lib/site";
import { LEGACY_INDUSTRY_MOVES } from "@/lib/industry-redirects";

// /for/<industry> or /for/<hub> (brief section 16, item 3). The old trade addresses move to the new ones.
// Lean 1 (speed): the route's loader and head stay in the shared bundle on every page, so the twelve industry texts load
// here, on demand, and the head reads what the loader returns (the crumbs and the index flag), never the content itself.
export const Route = createFileRoute("/for/$trade")({
  loader: async ({ params }) => {
    const { MOVED, crumbsFor, hub, hubIndexed, industry } = await import("@/content/industries");
    const moved = MOVED[params.trade] ?? LEGACY_INDUSTRY_MOVES[params.trade];
    if (moved) throw redirect({ to: "/for/$trade", params: { trade: moved }, statusCode: 301 });
    // crumbsFor gives Home, the hub and the page; pageHead adds Home itself.
    const crumbs = (c: { name: string; to: string }[]) =>
      c.filter((x) => x.to !== "/").map((x) => ({ name: x.name, path: x.to }));
    const i = industry(params.trade);
    if (i) return { kind: "industry" as const, industry: i, crumbs: crumbs(crumbsFor(i)) };
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
          title: `Kabsi: Your ${d.industry.name} on Google. Taken care of.`,
          description: d.industry.lead,
          path: `/for/${d.industry.slug}`,
          image: "industry",
          crumbs: d.crumbs,
          // Only finished pages are indexed; the template pages wait for Content 1 (master plan 30.17).
          noindex: !d.industry.finished,
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
        {d.kind === "industry" ? <IndustryPage industry={d.industry} /> : <HubPage hub={d.hub} />}
      </SiteShell>
    );
  },
});
