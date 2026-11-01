// The signed-in website's shell (Design 3, light; App 2, master plan 30.22 item 5): a side bar from 1024 px, and below it
// a top bar (the business, and one account menu with the trial, help and Log out) and a bottom bar with the same five places. The places, the roles and the old addresses are in src/lib/app-nav.ts; this file only
// draws them. The staff area (/staff) uses the same shell with its own single link.
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Camera,
  ChevronDown,
  CircleUser,
  Home,
  LifeBuoy,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquareText,
  Newspaper,
  QrCode,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chooseLocation, myLatestLocation, myLocations, type Location } from "@/lib/onboarding";
import { amStaff } from "@/lib/reviews";
import { waitingReplies } from "@/lib/tasks";
import { myAccess, type Role } from "@/lib/team";
import { loadEntitlements } from "@/lib/entitlements";
import { fmtDate } from "@/lib/format";
import { openPrivacyChoices } from "@/lib/consent";
import { NOT_AFFILIATED } from "@/lib/site";
import {
  canOpen,
  desktopSections,
  phoneBar,
  sectionFor,
  type Section,
  type SectionId,
} from "@/lib/app-nav";
import { WhatsappLink } from "@/components/shared/whatsapp-link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ButtonLink, ErrorState, ExampleBadge, KabsiMark } from "@/components/kabsi/ui";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { setAnalyticsPaused } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

const ICON: Record<SectionId, LucideIcon> = {
  home: Home,
  reviews: MessageSquareText,
  "google-profile": ShieldCheck,
  content: Newspaper,
  "get-reviews": QrCode,
  settings: Settings,
  photos: Camera,
};

const STATUS_LABEL: Record<string, string> = {
  onboarding: "Setup not finished",
  access_pending: "Waiting for Google access",
  awaiting_payment: "Waiting for payment",
  active: "Active",
  paused: "Paused",
  disabled: "Disabled",
  waiting_list: "Waiting list",
};

