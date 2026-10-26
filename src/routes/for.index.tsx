import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { AllBusinesses } from "@/components/kabsi/d5-industry";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/for/")({
  head: () =>
    pageHead({
      title: "Kabsi for every local business",
      description:
        "Salons, restaurants, clinics, garages, gyms and more: the Google work each one brings, and what Kabsi sends you on WhatsApp.",
      path: "/for",
      image: "industry",
      crumbs: [{ name: "All businesses", path: "/for" }],
    }),
  component: () => (
    <SiteShell>
      <AllBusinesses />
    </SiteShell>
  ),
});
