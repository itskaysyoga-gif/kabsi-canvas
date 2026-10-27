import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Link2 } from "lucide-react";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { Banner, ButtonLink, ErrorState, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { ActionCenter } from "@/components/home/action-center";
import { NotificationBell } from "@/components/home/notification-bell";
import { myAccess } from "@/lib/team";
import { loadEntitlements } from "@/lib/entitlements";
import { loadSetupStatus } from "@/lib/home";
import { homeState, waitingLead } from "@/lib/home-state";
import { loadTasks } from "@/lib/tasks";
import { loadScenario, myLatestLocation, type Location } from "@/lib/onboarding";
import { screenFor } from "@/lib/scenarios";
import { KABSI_GROUP_ID } from "@/lib/site";

// Home, "Waiting for you" (Design 3, COPY.md 19): what needs the owner now, what Kabsi sent to Google lately and the next
// report. Facts only (section 3, D222). The shell (app-layout.tsx) gives the page its container.
export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home | Kabsi" }, { name: "robots", content: "noindex" }] }),
  beforeLoad: async () => {
    try {
      // K-16 (P0.3-06): an invitation to someone's team becomes a membership when its address signs in.
      // The client loads here, with the account, and not with every public page's entry code (lane R, performance).
      const { supabase } = await import("@/lib/supabase");
      await supabase.rpc("claim_team_invites");
    } catch {
      // Home still loads; the invitation is claimed on the next visit.
    }
  },
  component: HomePage,
});

