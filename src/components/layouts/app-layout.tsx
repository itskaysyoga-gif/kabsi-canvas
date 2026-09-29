import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  LifeBuoy,
  LogOut,
  Mail,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  Store,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { chooseLocation, myLatestLocation, myLocations } from "@/lib/onboarding";
import { amStaff } from "@/lib/reviews";
import { myPartner } from "@/lib/partner";
import { waitingCount } from "@/lib/dashboard";
import { Button } from "@/components/ui/button";
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

// Five places, not eleven tabs. Related pages sit under one section as small tabs at the top.
type Section = {
  label: string;
  short: string;
  to: string;
  icon: typeof Home;
  paths: string[];
  sub?: [string, string][];
};
const SECTIONS: Section[] = [
  { label: "Home", short: "Home", to: "/app", icon: Home, paths: ["/app", "/app/report"] },
  {
    label: "Replies",
    short: "Replies",
    to: "/app/inbox",
    icon: MessageSquareText,
    paths: ["/app/inbox", "/app/reviews"],
    sub: [
      ["To reply", "/app/inbox"],
      ["All reviews", "/app/reviews"],
    ],
  },
  {
    label: "Profile",
    short: "Profile",
    to: "/app/posts",
    icon: Store,
    paths: ["/app/posts", "/app/photos", "/app/hours", "/app/shield"],
    sub: [
      ["Posts", "/app/posts"],
      ["Photos", "/app/photos"],
      ["Hours", "/app/hours"],
      ["Listing Shield", "/app/shield"],
    ],
  },
  {
    label: "Get reviews",
    short: "Get reviews",
    to: "/app/cards",
    icon: CreditCard,
    paths: ["/app/cards"],
  },
  {
    label: "Settings",
    short: "Settings",
    to: "/app/knowledge",
    icon: Settings,
    paths: ["/app/knowledge", "/app/plan", "/app/settings"],
    sub: [
      ["About your business", "/app/knowledge"],
      ["Plan", "/app/plan"],
      ["Emails", "/app/settings"],
    ],
  },
];
const clean = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
const sectionFor = (path: string) => SECTIONS.find((s) => s.paths.includes(clean(path)));

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
  const Icon = section.icon;
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

function SubNav({ section, path }: { section: Section; path: string }) {
  if (!section.sub) return null;
  return (
    <nav
      aria-label={`${section.label} pages`}
      className="border-b border-kb-hairline bg-kb-white px-4 sm:px-7"
    >
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto">
        {section.sub.map(([label, to]) => {
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
  const waiting = useQuery({
    queryKey: ["waiting-count", myLoc.data?.id],
    queryFn: () => waitingCount(myLoc.data!.id),
    enabled: area === "app" && myLoc.data?.status === "active",
    refetchInterval: 60_000,
  });
  const current = sectionFor(location.pathname);
  const badgeFor = (sec: Section) =>
    sec.label === "Replies" && waiting.data ? waiting.data : undefined;
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
                {SECTIONS.map((sec) => (
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
          <div className="rounded-card bg-kb-sand p-4 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <LifeBuoy className="size-4" aria-hidden="true" /> Need a hand?
            </p>
            <Link
              to="/guides"
              className="mt-2 flex items-center gap-2 text-kb-stone hover:text-kb-black"
            >
              <BookOpen className="size-4" aria-hidden="true" /> Guides
            </Link>
            <a
              href="mailto:hello@kabsi.co"
              className="mt-1.5 flex items-center gap-2 text-kb-stone hover:text-kb-black"
            >
              <Mail className="size-4" aria-hidden="true" /> hello@kabsi.co
            </a>
          </div>
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
        <TestModeBanner />
        {area === "app" && current ? <SubNav section={current} path={location.pathname} /> : null}
        <main>{children}</main>
      </div>
      {area === "app" ? <AssistantWidget surface="app" /> : null}
      {area === "app" ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-kb-hairline bg-kb-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Business navigation"
        >
          {SECTIONS.map((sec) => (
            <NavLink
              key={sec.to}
              section={sec}
              active={current === sec}
              badge={badgeFor(sec)}
              mobile
            />
          ))}
        </nav>
      ) : null}
    </div>
  );
}
