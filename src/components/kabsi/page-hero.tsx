// Design 8 (Web 4): one hero on every public page. The headline says the page's job, one line under it, one action,
// and a visual made for that page (never the same phone twice). CSS motion only: the text enters once, the visual's
// parts arrive one after another (stagger and popCls), and reduced motion shows the last frame at once.
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MAIN_CTA, SCAN_LINE } from "@/lib/site";
import { ButtonLink } from "./ui";

export type PageHeroLines = { title: string; line: string; action?: string };

/** A delay for one part of a hero visual; dropped under reduced motion. */
export function stagger(i: number, base = 200, step = 140) {
  return { "--d": `${base + i * step}ms` } as CSSProperties;
}
export const popCls = "animate-pop [animation-delay:var(--d)] motion-reduce:[animation-delay:0ms]";

export function PageHero({
  hero,
  eyebrow,
  action,
  under = SCAN_LINE,
  visual,
  children,
  className,
}: {
  hero: PageHeroLines;
  eyebrow?: ReactNode;
  /** Replaces the default action (the free check). */
  action?: ReactNode;
  under?: string | null;
  visual: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby="hero-title" data-hero className={cn("relative isolate", className)}>
      <div className="container-kb grid gap-10 pt-8 pb-12 md:pt-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-14 lg:pt-16 lg:pb-20">
        <div className="max-w-[36rem]">
          {eyebrow && (
            <div className="mb-4 animate-enter text-label font-bold text-text-2">{eyebrow}</div>
          )}
          {/* The headline paints with no entrance animation, so it can be the page's LCP at once (Web 3). */}
          <h1 id="hero-title" className="text-display text-balance">
            {hero.title}
          </h1>
          <p
            className="mt-5 animate-enter text-lead text-text-2"
            style={{ animationDelay: "60ms" }}
          >
            {hero.line}
          </p>
          <div className="mt-7 animate-enter" style={{ animationDelay: "120ms" }} data-main-cta>
            {action ?? <ButtonLink to="/scan">{hero.action ?? MAIN_CTA}</ButtonLink>}
            {under && <p className="mt-3 text-small text-text-2">{under}</p>}
          </div>
          {children}
        </div>
        <div className="relative mx-auto w-full max-w-[30rem] lg:me-0">{visual}</div>
      </div>
    </section>
  );
}
