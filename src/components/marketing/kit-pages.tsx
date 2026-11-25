// SITE-7: the parts of the section system that Home does not use (the page's H1 block and the tick list), in a file of
// their own so Home's script does not carry them. The rest of the system is kit.tsx.
import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Marked } from "@/components/kabsi/highlight";
import { Lead } from "./kit";

/** The page's H1 block: the H1 with its phrase on the bar, the line, and the page's own content. `aside` fills the right. */
export function PageTop({
  title,
  mark,
  line,
  children,
  aside,
}: {
  title: string;
  mark: string;
  line: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section aria-labelledby="page-h" data-hero className="relative z-10 bg-surface-0">
      <div
        className={cn(
          "container-kb pt-8 pb-12 sm:pt-14 sm:pb-16 lg:pb-20",
          aside &&
            "lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16",
        )}
      >
        <div>
          <h1 id="page-h" className="max-w-[20ch] text-display text-balance">
            <Marked text={title} mark={mark} />
          </h1>
          <Lead className="mt-5">{line}</Lead>
          {children}
        </div>
        {aside ? <div className="mt-10 lg:mt-0">{aside}</div> : null}
      </div>
    </section>
  );
}

/** A tick list at the reading size. */
export function Ticks({
  items,
  className,
  cols = false,
}: {
  items: readonly string[];
  className?: string;
  /** Two columns from 640 px. */
  cols?: boolean;
}) {
  return (
    <ul className={cn("grid gap-3", cols && "sm:grid-cols-2 sm:gap-x-8", className)}>
      {items.map((t) => (
        <li key={t} className="flex gap-3 text-read text-text-1">
          <Check className="mt-1 size-5 shrink-0 text-ok" aria-hidden />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}
