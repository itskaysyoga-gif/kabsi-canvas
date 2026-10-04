import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Mail, MessageCircle } from "lucide-react";
import { IndustryLinks } from "@/components/marketing/business-grid";
import { PublicLayout } from "@/components/layouts/public-layout";
import {
  CtaBand,
  FaqList,
  IconBadge,
  PageHero,
  Photo,
  Section,
} from "@/components/marketing/parts";
import { AnswerVisual } from "@/components/marketing/visuals";
import { CONTACT_EMAIL, CONTACT_PHONE, pageHead } from "@/lib/site";
import { FAQ, faqJsonLd } from "@/lib/faq";

export const Route = createFileRoute("/faq")({
  head: () =>
    pageHead({
      title: "Kabsi FAQ | Google review replies, access, cards and pricing",
      description:
        "Straight answers about Kabsi: approvals, languages, Google access, Google Protection, Get Reviews, payment and refunds.",
      path: "/faq",
      crumbs: [{ name: "FAQ", path: "/faq" }],
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
        visual={<AnswerVisual />}
        photo="heroFaq"
      />
      <Section className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <FaqList items={FAQ} />
          <IndustryLinks className="mt-10" title="Answers for your kind of business" />
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="overflow-hidden rounded-large bg-kb-sand">
            <Photo id="hotel" sizes="320px" className="aspect-[4/3] rounded-none" />
            <div className="p-6">
              <h2 className="text-lg font-bold">Something else?</h2>
              <p className="mt-1 leading-7 text-kb-stone">A person reads every message.</p>
              <ul className="mt-5 space-y-3 text-[15px]">
                <li className="flex items-center gap-3">
                  <IconBadge icon={<Mail />} className="size-9 [&_svg]:size-4" />
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-bold underline underline-offset-4"
                  >
                    {CONTACT_EMAIL}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <IconBadge
                    icon={<MessageCircle />}
                    tone="sand"
                    className="size-9 bg-kb-white [&_svg]:size-4"
                  />
                  <span className="font-bold">{CONTACT_PHONE}</span>
                </li>
                <li className="flex items-center gap-3">
                  <IconBadge
                    icon={<BookOpen />}
                    tone="sand"
                    className="size-9 bg-kb-white [&_svg]:size-4"
                  />
                  <Link to="/guides" className="font-bold underline underline-offset-4">
                    Read the guides
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </Section>
      <CtaBand />
    </PublicLayout>
  );
}
