import { Link, useLocation } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import type { ReactNode } from "react";
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
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { useAuth } from "@/components/auth/auth-provider";

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
  const { user, loading } = useAuth();
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
              <Button asChild size="compact">
                <Link to="/app">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link to="/login" className="text-sm font-bold text-kb-black">
                  Log in
                </Link>
                <Button asChild size="compact">
                  <Link to="/start">Get set up</Link>
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
                  <SheetClose asChild>
                    <Button asChild className="mt-5 w-full">
                      <Link to="/app">Dashboard</Link>
                    </Button>
                  </SheetClose>
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
                        <Link to="/start">Get set up</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main>{children}</main>
      <footer className="bg-kb-carbon text-kb-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="grid gap-10 border-b border-kb-white/15 pb-10 md:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <KabsiLogo dark />
              <p className="mt-4 text-kb-stone-on-dark">Tap. Review. Reply.</p>
            </div>
            <nav
              className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm"
              aria-label="Footer navigation"
            >
              <Link to="/how-it-works">How it works</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/partners">Partners</Link>
              <Link to="/faq">FAQ</Link>
              <Link to="/google-review-link">Free review link and QR</Link>
              <Link to="/guides">Guides</Link>
              <Link to="/privacy">Privacy</Link>
              <Link to="/terms">Terms</Link>
            </nav>
            <nav className="grid gap-y-3 text-sm" aria-label="Kabsi for your business">
              <p className="text-xs font-bold uppercase tracking-wider text-kb-stone-on-dark">
                For your business
              </p>
              {VERTICALS.map((v) => (
                <Link key={v.slug} to="/for/$slug" params={{ slug: v.slug }}>
                  {v.label}
                </Link>
              ))}
              <Link to="/for" className="font-bold">
                All businesses
              </Link>
            </nav>
            <a className="text-sm font-medium" href="mailto:hello@kabsi.co">
              hello@kabsi.co
            </a>
          </div>
          <p className="pt-6 text-sm leading-6 text-kb-stone-on-dark">
            © Kabsi. Kabsi is independent and not affiliated with Google.
          </p>
        </div>
      </footer>
      <AssistantWidget surface="site" />
    </div>
  );
}
