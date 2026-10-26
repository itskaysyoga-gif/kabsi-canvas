// Compact links to the finished industry pages (internal linking from the guides). Only indexed pages are linked.
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { INDUSTRIES } from "@/content/industries";

/** Compact links to the finished industry pages (internal linking from the guides). */
export function IndustryLinks({
  title = "Kabsi for your kind of business",
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <nav aria-label={title} className={className}>
      <p className="text-xs font-bold text-kb-stone">{title}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {INDUSTRIES.filter((i) => i.finished).map((i) => (
          <li key={i.slug}>
            <Link
              to="/for/$trade"
              params={{ trade: i.slug }}
              className="inline-flex items-center gap-2 rounded-pill border border-kb-hairline bg-kb-white px-3.5 py-2 text-sm font-bold hover:border-kb-black"
            >
              {i.plural}
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
