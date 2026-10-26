import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { FreeCheckStart } from "@/components/kabsi/d4-free-check";
import { LiveFreeCheck } from "@/components/kabsi/scan-live";
import { pageHead } from "@/lib/site";

// The one free check (master plan 30.16 section 4). The scan box sends ?q= (and an industry page its search and
// industry); without ?q the page explains the check and shows the box.
const searchSchema = z.object({
  q: z.string().trim().min(2).max(120).optional().catch(undefined),
  keyword: z.string().trim().min(2).max(60).optional().catch(undefined),
  industry: z
    .string()
    .regex(/^[a-z0-9-]{2,40}$/)
    .optional()
    .catch(undefined),
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
          key={`${q}|${keyword ?? ""}`}
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
