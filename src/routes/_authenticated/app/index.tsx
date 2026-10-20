import { CONCIERGE_COPY } from "@/lib/concierge-copy";
import { createFileRoute, isRedirect, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionCenter } from "@/components/home/action-center";
import { myAccess } from "@/lib/team";
import { supabase } from "@/lib/supabase";
import { loadEntitlements } from "@/lib/entitlements";
import { myLatestLocation, type Location } from "@/lib/onboarding";
import { cn } from "@/lib/utils";

// Home: one calm page that says what needs the owner now, then how the week looks. Facts only (§3, D222).
export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home | Kabsi" }, { name: "robots", content: "noindex" }] }),
  // A partner with no business of their own goes to the partner workspace instead.
  beforeLoad: async () => {
    try {
      // K-16 (P0.3-06): an invitation to someone's team becomes a membership when its address signs in.
      await supabase.rpc("claim_team_invites");
      const { data: loc } = await supabase.from("locations").select("id").limit(1).maybeSingle();
      if (!loc) {
        const { data: partnerId } = await supabase.rpc("claim_partner_membership");
        if (partnerId) throw redirect({ to: "/partner" });
      }
    } catch (e) {
      if (isRedirect(e)) throw e;
    }
  },
  component: HomePage,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function HomePage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const access = useQuery({
    queryKey: ["access", loc?.id],
    queryFn: () => myAccess(loc!.id),
    enabled: !!loc,
  });
  const staffRole = access.data?.role === "staff";

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      {location.isLoading ? <p className="text-kb-stone">Loading…</p> : null}
      {!location.isLoading && !loc ? <NoBusiness /> : null}
      {loc ? (
        <>
          <p className="text-sm font-medium text-kb-stone">{greeting()}</p>
          <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">{loc.name}</h1>
          {staffRole ? (
            <StaffHome />
          ) : loc.status === "paused" || loc.status === "disabled" ? (
            <Paused loc={loc} />
          ) : loc.status !== "active" ? (
            <Setup loc={loc} />
          ) : access.isError ? (
            <p className="mt-6 text-kb-red" role="alert">
              We couldn't load your page. Refresh and try again.
            </p>
          ) : access.data ? (
            <ActionCenter loc={loc} role={access.data.role} />
          ) : (
            <Skeleton />
          )}
        </>
      ) : null}
    </div>
  );
}

// K-16: staff add photos and share the review link; everything else is the owner's and the managers'.
function StaffHome() {
  return (
    <section className="mt-7 rounded-large bg-kb-white p-6 shadow-kb">
      <h2 className="text-2xl font-bold">You're on the team</h2>
      <p className="mt-2 max-w-xl leading-7 text-kb-stone">
        You can add photos of the business and share the review link. The owner approves everything
        that goes on Google.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/app/photos">
            Add photos <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/app/cards">Share the review link</Link>
        </Button>
      </div>
    </section>
  );
}

function NoBusiness() {
  return (
    <div className="rounded-large bg-kb-carbon p-7 text-kb-white sm:p-10">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Welcome to Kabsi</h1>
      <p className="mt-4 max-w-lg leading-7 text-kb-stone-on-dark">
        Add your business to start. Every new Google review will reach you by email with a reply
        already drafted. Nothing goes on Google until you approve it.
      </p>
      <Button asChild className="mt-7">
        <Link to="/start">
          Add your business <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true">
      <div className="h-16 animate-pulse rounded-card bg-kb-white/70" />
      <div className="h-56 animate-pulse rounded-card bg-kb-white/70" />
    </div>
  );
}

// ── Setup not finished: one checklist, one button.
// Done = a Pro payment is recorded (the plan itself starts once Google access works, D224) or the organisation's
// entitlements show a trial or a plan (P0.4-06).
async function hasPaidPlan(locationId: string) {
  const [pay, ent] = await Promise.all([
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("location_id", locationId)
      .not("item", "in", "(card,cards_5,extra_card)"),
    loadEntitlements(locationId),
  ]);
  return (pay.count ?? 0) > 0 || (!!ent && ent.state !== "none");
}

