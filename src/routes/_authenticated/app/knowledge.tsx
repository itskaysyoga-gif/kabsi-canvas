import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { KnowledgeStep } from "@/components/onboarding/steps";
import { myLatestLocation } from "@/lib/onboarding";

// The knowledge card: the only facts reply drafts may use (D223). Same form as onboarding step 3.
export const Route = createFileRoute("/_authenticated/app/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge — Kabsi" }, { name: "robots", content: "noindex" }] }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      {location.isLoading ? <p className="text-kb-stone">Loading…</p> : null}
      {!location.isLoading && !location.data ? (
        <>
          <p className="text-kb-stone">Add your business first.</p>
          <Button asChild className="mt-5">
            <Link to="/start">Add your business</Link>
          </Button>
        </>
      ) : null}
      {location.data ? (
        <div className="rounded-large bg-kb-white p-6 shadow-kb sm:p-8">
          <KnowledgeStep
            key={location.data.id}
            location={location.data}
            onChanged={() => location.refetch()}
            mode="settings"
          />
        </div>
      ) : null}
    </div>
  );
}
