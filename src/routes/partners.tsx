import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { PartnersPage } from "@/components/kabsi/d2-partners";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/partners")({
  head: () =>
    pageHead({
      title: "Kabsi Partners: Earn 25% of every payment",
      description:
        "Recommend Kabsi to local business owners you know. You earn while the referred subscription stays paid.",
      path: "/partners",
      image: "partner",
      crumbs: [{ name: "Partners", path: "/partners" }],
    }),
  component: () => (
    <SiteShell>
      <PartnersPage />
    </SiteShell>
  ),
});
