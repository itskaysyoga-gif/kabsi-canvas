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

/* A tiny shared store for the phone menu, so the phone bar can step aside. */
type ChromeState = { menuOpen: boolean };
let chrome: ChromeState = { menuOpen: false };
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
