import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FreeCheckStart } from "@/components/kabsi/d4-free-check";
import { LiveFreeCheck } from "@/components/kabsi/scan-live";
import { pageHead } from "@/lib/site";
import { matching, text } from "@/lib/search-params";

// The one free check (master plan 30.16 section 4). The scan box sends ?q= (and an industry page its search and
// industry); without ?q the page explains the check and shows the box.
const searchSchema = (
  s: Record<string, unknown>,
): { q?: string | undefined; keyword?: string | undefined; industry?: string | undefined } => ({
  q: text(s["q"], { trim: true, min: 2, max: 120 }),
  keyword: text(s["keyword"], { trim: true, min: 2, max: 60 }),
  industry: matching(s["industry"], /^[a-z0-9-]{2,40}$/),
});

export const Route = createFileRoute("/scan/")({
  validateSearch: searchSchema,
  head: () =>
    pageHead({
      title: "Kabsi: Check your business on Google, free",
      description:
        "Your public Google profile and where you come up nearby, together. Free check. No Google access needed.",
      path: "/scan",
      image: "scan",
      crumbs: [{ name: "Free check", path: "/scan" }],
    }),
  component: Scan,
});

function Scan() {
  const { q, keyword, industry } = Route.useSearch();
  return (
    <SiteShell>
      {q ? (
        <LiveFreeCheck
          key={`${q}|${keyword ?? ""}|${industry ?? ""}`}
          query={q}
          keyword={keyword ?? null}
          industry={industry ?? null}
        />
      ) : (
        <FreeCheckStart />
      )}
    </SiteShell>
  );
}
