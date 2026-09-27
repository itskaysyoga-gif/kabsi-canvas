import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Nfc, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import { cn } from "@/lib/utils";
import type { PhotoId } from "@/lib/site-photos";
import { SiteImg } from "@/components/marketing/site-img";

export function Section({
  children,
  tone = "white",
  className,
  id,
  rise = true,
}: {
  children: ReactNode;
  tone?: "white" | "sand" | "carbon";
  className?: string;
  id?: string;
  rise?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        tone === "sand" && "bg-kb-sand",
        tone === "carbon" && "bg-kb-carbon text-kb-white",
        tone === "white" && "bg-kb-white",
      )}
    >
      <div
        data-rise={rise ? "" : undefined}
        className={cn("mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-24", className)}
      >
        {children}
      </div>
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-kb-stone">
      <span className="h-1 w-8 rounded-pill bg-kb-yellow" />
      {children}
    </p>
  );
}

export function H2({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "mt-4 max-w-3xl font-display text-[clamp(2.1rem,4.5vw,3.2rem)] leading-[1.05]",
        className,
      )}
    >
      {children}
    </h2>
  );
}

export function PageHero({
  eyebrow,
  title,
  sub,
  children,
  visual,
  visualClassName,
  photo,
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children?: ReactNode;
  /** A drawn HTML visual shown beside the text (below it on phones). */
  visual?: ReactNode;
  visualClassName?: string;
  /** A hero photo behind the section: dark on the left for the headline, subject on the right. */
  photo?: PhotoId;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-kb-carbon text-kb-white">
      {photo ? <HeroBackdrop photo={photo} /> : null}
      <div
        className={cn(
          "relative mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24 lg:py-28",
          photo && "max-md:-mt-6 max-md:pt-0",
          visual && "grid items-center gap-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]",
        )}
      >
        <div>
          <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-kb-stone-on-dark">
            <span className="h-1 w-8 rounded-pill bg-kb-yellow" />
            {eyebrow}
          </p>
          <h1
            className={cn(
              "mt-5 max-w-4xl font-display text-balance",
              visual ? "text-[clamp(2.6rem,5vw,3.9rem)]" : "text-[clamp(2.6rem,6.5vw,4.6rem)]",
              "leading-[0.98]",
            )}
          >
            {title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-kb-stone-on-dark">{sub}</p>
          {children}
        </div>
        {visual && (
          <div className={cn("kb-hero-visual flex justify-center md:justify-end", visualClassName)}>
            {visual}
          </div>
        )}
      </div>
    </section>
  );
}

/** Hero photo. Desktop: fills the right side behind the text and fades into Carbon on the left.
 *  Phones: a clear photo band above the headline that fades into Carbon at the bottom
 *  (behind the text it was too dark to see). One <img>, so the photo downloads once. */
export function HeroBackdrop({ photo }: { photo: PhotoId }) {
  return (
    <div className="pointer-events-none relative h-[clamp(220px,62vw,360px)] md:absolute md:inset-0 md:-z-10 md:h-auto">
      <SiteImg
        id={photo}
        priority
        sizes="(min-width: 768px) 80vw, 100vw"
        className="absolute inset-0 h-full w-full object-cover object-[65%_center] md:left-auto md:right-0 md:w-[80%] md:object-right"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,11,11,.35)_0%,rgba(11,11,11,0)_30%,rgba(11,11,11,0)_55%,#0b0b0b_100%)] md:bg-[linear-gradient(90deg,#0b0b0b_0%,#0b0b0b_22%,rgba(11,11,11,.78)_42%,rgba(11,11,11,.3)_70%,rgba(11,11,11,.15)_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 hidden h-24 bg-gradient-to-t from-kb-carbon to-transparent md:block"
      />
    </div>
  );
}

/** Lucide icon in the brand badge: black 2 px stroke on a yellow circle (KABSI-BRAND "Icons"). */
export function IconBadge({
  icon,
  className,
  tone = "yellow",
}: {
  icon: ReactNode;
  className?: string;
  tone?: "yellow" | "sand" | "dark";
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-11 shrink-0 place-items-center rounded-full [&_svg]:size-5 [&_svg]:stroke-[2]",
        tone === "yellow" && "bg-kb-yellow text-kb-black",
        tone === "sand" && "bg-kb-sand text-kb-black ring-1 ring-kb-hairline",
        tone === "dark" && "bg-kb-white/10 text-kb-yellow ring-1 ring-kb-white/15",
        className,
      )}
    >
      {icon}
    </span>
  );
}

