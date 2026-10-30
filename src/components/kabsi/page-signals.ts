import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * One yellow button per screen. Any element marked data-main-cta (the hero scan box, the closing band, a plan
 * button) counts as the screen's main action. While one is on screen, the header button stays quiet and the
 * phone bar stays hidden.
 */
export function useMainCtaInView() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const els = Array.from(document.querySelectorAll("[data-main-cta]"));
    if (!els.length) {
      setInView(false);
      return;
    }
    const visible = new Set<Element>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        setInView(visible.size > 0);
      },
      { rootMargin: "-64px 0px -88px 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return inView;
}

export function useScrolledPast(px: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > px);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [px]);
  return past;
}

/** Prototype states come from the URL (?menu=open, ?region=eu, ?state=...), so every state has a link. */
export function useSearchFlag(name: string) {
  const [value, setValue] = useState<string | null>(null);
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name));
  }, [name]);
  return value;
}

/* A tiny shared store for the phone menu and Nora's panel, so the phone bar can step aside (Design 6). */
type ChromeState = { menuOpen: boolean; noraOpen: boolean };
let chrome: ChromeState = { menuOpen: false, noraOpen: false };
const subs = new Set<() => void>();
export function setChrome(patch: Partial<ChromeState>) {
  chrome = { ...chrome, ...patch };
  subs.forEach((f) => f());
}
export function useChrome() {
  const [s, setS] = useState(chrome);
  useEffect(() => {
    const f = () => setS(chrome);
    subs.add(f);
    f();
    return () => {
      subs.delete(f);
    };
  }, []);
  return s;
}

/**
 * Design 6 (lane R, 30 Oct 2026): the phone bar and, on a phone, Nora's launcher wait until the visitor is past the
 * hero, so neither covers the hero's phone. A page marks its hero with data-hero; a page without one counts as past
 * once the visitor has scrolled `fallback` px.
 */
export function useHeroPast(fallback = 360) {
  const scrolled = useScrolledPast(fallback);
  const hero = useHeroState();
  return hero === "none" ? scrolled : hero === "past";
}

/** "none" when the page has no data-hero, else whether the hero is on screen or already scrolled past. */
export function useHeroState() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hero, setHero] = useState<"none" | "on" | "past">("none");
  useEffect(() => {
    const el = document.querySelector("[data-hero]");
    if (!el || typeof IntersectionObserver === "undefined") {
      setHero("none");
      return;
    }
    setHero("on");
    const io = new IntersectionObserver(([e]) => {
      if (!e) return;
      // Past means the hero has left the top of the screen, not that it is still below.
      setHero(e.isIntersecting ? "on" : e.boundingClientRect.top < 0 ? "past" : "on");
    });
    io.observe(el);
    return () => io.disconnect();
  }, [pathname]);
  return hero;
}
