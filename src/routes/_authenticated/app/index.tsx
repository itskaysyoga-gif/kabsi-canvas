import type { ReactNode } from "react";
import { createFileRoute, isRedirect, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Check,
  Clock3,
  CreditCard,
  FileText,
  ImagePlus,
  MessageSquareText,
  Newspaper,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { myLatestLocation, type Location } from "@/lib/onboarding";
import {
  daysSince,
  daysUntil,
  loadDashboard,
  PLAN_NAME,
  type Dashboard,
  type RecentReview,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

// Home: one calm page that says what needs the owner now, then how the week looks. Facts only (§3, D222).
export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({ meta: [{ title: "Home | Kabsi" }, { name: "robots", content: "noindex" }] }),
  // A partner with no business of their own goes to the partner workspace instead.
  beforeLoad: async () => {
    try {
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

const shortDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "-";

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function HomePage() {
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
  const dash = useQuery({
    queryKey: ["dashboard", loc?.id],
    queryFn: () => loadDashboard(loc!.id),
    enabled: !!loc,
    refetchInterval: 60_000,
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      {location.isLoading ? <p className="text-kb-stone">Loading…</p> : null}
      {!location.isLoading && !loc ? <NoBusiness /> : null}
      {loc ? (
        <>
          <p className="text-sm font-medium text-kb-stone">{greeting()}</p>
          <h1 className="mt-1 font-display text-4xl leading-none sm:text-5xl">{loc.name}</h1>
          {loc.status !== "active" ? (
            <Setup loc={loc} />
          ) : dash.isError ? (
            <p className="mt-6 text-kb-red">We couldn't load your summary. Refresh the page.</p>
          ) : !dash.data ? (
            <Skeleton />
          ) : (
            <Active d={dash.data} />
          )}
        </>
      ) : null}
    </div>
  );
}

function NoBusiness() {
  return (
    <div className="rounded-large bg-kb-carbon p-7 text-kb-white sm:p-10">
      <h1 className="font-display text-4xl leading-none sm:text-5xl">Welcome to Kabsi</h1>
      <p className="mt-4 max-w-lg leading-7 text-kb-stone-on-dark">
        Add your business to start. Every new Google review will reach you by email with a reply
        already drafted. Nothing is posted until you tap Post.
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
    <div className="mt-7 space-y-5" aria-busy="true">
      <div className="h-44 animate-pulse rounded-large bg-kb-white/70" />
      <div className="grid gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-large bg-kb-white/70" />
        ))}
      </div>
    </div>
  );
}

// ── Setup not finished: one checklist, one button.
// Paid = a Pro payment is recorded (the plan itself starts once Google access works, D224).
async function hasPaidPlan(locationId: string) {
  const { count } = await supabase
    .from("payments")
    .select("id", { count: "exact", head: true })
    .eq("location_id", locationId)
    .in("item", ["pro_6m", "pro_12m"]);
  return (count ?? 0) > 0;
}

function Setup({ loc }: { loc: Location }) {
  const paid = useQuery({ queryKey: ["paid-plan", loc.id], queryFn: () => hasPaidPlan(loc.id) });
  const knowledgeDone = loc.onboarding_step === "plan" || loc.onboarding_step === "done";
  const steps = [
    { label: "Find your business on Google", done: true, note: "" },
    {
      label: "Add Kabsi as a Manager on your Google profile",
      done: !!loc.access_granted_at,
      note: loc.consent_at && !loc.access_granted_at ? "Waiting for Google access" : "",
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

// ── Active business
function Active({ d }: { d: Dashboard }) {
  const daysLeft = daysUntil(d.planPaidUntil);
  const extras: { key: string; icon: ReactNode; text: string; to: string; tone?: "alert" }[] = [];
  if (d.openChanges)
    extras.push({
      key: "shield",
      icon: <ShieldAlert />,
      text: `Someone changed your Google listing. Keep it or put yours back.`,
      to: "/app/shield",
      tone: "alert",
    });
  if (d.postDrafts)
    extras.push({
      key: "posts",
      icon: <Newspaper />,
      text: `${d.postDrafts} Google ${d.postDrafts === 1 ? "post is" : "posts are"} drafted and waiting for you.`,
      to: "/app/posts",
    });
  if (d.photoDrafts)
    extras.push({
      key: "photos",
      icon: <ImagePlus />,
      text: `${d.photoDrafts} ${d.photoDrafts === 1 ? "photo is" : "photos are"} checked and ready to post.`,
      to: "/app/photos",
    });
  if (d.plan?.kind !== "partner" && daysLeft !== null && daysLeft <= 30)
    extras.push({
      key: "plan",
      icon: <CreditCard />,
      text: `Your plan ends in ${daysLeft} ${daysLeft === 1 ? "day" : "days"}. Renew to keep replies coming.`,
      to: "/app/plan",
    });

  return (
    <>
      {/* What needs you */}
      <section className="mt-7 overflow-hidden rounded-large bg-kb-carbon text-kb-white">
        <div className="relative p-6 sm:p-9">
          {d.waiting > 0 ? <ReplyStack /> : null}
          {d.waiting > 0 ? (
            <div className="relative max-w-xl">
              <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-2xl font-bold sm:text-3xl">
                <span className="font-display text-5xl leading-none text-kb-yellow sm:text-7xl">
                  {d.waiting}
                </span>
                {d.waiting === 1 ? "reply is ready for you" : "replies are ready for you"}
              </h2>
              <p className="mt-2 max-w-xl leading-7 text-kb-stone-on-dark">
                {d.urgent > 0
                  ? `${d.urgent} ${d.urgent === 1 ? "needs" : "need"} extra care. Read the draft, change it if you like, and tap Post.`
                  : "Read each draft, change it if you like, and tap Post. Nothing goes on Google without you."}
              </p>
              <Button asChild className="mt-6">
                <Link to="/app/inbox">
                  Review replies <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black">
                <Check className="size-6" />
              </span>
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">You're all caught up</h2>
                <p className="mt-2 max-w-xl leading-7 text-kb-stone-on-dark">
                  When a new Google review arrives, you'll get an email with a reply ready.
                </p>
              </div>
            </div>
          )}
        </div>
        {extras.length ? (
          <ul className="divide-y divide-white/10 border-t border-white/10">
            {extras.map((x) => (
              <li key={x.key}>
                <Link
                  to={x.to}
                  className="flex items-center gap-3 px-6 py-4 text-sm transition-colors hover:bg-white/5 sm:px-9 [&_svg]:size-5 [&_svg]:shrink-0"
                >
                  <span className={x.tone === "alert" ? "text-kb-yellow" : "text-kb-stone-on-dark"}>
                    {x.icon}
                  </span>
                  <span className="flex-1">{x.text}</span>
                  <ArrowRight className="text-kb-stone-on-dark" />
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* This week */}
      <h2 className="mt-10 text-sm font-bold uppercase tracking-wider text-kb-stone">
        Last 7 days
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Tile
          label="Google rating"
          value={d.rating != null ? d.rating.toFixed(1) : "-"}
          icon={<Star className="fill-kb-yellow text-kb-yellow" />}
          sub={
            d.rating == null
              ? "Appears after the first daily check"
              : d.ratingChange == null
                ? `${d.ratingCount ?? 0} ${d.ratingCount === 1 ? "review" : "reviews"} on Google`
                : d.ratingChange === 0
                  ? "Same as last week"
                  : `${d.ratingChange > 0 ? "+" : ""}${d.ratingChange.toFixed(1)} since last week`
          }
          subTone={d.ratingChange != null && d.ratingChange <= -0.1 ? "down" : undefined}
        />
        <Tile label="New reviews" value={String(d.newReviews7d)} icon={<MessageSquareText />} />
        <Tile
          label="Replied"
          value={d.newReviews7d ? `${d.replied7d} of ${d.newReviews7d}` : "-"}
          icon={<Check />}
          sub={d.newReviews7d ? "new reviews this week" : "No new reviews this week"}
        />
        <Tile
          label="Card taps"
          value={String(d.taps7d)}
          icon={<CreditCard />}
          sub={`${d.taps30d} in the last 30 days`}
        />
      </div>

      <ProfileHealth d={d} />

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Latest reviews */}
        <section className="rounded-large bg-kb-white p-6 shadow-kb">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Latest reviews</h2>
            <Link
              to="/app/reviews"
              className="text-sm font-medium underline-offset-4 hover:underline"
            >
              See all
            </Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-kb-stone">
              No reviews yet. New ones show up here and in your email.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-kb-hairline">
              {d.recent.map((r) => (
                <ReviewLine key={r.id} r={r} />
              ))}
            </ul>
          )}
        </section>

        {/* Status column */}
        <div className="space-y-5">
          <StatusCard
            icon={<CreditCard />}
            title={d.plan ? (PLAN_NAME[d.plan.kind] ?? "Kabsi Pro") : "Your plan"}
            to="/app/plan"
            line={
              d.plan?.kind === "partner"
                ? "Your plan comes through your Kabsi partner."
                : d.planPaidUntil
                  ? `Active until ${shortDate(d.planPaidUntil)}${daysLeft !== null ? ` · ${daysLeft} days left` : ""}`
                  : d.pendingClaim
                    ? "Payment sent. We're confirming it."
                    : "Active"
            }
            dot="ok"
          />
          <StatusCard
            icon={<FileText />}
            title="Weekly report"
            to="/app/report"
            line={
              d.latestReport
                ? `Latest: week of ${shortDate(d.latestReport.week_of)}. A new one every Monday.`
                : "Your first report arrives on Monday morning."
            }
          />
        </div>
      </div>

      {/* Quick actions */}
      <h2 className="mt-10 text-sm font-bold uppercase tracking-wider text-kb-stone">
        Keep your Google profile fresh
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Quick
          to="/app/posts"
          icon={<Newspaper />}
          title="Write a post"
          sub="Tell customers what's new"
        />
        <Quick
          to="/app/photos"
          icon={<ImagePlus />}
          title="Add a photo"
          sub="Checked before it goes up"
        />
        <Quick
          to="/app/hours"
          icon={<Clock3 />}
          title="Special hours"
          sub="Holidays and closures"
        />
      </div>
    </>
  );
}

// Local SEO health: the facts Google's own guidance points to (answer reviews, keep the profile
// current and accurate). Plain facts with a next step, no made-up score (D240).
// Decorative: a drafted reply waiting for the owner's tap (desktop only).
function ReplyStack() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-9 top-1/2 hidden w-64 -translate-y-1/2 xl:block"
    >
      <div className="ml-8 rotate-3 rounded-card bg-white/10 p-4 ring-1 ring-white/10">
        <span className="block h-2 w-3/4 rounded-pill bg-white/20" />
        <span className="mt-2 block h-2 w-1/2 rounded-pill bg-white/20" />
      </div>
      <div className="-mt-6 -rotate-2 rounded-card bg-kb-white p-4 text-kb-ink shadow-[0_18px_40px_rgba(0,0,0,.45)]">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-kb-carbon text-[11px] font-bold text-kb-white">
            E
          </span>
          <span className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={n} className="size-3 fill-kb-black" />
            ))}
          </span>
        </div>
        <span className="mt-3 block h-2 w-full rounded-pill bg-kb-hairline" />
        <span className="mt-1.5 block h-2 w-2/3 rounded-pill bg-kb-hairline" />
        <div className="mt-3 flex gap-2">
          <span className="rounded-pill bg-kb-yellow px-4 py-1 text-xs font-bold">Post</span>
          <span className="rounded-pill px-3 py-1 text-xs font-bold ring-2 ring-kb-black">
            Edit
          </span>
        </div>
      </div>
    </div>
  );
}

function ProfileHealth({ d }: { d: Dashboard }) {
  const rate = d.reviews90d ? Math.round((d.answered90d / d.reviews90d) * 100) : null;
  const postDays = daysSince(d.lastPostAt);
  const rows: {
    key: string;
    icon: ReactNode;
    label: string;
    value: string;
    note: string;
    ok: boolean;
    to: string;
  }[] = [
    {
      key: "replies",
      icon: <MessageSquareText />,
      label: "Reviews answered",
      value: rate == null ? "-" : `${rate}%`,
      note:
        rate == null
          ? "No reviews in the last 90 days"
          : `${d.answered90d} of ${d.reviews90d} in the last 90 days`,
      ok: rate == null || rate >= 90,
      to: "/app/inbox",
    },
    {
      key: "posts",
      icon: <Newspaper />,
      label: "Last Google post",
      value: postDays == null ? "None yet" : postDays === 0 ? "Today" : `${postDays}d ago`,
      note:
        postDays != null && postDays <= 7
          ? "Your profile looks active"
          : "A post a week keeps it fresh",
      ok: postDays != null && postDays <= 7,
      to: "/app/posts",
    },
    {
      key: "shield",
      icon: d.openChanges ? <ShieldAlert /> : <ShieldCheck />,
      label: "Profile guard",
      value: d.openChanges ? "Needs you" : d.shieldWatching ? "Watching" : "Starting",
      note: d.openChanges
        ? "A change to your listing is waiting for your decision"
        : "Name, phone, address, hours, website, category",
      ok: !d.openChanges,
      to: "/app/shield",
    },
    {
      key: "taps",
      icon: <CreditCard />,
      label: "Review link taps",
      value: String(d.taps7d),
      note: `Last 7 days · ${d.taps30d} in 30 days`,
      ok: true,
      to: "/app/cards",
    },
  ];
  return (
    <section className="mt-8 rounded-large bg-kb-white p-6 shadow-kb">
      <h2 className="text-lg font-bold">Profile health</h2>
      <p className="mt-1 text-sm text-kb-stone">
        Google advises keeping your details complete and accurate and answering reviews. Regular
        posts show customers you're active.
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {rows.map((r) => (
          <li key={r.key} className="min-w-0">
            <Link
              to={r.to}
              className="flex items-center gap-3 rounded-card border border-kb-hairline p-4 transition-colors hover:bg-kb-sand/50 [&_svg]:size-5 [&_svg]:shrink-0"
            >
              <span className={r.ok ? "text-kb-stone" : "text-kb-black"}>{r.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-kb-stone">{r.label}</span>
                <span className="block truncate text-xs text-kb-stone">{r.note}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 whitespace-nowrap text-right font-bold">
                {r.value}
                <span
                  aria-hidden
                  className={cn("size-2 rounded-full", r.ok ? "bg-kb-green" : "bg-kb-yellow")}
                />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Tile({
  label,
  value,
  icon,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  sub?: string | undefined;
  subTone?: "down" | undefined;
}) {
  return (
    <div className="rounded-large bg-kb-white p-4 shadow-kb sm:p-5">
      <div className="flex items-center justify-between gap-2 text-kb-stone [&_svg]:size-4">
        <span className="text-sm font-medium">{label}</span>
        {icon}
      </div>
      <p className="mt-2 font-display text-4xl leading-none">{value}</p>
      {sub ? (
        <p
          className={cn(
            "mt-2 text-xs leading-5",
            subTone === "down" ? "text-kb-red" : "text-kb-stone",
          )}
        >
          {sub}
        </p>
      ) : null}
    </div>
  );
}

const REVIEW_STATE: Record<string, { label: string; cls: string }> = {
  new: { label: "Drafting", cls: "bg-kb-sand text-kb-stone" },
  drafted: { label: "Reply ready", cls: "bg-kb-yellow text-kb-black" },
  blocked: { label: "Needs you", cls: "bg-kb-yellow text-kb-black" },
  posted: { label: "Replied", cls: "bg-kb-green/10 text-kb-green" },
  skipped: { label: "Skipped", cls: "bg-kb-sand text-kb-stone" },
  handled_offline: { label: "Handled by you", cls: "bg-kb-sand text-kb-stone" },
  archived: { label: "Older", cls: "bg-kb-sand text-kb-stone" },
};

function ReviewLine({ r }: { r: RecentReview }) {
  const st = REVIEW_STATE[r.state] ?? { label: r.state, cls: "bg-kb-sand" };
  const open = r.state === "drafted" || r.state === "blocked" || r.state === "new";
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <Link to={open ? "/app/inbox" : "/app/reviews"} className="block">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <span className="flex" role="img" aria-label={`${r.star_rating} stars`}>
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "size-4",
                    i <= r.star_rating ? "fill-kb-yellow text-kb-yellow" : "text-kb-hairline",
                  )}
                />
              ))}
            </span>
            <span className="truncate text-sm font-medium">{r.reviewer_name ?? "A customer"}</span>
          </span>
          <span className={cn("shrink-0 rounded-pill px-2.5 py-1 text-xs font-bold", st.cls)}>
            {st.label}
          </span>
        </div>
        {r.comment ? (
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-kb-stone">{r.comment}</p>
        ) : (
          <p className="mt-1.5 text-sm italic text-kb-stone">Rating only, no text</p>
        )}
      </Link>
    </li>
  );
}

function StatusCard({
  icon,
  title,
  line,
  to,
  dot,
}: {
  icon: ReactNode;
  title: string;
  line: string;
  to: string;
  dot?: "ok" | "alert" | "idle";
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 rounded-large bg-kb-white p-5 shadow-kb transition-transform hover:-translate-y-0.5"
    >
      <span className="relative grid size-11 shrink-0 place-items-center rounded-card bg-kb-sand [&_svg]:size-5">
        {icon}
        {dot ? (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-kb-white",
              dot === "ok" ? "bg-kb-green" : dot === "alert" ? "bg-kb-red" : "bg-kb-hairline",
            )}
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{title}</span>
        <span className="mt-0.5 block text-sm leading-6 text-kb-stone">{line}</span>
      </span>
      <ArrowRight className="mt-1 size-4 shrink-0 text-kb-stone transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function Quick({
  to,
  icon,
  title,
  sub,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 rounded-large border-2 border-kb-hairline bg-kb-white p-4 transition-colors hover:border-kb-black [&_svg]:size-5"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-kb-yellow text-kb-black">
        {icon}
      </span>
      <span>
        <span className="block font-bold">{title}</span>
        <span className="block text-sm text-kb-stone">{sub}</span>
      </span>
    </Link>
  );
}
