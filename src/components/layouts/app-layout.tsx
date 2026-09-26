import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  Building2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  FileText,
  Images,
  Inbox,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Newspaper,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { myLatestLocation } from "@/lib/onboarding";
import { amStaff } from "@/lib/reviews";
import { myPartner } from "@/lib/partner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { TestModeBanner } from "@/components/shared/test-mode-banner";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";

const appNav = [
  ["Inbox", "/app/inbox", Inbox],
  ["Reviews", "/app/reviews", MessageSquareText],
  ["Posts", "/app/posts", Newspaper],
  ["Photos", "/app/photos", Images],
  ["Hours", "/app/hours", Clock3],
  ["Shield", "/app/shield", ShieldCheck],
  ["Report", "/app/report", FileText],
  ["Cards", "/app/cards", CreditCard],
  ["Knowledge", "/app/knowledge", CircleHelp],
  ["Plan", "/app/plan", Building2],
  ["Settings", "/app/settings", Settings],
] as const;

function NavLink({ item, mobile = false }: { item: (typeof appNav)[number]; mobile?: boolean }) {
  const [label, to, Icon] = item;
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      className={cn(
        "group flex items-center gap-3 rounded-card font-medium text-kb-stone transition-colors hover:bg-kb-white hover:text-kb-black",
        mobile ? "flex-col gap-1 px-1 py-2 text-[11px]" : "px-3 py-2.5 text-sm",
      )}
      activeProps={{ className: "bg-kb-white text-kb-black shadow-kb" }}
    >
      <Icon className="size-5 shrink-0 stroke-2" />
      <span>{label}</span>
    </Link>
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
  const location = useQuery({ queryKey: ["my-location"], queryFn: myLatestLocation });
  const loc = location.data;
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
  const mobileMain = appNav.slice(0, 4);
  const areaTitle = area === "partner" ? "Partner" : area === "staff" ? "Staff" : "Business";

  async function handleSignOut() {
    setSignOutError("");
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await signOut();
      await navigate({ to: "/login", replace: true });
    } catch (error) {
      setSignOutError(error instanceof Error ? error.message : "Unable to sign out.");
    }
  }

  return (
    <div className="min-h-screen bg-kb-sand text-kb-ink lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen border-r border-kb-hairline bg-kb-white p-5 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <KabsiLogo />
        <div className="mt-8 flex-1 overflow-y-auto">
          {area === "app" ? (
            <nav className="space-y-1" aria-label="Business navigation">
              {appNav.map((item) => (
                <NavLink key={item[1]} item={item} />
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
        <p className="pt-5 text-xs text-kb-stone">Kabsi</p>
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
              {signOutError ? (
                <p className="px-2 py-1 text-sm text-kb-red">{signOutError}</p>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <TestModeBanner />
        <main>{children}</main>
      </div>
      {area === "app" ? (
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-kb-hairline bg-kb-white px-1 pb-[env(safe-area-inset-bottom)] lg:hidden"
          aria-label="Business navigation"
        >
          {mobileMain.map((item) => (
            <NavLink key={item[1]} item={item} mobile />
          ))}
          <Sheet>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 rounded-card px-1 py-2 text-[11px] font-medium text-kb-stone"
                aria-label="More navigation"
              >
                <MoreHorizontal className="size-5" />
                More
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-large border-kb-hairline bg-kb-white">
              <SheetHeader>
                <SheetTitle>More</SheetTitle>
              </SheetHeader>
              <nav className="mt-5 grid grid-cols-2 gap-2">
                {appNav.slice(4).map((item) => (
                  <NavLink key={item[1]} item={item} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </nav>
      ) : null}
    </div>
  );
}
