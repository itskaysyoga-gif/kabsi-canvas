import { useEffect, useRef, useState, type ReactNode } from "react";
import { FileText, Scale, ShieldCheck } from "lucide-react";
import { PublicLayout } from "@/components/layouts/public-layout";
import { IconBadge } from "@/components/marketing/parts";

const ICONS = { privacy: <ShieldCheck />, terms: <Scale />, other: <FileText /> };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type TocItem = { id: string; text: string };

function TocList({ items }: { items: TocItem[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            className="text-sm font-medium text-kb-stone underline-offset-4 hover:text-kb-ink hover:underline"
          >
            {item.text}
          </a>
        </li>
      ))}
    </ul>
  );
}

// Plain, readable legal pages (KABSI-LEGAL-COPY.md, corrected to the system as built on 26 Sep 2026).
// The table of contents is built from the rendered H2 headings: each H2 gets an id (slug of its
// text) and the list links to it. Smooth scrolling comes from the global CSS, which
// prefers-reduced-motion already overrides to instant; scroll-mt-24 clears the sticky header.
export function LegalPage({
  title,
  updated,
  kind = "other",
  children,
}: {
  title: string;
  updated: string;
  kind?: keyof typeof ICONS;
  children: ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const headings = Array.from(root.querySelectorAll("h2"));
    const used = new Set<string>();
    const next: TocItem[] = [];
    for (const h of headings) {
      const text = h.textContent?.trim() ?? "";
      if (!text) continue;
      let id = slugify(text) || "section";
      while (used.has(id)) id = `${id}-2`;
      used.add(id);
      h.id = id;
      next.push({ id, text });
    }
    setItems(next);
  }, []);

  return (
    <PublicLayout>
      <header className="border-b border-kb-hairline bg-kb-sand">
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <IconBadge icon={ICONS[kind]} className="size-14 [&_svg]:size-6" />
          <h1 className="mt-6 font-display text-[clamp(2.6rem,6vw,4rem)] leading-none">{title}</h1>
          <p className="mt-3 text-sm text-kb-stone">Last updated {updated}</p>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-16">
        {items.length > 0 && (
          <details className="mb-10 rounded-[14px] border border-kb-hairline bg-kb-sand p-5 lg:hidden">
            <summary className="cursor-pointer text-sm font-bold text-kb-ink">On this page</summary>
            <nav aria-label="Table of contents" className="mt-4">
              <TocList items={items} />
            </nav>
          </details>
        )}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_16rem] lg:gap-12">
          <div
            ref={contentRef}
            className="space-y-10 text-[17px] leading-8 text-kb-ink [&_a]:font-bold [&_a]:underline [&_a]:underline-offset-4 [&_h2]:scroll-mt-24 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:mt-2 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6"
          >
            {children}
          </div>
          {items.length > 0 && (
            <aside className="hidden lg:block">
              <nav
                aria-label="Table of contents"
                className="sticky top-24 rounded-[14px] border border-kb-hairline bg-kb-sand p-5"
              >
                <p className="mb-3 text-sm font-bold text-kb-ink">On this page</p>
                <TocList items={items} />
              </nav>
            </aside>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
