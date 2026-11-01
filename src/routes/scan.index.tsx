import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FreeCheckStart } from "@/components/kabsi/d4-free-check";
import { FreeCheckAgain, LiveFreeCheck } from "@/components/kabsi/scan-live";
import { pageHead } from "@/lib/site";
import { flag, matching, text } from "@/lib/search-params";

// The one free check (master plan 30.16 section 4). The scan box sends ?q= (and an industry page its search and
// industry); without ?q the page explains the check and shows the box.
const searchSchema = (
  s: Record<string, unknown>,
): {
  q?: string | undefined;
  keyword?: string | undefined;
  industry?: string | undefined;
  place?: string | undefined;
  st?: string | undefined;
  change?: boolean | undefined;
} => ({
  q: text(s["q"], { trim: true, min: 2, max: 120 }),
  keyword: text(s["keyword"], { trim: true, min: 2, max: 60 }),
  industry: matching(s["industry"], /^[a-z0-9-]{2,40}$/),
  // Check 2: a suggestion chosen in the scan box (its Place ID and the Autocomplete session token), and
  // "Not your business? Change it" (the search box again with the text kept).
  place: matching(s["place"], /^[A-Za-z0-9_-]{10,200}$/),
  st: matching(s["st"], /^[A-Za-z0-9-]{16,64}$/),
  change: flag(s["change"]),
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
  const { q, keyword, industry, place, st, change } = Route.useSearch();
  return (
    <SiteShell>
      {q && change ? (
        <FreeCheckAgain query={q} keyword={keyword ?? null} industry={industry ?? null} />
      ) : q ? (
        <LiveFreeCheck
          key={`${q}|${keyword ?? ""}|${industry ?? ""}|${place ?? ""}`}
          query={q}
          keyword={keyword ?? null}
          industry={industry ?? null}
          placeId={place ?? null}
          sessionToken={st ?? null}
        />
      ) : (
        <FreeCheckStart />
      )}
    </SiteShell>
  );
}
