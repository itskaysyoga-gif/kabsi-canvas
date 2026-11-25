// SITE-4 (Rashid: "empty, no life, no photos"): the parts that give the public pages life without changing their
// structure. Real photographs of owners and their places (public/photos, credits in public/photos/CREDITS.md), Kabsi's
// own screens with an example business in device frames (labelled Example), numbers that count up once, and a typing dot
// before each answer. Every movement respects prefers-reduced-motion: the final state shows at once.
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExampleBadge } from "@/components/kabsi/ui";
import { SiteLink } from "@/components/kabsi/site-link";
import { Head } from "./kit";
import { TRADE_TILES, pubSrc, pubSrcSet, type PubPhoto } from "./public-photos";

/** A photo from public/photos with its sizes, width and height. Lazy unless it is the page's main image. */
export function PubImg({
  photo,
  sizes,
  className,
  priority = false,
  decorative = false,
}: {
  photo: PubPhoto;
  sizes: string;
  className?: string | undefined;
  priority?: boolean | undefined;
  decorative?: boolean | undefined;
}) {
  return (
    <img
      src={pubSrc(photo, photo.widths[0]!)}
      srcSet={pubSrcSet(photo)}
      sizes={sizes}
      width={photo.w}
      height={photo.h}
      alt={decorative ? "" : photo.alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}

/** Whether the visitor asked for less motion (false on the server, so the server draws the final state). */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/**
 * The report's numbers count up once (styles.css, .kb-count): this marks the box when it first comes into view. The
 * server, reduced motion and a browser without the observer show the final numbers.
 */
export function useCountOnce() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        el.classList.add("kb-count");
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/** A number for .kb-count: drawn by CSS from --to (so it can count), read by screen readers from the text. */
export function Num({ value }: { value: string }) {
  if (!/^\d+$/.test(value)) return <>{value}</>;
  return (
    <>
      <span className="kb-num" style={{ "--to": value } as CSSProperties} aria-hidden />
      <span className="sr-only">{value}</span>
    </>
  );
}

/* ---------- Built for your kind of business: photo tiles to the /for pages ---------- */

// SITE-4: the long class lists of these parts are named classes in styles.css (kb-more, kb-tile, kb-shot, kb-shots), so
// they stay out of Home's script budget.
export function TradeStrip({ id = "trades", className }: { id?: string; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={className}>
      <div className="container-kb py-14 sm:py-20 lg:py-24" data-rise>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
          <Head id={id} title="Built for your kind of business." />
          <SiteLink to="/for" className="press kb-more">
            See every business
            <ArrowRight aria-hidden />
          </SiteLink>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
          {TRADE_TILES.map((t) => (
            <li key={t.slug}>
              <SiteLink to={`/for/${t.slug}`} className="kb-lift kb-tile">
                <PubImg
                  photo={t.photo}
                  sizes="(min-width: 1200px) 280px, (min-width: 768px) 23vw, 46vw"
                />
                <span>
                  {t.label}
                  <ArrowRight aria-hidden />
                </span>
              </SiteLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------- Kabsi's own screens, with an example business, in device frames ---------- */

export const SCREENS = {
  report: {
    src: "/screens/app-report-560.webp",
    alt: "Kabsi's weekly report in the account, for an example business",
    title: "Your weekly report",
    line: "What was done, what waits.",
  },
  cards: {
    src: "/screens/app-cards-560.webp",
    alt: "Kabsi's review link message and QR code, for an example business",
    title: "Your review link and QR code",
    line: "To share after a real visit.",
  },
  email: {
    src: "/screens/email-weekly-560.webp",
    alt: "Kabsi's weekly report email, for an example business",
    title: "Your week, by email",
    line: "Every Monday, in your inbox.",
  },
} as const;

export type ScreenId = keyof typeof SCREENS;
export type Shot = { src: string; alt: string; title: string; line: string };

/** One of Kabsi's own screens in a phone frame, with the Example badge on it. SITE-5: `shot` draws a screen that is not
 * in SCREENS (the ones Home does not show live in screens-section.tsx, so they stay out of Home's script). */
export function DeviceShot({
  id,
  shot,
  className,
}: {
  id?: ScreenId;
  shot?: Shot;
  className?: string;
}) {
  const s = shot ?? SCREENS[id ?? "report"];
  return (
    <div className={cn("kb-shot", className)}>
      <img src={s.src} alt={s.alt} width={560} height={1212} loading="lazy" decoding="async" />
      <ExampleBadge />
    </div>
  );
}

/** The screens in a row (a row to swipe on a phone), each with its title and one line. */
export function ScreenRow({ ids, className }: { ids: readonly ScreenId[]; className?: string }) {
  return (
    <ul className={cn("kb-shots", ids.length < 3 && "kb-shots-2", className)}>
      {ids.map((k) => (
        <li key={k}>
          <DeviceShot id={k} />
          <div>
            <h3>{SCREENS[k].title}</h3>
            <p>{SCREENS[k].line}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
