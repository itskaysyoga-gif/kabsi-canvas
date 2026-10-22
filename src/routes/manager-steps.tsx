import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PublicLayout } from "@/components/layouts/public-layout";
import { ManagerGuide } from "@/components/onboarding/manager-guide";
import { pageHead } from "@/lib/site";

const searchSchema = z.object({
  b: z
    .string()
    .transform((value) => value.trim().slice(0, 80))
    .optional()
    .catch(undefined),
  s: z.coerce.number().int().min(1).max(5).optional().catch(undefined),
});

export const Route = createFileRoute("/manager-steps")({
  validateSearch: searchSchema,
  head: () =>
    pageHead({
      title: "Add Kabsi as a Manager",
      description: "Steps for adding Kabsi as a Manager on a Google Business Profile.",
      path: "/manager-steps",
      noindex: true,
    }),
  component: ManagerStepsPage,
});

function ManagerStepsPage() {
  const { b, s: step } = Route.useSearch();
  const businessName = b || "This business";

  return (
    <PublicLayout>
      <header className="border-b border-kb-hairline bg-kb-sand">
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-sm font-bold uppercase text-kb-stone">Manager access</p>
          <h1 className="mt-4 font-display text-[clamp(2.6rem,6vw,4rem)] leading-none">
            Add Kabsi as a Manager
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-8 text-kb-stone">
            {businessName} would like to add Kabsi as a Manager on its Google Business Profile so
            replies can be prepared for review. Kabsi never posts anything without the owner's
            approval.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <ManagerGuide {...(b ? { businessName: b } : {})} start={step ?? 1} />

        <p className="mt-8 border-l-4 border-kb-yellow pl-4 leading-7">
          You can remove Kabsi at any time in People and access.
        </p>
      </section>
    </PublicLayout>
  );
}
