import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { AboutPage } from "@/components/kabsi/d2-legal";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "Kabsi: Kabsi is built for the owner at the counter",
      description: "Why Kabsi exists, and who is behind it.",
      path: "/about",
      image: "about",
      crumbs: [{ name: "About", path: "/about" }],
    }),
  component: () => (
    <SiteShell>
      <AboutPage />
    </SiteShell>
  ),
});
