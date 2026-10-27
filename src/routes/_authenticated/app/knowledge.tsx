import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { KnowledgeStep } from "@/components/onboarding/steps";
import { AccountTop } from "@/components/kabsi/d3-account";
import { EmptyState, ErrorState, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { myLatestLocation } from "@/lib/onboarding";

// Business Knowledge: the only facts reply drafts may use (D223). Same form as onboarding step 3, in Design 3's page top.
export const Route = createFileRoute("/_authenticated/app/knowledge")({
  head: () => ({
    meta: [{ title: "Business Knowledge | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  return (
    <>
      <AccountTop title="Business Knowledge" lead={location.data?.name} />
      {location.isLoading ? (
        <div
          className="rounded-card border border-line bg-surface-1 p-5"
          role="status"
          aria-label="Loading"
        >
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-3 h-4 w-full" />
        </div>
      ) : null}
      {!location.isLoading && !location.error && !location.data ? (
        <EmptyState
          title="Add your business first."
          action={
            <Link to="/start" className={buttonClass()} data-main-cta>
              Add your business
            </Link>
          }
        />
      ) : null}
      {location.error ? (
        <ErrorState title="This page did not load." onRetry={() => void location.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      ) : null}
      {location.data ? (
        <KnowledgeStep
          key={location.data.id}
          location={location.data}
          onChanged={() => location.refetch()}
          mode="settings"
        />
      ) : null}
    </>
  );
}