function HomePage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const access = useQuery({
    queryKey: ["access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const role = access.data?.role;
  const live = !!loc && loc.status === "active" && !!role && role !== "staff";
  // The same query as the list below (one request): the lead line counts what waits.
  const tasks = useQuery({
    queryKey: ["tasks", loc?.id],
    queryFn: () => loadTasks(loc!.id),
    enabled: live,
    refetchInterval: 60_000,
  });
  const total = tasks.data ? homeState(tasks.data.tasks).total : 0;

  if (location.isLoading) return <PageSkeleton />;
  if (location.isError)
    return (
      <>
        <AccountTop title="Waiting for you" />
        <ErrorState title="This page did not load." onRetry={() => void location.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      </>
    );
  if (!loc) return <NoBusiness />;

  return (
    <>
      <AccountTop
        title="Waiting for you"
        lead={live && total > 0 ? waitingLead(total) : undefined}
        action={role && role !== "staff" ? <NotificationBell locationId={loc.id} /> : undefined}
      />
      {role === "staff" ? (
        <StaffHome />
      ) : loc.status === "paused" || loc.status === "disabled" ? (
        <Paused loc={loc} />
      ) : (
        <>
          <SetupBanner loc={loc} owner={role === "owner"} />
          {loc.status !== "active" ? null : access.isError ? (
            <ErrorState title="This page did not load." onRetry={() => void access.refetch()}>
              Nothing you did, and nothing changed on Google. Try again in a minute.
            </ErrorState>
          ) : access.data ? (
            <ActionCenter loc={loc} role={access.data.role} />
          ) : (
            <PageSkeleton bare />
          )}
        </>
      )}
    </>
  );
}

function PageSkeleton({ bare }: { bare?: boolean }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      {bare ? null : <Skeleton className="mb-6 h-10 w-64" />}
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-card border border-line bg-surface-1 p-5">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// K-16: staff add photos and share the review link; everything else is the owner's and the managers'.
function StaffHome() {
  return (
    <Panel title="You're on the team" id="staff-home">
      <p className="max-w-xl text-body text-text-2">
        You can add photos of the business and share the review link. The owner approves everything
        that goes on Google.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/app/photos" className={buttonClass("primary", "md")} data-main-cta>
          <Camera className="size-4" aria-hidden />
          Add photos
        </Link>
        <ButtonLink
          to="/app/cards"
          variant="secondary"
          size="md"
          icon={<Link2 className="size-4" aria-hidden />}
        >
          Share the review link
        </ButtonLink>
      </div>
    </Panel>
  );
}

function NoBusiness() {
  return (
    <>
      <AccountTop title="Welcome to Kabsi" tabs={false} />
      <Panel>
        <p className="max-w-lg text-body text-text-2">
          Add your business to start. Nothing goes on Google until you approve it.
        </p>
        <Link to="/start" className={buttonClass("primary", "lg", false) + " mt-5"} data-main-cta>
          Add your business
        </Link>
      </Panel>
    </>
  );
}

// Setup is waiting for Google access (V4's onboarding_status): one line and the way back to the next step. The trial
// line is only said while there is no trial or plan yet (the organisation's entitlements, P0.4-06).
function SetupBanner({ loc, owner }: { loc: Location; owner: boolean }) {
  const status = useQuery({
    queryKey: ["setup-status", loc.id],
    queryFn: () => loadSetupStatus(loc.id),
    staleTime: 60_000,
  });
  const ent = useQuery({
    queryKey: ["entitlements", loc.id],
    queryFn: () => loadEntitlements(loc.id),
    staleTime: 60_000,
  });
  // The situation the owner reported while adding Kabsi (P0.4-04).
  const scenario = useQuery({
    queryKey: ["scenario", loc.id],
    queryFn: () => loadScenario(loc.id),
    enabled: !loc.access_granted_at,
  });
  const lost = !!loc.access_lost_at && !loc.access_granted_at;
  const waiting = status.data ? !status.data.checked : loc.status !== "active";
  const noPlan = !ent.data || ent.data.state === "none";
  const said =
    scenario.data && !loc.access_granted_at
      ? screenFor(scenario.data.scenario, scenario.data.variant)
      : null;
  return (
    <>
      {lost ? (
        <Banner tone="bad" title="Kabsi can't reach your Google profile any more." className="mb-5">
          Someone may have removed Kabsi as a Manager. Invite the Kabsi group ID {KABSI_GROUP_ID}{" "}
          again and Kabsi picks up where it left off.
        </Banner>
      ) : null}
      {waiting && !lost ? (
        <Banner
          tone="warn"
          title="Setup is waiting for one step: add Kabsi as a Manager."
          className="mb-5"
          action={
            owner ? (
              <ButtonLink to="/start" size="md" variant="secondary">
                Continue setup
              </ButtonLink>
            ) : undefined
          }
        >
          {noPlan ? <p>Your trial has not started and nothing has been published.</p> : null}
          {said ? <p className={noPlan ? "mt-1" : ""}>{said.home}</p> : null}
          {!said && loc.concierge && loc.consent_at ? (
            <p className={noPlan ? "mt-1" : ""}>{CONCIERGE_COPY.setup}</p>
          ) : null}
        </Banner>
      ) : null}
    </>
  );
}

function Paused({ loc }: { loc: Location }) {
  if (loc.disconnect_requested_at) return <Disconnected loc={loc} />;
  return (
    <Panel
      title={
        loc.status === "paused"
          ? "Kabsi is paused for this business"
          : "This business is switched off"
      }
      id="paused"
    >
      <p className="max-w-xl text-body text-text-2">
        No drafts or emails are sent while it's {loc.status}. Your card and review link keep
        working. Email hello@kabsi.co and we'll help you start again.
      </p>
      <a href="mailto:hello@kabsi.co" className={buttonClass("secondary", "md") + " mt-5"}>
        Email Kabsi
      </a>
    </Panel>
  );
}

// The owner disconnected Kabsi in Settings (K-41, P0.2-02).
function Disconnected({ loc }: { loc: Location }) {
  return (
    <Panel
      title={loc.access_removed_at ? "Kabsi is disconnected from Google" : "Kabsi has stopped"}
      id="disconnected"
    >
      <p className="max-w-xl text-body text-text-2">
        {loc.access_removed_at
          ? "Kabsi no longer reads or changes anything on your Google profile. Your card and review link keep working until your plan ends."
          : "No drafts or emails are sent, and nothing goes to Google. Kabsi is removing its Manager access now. Your card and review link keep working."}
      </p>
      <ButtonLink to="/app/settings" variant="secondary" size="md" className="mt-5">
        See the details in Settings
      </ButtonLink>
    </Panel>
  );
}
