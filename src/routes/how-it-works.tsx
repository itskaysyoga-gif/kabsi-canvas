import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { V31How } from "@/components/marketing/v31-pages";
import { HEADS } from "@/components/marketing/v31-heads";
import { pageHead } from "@/lib/site";

// How it works on blueprint 3.1 section 5 (SITE-1): connect Google, choose how you hear from Kabsi, your first day, a
// normal week, your monthly report.
export const Route = createFileRoute("/how-it-works")({
  head: () =>
    pageHead({
      title: HEADS.how.title,
      description: HEADS.how.description,
      path: "/how-it-works",
      image: "home",
      crumbs: [{ name: "How it works", path: "/how-it-works" }],
    }),
  component: function HowItWorks() {
    return (
      <SiteShell>
        <V31How />
      </SiteShell>
    );
  },
});
