import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FoundingPage } from "@/components/kabsi/d5-founding";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/founding")({
  head: () =>
    pageHead({
      title: "Kabsi: Founding 25, three months of Kabsi Pro, free",
      description:
        "For 25 businesses, by application. Kabsi does the Google work; you tell Rashid what to make better. No card.",
      path: "/founding",
      image: "founding",
      crumbs: [{ name: "Founding 25", path: "/founding" }],
    }),
  component: () => (
    <SiteShell>
      <FoundingPage />
    </SiteShell>
  ),
});
