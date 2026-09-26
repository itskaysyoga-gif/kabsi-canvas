import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Nfc } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KabsiMark } from "@/components/shared/kabsi-logo";
import { cn } from "@/lib/utils";

export function Section({
  children,
  tone = "white",
  className,
  id,
}: {
  children: ReactNode;
  tone?: "white" | "sand" | "carbon";
  className?: string;
  id?: string;
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
      <div className={cn("mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-24", className)}>
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
}: {
  eyebrow: string;
  title: string;
  sub: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-kb-carbon text-kb-white">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <p className="flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-kb-stone-on-dark">
          <span className="h-1 w-8 rounded-pill bg-kb-yellow" />
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-4xl font-display text-[clamp(2.6rem,6.5vw,4.6rem)] leading-[0.98]">
          {title}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-kb-stone-on-dark">{sub}</p>
        {children}
      </div>
    </section>
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

// A drawn card (not a photo): instruction first, mark small, code DEMO24 only (KABSI-STICKER-SPEC).
export function CardRender({ className }: { className?: string }) {
  // Decorative QR-like pattern, deterministic, not scannable.
  const cells = Array.from({ length: 21 * 21 }, (_, n) => {
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
  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[340px] rounded-large bg-kb-sand p-6 shadow-[0_18px_40px_rgba(0,0,0,.18)] ring-1 ring-kb-hairline",
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
            <span className="grid size-12 place-items-center rounded-full bg-kb-white ring-1 ring-kb-hairline">
              <Nfc className="size-6" />
            </span>
            <KabsiMark className="size-6" />
          </div>
          <p className="mt-2 text-sm font-bold leading-5">Tap your phone here</p>
          <p className="text-xs text-kb-stone">or scan the QR code</p>
        </div>
        <div className="rounded-lg bg-kb-white p-2">
          <div className="grid size-24 grid-cols-[repeat(21,1fr)]">
            {cells.map((on, n) => (
              <span key={n} className={on ? "bg-kb-black" : ""} />
            ))}
          </div>
          <p className="mt-1 text-center font-mono text-[10px] tracking-widest">DEMO24</p>
        </div>
      </div>
      <p className="absolute inset-x-6 bottom-4 text-[10px] text-kb-stone">
        Powered by kabsi.co · Beirut, Lebanon
      </p>
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
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-kb-sand text-xl leading-none transition-transform group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 max-w-3xl leading-7 text-kb-stone">{f.a}</p>
        </details>
      ))}
    </div>
  );
}