/** The business card at the top of the side bar, and the business name in the phone top bar: one menu for both. */
function BusinessMenu({ compact = false }: { compact?: boolean }) {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const all = useQuery({ queryKey: ["my-locations"], queryFn: myLocations });
  const loc = location.data;
  const others = (all.data ?? []).filter((l) => l.id !== loc?.id);
  async function switchTo(id: string) {
    chooseLocation(id);
    await queryClient.invalidateQueries();
  }
  const name = location.isLoading
    ? "Loading"
    : location.isError
      ? "Your business"
      : (loc?.name ?? "Add your business");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="press flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-inner px-1 text-start"
          >
            <span className="truncate font-display text-title font-bold">{name}</span>
            {loc?.is_demo ? <ExampleBadge className="shrink-0" /> : null}
            <ChevronDown className="size-4 shrink-0 text-text-2" aria-hidden />
            <span className="sr-only">: switch business</span>
          </button>
        ) : (
          <button
            type="button"
            className="press mx-3 flex items-center gap-3 rounded-inner border border-line bg-surface-0 px-3 py-2.5 text-start hover:bg-surface-2"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-text-1 font-display text-title font-bold text-surface-0">
              {(loc?.name ?? "K").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-bold">{name}</span>
              <span className="block truncate text-label text-text-2">
                {loc?.is_demo ? "Example" : loc ? (STATUS_LABEL[loc.status] ?? loc.status) : ""}
              </span>
            </span>
            <ChevronDown className="size-4 shrink-0 text-text-2" aria-hidden />
            <span className="sr-only">: switch business</span>
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 rounded-card border-line bg-surface-1 p-2 shadow-float"
      >
        {loc ? (
          <>
            <DropdownMenuLabel className="text-small font-semibold">
              <span className="block truncate">{loc.name}</span>
              <span className="block text-label font-normal text-text-2">
                {STATUS_LABEL[loc.status] ?? loc.status}
              </span>
            </DropdownMenuLabel>
            {loc.status !== "active" ? (
              <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-inner">
                <Link to="/start">Continue setup</Link>
              </DropdownMenuItem>
            ) : null}
            {others.length ? (
              <>
                <DropdownMenuSeparator className="bg-line" />
                <DropdownMenuLabel className="text-label font-normal text-text-2">
                  Switch business
                </DropdownMenuLabel>
                {others.map((o) => (
                  <DropdownMenuItem
                    key={o.id}
                    className="min-h-11 cursor-pointer rounded-inner"
                    onSelect={() => void switchTo(o.id)}
                  >
                    <span className="truncate">{o.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
            <DropdownMenuSeparator className="bg-line" />
            <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-inner">
              <Link to="/start" search={{ new: true }}>
                Add another business
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-inner">
            <Link to="/start">Add your business</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** "Pro trial, [n] days left." with its end date (COPY.md 19), for the owner while the trial runs. */
function useTrial(loc: Location | null | undefined, role: Role | undefined) {
  const ent = useQuery({
    queryKey: ["entitlements", loc?.id],
    queryFn: () => loadEntitlements(loc!.id),
    enabled: !!loc && role === "owner",
    staleTime: 60_000,
  });
  return ent.data?.state === "trial" ? ent.data.trial : null;
}

const daysLeft = (iso: string) =>
  Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 86_400_000));

function TrialWords({ endsAt }: { endsAt: string }) {
  const left = daysLeft(endsAt);
  return (
    <>
      <CircleUser className="size-5 shrink-0 text-text-2" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block font-bold">
          Pro trial, {left} {left === 1 ? "day" : "days"} left.
        </span>
        <span className="block text-label text-text-2">Ends {fmtDate(endsAt, false)}</span>
      </span>
    </>
  );
}

function TrialStrip({
  loc,
  role,
  className,
}: {
  loc: Location | null | undefined;
  role?: Role | undefined;
  className?: string;
}) {
  const t = useTrial(loc, role);
  if (!t) return null;
  return (
    <Link
      to="/app/plan"
      className={cn(
        "press flex min-h-11 items-center gap-3 rounded-inner bg-surface-2 px-3 py-2 text-small hover:bg-surface-3",
        className,
      )}
    >
      <TrialWords endsAt={t.ends_at} />
    </Link>
  );
}

// "Need a hand?" (K-03): a person on WhatsApp or by email, and the guides. The WhatsApp number answers questions only;
// it approves nothing (K-122).
function NeedAHand({ className }: { className?: string }) {
  return (
    <div className={cn("text-small", className)}>
      <p className="flex items-center gap-2 px-3 font-bold">
        <LifeBuoy className="size-4" aria-hidden /> Need a hand?
      </p>
      <WhatsappLink
        kind="general"
        className="flex min-h-11 items-center gap-3 rounded-inner px-3 font-semibold text-text-2 no-underline hover:bg-surface-2 hover:text-text-1"
      >
        <MessageSquareText className="size-4" aria-hidden /> WhatsApp
      </WhatsappLink>
      <a
        href="mailto:hello@kabsi.co"
        className="flex min-h-11 items-center gap-3 rounded-inner px-3 font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1"
      >
        <Mail className="size-4" aria-hidden /> hello@kabsi.co
      </a>
      <Link
        to="/guides"
        className="flex min-h-11 items-center gap-3 rounded-inner px-3 font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1"
      >
        <BookOpen className="size-4" aria-hidden /> Guides
      </Link>
    </div>
  );
}

function SideLink({
  section,
  on,
  badge,
}: {
  section: Section;
  on: boolean;
  badge?: number | undefined;
}) {
  const I = ICON[section.id];
  return (
    <Link
      to={section.to}
      aria-current={on ? "page" : undefined}
      className={cn(
        "press flex min-h-11 items-center gap-3 rounded-inner px-3 text-small font-semibold",
        on ? "bg-surface-2 text-text-1" : "text-text-2 hover:bg-surface-2 hover:text-text-1",
      )}
    >
      <I className="size-5 shrink-0" strokeWidth={on ? 2.25 : 1.75} aria-hidden />
      <span className="flex-1">{section.label}</span>
      {badge ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-text-1 px-1.5 text-label font-bold text-surface-0">
          {badge > 99 ? "99+" : badge}
          <span className="sr-only"> waiting</span>
        </span>
      ) : null}
    </Link>
  );
}

function BarLink({
  section,
  on,
  badge,
}: {
  section: Section;
  on: boolean;
  badge?: number | undefined;
}) {
  const I = ICON[section.id];
  return (
    <Link
      to={section.to}
      aria-current={on ? "page" : undefined}
      className={cn(
        "press relative flex min-h-16 flex-col items-center justify-center gap-1 text-label font-bold",
        on ? "text-text-1" : "text-text-2",
      )}
    >
      {on && <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-text-1" />}
      <span className="relative">
        <I className="size-6" strokeWidth={on ? 2.25 : 1.75} aria-hidden />
        {badge ? (
          <span className="absolute -end-2.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-text-1 px-1 text-label font-bold text-surface-0">
            {badge > 9 ? "9+" : badge}
            <span className="sr-only"> waiting</span>
          </span>
        ) : null}
      </span>
      {section.short}
    </Link>
  );
}

/** The phone's account menu (App 2: the bottom bar has no More): the trial, help and Log out. */
function AccountMenu({
  loc,
  role,
  email,
  onSignOut,
}: {
  loc: Location | null | undefined;
  role?: Role | undefined;
  email: string | undefined;
  onSignOut: () => void;
}) {
  const item = "min-h-11 cursor-pointer gap-3 rounded-inner text-small font-semibold";
  const trial = useTrial(loc, role);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Your account and help"
          className="press grid size-11 shrink-0 place-items-center rounded-full text-text-2 hover:bg-surface-2"
        >
          <CircleUser className="size-6" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72 rounded-card border-line bg-surface-1 p-2 shadow-float"
      >
        {trial ? (
          <DropdownMenuItem
            asChild
            className="mb-1 min-h-11 cursor-pointer gap-3 rounded-inner bg-surface-2 text-small"
          >
            <Link to="/app/plan">
              <TrialWords endsAt={trial.ends_at} />
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuLabel className="text-label font-normal text-text-2">
          Need a hand?
        </DropdownMenuLabel>
        <DropdownMenuItem
          className={item}
          onSelect={() => window.dispatchEvent(new CustomEvent("kabsi:open-nora"))}
        >
          <MessageCircle className="size-4" aria-hidden /> Ask Nora
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <WhatsappLink kind="general" className="no-underline">
            <MessageSquareText className="size-4" aria-hidden /> WhatsApp
          </WhatsappLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <a href="mailto:hello@kabsi.co">
            <Mail className="size-4" aria-hidden /> hello@kabsi.co
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className={item}>
          <Link to="/guides">
            <BookOpen className="size-4" aria-hidden /> Guides
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-line" />
        <DropdownMenuItem className={item} onSelect={onSignOut}>
          <LogOut className="size-4" aria-hidden /> Log out
        </DropdownMenuItem>
        {email ? <p className="truncate px-2 pt-1 text-label text-text-2">{email}</p> : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({
  children,
  area = "app",
}: {
  children: ReactNode;
  area?: "app" | "staff";
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [signOutError, setSignOutError] = useState("");
  const isStaff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  const myLoc = useQuery({
    queryKey: ["my-location"],
    queryFn: myLatestLocation,
    enabled: area === "app",
  });
  const access = useQuery({
    queryKey: ["access", myLoc.data?.id],
    queryFn: () => myAccess(myLoc.data!.id),
    enabled: area === "app" && !!myLoc.data,
  });
  const role = access.data?.role;
  const staffRole = role === "staff";
  const sections = desktopSections(role);
  const bar = phoneBar(role);
  const waiting = useQuery({
    queryKey: ["waiting-count", myLoc.data?.id],
    queryFn: () => waitingReplies(myLoc.data!.id),
    enabled: area === "app" && myLoc.data?.status === "active" && !!access.data && !staffRole,
    refetchInterval: 60_000,
  });
  // Demo workspace (P0.1-06): no analytics while a demo business is open.
  const isDemo = area === "app" && myLoc.data?.is_demo === true;
  useEffect(() => setAnalyticsPaused(isDemo), [isDemo]);
  const current = area === "app" ? sectionFor(location.pathname, role) : undefined;
  const badgeFor = (sec: Section) =>
    sec.id === "reviews" && waiting.data ? waiting.data : undefined;
  // K-16: a page that is not part of the person's role says so, instead of showing a screen the database would refuse.
  const blocked = area === "app" && role !== undefined && !canOpen(location.pathname, role);

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/", replace: true });
    } catch {
      setSignOutError("Could not log out. Check your connection and try again.");
    }
  }

  return (
    <div className="theme-light min-h-dvh overflow-x-clip bg-surface-0 text-text-1">
      <a
        href="#main"
        className="press fixed start-3 top-3 z-[70] -translate-y-20 rounded-full bg-kb-yellow px-4 py-3 text-small font-bold text-kb-black focus:translate-y-0"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 flex-col border-e border-line bg-surface-1 lg:flex">
        <Link
          to={area === "staff" ? "/staff" : "/app"}
          className="flex h-16 items-center gap-2.5 px-5"
        >
          <KabsiMark className="size-8" />
          <span className="font-display text-[1.375rem] font-bold tracking-[-0.02em]">Kabsi</span>
        </Link>
        {area === "app" ? <BusinessMenu /> : null}
        <nav
          aria-label={area === "staff" ? "Staff" : "Your Kabsi account"}
          className="mt-4 flex-1 overflow-y-auto px-3"
        >
          {area === "app" ? (
            <ul className="space-y-0.5">
              {sections.map((s) => (
                <li key={s.id}>
                  <SideLink section={s} on={current?.id === s.id} badge={badgeFor(s)} />
                </li>
              ))}
            </ul>
          ) : (
            <Link
              to="/staff"
              aria-current="page"
              className="flex min-h-11 items-center gap-3 rounded-inner bg-surface-2 px-3 text-small font-semibold"
            >
              <Users className="size-5" aria-hidden /> Staff
            </Link>
          )}
        </nav>
        <div className="space-y-2 border-t border-line p-3">
          {area === "app" ? <TrialStrip loc={myLoc.data} role={role} /> : null}
          <NeedAHand />
          {isStaff.data ? (
            <Link
              to={area === "staff" ? "/app" : "/staff"}
              className="flex min-h-11 items-center gap-3 rounded-inner px-3 text-small font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1"
            >
              <Users className="size-5" aria-hidden />{" "}
              {area === "staff" ? "Business account" : "Staff"}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="press flex min-h-11 w-full items-center gap-3 rounded-inner px-3 text-small font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1"
          >
            <LogOut className="size-5" aria-hidden />
            Log out
          </button>
          {user?.email ? (
            <p className="truncate px-3 text-label text-text-2">{user.email}</p>
          ) : null}
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-surface-1/95 px-4 backdrop-blur lg:hidden">
        <KabsiMark className="size-7 shrink-0" />
        {area === "app" ? (
          <BusinessMenu compact />
        ) : (
          <p className="min-w-0 flex-1 truncate font-display text-title font-bold">Staff</p>
        )}
        {isStaff.data ? (
          <Link
            to={area === "staff" ? "/app" : "/staff"}
            className="press inline-flex min-h-11 items-center rounded-full px-3 text-small font-bold text-text-2 hover:bg-surface-2"
          >
            {area === "staff" ? "Business" : "Staff"}
          </Link>
        ) : null}
        {area === "app" ? (
          <AccountMenu
            loc={myLoc.data}
            role={role}
            email={user?.email}
            onSignOut={() => void handleSignOut()}
          />
        ) : null}
        {area === "staff" ? (
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="press grid size-11 place-items-center rounded-full text-text-2 hover:bg-surface-2"
            aria-label="Log out"
          >
            <LogOut className="size-5" aria-hidden />
          </button>
        ) : null}
      </header>

      <main id="main" className="pb-[calc(7rem+env(safe-area-inset-bottom))] lg:ps-64 lg:pb-12">
        {signOutError ? (
          <p
            role="alert"
            className="bg-bad px-5 py-2 text-center text-small font-bold text-kb-white"
          >
            {signOutError}
          </p>
        ) : null}
        <TestModeBanner concierge={area === "app" && myLoc.data?.concierge === true} />
        <div
          className={cn(
            "mx-auto w-full px-4 pt-5 sm:px-8 lg:pt-10",
            area === "staff" ? "max-w-[72rem]" : "max-w-[60rem]",
          )}
        >
          {blocked ? (
            <div className="max-w-xl py-6">
              <h1 className="font-display text-h3 font-bold">This page is not part of your role</h1>
              <p className="mt-2 text-body text-text-2">
                {role === "staff"
                  ? "You can add photos and share the review link. The owner looks after the rest."
                  : "Plan and billing, and the team, are looked after by the owner."}
              </p>
              <ButtonLink to="/app" variant="secondary" size="md" className="mt-6">
                Back to Home
              </ButtonLink>
            </div>
          ) : area === "app" && myLoc.isError ? (
            <ErrorState
              className="mt-6 max-w-xl"
              title="Something went wrong on our side."
              onRetry={() => void myLoc.refetch()}
            >
              Nothing you did. Try again in a minute.
            </ErrorState>
          ) : (
            children
          )}
        </div>
        <footer
          className={cn(
            "mx-auto mt-14 space-y-1 px-4 text-small text-text-2 sm:px-8",
            area === "staff" ? "max-w-[72rem]" : "max-w-[60rem]",
          )}
        >
          <p>{NOT_AFFILIATED}</p>
          <p className="flex flex-wrap items-center gap-x-5">
            <button
              type="button"
              onClick={openPrivacyChoices}
              className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-text-1"
            >
              Your privacy choices
            </button>
            <span>© 2026 Kabsi</span>
          </p>
        </footer>
      </main>

      {area === "app" ? <AssistantWidget surface="app" /> : null}
      {area === "app" ? (
        <nav
          aria-label="Your Kabsi account"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        >
          <ul
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${bar.length}, minmax(0, 1fr))`,
            }}
          >
            {bar.map((s) => (
              <li key={s.id}>
                <BarLink section={s} on={current?.id === s.id} badge={badgeFor(s)} />
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
