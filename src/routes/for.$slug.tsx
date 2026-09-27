import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import {
  CardRender,
  CtaBand,
  Eyebrow,
  FaqList,
  FeatureCard,
  H2,
  IconBadge,
  PageHero,
  Photo,
  Section,
} from "@/components/marketing/parts";
import { Callout, Example, IconGrid } from "@/components/marketing/guide-kit";
import { Button } from "@/components/ui/button";
import { VERTICALS, verticalBySlug } from "@/lib/verticals";
import { faqJsonLd } from "@/lib/faq";
import { photoSrc } from "@/lib/site-photos";
import { SITE_URL, pageHead } from "@/lib/site";

// Industry pages (D258). Content lives in src/lib/verticals.tsx; every example is fictional and labelled.
export const Route = createFileRoute("/for/$slug")({
  loader: ({ params }) => {
    const v = verticalBySlug(params.slug);
    if (!v) throw notFound();
    return { slug: v.slug };
  },
  head: ({ params }) => {
    const v = verticalBySlug(params.slug);
    if (!v) return { meta: [{ title: "Page not found | Kabsi" }] };
    const url = `${SITE_URL}/for/${v.slug}`;
    return pageHead({
      title: v.title,
      description: v.description,
      path: `/for/${v.slug}`,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: v.title,
          description: v.description,
          url,
          primaryImageOfPage: { "@type": "ImageObject", url: photoSrc(v.hero, 1200) },
          breadcrumb: {
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Kabsi", item: SITE_URL },
              { "@type": "ListItem", position: 2, name: v.label, item: url },
            ],
          },
        },
        faqJsonLd(v.faqs),
      ],
    });
  },
  component: Page,
});

function Page() {
  const { slug } = Route.useLoaderData();
  const v = verticalBySlug(slug)!;
  const others = VERTICALS.filter((x) => x.slug !== v.slug);
  return (
    <PublicLayout>
      <PageHero eyebrow={`For ${v.name}`} title={v.h1} sub={v.sub} photo={v.hero}>
        <div className="mt-9 grid gap-3 sm:flex">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/start">
              Get set up <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="w-full border-kb-white text-kb-white hover:bg-kb-white/10 sm:w-auto"
          >
            <Link to="/how-it-works">How it works</Link>
          </Button>
        </div>
      </PageHero>

      <Section>
        <Eyebrow>What gets in the way</Eyebrow>
        <H2>The Google profile is one more job.</H2>
        <div className="mt-10">
          <IconGrid items={v.pains} />
        </div>
      </Section>

      <Section tone="sand">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <Eyebrow>A reply you approve</Eyebrow>
            <H2>Drafted in the reviewer's language. Posted only when you tap.</H2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
              Each new review arrives by email with a draft reply. Edit it or post it as it is.
              Nothing is written to Google until you approve it.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-kb-stone">{v.exampleNote}</p>
          </div>
          <Example {...v.example} />
        </div>
      </Section>

      <Section>
        <Eyebrow>What Kabsi does for you</Eyebrow>
        <H2>Four jobs, handled by email.</H2>
        <div
          className={
            v.side
              ? "mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start"
              : "mt-10"
          }
        >
          <div data-stagger="" className="grid gap-4 sm:grid-cols-2">
            {v.helps.map((h) => (
              <FeatureCard key={h.title} icon={h.icon} title={h.title}>
                {h.text}
              </FeatureCard>
            ))}
          </div>
          {v.side ? (
            <Photo
              id={v.side}
              sizes="(min-width: 1024px) 420px, 100vw"
              className="aspect-[4/5] lg:sticky lg:top-24"
            />
          ) : null}
        </div>
      </Section>

      <Section tone="sand">
        <div className="grid items-center gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:gap-14">
          <div>
            <Eyebrow>The review card</Eyebrow>
            <H2>One tap opens your Google review page.</H2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
              An optional NFC and QR card. Customers tap their phone or scan the code, and Google's
              own review form opens. Where it works best:
            </p>
            <ul className="mt-6 space-y-3">
              {v.placements.map((p) => (
                <li key={p} className="flex gap-3 text-[17px] leading-7">
                  <IconBadge icon={<Check />} className="mt-0.5 size-7 [&_svg]:size-4" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-8 max-w-xl">
              <Callout kind="warn" title={v.care.title}>
                {v.care.text}
              </Callout>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <CardRender />
          </div>
        </div>
      </Section>

      <Section>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          <div className="min-w-0">
            <Eyebrow>Questions</Eyebrow>
            <H2>What {v.name} ask us.</H2>
            <div className="mt-8">
              <FaqList items={v.faqs} />
            </div>
          </div>
          <aside className="space-y-6">
            <Link
              to="/guides/$slug"
              params={{ slug: v.guide.slug }}
              className="kb-lift flex gap-4 rounded-large bg-kb-sand p-5"
            >
              <IconBadge icon={<BookOpen />} className="size-10" />
              <span>
                <span className="block text-xs font-bold uppercase tracking-wider text-kb-stone">
                  Free guide
                </span>
                <span className="mt-1 block font-bold leading-6">{v.guide.title}</span>
              </span>
            </Link>
            <nav aria-label="Other kinds of business">
              <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">
                Kabsi for other businesses
              </p>
              <ul className="mt-3 divide-y divide-kb-hairline border-y border-kb-hairline">
                {others.map((o) => (
                  <li key={o.slug}>
                    <Link
                      to="/for/$slug"
                      params={{ slug: o.slug }}
                      className="flex items-center gap-3 py-3 font-bold hover:text-kb-stone"
                    >
                      <IconBadge icon={o.icon} tone="sand" className="size-8 [&_svg]:size-4" />
                      {o.label}
                      <ArrowRight className="ml-auto size-4" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      </Section>

      <CtaBand />
    </PublicLayout>
  );
}
