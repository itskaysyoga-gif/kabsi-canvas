import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

// The official Kabsi mark (KABSI-BRAND.md): black ring, yellow field, off-centre black dot.
// Geometry copied from kabsi-mark.svg — never redraw it.
export function KabsiMark({ className }: { className?: string | undefined }) {
  return (
    <svg viewBox="0 0 120 120" className={cn("size-7 shrink-0", className)} aria-hidden="true" focusable="false">
      <circle cx="60" cy="60" r="58" fill="#000000" />
      <circle cx="60" cy="60" r="42.0036" fill="#FFD60A" />
      <circle cx="63.5032" cy="64.9996" r="15.9964" fill="#000000" />
    </svg>
  );
}

export function KabsiLogo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5 font-bold", dark ? "text-kb-white" : "text-kb-black")} aria-label="Kabsi home">
      <KabsiMark className={dark ? "rounded-full ring-2 ring-kb-white/20" : undefined} />
      <span className="text-xl leading-none">kabsi</span>
    </Link>
  );
}
