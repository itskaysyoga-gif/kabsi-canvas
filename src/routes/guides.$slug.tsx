import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Clock3, ExternalLink, QrCode } from "lucide-react";
import { IndustryLinks } from "@/components/marketing/business-grid";
import { PublicLayout } from "@/components/layouts/public-layout";
import { Breadcrumbs, CtaBand, IconBadge, Photo, Section } from "@/components/marketing/parts";
import { KeyPoints } from "@/components/marketing/guide-kit";
import { GUIDE_ICONS } from "@/components/marketing/visuals";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import { Button } from "@/components/ui/button";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { photoSrc } from "@/lib/site-photos";
import { SiteImg } from "@/components/marketing/site-img";
import { ORG_LD, SITE_URL, pageHead } from "@/lib/site";

// One guide (D253, D256). Content lives in src/lib/guides.tsx, building blocks in guide-kit.tsx.
export const Route = createFileRoute("/guides/$slug")({
  loader: ({ params }) => {
    const g = guideBySlug(params.slug);
    if (!g) throw notFound();
    return { slug: g.slug };
  },
  head: ({ params }) => {
    const g = guideBySlug(params.slug);
    if (!g) return { meta: [{ title: "Guide not found | Kabsi" }] };
    const image = photoSrc(g.photo, 1600);
    return pageHead({
      title: `${g.title} | Kabsi`,
      description: g.description,
      path: `/guides/${g.slug}`,
      type: "article",
      crumbs: [
        { name: "Guides", path: "/guides" },
        { name: g.title, path: `/guides/${g.slug}` },
      ],
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: g.title,
          description: g.description,
          image: [image],
          datePublished: "2026-09-26",
          dateModified: g.updated,
          mainEntityOfPage: `${SITE_URL}/guides/${g.slug}`,
          inLanguage: "en",
          author: { "@type": "Organization", name: "Kabsi", url: SITE_URL },
          publisher: ORG_LD,
        },
      ],
    });
  },
  component: Page,
});

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Page() {
  const { slug } = Route.useLoaderData();
  const g = guideBySlug(slug)!;
  const more = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);
  return (
    <PublicLayout>
      <Section rise={false} className="pb-10 pt-8 sm:pb-12 sm:pt-12">
        <Breadcrumbs items={[{ name: "Guides", to: "/guides" }, { name: g.title }]} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-kb-stone">
              <IconBadge icon={GUIDE_ICONS[g.slug]} className="size-12 [&_svg]:size-6" />
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-4" aria-hidden="true" /> {g.minutes} min read
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" /> Updated {date(g.updated)}
              </span>
            </div>
            <h1 className="mt-5 font-display text-[clamp(2.2rem,5vw,3.5rem)] leading-[1.02] text-balance">
              {g.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-kb-stone">{g.description}</p>
            <Photo
              id={g.photo}
              priority
              sizes="(min-width: 1024px) 760px, 100vw"
              className="mt-8 aspect-[16/9]"
            />
            <div className="mt-8">
              <KeyPoints items={g.summary} />
            </div>
            <article className="mt-10 space-y-6 text-[17px] leading-8 text-kb-ink sm:text-lg [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_b]:font-bold [&>h2]:!mt-12 [&>h2]:font-display [&>h2]:text-3xl [&>h2]:leading-tight [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:pl-6">
              {g.body}
            </article>
            <aside className="mt-12 rounded-large border border-kb-hairline p-5 text-sm text-kb-stone">
              <p className="font-bold text-kb-ink">Sources</p>
              <ul className="mt-2 space-y-1.5">
                {g.sources.map((s) => (
                  <li key={s.href}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-kb-black"
                    >
                      {s.label}
                      <ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3">Kabsi is independent and not affiliated with Google.</p>
            </aside>
          </div>
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-large bg-kb-carbon text-kb-white">
              <div className="p-6">
                <KabsiMark className="size-9" />
                <p className="mt-4 text-xl font-bold leading-snug">
                  Every Google review answered, in the customer's language.
                </p>
                <p className="mt-2 text-sm leading-6 text-kb-stone-on-dark">
                  Kabsi emails you each new review with a reply ready. Nothing is posted until you
                  tap Post.
                </p>
                <Button asChild className="mt-5 w-full">
                  <Link to="/start">
                    Get set up <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
            <Link
              to="/google-review-link"
              className="kb-lift mt-4 flex items-center gap-4 rounded-large border border-kb-hairline bg-kb-white p-5"
            >
              <IconBadge icon={<QrCode />} />
              <span>
                <span className="block font-bold">Free review link and QR</span>
                <span className="block text-sm text-kb-stone">No sign-up, from any phone.</span>
              </span>
            </Link>
            <IndustryLinks className="mt-6" />
          </aside>
        </div>
      </Section>

      <Section tone="sand">
        <h2 className="font-display text-3xl leading-tight">More guides</h2>
        <ul data-stagger="" className="mt-6 grid gap-4 md:grid-cols-3">
          {more.map((m) => {
            return (
              <li key={m.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: m.slug }}
                  className="kb-lift group flex h-full flex-col overflow-hidden rounded-large bg-kb-white shadow-kb"
                >
                  <span className="block aspect-[16/9] overflow-hidden bg-kb-hairline">
                    <SiteImg
                      id={m.photo}
                      min={480}
                      sizes="(min-width: 768px) 360px, 100vw"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </span>
                  <span className="flex flex-1 items-start gap-3 p-5">
                    <IconBadge icon={GUIDE_ICONS[m.slug]} tone="sand" className="size-10" />
                    <span className="flex-1 font-bold leading-snug">{m.title}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      <CtaBand
        title="Every Google review, answered. You just tap Post."
        sub="Kabsi emails you each new review with a reply drafted in your customer's language. Nothing is posted until you approve it."
      />
    </PublicLayout>
  );
}
