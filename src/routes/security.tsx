import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { H2, PageHero, Section } from "@/components/marketing/parts";
import { KABSI_GROUP_ID, KABSI_GROUP_NAME, pageHead } from "@/lib/site";

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
            Kabsi cannot post on its own. Every Google action happens inside Kabsi, for the business
            that asked. Kabsi gives no one else, partners included, a way to read or write your
            Google data.
          </p>
        </ContentSection>

        <ContentSection title="Disconnect Kabsi">
          <p>
            In Kabsi, open <strong>Settings</strong> and choose{" "}
            <strong>Disconnect Kabsi from Google</strong>. Only the signed-in owner can do it. Kabsi
            stops at once, cancels what was waiting for your approval and then removes its own
            Manager access. You get an email that confirms it. If Google does not let Kabsi remove
            itself, our team does it within 7 business days and tells you the date.
          </p>
          <p className="mt-4">
            You can also do it on Google, without asking us. Open{" "}
            <strong>Business Profile settings</strong>, choose <strong>People and access</strong>,
            then remove <strong>{KABSI_GROUP_NAME}</strong> (group ID {KABSI_GROUP_ID}). Kabsi loses
            access to that profile at once.
          </p>
        </ContentSection>

        <ContentSection title="Notice of any change">
          <p>
            When Kabsi accepts your Manager invitation, or anything about its access changes, we
            email you within 48 hours to say what changed and how to remove Kabsi. This is separate
            from the notices Google sends.
          </p>
        </ContentSection>

        <ContentSection title="How you sign in, and what we never ask">
          <p>
            You sign in with a one-time code sent to your email. There are no passwords. Kabsi never
            asks for your Google password or a Google verification code, and does not store a Google
            token of yours. Kabsi's own access to Google is held on our servers and never reaches
            your browser or anyone else's.
          </p>
          <p className="mt-4">
            Links in Kabsi emails work once, expire after 72 hours and belong to the person they
            were sent to. Opening one never does anything by itself. Profile changes and reviews
            that need care also need that person signed in.
          </p>
        </ContentSection>

        <ContentSection title="How your data is handled">
          <p>
            Your data is stored in the EU, in Frankfurt, and encrypted in transit. Each business's
            data is separated at the database level, so only its members, and Kabsi staff when
            helping you, can read it. Review text and reviewer names that come from Google are
            removed 30 days after Google last returned them. We never sell Google data, use it for
            advertising or use it to train AI models. People at Kabsi read it only with your
            consent, to keep Kabsi secure, or when the law requires it. Read the{" "}
            <Link to="/privacy" className="font-bold underline underline-offset-4">
              privacy policy
            </Link>{" "}
            for the full list of what we keep and who helps us run Kabsi.
          </p>
        </ContentSection>

        <ContentSection title="Who to ask">
          <p>
            Write to{" "}
            <a href="mailto:hello@kabsi.co" className="font-bold underline underline-offset-4">
              hello@kabsi.co
            </a>
            . A person replies.
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
