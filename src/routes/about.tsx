import { createFileRoute, Link } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { H2, PageHero, Section } from "@/components/marketing/parts";
import { CONTACT_EMAIL, OPERATOR_NAME, pageHead } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About Kabsi",
      description: `Kabsi is operated by ${OPERATOR_NAME}. It helps local businesses answer reviews and look after their listing, and a person answers when you write.`,
      path: "/about",
      crumbs: [{ name: "About", path: "/about" }],
    }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="About"
        title="Who runs Kabsi"
        sub="A small independent product for local businesses, run by a person you can write to."
        crumbs={[{ name: "About" }]}
      />

      <Section>
        <div className="max-w-3xl space-y-10 text-[17px] leading-8">
          <section>
            <H2 className="text-3xl">Who runs it</H2>
            <p className="mt-4 text-kb-stone">
              Kabsi is operated by {OPERATOR_NAME}. Contact: {CONTACT_EMAIL}. {OPERATOR_NAME} is
              the person responsible for your data. Kabsi serves businesses in any country.
            </p>
          </section>

          <section>
            <H2 className="text-3xl">Why it exists</H2>
            <p className="mt-4 text-kb-stone">
              A business that customers find on Google Maps needs its reviews answered and its
              listing kept right: the hours, the phone number, the photos. For an owner who is busy
              serving customers, that is easy to leave for later. Kabsi prepares the replies and the
              updates, watches the listing, and waits for your approval before anything is
              published.
            </p>
          </section>

          <section>
            <H2 className="text-3xl">The name</H2>
            <p className="mt-4 text-kb-stone">
              The name is Arabic for "press": one press is all it takes to approve a reply.
            </p>
          </section>

          {/* W4 video slot (KABSI-VIDEO): add it here once the video exists. Nothing is shown until then. */}

          <section>
            <H2 className="text-3xl">How to reach a person</H2>
            <p className="mt-4 text-kb-stone">
              Write to{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-bold underline underline-offset-4"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and a person replies. You can also{" "}
              <Link to="/setup-call" className="font-bold underline underline-offset-4">
                book a free setup call
              </Link>
              .
            </p>
          </section>

          <section>
            <H2 className="text-3xl">Independent</H2>
            <p className="mt-4 text-kb-stone">
              Kabsi is independent. It is not affiliated with, sponsored by or endorsed by Google.
            </p>
          </section>

          <p className="border-t border-kb-hairline pt-8 font-bold">
            We watch your listing. You run your business.
          </p>
        </div>
      </Section>
    </PublicLayout>
  );
}
