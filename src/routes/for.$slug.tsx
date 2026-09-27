import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Check, QrCode, Receipt } from "lucide-react";
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
import { VERTICALS, VERTICAL_REDIRECTS, verticalBySlug } from "@/lib/verticals";
import { faqJsonLd } from "@/lib/faq";
import { photoSrc } from "@/lib/site-photos";
import { PRICES, SITE_URL, pageHead } from "@/lib/site";

// Industry pages (D258, D259). Content lives in src/lib/verticals.tsx; every example is fictional and
// labelled. Each page has its own headings, example and FAQ so no two pages repeat each other.
export const Route = createFileRoute("/for/$slug")({
  loader: ({ params }) => {
    const moved = VERTICAL_REDIRECTS[params.slug];
    if (moved) throw redirect({ to: "/for/$slug", params: { slug: moved }, statusCode: 301 });
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
      crumbs: [
        { name: "For your business", path: "/for" },
        { name: v.label, path: `/for/${v.slug}` },
      ],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: v.title,
          description: v.description,
          abstract: v.summary,
          url,
          inLanguage: "en",
          isPartOf: { "@id": `${SITE_URL}/#website` },
          primaryImageOfPage: { "@type": "ImageObject", url: photoSrc(v.hero, 1200) },
        },
        {
          "@context": "https://schema.org",
          "@type": "Service",
          name: `Google Business Profile care for ${v.name}`,
          serviceType: "Google Business Profile management",
          description: v.summary,
          url,
          areaServed: "Worldwide",
          audience: { "@type": "BusinessAudience", name: v.label },
          provider: { "@id": `${SITE_URL}/#organization`, "@type": "Organization", name: "Kabsi" },
          offers: {
            "@type": "Offer",
            name: "Kabsi Pro, 6 months",
            price: PRICES.pro6,
            priceCurrency: "USD",
            url: `${SITE_URL}/pricing`,
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
      <PageHero
        eyebrow={`For ${v.name}`}
        title={v.h1}
        sub={v.sub}
        photo={v.hero}
        crumbs={[{ name: "For your business", to: "/for" }, { name: v.label }]}
      >
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

      <Section className="pb-0 sm:pb-0">
        <div className="rounded-large border-l-4 border-kb-yellow bg-kb-sand p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">In short</p>
          <p className="mt-2 max-w-3xl text-lg leading-8 text-kb-ink">
            {v.summary} Nothing is posted to Google until you approve it.
          </p>
          <p className="mt-3 text-[15px] leading-7 text-kb-stone">
            Kabsi Pro is ${PRICES.pro6} for 6 months or ${PRICES.pro12} for 12 months, paid once.{" "}
            <Link to="/pricing" className="font-bold text-kb-ink underline underline-offset-4">
              See pricing
            </Link>
          </p>
        </div>
      </Section>

      <Section>
        <Eyebrow>What gets in the way</Eyebrow>
        <H2>{v.headings.pains}</H2>
        <div className="mt-10">
          <IconGrid items={v.pains} />
        </div>
      </Section>

      <Section tone="sand">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <Eyebrow>A reply you approve</Eyebrow>
            <H2>{v.headings.example}</H2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
              Each new review arrives by email with a draft reply. Edit it or post it as it is.
              Nothing is written to Google until you approve it.
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-kb-stone">{v.exampleNote}</p>
            <p className="mt-6 text-[15px]">
              <Link
                to="/guides/$slug"
                params={{ slug: v.guide.slug }}
                className="inline-flex items-center gap-2 font-bold underline underline-offset-4"
              >
                <BookOpen className="size-4" aria-hidden="true" /> Guide: {v.guide.title}
              </Link>
            </p>
          </div>
          <Example {...v.example} />
        </div>
      </Section>

      <Section>
        <Eyebrow>What Kabsi does for you</Eyebrow>
        <H2>{v.headings.helps}</H2>
        <div
          className={
            v.side
              ? "mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start"
              : "mt-10"
          }
        >
          <div
            data-stagger=""
            className={
              v.side ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            }
          >
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
            <H2>{v.headings.card}</H2>
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
            <div className="mt-6 flex flex-col gap-3 text-[15px] sm:flex-row sm:gap-6">
              <Link
                to="/google-review-link"
                className="inline-flex items-center gap-2 font-bold underline underline-offset-4"
              >
                <QrCode className="size-4" aria-hidden="true" /> Free review link and QR code
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 font-bold underline underline-offset-4"
              >
                <Receipt className="size-4" aria-hidden="true" /> Card prices
              </Link>
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
            <p className="mt-6 text-[15px] text-kb-stone">
              More answers in the{" "}
              <Link to="/faq" className="font-bold text-kb-ink underline underline-offset-4">
                full FAQ
              </Link>
              .
            </p>
          </div>
          <aside>
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
