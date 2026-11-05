import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { ForIndex } from "@/components/kabsi/d9-industry";
import { pageHead } from "@/lib/site";

// Industries 2: /for is one flat, alphabetical list of every industry page (no groups), with a filter field.
const FOR_SEO = {
  title: "Google Business Profile help for local businesses | Kabsi",
  description:
    "Kabsi does the Google Business Profile work for local businesses: replies, posts, photos, hours and details kept right. Find yours, or check it free.",
} as const;

export const Route = createFileRoute("/for/")({
  head: () =>
    pageHead({
      ...FOR_SEO,
      path: "/for",
      image: "industry",
      crumbs: [{ name: "Businesses", path: "/for" }],
    }),
  component: () => (
    <SiteShell>
      <ForIndex />
    </SiteShell>
  ),
});
