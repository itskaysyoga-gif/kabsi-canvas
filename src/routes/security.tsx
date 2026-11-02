import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { D8Security } from "@/components/kabsi/d8-security";
import { SECURITY_HERO } from "@/components/kabsi/hero-lines";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: `Kabsi: ${SECURITY_HERO.title}`,
      description: SECURITY_HERO.line,
      path: "/security",
      image: "about",
      crumbs: [{ name: "Security", path: "/security" }],
    }),
  component: () => (
    <SiteShell>
      <D8Security />
    </SiteShell>
  ),
});
