import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { ManagerSteps } from "@/components/kabsi/d2-flow";
import { pageHead } from "@/lib/site";

// The access steps for anyone, linked from WhatsApp, the emails and "Send these steps" (master plan 30.17 section 3).
// ?b= and ?s= from older links are still accepted, so no link breaks.
const searchSchema = z.object({
  b: z.string().optional().catch(undefined),
  s: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
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
