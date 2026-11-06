import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useFoundingPlaces } from "@/lib/public-api";
import { FOUNDING25_TOTAL } from "./founding-total";
import { SiteLink } from "./site-link";

/**
 * The slim Founding 25 line above the header (Design 8, Web 4, lane R decision 2 of 1 Nov 2026). The count is never
 * typed: it is the real one from GET /api/founding-count, and no number shows while it is unknown. Once applications
 * are closed (no place left) the line goes. A visitor can hide it. Both are kept in this browser ("hidden", or
 * "closed" as last read) and applied before the first paint by the small script below, so a returning visitor never
 * sees the page shift; a "closed" that reopens is cleared when the count says so.
 */
export const FOUNDING_LINE_KEY = "kabsi-founding-line";
const HIDDEN_CLASS = "founding-line-hidden";
const BEFORE_PAINT = `try{var v=localStorage.getItem("${FOUNDING_LINE_KEY}");if(v==="hidden"||v==="closed")document.documentElement.classList.add("${HIDDEN_CLASS}")}catch(e){}`;

/** The pages that show the Founding 25 line: Home, Pricing and the /for pages only (master plan 30.24). */
export function foundingLinePage(path: string): boolean {
  const p = path.replace(/\/+$/, "") || "/";
  return p === "/" || p === "/pricing" || p === "/for" || p.startsWith("/for/");
}

function remember(value: "hidden" | "closed" | null) {
  try {
    if (value) {
      window.localStorage.setItem(FOUNDING_LINE_KEY, value);
      document.documentElement.classList.add(HIDDEN_CLASS);
    } else {
      window.localStorage.removeItem(FOUNDING_LINE_KEY);
      document.documentElement.classList.remove(HIDDEN_CLASS);
    }
  } catch {
    /* private mode: for this visit only */
  }
}

export function FoundingLine() {
  const places = useFoundingPlaces();
  const [hidden, setHidden] = useState(false);
  // Design 9 (master plan 30.24, changes Polish 2's decision 7): only on Home, Pricing and the /for pages; never on How
  // it works, legal, security, about, partners, sign-in or Founding 25 itself.
  const shown = useRouterState({ select: (s) => foundingLinePage(s.location.pathname) });
  useEffect(() => {
    try {
      if (window.localStorage.getItem(FOUNDING_LINE_KEY) === "hidden") setHidden(true);
    } catch {
      /* private mode: the line shows */
    }
  }, []);
  const closed = places !== null && places.left <= 0;
  // Keep the last count's answer for the next page view; a visitor's own "hidden" always wins.
  useEffect(() => {
    if (places === null) return;
    let v: string | null = null;
    try {
      v = window.localStorage.getItem(FOUNDING_LINE_KEY);
    } catch {
      return;
    }
    if (v === "hidden") return;
    if (closed && v !== "closed") remember("closed");
    if (!closed && v === "closed") remember(null);
  }, [places, closed]);
  if (hidden || !shown || closed) return null;
  const hide = () => {
    setHidden(true);
    remember("hidden");
    // Focus goes to the header's first link, not to the top of the document.
    document.querySelector<HTMLElement>("header a")?.focus();
  };
  return (
    <div data-founding-line className="theme-dark bg-band text-text-1">
      <script dangerouslySetInnerHTML={{ __html: BEFORE_PAINT }} />
      <div className="container-kb flex min-h-13 items-center gap-3 py-1.5 text-label sm:min-h-10 sm:text-small">
        <p className="min-w-0 flex-1">
          <span className="font-bold">Founding 25:</span> three months of Kabsi Pro, free.{" "}
          {places && places.left > 0 && (
            <span data-qa-mask className="text-text-2">
              {places.left} of {places.total || FOUNDING25_TOTAL} places left.{" "}
            </span>
          )}
          <SiteLink
            to="/founding"
            className="font-bold whitespace-nowrap underline underline-offset-4"
          >
            Apply
          </SiteLink>
        </p>
        <button
          type="button"
          onClick={hide}
          className="press -me-2 grid size-11 shrink-0 place-items-center rounded-full text-text-2 hover:text-text-1"
        >
          <X className="size-4" aria-hidden />
          <span className="sr-only">Hide the Founding 25 line</span>
        </button>
      </div>
    </div>
  );
}
