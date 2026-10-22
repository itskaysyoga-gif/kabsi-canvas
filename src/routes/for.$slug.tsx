import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Camera, Check, QrCode, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import {
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
import { VERTICALS, VERTICAL_GONE, VERTICAL_REDIRECTS, verticalBySlug } from "@/lib/verticals";
import { faqJsonLd } from "@/lib/faq";
import { photoSrc } from "@/lib/site-photos";
import { CTA_CHECK, SITE_URL, pageHead } from "@/lib/site";

// Industry pages (D258, D259). Content lives in src/lib/verticals.tsx; every example is fictional and
// labelled. Each page has its own headings, example and FAQ so no two pages repeat each other.
export const Route = createFileRoute("/for/$slug")({
  loader: ({ params }) => {
    const moved = VERTICAL_REDIRECTS[params.slug];
    if (moved) throw redirect({ to: "/for/$slug", params: { slug: moved }, statusCode: 301 });
    // The kinds of business that no longer have their own page go to the /for page (P0.8-13).
    if (VERTICAL_GONE.includes(params.slug)) throw redirect({ to: "/for", statusCode: 301 });
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
            <Link to="/google-profile-check">
              {CTA_CHECK} <ArrowRight />
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
            Every plan starts with a 14-day Pro trial and no card.{" "}
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
              v.side ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
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
        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
            <IconBadge icon={<Camera />} />
            <h3 className="mt-5 text-xl font-bold">Photos customers look for</h3>
            <ul className="mt-4 space-y-3">
              {v.photoTypes.map((t) => (
                <li key={t} className="flex gap-3 leading-7">
                  <Check className="mt-1 size-4 shrink-0 text-kb-green" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-kb-stone">
              Kabsi checks each photo for size and clarity before you post it. You choose what goes
              up.
            </p>
          </div>
          <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
            <IconBadge icon={<ShieldCheck />} />
            <h3 className="mt-5 text-xl font-bold">How replies are kept careful</h3>
            <ul className="mt-4 space-y-3">
              {v.careRules.map((t) => (
                <li key={t} className="flex gap-3 leading-7">
                  <Check className="mt-1 size-4 shrink-0 text-kb-green" aria-hidden="true" /> {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-6 text-kb-stone">
              You read every reply before it is published, and nothing goes out without your
              approval.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <div>
          <div>
            <Eyebrow>Getting reviews</Eyebrow>
            <H2>Where to put your review link</H2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-kb-stone">
              Your review link and QR code are free in every country, and they work with your own QR
              codes and NFC cards. Put them where customers already are: on the counter, on
              receipts, on a table tent, or in a follow-up message.
            </p>
            <p className="mt-4 max-w-xl text-[15px] text-kb-stone">What works for {v.name}:</p>
            <ul className="mt-4 space-y-3">
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
            </div>
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
