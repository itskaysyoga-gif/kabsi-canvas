import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { H2, PageHero, Section } from "@/components/marketing/parts";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/security")({
  head: () =>
    pageHead({
      title: "Security and your Google profile | Kabsi",
      description:
        "How Kabsi uses Manager access, waits for your approval, stores Google data, and can be removed from your Google Business Profile.",
      path: "/security",
      crumbs: [{ name: "Security", path: "/security" }],
    }),
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Security"
        title="Security and your Google profile"
        sub="You stay in control of your Google Business Profile and everything Kabsi prepares."
        crumbs={[{ name: "Security" }]}
      />

      <Section className="max-w-3xl space-y-12 text-[17px] leading-8">
        <ContentSection title="What a Manager can do">
          <p>
            Google gives a Manager access to help run a profile. You can read about the{" "}
            <a
              href="https://support.google.com/business/answer/3403100"
              className="font-bold underline underline-offset-4"
            >
              roles on Google's own page
            </a>
            . You stay the owner.
          </p>
        </ContentSection>

        <ContentSection title="What Kabsi does with that access">
          <p>
            Kabsi reads new reviews, prepares reply drafts, and posts only what you approved. Every
            reply, post, photo and change shows you the exact text first and waits for your tap.
            Kabsi cannot post on its own.
          </p>
        </ContentSection>

        <ContentSection title="Remove Kabsi in three taps">
          <p>
            Open <strong>Business Profile settings</strong>, choose{" "}
            <strong>People and access</strong>, then remove <strong>Kabsi Clients</strong> (group ID
            5481006796). Kabsi loses access to that profile at once.
          </p>
        </ContentSection>

        <ContentSection title="Where your data lives">
          <p>
            Your data is stored in the EU, in Frankfurt. Review text and reviewer names that come
            from Google are removed 30 days after Google last returned them. Read the{" "}
            <Link to="/privacy" className="font-bold underline underline-offset-4">
              privacy policy
            </Link>{" "}
            for the full list.
          </p>
        </ContentSection>

        <ContentSection title="Who to ask">
          <p>
            Write to{" "}
            <a href="mailto:hello@kabsi.co" className="font-bold underline underline-offset-4">
              hello@kabsi.co
            </a>
            .
          </p>
        </ContentSection>

        <p className="border-t border-kb-hairline pt-8 font-bold">
          Kabsi is independent and not affiliated with Google.
        </p>
      </Section>
    </PublicLayout>
  );
}

function ContentSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <H2 className="text-3xl">{title}</H2>
      <div className="mt-4 text-kb-stone">{children}</div>
    </section>
  );
}
