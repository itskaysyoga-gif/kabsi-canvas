import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PublicLayout } from "@/components/layouts/public-layout";
import { ManagerAccessInstructions } from "@/components/onboarding/manager-access-instructions";
import { CopyButton } from "@/components/shared/copy-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pageHead } from "@/lib/site";

const searchSchema = z.object({
  b: z
    .string()
    .transform((value) => value.trim().slice(0, 80))
    .optional()
    .catch(undefined),
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
  const { b } = Route.useSearch();
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
        <Tabs defaultValue="computer">
          <TabsList className="grid h-12 w-full grid-cols-2 rounded-card bg-kb-sand p-1">
            <TabsTrigger value="computer" className="h-10 rounded-[10px] text-base">
              On a computer
            </TabsTrigger>
            <TabsTrigger value="phone" className="h-10 rounded-[10px] text-base">
              On your phone
            </TabsTrigger>
          </TabsList>
          <TabsContent value="computer" className="mt-8">
            <ManagerAccessInstructions mode="computer" />
          </TabsContent>
          <TabsContent value="phone" className="mt-8">
            <ManagerAccessInstructions mode="phone" businessName={b} />
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex flex-col gap-3 rounded-card bg-kb-sand p-5 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-bold">hello@kabsi.co</span>
          <CopyButton text="hello@kabsi.co" label="Copy email" />
        </div>

        <p className="mt-8 border-l-4 border-kb-yellow pl-4 leading-7">
          You can remove Kabsi at any time in People and access.
        </p>
        <p className="mt-10 border-t border-kb-hairline pt-6 text-sm leading-6 text-kb-stone">
          © Kabsi. Kabsi is independent and not affiliated with Google.
        </p>
      </section>
    </PublicLayout>
  );
}