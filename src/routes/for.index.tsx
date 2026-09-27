import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { CtaBand, Eyebrow, H2, IconBadge, PageHero, Section } from "@/components/marketing/parts";
import { SiteImg } from "@/components/marketing/site-img";
import { VERTICALS } from "@/lib/verticals";
import { SITE_URL, pageHead } from "@/lib/site";

// Hub for the industry pages (D259): one card per kind of business, each linking to its own page.
export const Route = createFileRoute("/for/")({
  head: () =>
    pageHead({
      title: "Kabsi for your business | Restaurants, clinics, salons and more",
      description:
        "How Kabsi looks after the Google Business Profile of restaurants, cafés, clinics, salons, hotels, garages, shops and florists. You approve every post.",
      path: "/for",
      crumbs: [{ name: "For your business", path: "/for" }],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Kabsi for your business",
          url: `${SITE_URL}/for`,
          isPartOf: { "@id": `${SITE_URL}/#website` },
          mainEntity: {
            "@type": "ItemList",
            itemListElement: VERTICALS.map((v, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: v.label,
              url: `${SITE_URL}/for/${v.slug}`,
            })),
          },
        },
      ],
    }),
  component: Page,
});

function Page() {
  return (
    <PublicLayout>
      <PageHero
        eyebrow="For your business"
        title="Made for businesses people find on Google Maps."
        sub="Every kind of local business gets reviews, questions about hours and the odd wrong phone number. Here is what Kabsi does for yours."
        crumbs={[{ name: "For your business" }]}
        visual={<Collage />}
        visualClassName="max-md:hidden"
      />
      <Section>
        <Eyebrow>Pick your business</Eyebrow>
        <H2>Eight kinds of business, one simple rule.</H2>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-kb-stone">
          Kabsi drafts, you decide. Nothing is posted to Google until you approve it, whatever you
          run.
        </p>
        <ul data-stagger="" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VERTICALS.map((v) => (
            <li key={v.slug}>
              <Link
                to="/for/$slug"
                params={{ slug: v.slug }}
                className="kb-lift group flex h-full flex-col overflow-hidden rounded-large border border-kb-hairline bg-kb-white hover:border-kb-black"
              >
                <span className="block aspect-[4/3] overflow-hidden bg-kb-sand">
                  <SiteImg
                    id={v.hero}
                    min={480}
                    sizes="(min-width: 1024px) 270px, (min-width: 640px) 50vw, 100vw"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="flex items-center gap-3">
                    <IconBadge icon={v.icon} className="size-9 [&_svg]:size-4" />
                    <span className="text-lg font-bold leading-tight">{v.label}</span>
                  </span>
                  <span className="mt-3 flex-1 text-[15px] leading-6 text-kb-stone">
                    {v.description}
                  </span>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                    Kabsi for {v.name} <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
      <CtaBand />
    </PublicLayout>
  );
}

/** Hero visual: four of the business photos as a small collage (the hub gives an overview). */
function Collage() {
  const ids = ["restaurant", "salon", "garage", "hotel"] as const;
  return (
    <div className="grid w-full max-w-md grid-cols-2 gap-3" aria-hidden="true">
      {ids.map((id, i) => (
        <div
          key={id}
          className={
            i % 2 === 1
              ? "aspect-[4/5] translate-y-6 overflow-hidden rounded-large ring-1 ring-kb-white/10"
              : "aspect-[4/5] overflow-hidden rounded-large ring-1 ring-kb-white/10"
          }
        >
          <SiteImg
            id={id}
            min={480}
            priority={i < 2}
            sizes="(min-width: 768px) 220px, 45vw"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}
