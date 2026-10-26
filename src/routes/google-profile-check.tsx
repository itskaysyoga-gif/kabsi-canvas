import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FreeCheckStart } from "@/components/kabsi/d4-free-check";
import { SITE_URL, pageHead } from "@/lib/site";

// The separate profile check became the one free check (master plan 30.16 section 4). The address keeps working
// and points search engines at /scan.
export const Route = createFileRoute("/google-profile-check")({
  head: () => {
    const h = pageHead({
      title: "Kabsi: Check your business on Google, free",
      description:
        "Your public Google profile and where you come up nearby, together. Free check. No Google access needed.",
      path: "/scan",
      image: "tool",
    });
    return { ...h, links: [{ rel: "canonical", href: `${SITE_URL}/scan` }] };
  },
  component: () => (
    <SiteShell>
      <FreeCheckStart />
    </SiteShell>
  ),
});
