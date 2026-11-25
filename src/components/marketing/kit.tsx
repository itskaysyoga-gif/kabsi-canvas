// SITE-3 (R-164 item 7): the one section system of every public page. Home, Pricing, How it works, the FAQ, About,
// Security, the industry pages, the guides, the free check and the tools are built from these parts, so they look like
// one product. The rules (SITE-3 prompt, step 3):
// - Three backgrounds only: ivory (the page), white (a quiet band) and charcoal (one band, `tone="dark"`).
// - The yellow bar only on the page's H1 and at most one other headline: `Head` draws a bar only when given `mark`.
// - Body text is the reading size (17 to 18 px, `text-read`) in the reading grey, at most about 70 characters a line.
// - One primary action, "Check my business free", at the top, the middle and the bottom.
// - On a computer no section leaves half the screen empty: `split` puts the headline beside the content.
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Marked } from "@/components/kabsi/highlight";
import { ScanBox } from "@/components/kabsi/scan-box";

// SITE-4 (lane R): two soft tints join the grounds, the warm yellow tint and the soft neutral. Still at most three
// backgrounds a page: a page that uses a tint leaves out white or the other tint.
export type Tone = "ivory" | "white" | "dark" | "warm" | "soft";

const TONE: Record<Tone, string> = {
  ivory: "bg-surface-0",
  white: "bg-surface-1",
  dark: "theme-dark bg-kb-carbon text-text-1",
  warm: "bg-tint-warm",
  soft: "bg-tint-soft",
};

/** A band of the page. `tone` is one of the three backgrounds. */
export function Band({
  id,
  tone = "ivory",
  label,
  children,
  className,
  inner,
}: {
  /** The headline's id is `${id}-h`; the band is labelled by it unless `label` is given. */
  id: string;
  tone?: Tone;
  label?: string | undefined;
  children: ReactNode;
  className?: string | undefined;
  inner?: string | undefined;
}) {
  return (
    <section
      id={id}
      aria-labelledby={label ? undefined : `${id}-h`}
      aria-label={label}
      className={cn(TONE[tone], className)}
    >
      {/* SITE-4: each band rises once as it scrolls in (motion.ts); a band already on screen is shown at once. */}
      <div data-rise className={cn("container-kb py-14 sm:py-20 lg:py-24", inner)}>
        {children}
      </div>
    </section>
  );
}

/** A section headline with its line. The yellow bar only when `mark` is given (at most once a page besides the H1). */
export function Head({
  id,
  title,
  mark,
  line,
  className,
}: {
  id: string;
  title: string;
  mark?: string | undefined;
  line?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div className={className}>
      <h2 id={`${id}-h`} className="max-w-[22ch] text-h2 text-balance">
        {mark ? <Marked text={title} mark={mark} /> : title}
      </h2>
      {line ? <Lead className="mt-4">{line}</Lead> : null}
    </div>
  );
}

/** Body text at the reading size, in the reading grey, under 70 characters a line. */
export function Lead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("max-w-[60ch] text-read text-text-2", className)}>{children}</p>;
}

/** A section: the headline, then the content; with `split` the headline sits on the left from 1024 px. */
export function Sec({
  id,
  title,
  mark,
  line,
  children,
  tone = "page",
  split = false,
  className,
}: {
  id: string;
  title: string;
  mark?: string | undefined;
  line?: ReactNode;
  children?: ReactNode;
  /** "page" is ivory, "card" is white, "dark" is the charcoal band, "warm" and "soft" the SITE-4 tints. */
  tone?: "page" | "card" | "dark" | "warm" | "soft";
  split?: boolean;
  className?: string | undefined;
}) {
  return (
    <Band
      id={id}
      tone={tone === "card" ? "white" : tone === "page" ? "ivory" : tone === "dark" ? "dark" : tone}
      className={className}
      inner={
        split
          ? "lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16 xl:gap-24"
          : undefined
      }
    >
      <Head id={id} title={title} mark={mark} line={line} />
      {split ? <div className="lg:[&>*:first-child]:mt-0">{children}</div> : children}
    </Band>
  );
}

/** The free check box, the one action. `under` is the line under it. */
export function CheckBox({
  id,
  under,
  className,
}: {
  id: string;
  under: string;
  className?: string;
}) {
  return <ScanBox id={id} note={under} className={className} />;
}

/** Quiet marks in one row: a small tick and a few words each. */
export function MarkRow({ items, className }: { items: readonly string[]; className?: string }) {
  return (
    // SITE-8: Nora's button steps aside rather than cover the trust list (it is the page's one list, R-167 rule 4).
    <ul data-nora-avoid className={cn("flex flex-wrap gap-x-5 gap-y-2", className)}>
      {items.map((m) => (
        <li
          key={m}
          className="inline-flex items-center gap-1.5 text-small font-semibold text-text-1"
        >
          <Check className="size-4 shrink-0 text-ok" aria-hidden />
          {m}
        </li>
      ))}
    </ul>
  );
}

/** The closing band: the page's charcoal band with the search box and the yellow button. */
export function ClosingDark({
  title,
  line,
  under,
  id = "closing",
}: {
  title: string;
  line?: string | undefined;
  under: string;
  id?: string;
}) {
  return (
    <Band id={id} tone="dark">
      <div className="mx-auto max-w-[44rem] text-center">
        <h2 id={`${id}-h`} className="text-h2 text-balance">
          {title}
        </h2>
        {line ? <Lead className="mx-auto mt-4">{line}</Lead> : null}
        <CheckBox id={`${id}-scan`} under={under} className="mt-8 text-start" />
      </div>
    </Band>
  );
}
