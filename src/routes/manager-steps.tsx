import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { ManagerSteps } from "@/components/kabsi/d2-flow";
import { pageHead } from "@/lib/site";
import { intBetween, text } from "@/lib/search-params";

// The access steps for anyone, linked from WhatsApp, the emails and "Send these steps" (master plan 30.17 section 3).
// ?b= and ?s= from older links are still accepted, so no link breaks.
const searchSchema = (
  s: Record<string, unknown>,
): { b?: string | undefined; s?: number | undefined } => ({
  b: text(s["b"]),
  s: intBetween(s["s"], 1, 5),
});

export const Route = createFileRoute("/manager-steps")({
  validateSearch: searchSchema,
  head: () =>
    pageHead({
      title: "Kabsi: Add Kabsi as a Manager on Google",
      description: "You stay the owner. You can remove Kabsi any time.",
      path: "/manager-steps",
      image: "scan",
      noindex: true,
    }),
  component: () => (
    <SiteShell>
      <ManagerSteps />
    </SiteShell>
  ),
});
