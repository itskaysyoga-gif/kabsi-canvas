import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  CreditCard,
  Home,
  LifeBuoy,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquareText,
  MoreHorizontal,
  Newspaper,
  NotebookText,
  Settings,
  Store,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chooseLocation, myLatestLocation, myLocations } from "@/lib/onboarding";
import { amStaff } from "@/lib/reviews";
import { myPartner } from "@/lib/partner";
import { waitingReplies } from "@/lib/tasks";
import { myAccess } from "@/lib/team";
import {
  canOpen,
  desktopSections,
  moreSections,
  phoneBar,
  sectionFor,
  tabsFor,
  type Section,
  type SectionId,
  type Tab,
} from "@/lib/app-nav";
import { WhatsappLink } from "@/components/shared/whatsapp-link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ExampleBadge } from "@/components/ui/example-badge";
import { setAnalyticsPaused } from "@/lib/telemetry";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

// The places an owner goes (K-03): eight on a desktop, four named on a phone plus More. The list, the roles and the old
// addresses are in src/lib/app-nav.ts; this file only draws them.
const ICON: Record<SectionId, typeof Home> = {
  home: Home,
  reviews: MessageSquareText,
  "get-reviews": CreditCard,
  "google-profile": Store,
  content: Newspaper,
  insights: BarChart3,
  knowledge: NotebookText,
  settings: Settings,
  photos: Store,
};

