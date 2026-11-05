import { useRouterState } from "@tanstack/react-router";
import { ChevronRight, Menu, MessageCircle, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { HEADER_CTA, MAIN_CTA, NAV_LINKS, WHATSAPP_ON, WHATSAPP_URL } from "@/lib/site";
import { ButtonLink, Logo, TrialLine, WhatsAppGlyph, buttonClass } from "./ui";
import { SiteLink } from "./site-link";
import { setChrome, useScrolledPast, useSearchFlag } from "./page-signals";
import { useAccountLink, type AccountState } from "@/components/auth/use-account-link";

/**
 * The public header (Design 9; Site 2, master plan 30.34 item 4): sticky, so the slim Founding 25 line can sit above it
 * in the flow. How it works, Businesses (one link to /for), Pricing, Guides and About, then Log in or Dashboard, then
 * "Free check", filled charcoal with ivory text so it leads the header without competing with the page's one yellow
 * action. No dropdowns; the active page is marked. Under 1024 px the links move into the phone menu (the same rows, no
 * nested rows); from 640 px "Free check" stays in the header.
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
    // The menu starts under the header, wherever the header sits (under the Founding 25 line at the top of the page).
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
          "border-b transition-[background-color,border-color] duration-200 ease-kb",
          open
            ? "border-line bg-surface-0"
            : scrolled
              ? "glass border-line"
              : "border-transparent bg-surface-0",
        )}
      >
        <div className="container-kb flex h-16 items-center gap-2">
          <Logo onClick={close} className="-ms-1 ps-1 pe-2" />
          <nav aria-label="Main" className="ms-6 hidden flex-1 items-center gap-1 lg:flex">
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
 * The phone menu (Design 9, Site 2): the five header rows near 48 px and Log in or Dashboard, no nested rows, then "Check my business free" with the trial line,
 * then one quiet row: Ask Nora, and WhatsApp only while WHATSAPP_ON. Focus is trapped, Escape closes and returns
 * focus, a tap on a row closes it, the page behind does not scroll, and the safe area is kept at the bottom.
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
  const rowCls =
    "press flex min-h-12 items-center justify-between gap-4 font-display text-title font-semibold text-text-1 focus-visible:outline-offset-0";
  const quietCls =
    "press inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-small font-semibold text-text-1 hover:bg-surface-2";
  const rows = NAV_LINKS;
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
      <div className="container-kb flex min-h-full flex-col pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <nav aria-label="Menu links">
          <ul className="divide-y divide-line border-b border-line">
            {rows.map((n) => (
              <li key={n.to}>
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
            <li>
              <AccountLink
                onClick={close}
                className={cn(rowCls, "font-sans text-body text-text-2")}
              >
                {(state) => (
                  <>
                    <AccountWords state={state} />
                    <ChevronRight className="size-5 text-text-3 rtl:-scale-x-100" aria-hidden />
                  </>
                )}
              </AccountLink>
            </li>
          </ul>
        </nav>
        <div className="mt-6">
          <ButtonLink to="/scan" full onClick={close}>
            {MAIN_CTA}
          </ButtonLink>
          <TrialLine className="mt-2 text-center" />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 border-t border-line pt-4">
          {/* Nora is always one tap away on a phone, even where the phone bar waits (Web 4 review). */}
          <button
            type="button"
            onClick={() => {
              close();
              window.dispatchEvent(new CustomEvent("kabsi:open-nora"));
            }}
            className={quietCls}
          >
            <MessageCircle className="size-5" aria-hidden />
            Ask Nora
          </button>
          {WHATSAPP_ON && (
            <>
              <span aria-hidden className="h-5 w-px bg-line-strong" />
              {/* The glyph labels the channel beside the word, on a link that opens Kabsi's WhatsApp (Meta's rules). */}
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                onClick={close}
                className={quietCls}
              >
                <WhatsAppGlyph className="size-5" />
                WhatsApp
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
