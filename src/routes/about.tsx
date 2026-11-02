import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { D8About } from "@/components/kabsi/d8-about";
import { ABOUT_HERO } from "@/components/kabsi/hero-lines";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: `Kabsi: ${ABOUT_HERO.title}`,
      description: ABOUT_HERO.line,
      path: "/about",
      image: "about",
      crumbs: [{ name: "About", path: "/about" }],
    }),
  component: () => (
    <SiteShell>
      <D8About />
    </SiteShell>
  ),
});
