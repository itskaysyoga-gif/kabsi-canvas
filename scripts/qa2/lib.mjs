// QA 2: what the crawl and the signed-in pass measure in a page (sideways scroll, covered buttons, touch targets, images,
// tags) and the words that must never appear.
// Everything measured inside the page, at one width.
export async function measure(page, width) {
  return page.evaluate((width) => {
    const out = {};
    const de = document.documentElement;
    out.scrollWidth = Math.max(de.scrollWidth, document.body.scrollWidth);
    out.sideways = out.scrollWidth > window.innerWidth + 1;
    // Elements that stick out to the right (the cause of sideways scroll), deepest first.
    const wide = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed") continue;
      if (
        r.right > window.innerWidth + 1 &&
        !el.closest("[data-qa-scroll], .overflow-x-auto, [style*='overflow-x']")
      ) {
        let p = el.parentElement,
          clipped = false;
        while (p) {
          const ps = getComputedStyle(p);
          if (/(auto|scroll|hidden|clip)/.test(ps.overflowX)) {
            clipped = true;
            break;
          }
          p = p.parentElement;
        }
        if (!clipped)
          wide.push(
            `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} right=${Math.round(r.right)}`,
          );
      }
    }
    out.wide = wide.slice(-5);
    // The page's tags.
    out.title = document.title;
    out.description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null;
    out.canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
    out.robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;
    out.h1 = [...document.querySelectorAll("h1")]
      .filter((h) => h.offsetParent !== null || getComputedStyle(h).position === "fixed")
      .map((h) => h.innerText.trim());
    out.h1All = document.querySelectorAll("h1").length;
    out.jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
      try {
        const j = JSON.parse(s.textContent);
        return []
          .concat(j["@graph"] ?? j)
          .map((x) => x["@type"])
          .join("+");
      } catch {
        return "INVALID";
      }
    });
    // Images: upscaled (blurry) or drawn at another shape than their own (stretched).
    out.images = [];
    for (const img of document.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      if (!img.complete || !img.naturalWidth || r.width < 24 || r.height < 24) continue;
      const fit = getComputedStyle(img).objectFit;
      const dpr = window.devicePixelRatio || 1;
      // The file's own width: with a srcset, naturalWidth is already divided by the chosen density, so read the w descriptor.
      const cand = (img.srcset || "")
        .split(",")
        .map((c) => c.trim().split(/\s+/))
        .find(([u]) => u && img.currentSrc.endsWith(u.replace(/^\.?\//, "")));
      const fileW = cand && /w$/.test(cand[1] ?? "") ? parseInt(cand[1]) : img.naturalWidth;
      const fileH = fileW * (img.naturalHeight / img.naturalWidth);
      const scale =
        fit === "contain"
          ? Math.min(r.width / fileW, r.height / fileH)
          : fit === "cover"
            ? Math.max(r.width / fileW, r.height / fileH)
            : Math.max(r.width / fileW, r.height / fileH);
      const blurry = scale * dpr > 1.3 && !img.currentSrc.endsWith(".svg");
      const ratioN = img.naturalWidth / img.naturalHeight,
        ratioR = r.width / r.height;
      const stretched =
        (fit === "fill" || fit === "") &&
        Math.abs(ratioN - ratioR) / ratioN > 0.04 &&
        !img.currentSrc.endsWith(".svg");
      if (blurry || stretched)
        out.images.push({
          src: img.currentSrc.split("/").pop().slice(0, 80),
          file: `${fileW}x${Math.round(fileH)}`,
          scale: Math.round(scale * dpr * 100) / 100,
          shown: `${Math.round(r.width)}x${Math.round(r.height)}`,
          blurry,
          stretched,
        });
    }
    // Touch targets under 44 px on phones and tablets (inline links in running text are left out, WCAG 2.5.8).
    out.small = [];
    if (width <= 768) {
      for (const el of document.querySelectorAll(
        "a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=combobox], summary",
      )) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        if (
          el.tagName === "A" &&
          el.closest("p, li") &&
          cs.display === "inline" &&
          el.closest("p, li").innerText.trim().length > el.innerText.trim().length + 3
        )
          continue;
        if (el.closest("[aria-hidden=true]")) continue;
        if (r.height < 44 || r.width < 44)
          out.small.push(
            `${el.tagName.toLowerCase()} "${(el.innerText || el.getAttribute("aria-label") || el.getAttribute("name") || "").trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`,
          );
      }
    }
    // Fixed bars (Nora, the cookie bar, the phone bar) that sit over a link or button in the first screen.
    const fixed = [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      return (
        (cs.position === "fixed" || cs.position === "sticky") &&
        el.getBoundingClientRect().height > 0 &&
        cs.visibility !== "hidden"
      );
    });
    out.fixed = fixed.map((el) => {
      const r = el.getBoundingClientRect();
      return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} ${getComputedStyle(el).position}`;
    });
    out.text = document.body.innerText;
    out.links = [
      ...new Set([...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"))),
    ];
    return out;
  }, width);
}

// Interactive elements covered by a fixed bar, at a scroll position.
export async function covered(page) {
  return page.evaluate(() => {
    const hits = [];
    for (const el of document.querySelectorAll(
      "a[href], button, input:not([type=hidden]), [role=button], [role=combobox]",
    )) {
      const r = el.getBoundingClientRect();
      if (
        r.width < 4 ||
        r.height < 4 ||
        r.bottom < 0 ||
        r.top > window.innerHeight ||
        r.right < 0 ||
        r.left > window.innerWidth
      )
        continue;
      if (getComputedStyle(el).visibility === "hidden") continue;
      const x = Math.min(window.innerWidth - 1, Math.max(0, r.left + r.width / 2)),
        y = Math.min(window.innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const top = document.elementFromPoint(x, y);
      if (!top || el.contains(top) || top.contains(el)) continue;
      let f = top,
        fixed = null;
      while (f && f !== document.body) {
        const p = getComputedStyle(f).position;
        if (p === "fixed" || p === "sticky") {
          fixed = f;
          break;
        }
        f = f.parentElement;
      }
      // A sticky header over what scrolled under it is normal; only bars that stay over content count.
      const fr = fixed && fixed.getBoundingClientRect();
      if (fixed && fixed.tagName === "HEADER" && fr.top < 120) continue;
      if (fixed && !fixed.contains(el))
        hits.push(
          `"${(el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40)}" under ${fixed.tagName.toLowerCase()}.${String(fixed.className).slice(0, 40)}`,
        );
    }
    return hits;
  });
}

// Words that must never appear.
export const WORDS = [
  ["em dash", /—/g],
  ["en dash", /–/g],
  ["exclamation mark", /!/g],
  ["Arabic", /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]+/g],
  [
    "banned name",
    /\b(Profile Score|Do now|Listing Shield|Put mine back|Profile Care|Monday Report)\b/g,
  ],
  ["spot/grid/pin", /\b(spots?|grids?|pins?|pinned)\b/gi],
  ["app for Kabsi", /(?<![/\w.-])(Kabsi app|the app|our app|Kabsi.s app|app)(?![\w/.-])/gi],
];
export function words(text) {
  const hits = [];
  for (const [name, re] of WORDS) {
    for (const m of text.matchAll(re)) {
      const at = m.index ?? 0;
      hits.push({
        name,
        match: m[0],
        context: text.slice(Math.max(0, at - 50), at + 50).replace(/\s+/g, " "),
      });
    }
  }
  return hits;
}
