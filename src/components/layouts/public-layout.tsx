import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { BookingLink } from "@/components/shared/booking-link";
import { ChevronDown, LayoutDashboard, LogOut, Menu, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { KabsiLogo } from "@/components/shared/kabsi-logo";
import { useSectionRise } from "@/components/marketing/motion";
import { VERTICALS } from "@/lib/verticals";
import { BRAND_LINE, CTA_PRIMARY, GOOGLE_NOTICE, OPERATOR_LINE } from "@/lib/site";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { useAuth } from "@/components/auth/auth-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const links = [
  ["How it works", "/how-it-works"],
  ["Pricing", "/pricing"],
  ["Partners", "/partners"],
  ["FAQ", "/faq"],
] as const;

export function PublicLayout({ children }: { children: ReactNode }) {
  const pathname = useLocation({ select: (l) => l.pathname });
  useSectionRise(pathname);
  // D265: signed-in owners hitting the marketing site (a bookmark, a shared link) saw "Log
  // in" / "Get set up" as if they had no account — send them back to their dashboard instead.
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [signOutError, setSignOutError] = useState("");

  async function handleSignOut() {
    setSignOutError("");
    try {
      await signOut();
      await navigate({ to: "/", replace: true });
    } catch {
      setSignOutError("Couldn't sign out. Check your connection and try again.");
    }
  }
  return (
    <div className="min-h-screen bg-kb-white text-kb-ink">
      <header className="sticky top-0 z-40 border-b border-kb-hairline bg-kb-white/95 backdrop-blur">
        <div className="mx-auto grid h-18 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center px-5 sm:px-8">
          <KabsiLogo />
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            {links.map(([label, to]) => (
              <Link
                key={to}
                to={to}
                className="text-sm font-medium text-kb-stone transition-colors hover:text-kb-black"
              >
                {label}
              </Link>
            ))}
            {loading ? null : user ? (
              <>
                <Button asChild size="compact">
                  <Link to="/app">Dashboard</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="icon" size="icon" aria-label="Open account menu">
                      <UserRound aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-64 rounded-card border-kb-hairline bg-kb-white p-2 shadow-kb"
                  >
                    <DropdownMenuLabel className="truncate text-sm font-medium">
                      {user.email}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-kb-hairline" />
                    <DropdownMenuItem
                      asChild
                      className="cursor-pointer rounded-lg py-2.5 text-base"
                    >
                      <Link to="/app">
                        <LayoutDashboard aria-hidden="true" /> Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => void handleSignOut()}
                      className="cursor-pointer rounded-lg py-2.5 text-base"
                    >
                      <LogOut aria-hidden="true" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-kb-black">
                  Log in
                </Link>
                <Button asChild size="compact">
                  <Link to="/start">{CTA_PRIMARY}</Link>
                </Button>
              </>
            )}
          </nav>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="icon" size="icon" className="lg:hidden" aria-label="Open navigation">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[88%] border-kb-hairline bg-kb-white p-6 sm:max-w-sm"
            >
              <SheetHeader>
                <SheetTitle>
                  <KabsiLogo />
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-10 flex flex-col gap-1" aria-label="Mobile navigation">
                {links.map(([label, to]) => (
                  <SheetClose asChild key={to}>
                    <Link
                      to={to}
                      className="rounded-card px-3 py-3 text-lg font-medium hover:bg-kb-sand"
                    >
                      {label}
                    </Link>
                  </SheetClose>
                ))}
                {loading ? null : user ? (
                  <div className="mt-5 border-t border-kb-hairline pt-5">
                    <p className="truncate px-3 text-sm font-medium text-kb-stone">{user.email}</p>
                    <SheetClose asChild>
                      <Button asChild className="mt-4 w-full">
                        <Link to="/app">
                          <LayoutDashboard aria-hidden="true" /> Dashboard
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() => void handleSignOut()}
                      >
                        <LogOut aria-hidden="true" /> Sign out
                      </Button>
                    </SheetClose>
                  </div>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Link
                        to="/login"
                        className="rounded-card px-3 py-3 text-lg font-medium hover:bg-kb-sand"
                      >
                        Log in
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild className="mt-5 w-full">
                        <Link to="/start">{CTA_PRIMARY}</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      {signOutError ? (
        <p role="alert" className="bg-kb-red px-5 py-2 text-center text-sm font-bold text-kb-white">
          {signOutError}
        </p>
      ) : null}
      <main>{children}</main>
      <footer className="bg-kb-carbon text-kb-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-8 border-b border-kb-white/15 pb-10 md:grid-cols-[1.3fr_1fr_1fr_1fr_1fr]">
            <div>
              <KabsiLogo dark />
              <p className="mt-4 max-w-xs text-kb-stone-on-dark">{BRAND_LINE}</p>
            </div>
            <FooterCol title="Product">
              <Link to="/how-it-works">How it works</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/google-review-link">Free review link and QR</Link>
              <Link to="/guides">Guides</Link>
              <Link to="/faq">FAQ</Link>
            </FooterCol>
            <FooterCol title="For your business">
              {VERTICALS.map((v) => (
                <Link key={v.slug} to="/for/$slug" params={{ slug: v.slug }}>
                  {v.label}
                </Link>
              ))}
              <Link to="/for" className="font-bold">
                All businesses
              </Link>
            </FooterCol>
            <FooterCol title="Company">
              <Link to="/about">About</Link>
              <Link to="/partners">Partners</Link>
              <Link to="/lebanon">Kabsi in Lebanon</Link>
              <Link to="/security">Security</Link>
              <Link to="/setup-call">Book a free setup call</Link>
              <BookingLink kind="partner" className="font-normal no-underline">
                For agencies: talk to Rashid
              </BookingLink>
            </FooterCol>
            <FooterCol title="Legal and contact">
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
              <a href="mailto:hello@kabsi.co">hello@kabsi.co</a>
            </FooterCol>
          </div>
          <p className="pt-6 text-sm leading-6 text-kb-stone-on-dark">{OPERATOR_LINE}</p>
          <p className="pt-2 text-sm leading-6 text-kb-stone-on-dark">{GOOGLE_NOTICE}</p>
          <p className="pt-2 text-sm leading-6 text-kb-stone-on-dark">© Kabsi</p>
        </div>
      </footer>
      <AssistantWidget surface="site" />
    </div>
  );
}

// Four link columns on desktop; on phones each one is an accordion.
function FooterCol({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-kb-white/15 md:border-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-12 w-full items-center justify-between text-left text-xs font-bold uppercase tracking-wider text-kb-stone-on-dark md:pointer-events-none md:min-h-0"
      >
        {title}
        <ChevronDown
          className={`size-4 transition-transform md:hidden ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      <nav
        aria-label={title}
        className={`gap-y-3 pb-4 text-sm md:mt-4 md:grid md:pb-0 ${open ? "grid" : "hidden"}`}
      >
        {children}
      </nav>
    </div>
  );
}
