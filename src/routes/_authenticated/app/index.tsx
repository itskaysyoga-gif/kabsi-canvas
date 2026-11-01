import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, Link2 } from "lucide-react";
import { AccountTop, Panel } from "@/components/kabsi/d3-account";
import { ButtonLink, ErrorState, Skeleton, buttonClass } from "@/components/kabsi/ui";
import { ActionCenter, NeedsAttention } from "@/components/home/action-center";
import { myAccess } from "@/lib/team";
import { loadEntitlements } from "@/lib/entitlements";
import { attentionLines, ATTENTION_DEFAULT_SETUP } from "@/lib/home-state";
import { loadScenario, myLatestLocation, type Location } from "@/lib/onboarding";
import { screenFor } from "@/lib/scenarios";

// Home (App 2, master plan 30.22 item 5): what needs the owner now, in one screen. No bell (WhatsApp tells owners), no
// connection strip unless access is broken. Facts only (section 3, D222). The shell (app-layout.tsx) gives the page its
// container.
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

  if (location.isLoading) return <PageSkeleton />;
  if (location.isError)
    return (
      <>
        <AccountTop title="Home" />
        <ErrorState title="This page did not load." onRetry={() => void location.refetch()}>
          Nothing you did, and nothing changed on Google. Try again in a minute.
        </ErrorState>
      </>
    );
  if (!loc) return <NoBusiness />;

  return (
    <>
      <AccountTop title="Home" />
      {role === "staff" ? (
        <StaffHome />
      ) : loc.status === "paused" || loc.status === "disabled" ? (
        <Paused loc={loc} />
      ) : (
        <>
          {loc.status !== "active" ? (
            <Setup loc={loc} owner={role === "owner"} />
          ) : access.isError ? (
            <ErrorState title="This page did not load." onRetry={() => void access.refetch()}>
              Nothing you did, and nothing changed on Google. Try again in a minute.
            </ErrorState>
          ) : access.data ? (
            <ActionCenter loc={loc} access={access.data} />
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

// Setup is waiting for a step (V4's onboarding_status): one line with the way back to it, in Needs attention, and what
// happens next. The line is the situation the owner reported while adding Kabsi (P0.4-04) when there is one.
function Setup({ loc, owner }: { loc: Location; owner: boolean }) {
  const scenario = useQuery({
    queryKey: ["scenario", loc.id],
    queryFn: () => loadScenario(loc.id),
    enabled: !loc.access_granted_at,
  });
  const said = scenario.data ? screenFor(scenario.data.scenario, scenario.data.variant) : null;
  const text =
    said?.home ??
    (loc.concierge && loc.consent_at ? CONCIERGE_COPY.setup : ATTENTION_DEFAULT_SETUP);
  // The trial line only while there is no trial or plan yet (the organisation's entitlements, P0.4-06).
  const ent = useQuery({
    queryKey: ["entitlements", loc.id],
    queryFn: () => loadEntitlements(loc.id),
    staleTime: 60_000,
  });
  const noPlan = !!ent.data && ent.data.state === "none";
  const lines = attentionLines({
    tasks: [],
    accessLost: !!loc.access_lost_at && !loc.access_granted_at,
    setup: { text, owner },
    plan: null,
  });
  return (
    <div className="space-y-4">
      <NeedsAttention lines={lines} />
      {loc.concierge || !noPlan ? null : (
        <p className="text-body text-text-2">
          Your trial starts only when access is checked. Nothing has been published.
        </p>
      )}
    </div>
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
