import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FreeCheckStart } from "@/components/kabsi/d4-free-check";
import { CHECK_HERO } from "@/components/kabsi/hero-lines";
import { SITE_URL, pageHead } from "@/lib/site";

// The separate profile check became the one free check (master plan 30.16 section 4). The address keeps working
// and points search engines at /scan; on kabsi.co vercel.json answers it with a 301 to /scan (Go live 1, B-019).
export const Route = createFileRoute("/google-profile-check")({
  head: () => {
    const h = pageHead({
      // docs/SEO-PLAN.md: "Kabsi: " and the hero headline; the description is the hero line (Design 8).
      title: "Kabsi: Check your business on Google, free.",
      description: CHECK_HERO.line,
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
