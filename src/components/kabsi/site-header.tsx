import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Menu, X } from "lucide-react";
import { Suspense, lazy, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { HEADER_CTA, NAV_LINKS, TRADES_MENU_LABEL } from "@/lib/site";
import { ButtonLink, Logo, buttonClass } from "./ui";
import { SiteLink } from "./site-link";
import { setChrome, useScrolledPast, useSearchFlag } from "./page-signals";
import { useAccountLink, type AccountState } from "@/components/auth/use-account-link";

/**
 * The public header (SITE-6, 25 Nov 2026): sticky, at the top of every page. The logo, then "For your business" (a
 * disclosure menu of every industry page, each with a small icon and one line, then "All businesses"), How it works,
 * Pricing and Guides; on the right Log in or Dashboard as a text link and "Free Google check", filled charcoal with ivory
 * text so it leads the header without competing with the page's one yellow action. A border and a soft shadow appear
 * once the page scrolls. The menu opens on a click, Enter or Space, closes on Escape (focus back on its button), on a
 * click outside it or when focus leaves it. Its rows (trade-menu.tsx) load on the first hover, focus or tap, so they never
 * weigh on a page's first load. Under 1024 px everything moves into the phone menu.
 */
const navLinkCls =
  "press relative inline-flex min-h-11 items-center rounded-full px-3.5 text-small font-semibold text-text-2 hover:text-text-1 after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-transparent";
/** The active page carries a 2 px charcoal bar under its word (and aria-current), not a colour change alone. */
const navActiveCls = "!text-text-1 after:!bg-text-1";

/**
 * Log in, or Dashboard while this browser holds a session (App 4, 30.31 item 1). Both words sit in the same grid cell,
 * so the link takes the width of the longer one whichever shows, and nothing moves when the browser finds out. Until
 * then (the server render) neither word shows and there is no link.
 */
function AccountWords({ state }: { state: AccountState }) {
  return (
    <span className="grid">
      <span className={cn("col-start-1 row-start-1", state !== "out" && "invisible")}>Log in</span>
      <span className={cn("col-start-1 row-start-1", state !== "in" && "invisible")}>
        Dashboard
      </span>
    </span>
  );
}

function AccountLink({
  className,
  onClick,
  children,
}: {
  className: string;
  onClick?: () => void;
  children: (state: AccountState) => ReactNode;
}) {
  const { state, to } = useAccountLink();
  if (state === "unknown")
    return (
      <span aria-hidden className={className}>
        {children(state)}
      </span>
    );
  return (
    <SiteLink to={state === "in" ? to : "/login"} onClick={onClick} className={className}>
      {children(state)}
    </SiteLink>
  );
}

/** Focusable parts of a panel that are actually shown. */
function focusables(root: HTMLElement | null) {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("a,button")).filter(
    (el) => el.offsetParent !== null,
  );
}

/** The trade rows load on demand (a separate chunk): the first hover, focus or tap of the button fetches them. */
const loadTradeMenu = () => import("./trade-menu");
const HeaderPart = lazy(loadTradeMenu);
const prefetchTradeMenu = () => void loadTradeMenu();

/**
 * "For your business" on a computer: a disclosure button and its panel (plain links, so Tab and screen readers read them
 * as links). The panel follows the button in the page order, so Tab moves into it.
 */
function TradesMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);

  // Escape and focus leaving it are handled on the wrapper; a press outside, by the panel (trade-menu.tsx).
  return (
    <div
      ref={wrap}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="trades-menu"
        onClick={() => setOpen(!open)}
        onPointerEnter={prefetchTradeMenu}
        onFocus={prefetchTradeMenu}
        className={cn(navLinkCls, "gap-1", (open || pathname.startsWith("/for")) && navActiveCls)}
      >
        {TRADES_MENU_LABEL}
        <ChevronRight
          aria-hidden
          className={cn(
            "size-4 transition-transform duration-200 ease-kb",
            open ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>
      <div
        id="trades-menu"
        hidden={!open}
        className="absolute start-0 top-full z-10 mt-2 w-[42rem] max-w-[calc(100vw-4rem)] rounded-panel border border-line bg-surface-1 p-3 shadow-float xl:w-[58rem]"
      >
        {open && (
          <Suspense fallback={null}>
            <HeaderPart onPick={() => setOpen(false)} within={wrap} />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [menuTop, setMenuTop] = useState(64);
  const scrolled = useScrolledPast(8);
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
    // The menu starts under the header, wherever the header sits.
    const place = () =>
      setMenuTop(Math.max(0, Math.round(header.current?.getBoundingClientRect().bottom ?? 64)));
    place();
    window.addEventListener("resize", place);
    // The page behind does not scroll (html and body); the menu scrolls on its own on a very short phone.
    const html = document.documentElement;
    const prev = [document.body.style.overflow, html.style.overflow];
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
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
      document.body.style.overflow = prev[0] ?? "";
      html.style.overflow = prev[1] ?? "";
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header ref={header} className="sticky top-0 z-50">
      <div
        className={cn(
          "border-b transition duration-200 ease-kb",
          open
            ? "border-line bg-surface-0"
            : scrolled
              ? "glass border-line shadow-lift"
              : "border-transparent bg-surface-0",
        )}
      >
        <div className="container-kb flex h-16 items-center gap-2">
          <Logo onClick={close} className="-ms-1 ps-1 pe-2" />
          <nav aria-label="Main" className="ms-6 hidden flex-1 items-center gap-1 lg:flex">
            <TradesMenu pathname={pathname} />
            {NAV_LINKS.map((n) => (
              <SiteLink key={n.to} to={n.to} className={navLinkCls} activeClassName={navActiveCls}>
                {n.label}
              </SiteLink>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <AccountLink className={cn(navLinkCls, "hidden px-4 lg:inline-flex")}>
              {(state) => <AccountWords state={state} />}
            </AccountLink>
            <ButtonLink to="/scan" size="md" variant="dark" className="hidden sm:inline-flex">
              {HEADER_CTA}
            </ButtonLink>
            <button
              ref={toggle}
              type="button"
              onClick={() => setOpen((o) => !o)}
              onPointerEnter={prefetchTradeMenu}
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

/**
 * The phone menu's sheet (SITE-6): it starts under the header, scrolls on its own and holds the phone menu
 * (trade-menu.tsx), which loads on the first hover, focus or tap of the menu button. Focus is trapped, Escape closes and
 * returns focus, a tap on a row closes it, the page behind does not scroll, and the safe area is kept at the bottom.
 */
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
  return (
    <div
      id="phone-menu"
      ref={panel}
      hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      style={{ top }}
      className="fixed inset-x-0 bottom-0 overflow-y-auto overscroll-contain bg-surface-0 lg:hidden"
    >
      {open && (
        <Suspense fallback={null}>
          <HeaderPart
            phone
            close={close}
            account={(rowCls, chevron) => (
              <AccountLink
                onClick={close}
                className={cn(rowCls, "font-sans text-body text-text-2")}
              >
                {(state) => (
                  <>
                    <AccountWords state={state} />
                    {chevron}
                  </>
                )}
              </AccountLink>
            )}
          />
        </Suspense>
      )}
    </div>
  );
}
