import { createFileRoute } from "@tanstack/react-router";
import { PublicLayout } from "@/components/layouts/public-layout";
import { H2, PageHero, Section } from "@/components/marketing/parts";
import { pageHead } from "@/lib/site";

export const Route = createFileRoute("/about")({
  head: () =>
    pageHead({
      title: "About Kabsi",
      description:
        "Kabsi is an independent product built by Rashid to help local businesses answer Google reviews and look after their Google profile.",
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
        title="About Kabsi"
        sub="A small independent product for local businesses."
        crumbs={[{ name: "About" }]}
      />

      <Section className="max-w-3xl space-y-10 text-[17px] leading-8">
        <section>
          <H2 className="text-3xl">Built for local businesses</H2>
          <p className="mt-4 text-kb-stone">
            Kabsi is a small independent product that helps local businesses answer Google reviews
            and look after their Google profile. It is built and run by Rashid.
          </p>
        </section>

        <section>
          <H2 className="text-3xl">The name</H2>
          <p className="mt-4 text-kb-stone">
            The name is Lebanese for "press": one press is all it takes to approve a reply.
          </p>
        </section>

        <section>
          <H2 className="text-3xl">Independent and available</H2>
          <p className="mt-4 text-kb-stone">
            Kabsi is independent and not affiliated with Google. Contact{" "}
            <a href="mailto:hello@kabsi.co" className="font-bold underline underline-offset-4">
              hello@kabsi.co
            </a>
            .
          </p>
        </section>

        <p className="border-t border-kb-hairline pt-8 font-bold">
          We watch your listing. You run your business.
        </p>
      </Section>
    </PublicLayout>
  );
}
