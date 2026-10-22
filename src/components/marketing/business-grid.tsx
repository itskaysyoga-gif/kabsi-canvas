// Compact links to every industry page (internal linking from guides, FAQ and how it works).
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { VERTICALS } from "@/lib/verticals";

/** Compact links to every industry page (internal linking from guides, FAQ and how it works). */
export function IndustryLinks({
  title = "Kabsi for your business",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <nav aria-label={title} className={className}>
      <p className="text-xs font-bold uppercase tracking-wider text-kb-stone">{title}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {VERTICALS.map((v) => (
          <li key={v.slug}>
            <Link
              to="/for/$slug"
              params={{ slug: v.slug }}
              className="inline-flex items-center gap-2 rounded-pill border border-kb-hairline bg-kb-white px-3.5 py-2 text-sm font-bold hover:border-kb-black [&_svg]:size-4"
            >
              {v.icon}
              {v.label}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/for"
            className="inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm font-bold underline underline-offset-4"
          >
            All businesses <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
