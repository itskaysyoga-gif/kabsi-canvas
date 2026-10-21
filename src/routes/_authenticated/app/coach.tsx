import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ListChecks as PageGlyph } from "lucide-react";
import { EarlyAccessNotice } from "@/components/app/early-access-notice";
import { CoachActions } from "@/components/coach/coach-actions";
import { CoachList } from "@/components/coach/coach-list";
import { PageIcon } from "@/components/shared/page-icon";
import { Button } from "@/components/ui/button";
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
  // After an action: the checklist, the tasks on Home and the profile watch all move.
  const changed = () =>
    Promise.all(
      [["coach"], ["tasks"], ["shield"], ["home-facts"]].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-12">
      <PageIcon icon={<PageGlyph />} />
      <p className="text-sm font-bold uppercase tracking-wider text-kb-stone">Profile</p>
      <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">Profile Coach</h1>
      <p className="mt-2 text-kb-stone">
        What a complete Google profile has, and what yours is missing. Nothing changes on Google
        until you approve it.
      </p>
      {!location.isLoading && !loc ? (
        <Button asChild className="mt-6">
          <Link to="/start">Add your business</Link>
        </Button>
      ) : null}
      {loc?.concierge ? <EarlyAccessNotice what="The Profile Coach" /> : null}
      {loc && !live && !loc.concierge ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <p className="font-bold">The Coach starts once Kabsi can reach your Google profile.</p>
          <Button asChild size="compact" className="mt-4">
            <Link to="/start">Continue setup</Link>
          </Button>
        </div>
      ) : null}
      {live && coach.isLoading ? <p className="mt-7 text-kb-stone">Loading…</p> : null}
      {live && coach.isError ? (
        <p className="mt-7 text-kb-stone" role="alert">
          The checklist did not load. Please try again in a moment.
        </p>
      ) : null}
      {live && c?.locked ? (
        <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
          <p className="font-bold">The Profile Coach comes with Essentials and Pro.</p>
          <p className="mt-1 text-sm text-kb-stone">
            Choose a plan and Kabsi shows what your profile is missing, one step at a time.
          </p>
          <Button asChild size="compact" className="mt-4">
            <Link to="/app/plan">See plans</Link>
          </Button>
        </div>
      ) : null}
      {live && c && !c.locked ? (
        <div className="mt-7">
          {c.source !== "live" ? (
            <p className="mb-4 rounded-card bg-kb-sand p-4 text-sm" data-testid="coach-not-live">
              Kabsi reads the description, categories and details from your live Google profile.
              Until that is connected they show as not checked yet.
            </p>
          ) : null}
          <CoachList rows={rows} />
          {c.pro && loc ? (
            <CoachActions locationId={loc.id} onChanged={changed} />
          ) : (
            <section
              className="mt-8 rounded-large bg-kb-white p-6 shadow-kb"
              data-testid="coach-pro-note"
            >
              <p className="font-bold">With Pro, Kabsi does these for you</p>
              <p className="mt-1 text-sm text-kb-stone">
                Pro prepares the website tag, more categories, a website check and a snippet for
                your website. You approve each one before anything reaches Google.
              </p>
              <Button asChild size="compact" className="mt-4">
                <Link to="/app/plan">See plans</Link>
              </Button>
            </section>
          )}
        </div>
      ) : null}
    </div>
  );
}
