import { useRouterState } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { ALL_BUSINESSES, BUSINESS_MENU, MAIN_CTA, NAV_LINKS } from "@/lib/site";
import { ButtonLink, Logo, TrialLine, WhatsAppLink, buttonClass } from "./ui";
import { SiteLink } from "./site-link";
import { setChrome, useMainCtaInView, useScrolledPast, useSearchFlag } from "./page-signals";

/**
 * The public header (Design 8, Web 4): sticky, so the slim Founding 25 line can sit above it in the flow. How it works,
 * Pricing, the Businesses menu, Log in and "Check my business free". The phone menu opens Businesses in place.
 */
const navLinkCls =
  "press inline-flex min-h-11 items-center gap-1 rounded-full px-3.5 text-small font-semibold text-text-2 hover:bg-surface-2 hover:text-text-1";

/** Focusable parts of a panel that are actually shown (a closed sub-list is skipped). */
function focusables(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("a,button")).filter(
    (el) => el.offsetParent !== null,
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(64);
  const scrolled = useScrolledPast(8);
  const mainInView = useMainCtaInView();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const menuFlag = useSearchFlag("menu");
  const header = useRef<HTMLElement>(null);
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
    // The menu starts under the header, wherever the header sits (under the Founding 25 line at the top of the page).
    setMenuTop(Math.max(0, Math.round(header.current?.getBoundingClientRect().bottom ?? 64)));
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    focusables(panel.current)[0]?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
      if (e.key === "Tab") {
        const all = [toggle.current!, ...focusables(panel.current)];
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
    <header ref={header} className="sticky top-0 z-50">
      <div
        className={cn(
          "border-b transition-[background-color,border-color] duration-200 ease-kb",
          scrolled || open ? "glass border-line" : "border-transparent bg-surface-0",
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
                className={navLinkCls}
                activeClassName="!text-text-1 bg-surface-2"
              >
                {n.label}
              </SiteLink>
            ))}
            <BusinessesMenu />
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <SiteLink to="/login" className={cn(navLinkCls, "hidden px-4 md:inline-flex")}>
              Log in
            </SiteLink>
            <ButtonLink to="/scan" size="md" variant={ctaVariant} className="hidden md:inline-flex">
              {MAIN_CTA}
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
      <PhoneMenu open={open} top={menuTop} panel={panel} close={close} />
    </header>
  );
}

/** Businesses: a small disclosure menu. Escape and a click or focus outside close it; Escape returns focus. */
function BusinessesMenu() {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const flag = useSearchFlag("biz");
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (flag === "open") setOpen(true);
  }, [flag]);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    const onFocus = (e: FocusEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);
  const onFor = pathname === "/for" || pathname.startsWith("/for/");
  return (
    <div ref={wrap} className="relative">
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls="biz-menu"
        onClick={() => setOpen((o) => !o)}
        className={cn(navLinkCls, (open || onFor) && "bg-surface-2 text-text-1")}
      >
        Businesses
        <ChevronDown
          className={cn("size-4 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      <div
        id="biz-menu"
        hidden={!open}
        className="absolute start-0 top-full mt-2 w-64 animate-enter rounded-card border border-line bg-surface-1 p-2 shadow-float"
      >
        <ul>
          {BUSINESS_MENU.map((b) => (
            <li key={b.to}>
              <SiteLink
                to={b.to}
                onClick={() => setOpen(false)}
                className="press flex min-h-11 items-center rounded-inner px-3 text-small font-semibold text-text-1 hover:bg-surface-2"
              >
                {b.label}
              </SiteLink>
            </li>
          ))}
        </ul>
        <SiteLink
          to={ALL_BUSINESSES.to}
          onClick={() => setOpen(false)}
          className="press mt-1 flex min-h-11 items-center justify-between rounded-inner border-t border-line px-3 pt-1 text-small font-bold text-text-1 hover:bg-surface-2"
        >
          {ALL_BUSINESSES.label}
          <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden />
        </SiteLink>
      </div>
    </div>
  );
}

function PhoneMenu({
  open,
  top,
  panel,
  close,
}: {
  open: boolean;
  top: number;
  panel: RefObject<HTMLDivElement | null>;
  close: () => void;
}) {
  const [biz, setBiz] = useState(false);
  useEffect(() => {
    if (!open) setBiz(false);
  }, [open]);
  const rowCls =
    "press -mx-2 flex min-h-16 w-[calc(100%+1rem)] items-center justify-between gap-4 rounded-inner px-2 font-display text-h3 font-semibold text-text-1 focus-visible:outline-offset-0 active:bg-surface-1";
  return (
    <div
      id="phone-menu"
      ref={panel}
      hidden={!open}
      style={{ top }}
      className="fixed inset-x-0 bottom-0 overflow-y-auto bg-surface-0 lg:hidden"
    >
      <div className="container-kb flex min-h-full flex-col pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <nav aria-label="Menu">
          <ul className="divide-y divide-line border-b border-line">
            {NAV_LINKS.map((n, i) => (
              <li key={n.to} className="animate-enter" style={{ animationDelay: `${i * 40}ms` }}>
                <SiteLink
                  to={n.to}
                  onClick={close}
                  className={rowCls}
                  activeClassName="[&>span]:underline [&>span]:decoration-2 [&>span]:underline-offset-8"
                >
                  <span>{n.label}</span>
                  <ChevronRight className="size-5 text-text-3 rtl:-scale-x-100" aria-hidden />
                </SiteLink>
              </li>
            ))}
            <li className="animate-enter" style={{ animationDelay: "80ms" }}>
              <button
                type="button"
                aria-expanded={biz}
                aria-controls="phone-biz"
                onClick={() => setBiz((b) => !b)}
                className={rowCls}
              >
                <span>Businesses</span>
                <ChevronDown
                  className={cn("size-5 text-text-3 transition-transform", biz && "rotate-180")}
                  aria-hidden
                />
              </button>
              <ul id="phone-biz" hidden={!biz} className="pb-3">
                {[...BUSINESS_MENU, ALL_BUSINESSES].map((b) => (
                  <li key={b.to}>
                    <SiteLink
                      to={b.to}
                      onClick={close}
                      className={cn(
                        "press flex min-h-11 items-center rounded-inner text-body text-text-2 hover:text-text-1",
                        b === ALL_BUSINESSES && "font-bold text-text-1",
                      )}
                    >
                      {b.label}
                    </SiteLink>
                  </li>
                ))}
              </ul>
            </li>
            <li className="animate-enter" style={{ animationDelay: "120ms" }}>
              <SiteLink
                to="/login"
                onClick={close}
                className={cn(rowCls, "font-sans text-title text-text-2")}
              >
                <span>Log in</span>
                <ChevronRight className="size-5 text-text-3 rtl:-scale-x-100" aria-hidden />
              </SiteLink>
            </li>
          </ul>
        </nav>
        <div className="mt-auto space-y-3 pt-10">
          <ButtonLink to="/scan" full onClick={close}>
            {MAIN_CTA}
          </ButtonLink>
          <WhatsAppLink full />
          <TrialLine className="pt-1 text-center" />
        </div>
      </div>
    </div>
  );
}
