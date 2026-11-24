import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { V31About } from "@/components/marketing/v31-pages";
import { HEADS } from "@/components/marketing/v31-heads";
import { pageHead } from "@/lib/site";

// About on blueprint 3.1 (SITE-1): shortened to the same message as Home.
export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: HEADS.about.title,
      description: HEADS.about.description,
      path: "/about",
      image: "about",
      crumbs: [{ name: "About", path: "/about" }],
    }),
  component: () => (
    <SiteShell>
      <V31About />
    </SiteShell>
  ),
});