/** White card with an icon badge, title and text. Lifts slightly on hover. */
export function FeatureCard({
  icon,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("kb-lift h-full rounded-large bg-kb-white p-6 shadow-kb", className)}>
      <IconBadge icon={icon} />
      <h3 className="mt-5 text-lg font-bold">{title}</h3>
      <div className="mt-2 leading-7 text-kb-stone [&_b]:text-kb-ink">{children}</div>
    </div>
  );
}

export function CtaBand({
  title = "Every Google review, answered. You just tap Post.",
  sub,
}: {
  title?: string;
  sub?: string;
}) {
  return (
    <section className="bg-kb-carbon text-kb-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-7 px-5 py-16 sm:px-8 sm:py-20 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="max-w-2xl font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05]">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-kb-stone-on-dark">
            {sub ??
              "Set up takes two steps: find your business, then add Kabsi as a Manager on your Google profile."}
          </p>
        </div>
        <Button asChild className="w-full shrink-0 md:w-auto">
          <Link to="/start">
            Get set up <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// Decorative QR-like pattern, deterministic, not scannable.
function demoQrCells() {
  return Array.from({ length: 21 * 21 }, (_, n) => {
    const x = n % 21;
    const y = Math.floor(n / 21);
    const finder = (a: number, b: number) => x >= a && x < a + 7 && y >= b && y < b + 7;
    if (finder(0, 0) || finder(14, 0) || finder(0, 14)) {
      const lx = x < 7 ? x : x - 14;
      const ly = y < 7 ? y : y - 14;
      return (
        lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4)
      );
    }
    return (x * 7 + y * 13 + x * y) % 5 < 2;
  });
}

/** The decorative QR pattern as one SVG path (one element instead of 441, cheaper to hydrate). */
export function DemoQr({ className }: { className?: string }) {
  const d = demoQrCells()
    .map((on, n) => (on ? `M${n % 21} ${Math.floor(n / 21)}h1v1h-1z` : ""))
    .join("");
  return (
    <svg viewBox="0 0 21 21" className={className} shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} fill="#000" />
    </svg>
  );
}

// A drawn card (not a photo): instruction first, mark small, code DEMO24 only (KABSI-STICKER-SPEC).
export function CardRender({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[340px] rounded-large bg-kb-sand p-6 text-kb-ink shadow-[0_18px_40px_rgba(0,0,0,.18)] ring-1 ring-kb-hairline",
        className,
      )}
      aria-label="Example Kabsi card"
      role="img"
    >
      <p className="font-display text-[clamp(1.5rem,6vw,2rem)] leading-[1.05] text-kb-ink">
        Leave us a review on Google
      </p>
      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="kb-ripple grid size-12 place-items-center rounded-full bg-kb-white ring-1 ring-kb-hairline">
              <Nfc className="size-6" />
            </span>
            <KabsiMark className="size-6" />
          </div>
          <p className="mt-2 text-sm font-bold leading-5">Tap your phone here</p>
          <p className="text-xs text-kb-stone">or scan the QR code</p>
        </div>
        <div className="rounded-lg bg-kb-white p-2">
          <DemoQr className="size-24" />
          <p className="mt-1 text-center font-mono text-[10px] tracking-widest">DEMO24</p>
        </div>
      </div>
      <p className="absolute inset-x-6 bottom-4 text-[10px] text-kb-stone">Powered by kabsi.co</p>
    </div>
  );
}

export function FaqList({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-kb-hairline border-y border-kb-hairline">
      {items.map((f) => (
        <details key={f.q} className="group py-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
            {f.q}
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-kb-sand transition-[transform,background-color] group-open:rotate-45 group-open:bg-kb-yellow">
              <Plus className="size-4" aria-hidden="true" />
            </span>
          </summary>
          <p className="mt-3 max-w-3xl leading-7 text-kb-stone">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** A marketing photo (no faces, no brands), WebP at several widths, lazy unless `priority`. */
export function Photo({
  id,
  className,
  sizes = "(min-width: 768px) 50vw, 100vw",
  priority = false,
}: {
  id: PhotoId;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <SiteImg
      id={id}
      sizes={sizes}
      priority={priority}
      className={cn("block h-auto w-full rounded-large bg-kb-sand object-cover", className)}
    />
  );
}