function NavLink({
  section,
  active,
  badge,
  mobile = false,
}: {
  section: Section;
  active: boolean;
  badge?: number | undefined;
  mobile?: boolean;
}) {
  const Icon = ICON[section.id];
  return (
    <Link
      to={section.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-card font-medium transition-colors",
        mobile
          ? "flex-col gap-1 px-1 py-2 text-[11px]"
          : "px-3 py-2.5 text-[15px] hover:bg-kb-sand hover:text-kb-black",
        active ? (mobile ? "text-kb-black" : "bg-kb-sand text-kb-black") : "text-kb-stone",
      )}
    >
      <span className="relative">
        <Icon className={cn("size-5 shrink-0", active ? "stroke-[2.4]" : "stroke-2")} />
        {badge && mobile ? (
          <span className="absolute -right-2.5 -top-1.5 grid min-w-4 place-items-center rounded-pill bg-kb-yellow px-1 text-[10px] font-bold text-kb-black">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="flex-1">{mobile ? section.short : section.label}</span>
      {badge && !mobile ? (
        <span className="rounded-pill bg-kb-yellow px-2 py-0.5 text-xs font-bold text-kb-black">
          {badge}
        </span>
      ) : null}
      {active && mobile ? (
        <span className="absolute inset-x-5 top-0 h-0.5 rounded-pill bg-kb-black" />
      ) : null}
    </Link>
  );
}

function SubNav({ section, tabs, path }: { section: Section; tabs: Tab[]; path: string }) {
  if (tabs.length < 2) return null;
  return (
    <nav
      aria-label={`${section.label} pages`}
      className="border-b border-kb-hairline bg-kb-white px-4 sm:px-7"
    >
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto">
        {tabs.map(({ label, to }) => {
          const on = clean(path) === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={on ? "page" : undefined}
              className={cn(
                "relative whitespace-nowrap px-3 py-3.5 text-sm font-medium transition-colors",
                on ? "text-kb-black" : "text-kb-stone hover:text-kb-black",
              )}
            >
              {label}
              {on ? (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-pill bg-kb-black" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

// "Need a hand?" (K-03): a person on WhatsApp or by email, and the guides. The WhatsApp number answers questions only;
// it approves nothing (K-122).
function NeedAHand({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-card bg-kb-sand p-4 text-sm", className)}>
      <p className="flex items-center gap-2 font-bold">
        <LifeBuoy className="size-4" aria-hidden="true" /> Need a hand?
      </p>
      <WhatsappLink
        kind="general"
        className="mt-2 flex min-h-10 items-center gap-2 font-normal text-kb-stone no-underline hover:text-kb-black"
      >
        <MessageCircle className="size-4" aria-hidden="true" /> WhatsApp
      </WhatsappLink>
      <a
        href="mailto:hello@kabsi.co"
        className="flex min-h-10 items-center gap-2 text-kb-stone hover:text-kb-black"
      >
        <Mail className="size-4" aria-hidden="true" /> hello@kabsi.co
      </a>
      <Link
        to="/guides"
        className="flex min-h-10 items-center gap-2 text-kb-stone hover:text-kb-black"
      >
        <BookOpen className="size-4" aria-hidden="true" /> Guides
      </Link>
    </div>
  );
}

// The phone's fifth place: Get Reviews, Insights, Business Knowledge and Settings, then help (K-03).
function MoreSheet({
  open,
  onOpenChange,
  sections,
  current,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: Section[];
  current: Section | undefined;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-large">
        <SheetHeader className="text-left">
          <SheetTitle>More</SheetTitle>
          <SheetDescription className="sr-only">Other places in Kabsi</SheetDescription>
        </SheetHeader>
        <nav aria-label="More pages" className="mt-3 divide-y divide-kb-hairline">
          {sections.map((sec) => {
            const Icon = ICON[sec.id];
            return (
              <Link
                key={sec.id}
                to={sec.to}
                onClick={() => onOpenChange(false)}
                aria-current={current === sec ? "page" : undefined}
                className="flex min-h-14 items-center gap-3 py-3 font-medium"
              >
                <Icon className="size-5 text-kb-stone" aria-hidden="true" />
                {sec.label}
              </Link>
            );
          })}
        </nav>
        <NeedAHand className="mt-4" />
      </SheetContent>
    </Sheet>
  );
}

const STATUS_LABEL: Record<string, string> = {
  onboarding: "Setup not finished",
  access_pending: "Waiting for Google access",
  awaiting_payment: "Waiting for payment",
  active: "Active",
  paused: "Paused",
  disabled: "Disabled",
  waiting_list: "Waiting list",
};

// The business in the header. One business per account for now; "Add another business" starts /start again.
function LocationMenu() {
  const queryClient = useQueryClient();
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const all = useQuery({ queryKey: ["my-locations"], queryFn: myLocations });
  const loc = location.data;
  const others = (all.data ?? []).filter((l) => l.id !== loc?.id);
  async function switchTo(id: string) {
    chooseLocation(id);
    await queryClient.invalidateQueries();
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 items-center gap-2 justify-self-start rounded-card px-2 py-2 text-left font-medium hover:bg-kb-sand"
          aria-label="Your business"
        >
          <Store className="size-5 shrink-0" />
          <span className="truncate">
            {location.isLoading ? "…" : (loc?.name ?? "Add your business")}
          </span>
          {loc?.is_demo ? <ExampleBadge className="shrink-0">Demo data</ExampleBadge> : null}
          <ChevronDown className="size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72 rounded-card border-kb-hairline bg-kb-white p-2 shadow-kb"
      >
        {loc ? (
          <>
            <DropdownMenuLabel className="text-sm font-medium">
              <span className="block truncate">{loc.name}</span>
              <span className="block text-xs font-normal text-kb-stone">
                {STATUS_LABEL[loc.status] ?? loc.status}
              </span>
            </DropdownMenuLabel>
            {loc.status !== "active" ? (
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
                <Link to="/start">Continue setup</Link>
              </DropdownMenuItem>
            ) : null}
            {others.length ? (
              <>
                <DropdownMenuSeparator className="bg-kb-hairline" />
                <DropdownMenuLabel className="text-xs font-normal text-kb-stone">
                  Switch business
                </DropdownMenuLabel>
                {others.map((o) => (
                  <DropdownMenuItem
                    key={o.id}
                    className="cursor-pointer rounded-lg py-2.5"
                    onSelect={() => void switchTo(o.id)}
                  >
                    <span className="truncate">{o.name}</span>
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}
            <DropdownMenuSeparator className="bg-kb-hairline" />
            <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
              <Link to="/start" search={{ new: true }}>
                Add another business
              </Link>
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5">
            <Link to="/start">Add your business</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppLayout({
  children,
  area = "app",
}: {
  children: ReactNode;
  area?: "app" | "partner" | "staff";
}) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [signOutError, setSignOutError] = useState("");
  const isStaff = useQuery({ queryKey: ["am-staff"], queryFn: amStaff, staleTime: Infinity });
  const partner = useQuery({ queryKey: ["my-partner"], queryFn: myPartner, staleTime: 60_000 });
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
  const more = moreSections(role);
  const [moreOpen, setMoreOpen] = useState(false);
  const waiting = useQuery({
    queryKey: ["waiting-count", myLoc.data?.id],
    queryFn: () => waitingReplies(myLoc.data!.id),
    enabled: area === "app" && myLoc.data?.status === "active" && !!access.data && !staffRole,
    refetchInterval: 60_000,
  });
  // Demo workspace (P0.1-06): no analytics while a demo business is open.
  const isDemo = area === "app" && myLoc.data?.is_demo === true;
  useEffect(() => setAnalyticsPaused(isDemo), [isDemo]);
  const current = sectionFor(location.pathname, role);
  const moreActive = !!current && more.includes(current);
  const badgeFor = (sec: Section) =>
    sec.id === "reviews" && waiting.data ? waiting.data : undefined;
  // K-16: a page that is not part of the person's role says so, instead of showing a screen the database would refuse.
  const blocked = area === "app" && role !== undefined && !canOpen(location.pathname, role);
  const areaTitle = area === "partner" ? "Partner" : area === "staff" ? "Staff" : "Business";

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      await queryClient.cancelQueries();
      queryClient.clear();
      await navigate({ to: "/", replace: true });
    } catch {
      setSignOutError("Couldn't sign out. Check your connection and try again.");
    }
  }

  return (
    <div className="min-h-screen bg-kb-sand text-kb-ink lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-kb-hairline bg-kb-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col p-5">
          <KabsiLogo />
          <div className="mt-8 flex-1 overflow-y-auto">
            {area === "app" ? (
              <nav className="space-y-1" aria-label="Business navigation">
                {sections.map((sec) => (
                  <NavLink
                    key={sec.to}
                    section={sec}
                    active={current === sec}
                    badge={badgeFor(sec)}
                  />
                ))}
              </nav>
            ) : (
              <nav className="space-y-1">
                <Link
                  to={area === "partner" ? "/partner" : "/staff"}
                  className="flex items-center gap-3 rounded-card bg-kb-sand px-3 py-2.5 text-sm font-medium"
                >
                  <Users className="size-5" />
                  {areaTitle}
                </Link>
              </nav>
            )}
          </div>
          <NeedAHand />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-card px-3 text-sm font-medium text-kb-stone hover:bg-kb-sand hover:text-kb-black"
          >
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </button>
        </div>
      </aside>
      <div className="min-w-0 pb-22 lg:pb-0">
        <header className="sticky top-0 z-30 grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-kb-hairline bg-kb-white px-4 sm:px-7">
          {area === "app" ? (
            <LocationMenu />
          ) : (
            <span className="px-2 font-medium">{areaTitle}</span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="icon" size="icon" aria-label="Open account menu">
                <span className="grid size-8 place-items-center rounded-full bg-kb-yellow font-bold">
                  {user?.email?.charAt(0).toUpperCase() || "K"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-64 rounded-card border-kb-hairline bg-kb-white p-2 shadow-kb"
            >
              <DropdownMenuLabel className="truncate text-sm font-medium">
                {user?.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-kb-hairline" />
              {partner.data ? (
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 text-base">
                  <Link to={area === "partner" ? "/app/inbox" : "/partner"}>
                    {area === "partner" ? "Business app" : "Partner"}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {isStaff.data ? (
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg py-2.5 text-base">
                  <Link to={area === "staff" ? "/app/inbox" : "/staff"}>
                    {area === "staff" ? "Business app" : "Staff"}
                  </Link>
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={() => void handleSignOut()}
                className="cursor-pointer rounded-lg py-2.5 text-base"
              >
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {signOutError ? (
          <p
            role="alert"
            className="bg-kb-red px-5 py-2 text-center text-sm font-bold text-kb-white"
          >
            {signOutError}
          </p>
        ) : null}
        <TestModeBanner concierge={area === "app" && myLoc.data?.concierge === true} />
        {area === "app" && current ? (
          <SubNav section={current} tabs={tabsFor(current, role)} path={location.pathname} />
        ) : null}
        <main>
          {blocked ? (
            <div className="mx-auto w-full max-w-xl px-5 py-10">
              <h1 className="text-2xl font-bold">This page is not part of your role</h1>
              <p className="mt-2 leading-7 text-kb-stone">
                {role === "staff"
                  ? "You can add photos and share the review link. The owner looks after the rest."
                  : "Plan and billing, and the team, are looked after by the owner."}
              </p>
              <Button asChild className="mt-6">
                <Link to="/app">Back to Home</Link>
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      {area === "app" ? <AssistantWidget surface="app" /> : null}
      {area === "app" ? (
        <nav
          style={{
            gridTemplateColumns: `repeat(${bar.length + (more.length ? 1 : 0)}, minmax(0, 1fr))`,
          }}
          className="fixed inset-x-0 bottom-0 z-40 grid border-t border-kb-hairline bg-kb-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Business navigation"
        >
          {bar.map((sec) => (
            <NavLink
              key={sec.id}
              section={sec}
              active={current === sec}
              badge={badgeFor(sec)}
              mobile
            />
          ))}
          {more.length ? (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-current={moreActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-card px-1 py-2 text-[11px] font-medium",
                moreActive ? "text-kb-black" : "text-kb-stone",
              )}
            >
              <MoreHorizontal className={cn("size-5", moreActive ? "stroke-[2.4]" : "stroke-2")} />
              <span>More</span>
              {moreActive ? (
                <span className="absolute inset-x-5 top-0 h-0.5 rounded-pill bg-kb-black" />
              ) : null}
            </button>
          ) : null}
        </nav>
      ) : null}
      {area === "app" && more.length ? (
        <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} sections={more} current={current} />
      ) : null}
    </div>
  );
}
