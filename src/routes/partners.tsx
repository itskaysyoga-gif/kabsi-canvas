import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Button } from "@/components/ui/button";
import { Eyebrow, H2, PageHero, Section } from "@/components/marketing/parts";
import { CONTACT_EMAIL, pageHead } from "@/lib/site";

// Holding page (P0.8-01, K-127). The old partner program (reselling, partner workspaces, partner billing) is gone.
// Kabsi Partners, the one affiliate program, replaces this page in P0.8-12 and opens only when Hussein switches it on.
export const Route = createFileRoute("/partners")({
  head: () =>
    pageHead({
      title: "Kabsi Partners | Opening soon",
      description: "Kabsi Partners is opening soon. Write to hello@kabsi.co to hear when it opens.",
      path: "/partners",
      crumbs: [{ name: "Partners", path: "/partners" }],
    }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Kabsi Partners"
        title="Kabsi Partners is opening soon."
        sub={`We are getting Kabsi Partners ready. Write to ${CONTACT_EMAIL} and we will tell you when it opens.`}
        photo="heroPartners"
      >
        <Button asChild>
          <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Kabsi Partners")}`}>
            Email {CONTACT_EMAIL}
          </a>
        </Button>
        <p className="mt-4 text-sm">
          <Link to="/partners/terms" className="font-bold underline underline-offset-4">
            Read the partner terms
          </Link>
        </p>
      </PageHero>

      <Section tone="sand">
        <Eyebrow>Looking after a client's profile?</Eyebrow>
        <H2>The owner invites you as a Manager.</H2>
        <p className="mt-4 max-w-2xl text-lg text-kb-stone">
          If you look after a business's Google profile for them, the owner adds you in Team, in
          their Kabsi settings. You then see that business in Kabsi and work in it with the rights
          the owner gives you.
        </p>
      </Section>
    </PublicLayout>
  );
}
