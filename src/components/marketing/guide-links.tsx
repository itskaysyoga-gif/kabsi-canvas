// Guides 3: links inside a guide's text. A link to another guide renders only while that guide is public; before its
// day it is plain text, so no page links an address that answers 404. The page puts the public slugs (decided on the
// server, on this request) in GuidePublic.
import { createContext, useContext, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

export const GuidePublic = createContext<ReadonlySet<string>>(new Set());

export function GuideLink({ slug, children }: { slug: string; children: ReactNode }) {
  const open = useContext(GuidePublic);
  if (!open.has(slug)) return <>{children}</>;
  return (
    <Link to="/guides/$slug" params={{ slug }}>
      {children}
    </Link>
  );
}

/** A link to another page on kabsi.co from a guide's text (the free check, the review link tool, an industry page). */
export function SiteRef({
  to,
  children,
}: {
  to: "/scan" | "/google-review-link" | "/how-it-works" | "/pricing" | "/security" | "/faq";
  children: ReactNode;
}) {
  return <Link to={to}>{children}</Link>;
}

/** A link out to a help page. */
export function Out({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
