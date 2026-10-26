import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { ReviewLinkTool } from "@/components/kabsi/d2-tools";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/google-review-link")({
  head: () =>
    pageHead({
      title: "Kabsi: Get your Google review link and QR code",
      description: "One link that opens the review box on your Google profile. Free, no sign-up.",
      path: "/google-review-link",
      image: "tool",
      crumbs: [{ name: "Review link and QR code", path: "/google-review-link" }],
    }),
  component: () => (
    <SiteShell>
      <ReviewLinkTool />
    </SiteShell>
  ),
});
