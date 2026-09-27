import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { KnowledgeStep } from "@/components/onboarding/steps";
import { myLatestLocation } from "@/lib/onboarding";
import { NotebookPen } from "lucide-react";
import { PageIcon } from "@/components/shared/page-icon";

// The knowledge card: the only facts reply drafts may use (D223). Same form as onboarding step 3.
export const Route = createFileRoute("/_authenticated/app/knowledge")({
  head: () => ({
    meta: [{ title: "About your business | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      {location.isLoading ? <p className="text-kb-stone">Loading…</p> : null}
      {!location.isLoading && !location.error && !location.data ? (
        <>
          <p className="text-kb-stone">Add your business first.</p>
          <Button asChild className="mt-5">
            <Link to="/start">Add your business</Link>
          </Button>
        </>
      ) : null}
      {location.error ? (
        <p className="text-kb-red" role="alert">
          Couldn't load your business. Refresh the page.
        </p>
      ) : null}
      {location.data ? (
        <>
          <PageIcon icon={<NotebookPen />} />
          <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Settings</p>
          <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">
            About your business
          </h1>
          <p className="mt-2 text-kb-stone">{location.data.name}</p>
          <div className="mt-7">
            <KnowledgeStep
              key={location.data.id}
              location={location.data}
              onChanged={() => location.refetch()}
              mode="settings"
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
