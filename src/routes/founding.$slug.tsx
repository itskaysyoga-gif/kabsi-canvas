import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FoundingPage } from "@/components/kabsi/d5-founding";
import { FOUNDING_HERO } from "@/components/kabsi/founding-private";
import { checkFoundingInvite } from "@/lib/founding-invite-server";

// Founding 1 (R-151, master plan 30.51 item 3): Founding 25 is private. This page opens only at /founding/<slug>, where the
// slug is app_settings.founding_invite_slug. A wrong or old slug is the real not-found page with a 404 status, and so is
// /founding alone (there is no route for it). The page is noindex and nofollow, has no canonical and no share image, sends no
// referrer, and is in no sitemap, llms file or IndexNow list. vercel.json adds the same noindex header and no-store.
export const Route = createFileRoute("/founding/$slug")({
  loader: async ({ params }) => {
    const r = await checkFoundingInvite({ data: params.slug });
    if (!r.ok) throw notFound();
    return { slug: params.slug };
  },
  head: () => ({
    meta: [
      { title: `Kabsi: ${FOUNDING_HERO.title}` },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Invited,
});

function Invited() {
  const { slug } = Route.useLoaderData();
  return (
    <SiteShell>
      <FoundingPage slug={slug} />
    </SiteShell>
  );
}
