import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { CoachActions } from "@/components/coach/coach-actions";
import { CoachList } from "@/components/coach/coach-list";
import { AccountTop, Panel, SourceLabel } from "@/components/kabsi/d3-account";
import { Banner, ButtonLink, ErrorState, Skeleton } from "@/components/kabsi/ui";
import { coachRows, loadCoach } from "@/lib/coach";
import { myLatestLocation } from "@/lib/onboarding";

// Profile Coach (P0.8-09, K-136): what a complete Google profile has, what is missing and why. Essentials sees the
// checklist; Pro also gets the changes prepared for approval (they arrive next). Every gap is also a task on Home.
export const Route = createFileRoute("/_authenticated/app/coach")({
  head: () => ({
    meta: [{ title: "Profile Coach | Kabsi" }, { name: "robots", content: "noindex" }],
  }),
  component: CoachPage,
});

function CoachPage() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const live = !!loc && loc.status === "active" && !loc.concierge;
  const coach = useQuery({
    queryKey: ["coach", loc?.id],
    queryFn: () => loadCoach(loc!.id),
    enabled: !!loc && !loc.concierge,
    retry: false,
  });
  const c = coach.data;
  const rows = c ? coachRows(c) : [];
  const done = rows.filter((r) => r.status === "done").length;
  // After an action: the checklist, the tasks on Home and the profile watch all move.
  const changed = () =>
    Promise.all(
      [["coach"], ["tasks"], ["shield"], ["home-facts"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  return (
    <>
      <AccountTop
        title="Profile Coach"
        lead="What a complete Google profile has, and what yours is missing. Nothing changes on Google until you approve it."
      />
      {!location.isLoading && !loc ? <ButtonLink to="/start">Add your business</ButtonLink> : null}
      {loc?.concierge ? <EarlyAccessNotice what="The Profile Coach" /> : null}
      {loc && !live && !loc.concierge ? (
        <Panel>
          <p className="text-body font-bold">
            The Coach starts once Kabsi can reach your Google profile.
          </p>
          <ButtonLink to="/start" size="md" className="mt-4">
            Continue setup
          </ButtonLink>
        </Panel>
      ) : null}
      {live && coach.isLoading ? (
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="mt-3 h-4 w-full" />
            </div>
          ))}
        </div>
      ) : null}
      {live && coach.isError ? (
        <ErrorState title="The checklist did not load." onRetry={() => void coach.refetch()}>
          Please try again in a moment.
        </ErrorState>
      ) : null}
      {live && c?.locked ? (
        <Panel>
          <p className="text-body font-bold">The Profile Coach comes with Essentials and Pro.</p>
          <p className="mt-1 text-small text-text-2">
            Choose a plan and Kabsi shows what your profile is missing, one step at a time.
          </p>
          <ButtonLink to="/app/plan" size="md" className="mt-4">
            See plans
          </ButtonLink>
        </Panel>
      ) : null}
      {live && c && !c.locked ? (
        <div className="space-y-4">
          {c.source !== "live" ? (
            <div data-testid="coach-not-live">
              <Banner title="Not checked yet">
                Kabsi reads the description, categories and details from your live Google profile.
                Until that is connected they show as not checked yet.
              </Banner>
            </div>
          ) : null}
          <Panel
            title="Your checklist"
            id="checklist"
            action={
              <SourceLabel>
                {done} of {rows.length} done
              </SourceLabel>
            }
          >
            <CoachList rows={rows} />
          </Panel>
          {c.pro && loc ? (
            <CoachActions locationId={loc.id} onChanged={changed} />
          ) : (
            <section data-testid="coach-pro-note">
              <Panel title="With Pro, Kabsi does these for you" id="pro">
                <p className="text-body text-text-2">
                  Pro prepares the website tag, more categories, a website check and a snippet for
                  your website. You approve each one before anything reaches Google.
                </p>
                <ButtonLink to="/app/plan" size="md" variant="secondary" className="mt-4">
                  See plans
                </ButtonLink>
              </Panel>
            </section>
          )}
        </div>
      ) : null}
    </>
  );
}
