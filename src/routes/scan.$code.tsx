import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/kabsi/site-chrome";
import { SavedFreeCheck } from "@/components/kabsi/scan-live";
import { pageHead } from "@/lib/site";

// A free check opened again from its code (KAB-XXXXXXXX). One business's result: never indexed.
export const Route = createFileRoute("/scan/$code")({
  head: ({ params }) =>
    pageHead({
      title: "Kabsi: Your free check",
      description: "Your free check: where you come up nearby, and who came first around you.",
      path: `/scan/${params.code}`,
      image: "scan",
      noindex: true,
    }),
  component: function ScanCode() {
    const { code } = Route.useParams();
    return (
      <SiteShell>
        <SavedFreeCheck code={code.replace(/^KAB-/i, "").toUpperCase()} />
      </SiteShell>
    );
  },
});
