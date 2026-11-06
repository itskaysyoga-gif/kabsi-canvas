// Guides 3: the article page (Design 9 system: ivory reading area, charcoal type, one yellow action, the black band at
// the end). Order: breadcrumb, the question as H1, the answer in two sentences, the byline and the date, the cover, In
// short, the free check box, the contents (long guides), the sections (each a question, a one-paragraph answer, then the
// detail), what Kabsi does, questions, sources with the day each was read, related guides and industry pages, and the
// closing band with the free check and Start free.
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useStartFree } from "@/components/auth/use-start-free";
import { ArrowRight, ArrowUpRight, Check, Clock3 } from "lucide-react";
import { ScanBox } from "@/components/kabsi/scan-box";
import { KabsiMark, TrialLine } from "@/components/kabsi/ui";
import { GuidePublic } from "@/components/marketing/guide-links";
import { GuideImage, TopicPill } from "@/components/marketing/guide-photo";
import { Marked } from "@/components/kabsi/highlight";
import { guideLook } from "@/content/guides/look";
import type { GuideDoc, GuideMeta } from "@/content/guides/types";
import { NOT_AFFILIATED } from "@/lib/site";
import { track } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export const longDate = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

const link =
  "inline-flex min-h-11 items-center gap-2 font-bold text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1";

const cta = (guide: string, box: "after_answer" | "end" | "start_free") => () =>
  track("guide_cta_clicked", { guide, box });

function Byline({ g }: { g: GuideMeta; sources: GuideDoc["sources"] }) {
  return (
    <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-text-2">
      <span>
        By Kabsi. Published {longDate(g.publishAt)}.
        {g.updated > g.publishAt.slice(0, 10) ? ` Updated ${longDate(g.updated)}.` : ""}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Clock3 className="size-4" aria-hidden="true" /> {g.minutes} min read
      </span>
    </p>
  );
}

export function checkedLine(doc: Pick<GuideDoc, "checked" | "sources">) {
  const googleOnly = doc.sources.every((s) =>
    /^https:\/\/(support|developers)\.google\.com\//.test(s.url),
  );
  return googleOnly
    ? `Checked against Google's help pages on ${longDate(doc.checked)}.`
    : `Checked against Google's help pages and the other sources below on ${longDate(doc.checked)}.`;
}

function InShort({ items }: { items: string[] }) {
  return (
    <aside
      aria-labelledby="in-short"
      className="rounded-panel border border-line bg-surface-1 p-5 sm:p-7"
    >
      <h2 id="in-short" className="font-display text-h3 font-bold text-text-1">
        In short
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((t) => (
          <li key={t} className="flex gap-3 text-body text-text-1">
            <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-kb-green text-kb-white">
              <Check className="size-3.5" aria-hidden="true" />
            </span>
            {t}
          </li>
        ))}
      </ul>
    </aside>
  );
}

function CheckBox({ slug }: { slug: string }) {
  return (
    <aside
      aria-labelledby="guide-check"
      className="rounded-panel border border-line-strong bg-surface-1 p-5 sm:p-7"
    >
      <h2 id="guide-check" className="font-display text-h3 font-bold text-text-1">
        See what Google shows about you
      </h2>
      <p className="mt-2 text-body text-text-2">
        Type your business and Kabsi reads your Google profile and searches around it, like a
        customer.
      </p>
      <ScanBox id="guide-scan" className="mt-5" onStart={cta(slug, "after_answer")} />
    </aside>
  );
}

