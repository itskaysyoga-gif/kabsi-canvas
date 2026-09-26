import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, FaqList, PageHero, Section } from "@/components/marketing/parts";
import { CONTACT_EMAIL, CONTACT_PHONE, pageHead } from "@/lib/site";
import { FAQ, faqJsonLd } from "@/lib/faq";

export const Route = createFileRoute("/faq")({
  head: () =>
    pageHead({
      title: "Questions | Kabsi",
      description:
        "Straight answers about Kabsi: approvals, languages, Google access, Listing Shield, the card, payment and refunds.",
      path: "/faq",
      jsonLd: [faqJsonLd()],
    }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="Questions"
        title="Straight answers."
        sub="If yours isn't here, write to us. A person replies."
      />
      <Section>
        <FaqList items={FAQ} />
        <p className="mt-10 text-kb-stone">
          Something else? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-kb-ink underline">
            {CONTACT_EMAIL}
          </a>{" "}
          or message {CONTACT_PHONE}.
        </p>
      </Section>
      <CtaBand />
    </PublicLayout>
  );
}
