import { useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSectionRise } from "@/components/marketing/motion";
import { SiteShell } from "@/components/kabsi/site-chrome";

// The pages Web 2 did not redesign yet (guides, log in, the setup call): their own light content inside the public
// header and footer of the new system (Your privacy choices is in the footer). docs/LATER.md has the row.
export function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  useSectionRise(pathname);
  return (
    <SiteShell>
      {/* The header sits on the dark ground; the light content starts under it. */}
      <div aria-hidden className="h-16" />
      <div className="theme-light">{children}</div>
    </SiteShell>
  );
}
