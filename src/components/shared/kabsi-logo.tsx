import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function KabsiLogo({ dark = false }: { dark?: boolean }) {
  return (
    <Link to="/" className={cn("inline-flex items-center gap-2.5 font-bold", dark ? "text-kb-white" : "text-kb-black")} aria-label="Kabsi home">
      <span className="relative size-7 shrink-0 rounded-full border-2 border-kb-black bg-kb-yellow" aria-hidden="true">
        <span className="absolute right-[5px] top-[4px] size-[5px] rounded-full bg-kb-black" />
      </span>
      <span className="text-xl leading-none">kabsi</span>
    </Link>
  );
}