function Contents({ doc }: { doc: GuideDoc }) {
  const items = [
    ...doc.sections.map((s) => ({ id: s.id, label: s.heading })),
    { id: "kabsi", label: doc.kabsi.heading },
    ...(doc.faqs?.length ? [{ id: "questions", label: "Questions owners ask" }] : []),
    { id: "sources", label: "Sources" },
  ];
  return (
    <nav aria-labelledby="contents" className="border-y border-line py-5">
      <h2 id="contents" className="text-title font-bold text-text-1">
        In this guide
      </h2>
      <ol className="mt-3 space-y-1">
        {items.map((it, i) => (
          <li key={it.id} className="flex gap-3 text-small">
            <span className="w-5 shrink-0 text-text-2">{i + 1}.</span>
            <a
              href={`#${it.id}`}
              className="text-text-1 underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
            >
              {it.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

const prose =
  "space-y-5 text-body text-text-1 sm:text-lead [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_b]:font-bold [&_h3]:font-display [&_h3]:text-title [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:ps-6 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:ps-6";

function Section({ id, heading, children }: { id: string; heading: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-24">
      <h2
        id={id}
        className="font-display text-h3 font-bold text-balance text-text-1 sm:text-[1.75rem] sm:leading-[1.2]"
      >
        {heading}
      </h2>
      <div className={cn("mt-4", prose)}>{children}</div>
    </section>
  );
}

function Sources({ doc }: { doc: GuideDoc }) {
  return (
    <section aria-labelledby="sources" className="scroll-mt-24">
      <h2 id="sources" className="font-display text-h3 font-bold text-text-1">
        Sources
      </h2>
      <p className="mt-2 text-small text-text-2">{checkedLine(doc)}</p>
      <ul className="mt-3 divide-y divide-line border-y border-line">
        {doc.sources.map((s) => (
          <li key={s.url} className="py-2">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className={link}>
              {s.title} <ArrowUpRight className="size-4 shrink-0" aria-hidden />
            </a>
            <span className="block text-small text-text-2">Read on {longDate(s.read)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-small text-text-2">{NOT_AFFILIATED}</p>
    </section>
  );
}

function Related({
  related,
  industries,
}: {
  related: GuideMeta[];
  industries: { slug: string; name: string }[];
}) {
  if (!related.length && !industries.length) return null;
  return (
    <section aria-labelledby="related" className="container-kb pb-16 lg:pb-24">
      <div className="border-t border-line pt-12">
        <h2 id="related" className="font-display text-h2 font-bold text-text-1">
          <Marked text="Read next" mark="next" />
        </h2>
        {related.length ? (
          <ul className="mt-6 grid gap-3 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to="/guides/$slug"
                  params={{ slug: r.slug }}
                  className="press group flex h-full flex-col overflow-hidden rounded-card border border-line bg-surface-1 shadow-rest hover:border-line-strong"
                >
                  <GuideImage slug={r.slug} ratio="16/9" sizes="(min-width: 768px) 380px, 100vw" />
                  <span className="flex flex-1 flex-col p-5">
                    <TopicPill>{guideLook(r.slug).group}</TopicPill>
                    <span className="mt-3 text-title font-bold text-text-1">{r.title}</span>
                    <span className="mt-2 line-clamp-2 flex-1 text-small text-text-2">
                      {r.description}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-small font-bold text-text-1">
                      Read the guide <ArrowRight className="size-4" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {industries.length ? (
          <div className="mt-8">
            <h3 className="text-title font-bold text-text-1">For your kind of business</h3>
            <ul className="mt-2 flex flex-wrap gap-x-6">
              {industries.map((i) => (
                <li key={i.slug}>
                  <a href={`/for/${i.slug}`} className={link}>
                    Kabsi for {i.name.toLowerCase()} <ArrowRight className="size-4" aria-hidden />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Link to="/guides" className={cn(link, "mt-6")}>
          All guides
        </Link>
      </div>
    </section>
  );
}

/** The closing band: the free check again, and Start free for an owner who has seen enough. */
export function GuideEnd({ slug }: { slug: string }) {
  // Launch 2 part C (30.36 item 8): one door to sign-up, the same as Pricing's.
  const door = useStartFree();
  return (
    <section aria-labelledby="guide-end" className="theme-dark border-t border-line bg-band">
      <div className="container-kb section-y">
        <div className="max-w-[40rem]">
          <h2 id="guide-end" className="font-display text-h2 font-bold text-text-1">
            Let Kabsi look after this.
          </h2>
          <p className="mt-4 text-lead text-text-2">
            Start with the free check. It shows what Google shows about your business today.
          </p>
          <ScanBox id="guide-end-scan" className="mt-8" onStart={cta(slug, "end")} />
          <p className="mt-6 text-body text-text-1">
            <Link
              to={door.to}
              {...(door.search ? { search: door.search } : {})}
              onClick={cta(slug, "start_free")}
              className="inline-flex min-h-11 items-center gap-2 font-bold underline decoration-text-3 underline-offset-4 hover:decoration-text-1"
            >
              Start free <ArrowRight className="size-4" aria-hidden />
            </Link>
          </p>
          <TrialLine className="mt-1" />
        </div>
      </div>
    </section>
  );
}

export function GuideArticle({
  doc,
  meta,
  related,
  industries,
  publicSlugs,
}: {
  doc: GuideDoc;
  meta: GuideMeta;
  related: GuideMeta[];
  industries: { slug: string; name: string }[];
  publicSlugs: string[];
}) {
  const long = doc.sections.length >= 5;
  return (
    <GuidePublic.Provider value={new Set(publicSlugs)}>
      <div className="container-kb pt-8 sm:pt-12">
        <nav aria-label="Breadcrumb" className="text-small text-text-2">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li>
              <Link
                to="/guides"
                className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text-1"
              >
                Guides
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li>{doc.topic}</li>
          </ol>
        </nav>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,38rem)_1fr] lg:items-center lg:gap-16">
          <header className="min-w-0">
            <p className="mt-2">
              <TopicPill>{guideLook(doc.slug).group}</TopicPill>
            </p>
            <h1 className="mt-3 font-display text-h2 font-bold text-balance text-text-1 sm:text-display">
              <Marked text={doc.title} mark={guideLook(doc.slug).mark} />
            </h1>
            <p className="mt-5 text-lead text-text-1">{doc.answer}</p>
            <Byline g={meta} sources={doc.sources} />
            <p className="mt-1 text-small text-text-2">{checkedLine(doc)}</p>
          </header>
          <GuideImage
            slug={doc.slug}
            ratio="3/2"
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="rounded-panel"
          />
        </div>
      </div>

      <div className="container-kb mt-10 pb-16 lg:pb-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,38rem)_1fr] lg:gap-16">
          <div className="min-w-0 space-y-12">
            <InShort items={doc.inShort} />
            <CheckBox slug={doc.slug} />
            {long ? (
              <div className="lg:hidden">
                <Contents doc={doc} />
              </div>
            ) : null}
            <article className="space-y-14">
              {doc.sections.map((s) => (
                <Section key={s.id} id={s.id} heading={s.heading}>
                  <p>{s.answer}</p>
                  {s.body}
                </Section>
              ))}
              {doc.kabsi.heading ? (
                <section
                  aria-labelledby="kabsi"
                  className="scroll-mt-24 rounded-panel border border-line bg-surface-1 p-5 sm:p-7"
                >
                  <div className="flex items-center gap-3">
                    <KabsiMark className="size-8" />
                    <h2 id="kabsi" className="font-display text-h3 font-bold text-text-1">
                      {doc.kabsi.heading}
                    </h2>
                  </div>
                  <div className={cn("mt-4", prose, "sm:text-body")}>{doc.kabsi.body}</div>
                </section>
              ) : null}
              {doc.faqs?.length ? (
                <section aria-labelledby="questions" className="scroll-mt-24">
                  <h2
                    id="questions"
                    className="font-display text-h3 font-bold text-text-1 sm:text-[1.75rem]"
                  >
                    Questions owners ask
                  </h2>
                  <dl className="mt-4 divide-y divide-line border-y border-line">
                    {doc.faqs.map((f) => (
                      <div key={f.q} className="py-4">
                        <dt className="text-title font-bold text-text-1">{f.q}</dt>
                        <dd className="mt-1.5 text-body text-text-2">{f.a}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </article>
            <Sources doc={doc} />
          </div>
          {long ? (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <Contents doc={doc} />
              </div>
            </aside>
          ) : null}
        </div>
      </div>
      <Related related={related} industries={industries} />
      <GuideEnd slug={doc.slug} />
    </GuidePublic.Provider>
  );
}
