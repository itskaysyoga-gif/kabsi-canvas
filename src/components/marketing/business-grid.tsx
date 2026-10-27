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
      <p className="text-label font-bold text-text-2">{title}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {INDUSTRIES.filter((i) => i.finished).map((i) => (
          <li key={i.slug}>
            <Link
              to="/for/$trade"
              params={{ trade: i.slug }}
              className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface-1 px-3.5 py-2 text-small font-bold hover:border-text-1"
            >
              {i.plural}
            </Link>
          </li>
        ))}
        <li>
          <Link
            to="/for"
            className="inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-small font-bold underline underline-offset-4"
          >
            All businesses <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
