import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { V31Security } from "@/components/marketing/v31-pages";
import { HEADS } from "@/components/marketing/v31-heads";
import { pageHead } from "@/lib/site";

// Security on blueprint 3.1 (SITE-1): shortened to the same message as Home.
export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: HEADS.security.title,
      description: HEADS.security.description,
      path: "/security",
      image: "about",
      crumbs: [{ name: "Security", path: "/security" }],
    }),
  component: () => (
    <SiteShell>
      <V31Security />
    </SiteShell>
  ),
});
