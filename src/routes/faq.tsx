import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FaqPage } from "@/components/kabsi/d2-legal";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/faq")({
  head: () =>
    pageHead({
      title: "Kabsi: Questions owners ask",
      description: "Short answers about passwords, posting, plans, cancelling and your data.",
      path: "/faq",
      image: "about",
      crumbs: [{ name: "FAQ", path: "/faq" }],
    }),
  component: () => (
    <SiteShell>
      <FaqPage />
    </SiteShell>
  ),
});