function Paused({ loc }: { loc: Location }) {
  if (loc.disconnect_requested_at) return <Disconnected loc={loc} />;
  return (
    <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-9">
      <h2 className="text-2xl font-bold">
        {loc.status === "paused"
          ? "Kabsi is paused for this business"
          : "This business is switched off"}
      </h2>
      <p className="mt-2 max-w-xl leading-7 text-kb-stone">
        No drafts or emails are sent while it's {loc.status}. Your card and review link keep
        working. Email hello@kabsi.co and we'll help you start again.
      </p>
      <Button asChild className="mt-6">
        <a href="mailto:hello@kabsi.co">Email Kabsi</a>
      </Button>
    </div>
  );
}

// The owner disconnected Kabsi in Settings (K-41, P0.2-02).
function Disconnected({ loc }: { loc: Location }) {
  return (
    <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-9">
      <h2 className="text-2xl font-bold">
        {loc.access_removed_at ? "Kabsi is disconnected from Google" : "Kabsi has stopped"}
      </h2>
      <p className="mt-2 max-w-xl leading-7 text-kb-stone">
        {loc.access_removed_at
          ? "Kabsi no longer reads or changes anything on your Google profile. Your card and review link keep working until your plan ends."
          : "No drafts or emails are sent, and nothing goes to Google. Kabsi is removing its Manager access now. Your card and review link keep working."}
      </p>
      <Button asChild variant="outline" className="mt-6">
        <Link to="/app/settings">See the details in Settings</Link>
      </Button>
    </div>
  );
}

function Setup({ loc }: { loc: Location }) {
  const paid = useQuery({ queryKey: ["paid-plan", loc.id], queryFn: () => hasPaidPlan(loc.id) });
  const knowledgeDone = loc.onboarding_step === "plan" || loc.onboarding_step === "done";
  const steps = [
    { label: "Find your business on Google", done: true, note: "" },
    {
      label: "Add Kabsi as a Manager on your Google profile",
      done: !!loc.access_granted_at,
      note:
        loc.consent_at && !loc.access_granted_at
          ? loc.concierge
            ? CONCIERGE_COPY.setup
            : "Waiting for Google access"
          : "",
    },
    { label: "Tell Kabsi about your business", done: knowledgeDone, note: "" },
    {
      label: loc.partner_id ? "Plan through your partner" : "Choose your plan",
      done: loc.partner_id ? loc.onboarding_step === "done" : paid.data === true,
      note:
        loc.onboarding_step === "done" && !loc.partner_id && paid.data === false
          ? "Waiting for payment"
          : "",
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  return (
    <div className="mt-7 rounded-large bg-kb-white p-6 shadow-kb sm:p-9">
      {loc.access_lost_at && !loc.access_granted_at ? (
        <div
          className="mb-6 flex gap-3 rounded-card bg-kb-red/10 p-4 text-sm leading-6"
          role="alert"
        >
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-kb-red" aria-hidden="true" />
          <p>
            <b>Kabsi can't reach your Google profile any more.</b> Someone may have removed Kabsi as
            a Manager. Invite the Kabsi group ID 5481006796 again and Kabsi picks up where it left
            off.
          </p>
        </div>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Finish setting up</h2>
          <p className="mt-1 text-kb-stone">
            Kabsi starts drafting replies as soon as these are done.
          </p>
        </div>
        <p className="font-display text-3xl leading-none">
          {doneCount}/{steps.length}
        </p>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-pill bg-kb-sand">
        <div
          className="h-full rounded-pill bg-kb-yellow transition-all"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-6 space-y-3">
        {steps.map((s) => (
          <li key={s.label} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2",
                s.done ? "border-kb-green bg-kb-green text-kb-white" : "border-kb-hairline",
              )}
            >
              {s.done ? <Check className="size-4" /> : null}
            </span>
            <span>
              <span className={cn("font-medium", s.done && "text-kb-stone")}>{s.label}</span>
              {s.note ? <span className="block text-sm text-kb-stone">{s.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/start">
            Continue setup <ArrowRight />
          </Link>
        </Button>
        {!loc.partner_id && paid.data === false && loc.onboarding_step === "done" ? (
          <Button asChild variant="outline">
            <Link to="/app/plan">Pay for your plan</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
