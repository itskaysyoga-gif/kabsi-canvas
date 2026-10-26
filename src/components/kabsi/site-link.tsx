import { Link, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A link to a page of this prototype opens it in place; a link to a page no route covers yet opens as a plain
 * address (and so shows the 404 page). The router decides, so nobody keeps a list of built pages by hand.
 */
export function SiteLink({
  to,
  className,
  children,
  onClick,
  activeClassName,
}: {
  to: string;
  className?: string | undefined;
  children: ReactNode;
  onClick?: (() => void) | undefined;
  activeClassName?: string | undefined;
}) {
  const router = useRouter();
  const built = router.matchRoutes(to).some((m) => m.routeId !== "__root__");
  if (built) {
    return (
      <Link
        to={to as "/"}
        onClick={onClick}
        className={className}
        activeOptions={{ exact: to === "/" }}
        activeProps={{ className: activeClassName, "aria-current": "page" }}
      >
        {children}
      </Link>
    );
  }
  return (
    <a href={to} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
