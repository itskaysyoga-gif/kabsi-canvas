import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "@/lib/site";
import { ButtonLink, Logo, TrialLine, WhatsAppLink, buttonClass } from "./ui";
import { SiteLink } from "./site-link";
import { setChrome, useMainCtaInView, useScrolledPast, useSearchFlag } from "./page-signals";

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const scrolled = useScrolledPast(8);
  const mainInView = useMainCtaInView();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuFlag = useSearchFlag("menu");
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuFlag === "open") setOpen(true);
  }, [menuFlag]);

  // Close on route change.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    setChrome({ menuOpen: open });
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector<HTMLElement>("a,button");
    first?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (e.key === "Tab" && panel.current) {
        const f = Array.from(panel.current.querySelectorAll<HTMLElement>("a,button"));
        const all = [toggle.current!, ...f];
        const i = all.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          all[all.length - 1]?.focus();
        } else if (!e.shiftKey && i === all.length - 1) {
          e.preventDefault();
          all[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  // The header button is yellow only when no other main action is on screen.
  const ctaVariant = mainInView ? "secondary" : "primary";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "border-b transition-[background-color,border-color] duration-200 ease-kb",
          scrolled || open ? "glass border-line" : "border-transparent",
          open && "bg-surface-0",
        )}
      >
        <div className="container-kb flex h-16 items-center gap-4">
          <Logo onClick={close} className="-ms-1 ps-1 pe-2" />
          <nav aria-label="Main" className="ms-6 hidden flex-1 items-center gap-1 lg:flex">
            {NAV_LINKS.map((n) => (
              <SiteLink
                key={n.to}
                to={n.to}
                className="press inline-flex min-h-11 items-center rounded-full px-3.5 text-small font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1"
                activeClassName="!text-text-1 bg-surface-2"
              >
                {n.label}
              </SiteLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <SiteLink
              to="/login"
              className="press hidden min-h-11 items-center rounded-full px-4 text-small font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1 md:inline-flex"
            >
              Log in
            </SiteLink>
            <ButtonLink to="/scan" size="md" variant={ctaVariant} className="hidden md:inline-flex">
              Check my business free
            </ButtonLink>
            <button
              ref={toggle}
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="phone-menu"
              className={cn(buttonClass("secondary", "md"), "w-11 px-0 lg:hidden")}
            >
              {open ? (
                <X className="size-5" aria-hidden />
              ) : (
                <Menu className="size-5" aria-hidden />
              )}
              <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Phone and tablet menu */}
      <div
        id="phone-menu"
        ref={panel}
        hidden={!open}
        className="fixed inset-x-0 top-16 bottom-0 overflow-y-auto bg-surface-0 lg:hidden"
      >
        <div className="container-kb flex min-h-full flex-col pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <nav aria-label="Menu">
            <ul className="divide-y divide-line border-b border-line">
              {NAV_LINKS.map((n, i) => (
                <li key={n.to} className="animate-enter" style={{ animationDelay: `${i * 40}ms` }}>
                  <SiteLink
                    to={n.to}
                    onClick={close}
                    className="press -mx-2 flex min-h-16 items-center justify-between gap-4 rounded-inner px-2 font-display text-h3 font-semibold text-text-1 focus-visible:outline-offset-0 active:bg-surface-1"
                    activeClassName="[&>span]:underline [&>span]:decoration-2 [&>span]:underline-offset-8"
                  >
                    <span>{n.label}</span>
                    <ChevronRight className="size-5 text-text-3 rtl:-scale-x-100" aria-hidden />
                  </SiteLink>
                </li>
              ))}
              <li className="animate-enter" style={{ animationDelay: "200ms" }}>
                <SiteLink
                  to="/login"
                  onClick={close}
                  className="press -mx-2 flex min-h-16 items-center justify-between gap-4 rounded-inner px-2 text-title font-semibold text-text-2 focus-visible:outline-offset-0 active:bg-surface-1"
                >
                  <span>Log in</span>
                  <ChevronRight className="size-5 text-text-3 rtl:-scale-x-100" aria-hidden />
                </SiteLink>
              </li>
            </ul>
          </nav>
          <div className="mt-auto space-y-3 pt-10">
            <ButtonLink to="/scan" full onClick={close}>
              Check my business free
            </ButtonLink>
            <WhatsAppLink full />
            <TrialLine className="pt-1 text-center" />
          </div>
        </div>
      </div>
    </header>
  );
}
