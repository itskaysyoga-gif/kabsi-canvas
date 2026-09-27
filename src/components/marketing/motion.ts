import { useEffect } from "react";

// Arms the one-time section rise (styles.css). Elements already on screen are marked shown first,
// so nothing above the fold flickers; the rest rise once as they scroll in, then are left alone.
export function useSectionRise(key: string) {
  useEffect(() => {
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rise],[data-stagger]"));
    const vh = window.innerHeight;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) el.classList.add("kb-in");
    }
    document.documentElement.classList.add("kb-motion");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("kb-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    for (const el of els) if (!el.classList.contains("kb-in")) io.observe(el);
    // Sections rendered later (client navigation, loaded content) get observed too, so nothing stays hidden.
    const mo = new MutationObserver((muts) => {
      for (const m of muts)
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return;
          const found = n.matches("[data-rise],[data-stagger]") ? [n] : [];
          found.push(...Array.from(n.querySelectorAll<HTMLElement>("[data-rise],[data-stagger]")));
          for (const el of found) if (!el.classList.contains("kb-in")) io.observe(el);
        });
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, [key]);
}
