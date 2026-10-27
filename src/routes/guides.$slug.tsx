import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight, Clock3, QrCode } from "lucide-react";
import { IndustryLinks } from "@/components/marketing/business-grid";
import { PublicLayout } from "@/components/layouts/public-layout";
import { IconBadge } from "@/components/marketing/parts";
import { GuideClosing, GuidePhoto, InlineScan, KeyPoints } from "@/components/marketing/guide-kit";
import { GUIDES, guideBySlug } from "@/lib/guides";
import { photoSrc } from "@/lib/site-photos";
import { NOT_AFFILIATED, ORG_LD, SITE_URL, pageHead } from "@/lib/site";

// One guide (D253, D256), in Design 2's guide template: breadcrumb, the question as H1, the byline, the short answer,
// the steps, "See where you show up" with the free check, Google's own help pages, more guides and the closing band.
// Content lives in src/lib/guides.tsx, building blocks in guide-kit.tsx.
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

const PUBLISHED = "2026-09-26";
const link =
  "inline-flex min-h-11 items-center gap-2 font-bold text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1";

function Page() {
  const { slug } = Route.useLoaderData();
  const g = guideBySlug(slug)!;
  const more = GUIDES.filter((x) => x.slug !== g.slug).slice(0, 3);
  return (
    <PublicLayout>
      <section className="container-kb pt-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-small text-text-2">
          <Link
            to="/guides"
            className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text-1"
          >
            Guides
          </Link>
        </nav>
        <h1 className="mt-2 max-w-3xl font-display text-h2 font-bold text-balance text-text-1 sm:text-display">
          {g.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lead text-text-2">{g.description}</p>
        <p className="mt-5 flex max-w-2xl flex-wrap items-center gap-x-4 gap-y-1 text-small text-text-2">
          <span>
            Kabsi team, reviewed by Rashid Abou Hamzy. Published {date(PUBLISHED)}. Updated{" "}
            {date(g.updated)}.
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-4" aria-hidden="true" /> {g.minutes} min read
          </span>
        </p>
      </section>

      <section className="container-kb mt-10 pb-16 lg:pb-24">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,40rem)_1fr] lg:gap-20">
          <div className="min-w-0">
            <KeyPoints items={g.summary} />
            <article className="mt-10 space-y-6 text-body text-text-1 sm:text-lead [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_b]:font-bold [&>h2]:!mt-14 [&>h2]:font-display [&>h2]:text-h3 [&>h2]:font-bold [&>ul]:list-disc [&>ul]:space-y-1 [&>ul]:ps-6">
              {g.body}
            </article>
            <div className="mt-14">
              <InlineScan />
            </div>
            <div className="mt-12">
              <h2 className="font-display text-h3 font-bold text-text-1">
                Google&apos;s own help page
              </h2>
              <ul className="mt-3">
                {g.sources.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={link}>
                      {s.label} <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-small text-text-2">{NOT_AFFILIATED}</p>
            </div>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="hidden overflow-hidden rounded-panel lg:block">
              <GuidePhoto
                slug={g.slug}
                priority
                sizes="30vw"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div>
              <h2 className="font-display text-h3 font-bold text-text-1">More guides</h2>
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {more.map((m) => (
                  <li key={m.slug}>
                    <Link
                      to="/guides/$slug"
                      params={{ slug: m.slug }}
                      className="flex min-h-11 items-center justify-between gap-3 py-3 text-small font-semibold text-text-1 hover:underline"
                    >
                      {m.title}
                      <ArrowUpRight className="size-4 shrink-0 text-text-2" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/guides" className={link + " mt-2 text-small"}>
                All guides
              </Link>
            </div>
            <Link
              to="/google-review-link"
              className="press flex items-center gap-4 rounded-card border border-line bg-surface-1 p-5 shadow-rest hover:border-line-strong"
            >
              <IconBadge icon={<QrCode />} />
              <span>
                <span className="block font-bold text-text-1">Free review link and QR code</span>
                <span className="block text-small text-text-2">No sign-up, from any phone.</span>
              </span>
            </Link>
            <IndustryLinks />
          </aside>
        </div>
      </section>

      <GuideClosing />
    </PublicLayout>
  );
}
