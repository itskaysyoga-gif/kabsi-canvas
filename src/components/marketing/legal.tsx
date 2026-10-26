import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { Prose } from "@/components/kabsi/d2-parts";
import { SectionHead } from "@/components/kabsi/ui";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type TocItem = { id: string; text: string };

// Privacy, Terms, Security and the partner terms in the design studio's layout (Design 2, LegalPage): plain words
// first, a five line summary, a contents list (folded on a phone, sticky on desktop), then the full text at reading
// width. The full text is kabsi-canvas's own, written to the system as built; the lawyer's text replaces it (29.8).
// The contents list is built from the rendered H2 headings: each H2 gets an id (slug of its text).
export function LegalPage({
  title,
  updated,
  summary,
  children,
}: {
  title: string;
  updated: string;
  /** "In short": lines from docs/COPY.md section 14. */
  summary?: string[];
  /** Kept for older callers; every legal page now looks the same. */
  kind?: "privacy" | "terms" | "other";
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const used = new Set<string>();
    const next: TocItem[] = [];
    for (const h of Array.from(root.querySelectorAll("h2"))) {
      const text = h.textContent?.trim() ?? "";
      if (!text) continue;
      let id = h.id || slugify(text) || "section";
      while (used.has(id)) id = `${id}-2`;
      used.add(id);
      h.id = id;
      next.push({ id, text });
    }
    setItems(next);
  }, []);

  return (
    <SiteShell>
      <section className="container-kb pt-28 lg:pt-36">
        <SectionHead as="h1" title={title} lead="Plain words first. The full text follows." />
        <p className="mt-4 text-small text-text-3">Updated {updated}</p>
      </section>
      <section className="container-kb mt-10 pb-20 lg:pb-28">
        {summary?.length ? (
          <div className="max-w-[44rem] rounded-panel border border-line bg-surface-1 p-6 sm:p-8">
            <h2 className="text-h3">In short</h2>
            <ul className="mt-4 space-y-3">
              {summary.map((s) => (
                <li key={s} className="flex gap-3 text-body text-text-1">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-kb-green">
                    <Check className="size-3 text-kb-white" strokeWidth={3.5} aria-hidden />
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-12 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            {items.length > 0 && (
              <details className="group rounded-card border border-line lg:border-0" open>
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-small font-bold text-text-1 lg:hidden [&::-webkit-details-marker]:hidden">
                  On this page
                  <ChevronDown
                    className="size-4 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mb-2 hidden text-label font-bold text-text-3 lg:block">
                  On this page
                </p>
                <ol className="px-2 pb-2 lg:px-0 lg:pb-0">
                  {items.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="inline-flex min-h-11 items-center text-small text-text-2 underline-offset-4 hover:text-text-1 hover:underline"
                      >
                        {s.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}
          </nav>
          <div ref={contentRef}>
            <Prose className="[&_b]:font-bold [&_b]:text-text-1 [&_dl]:mt-4 [&_dt]:text-text-1 [&_section]:mt-10 [&_table]:mt-4 [&_td]:py-2 [&_td]:pe-4 [&_th]:py-2 [&_th]:pe-4 [&_th]:text-start [&_th]:text-text-1">
              {children}
            </Prose>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
