// Guides 4 part C (master plan 30.32 item 4): which addresses to tell IndexNow about. Pure functions, no network, so the
// tests can read them. IndexNow is how Bing (and so the search that ChatGPT draws on) hears that a page was published or
// changed. A page "changed" when a file it is made of changed since the previous production deploy: the same files
// src/content/sitemap-pages.json lists for the sitemap's lastmod, and a guide's own content file.
import { readdirSync, readFileSync } from "node:fs";

export const HOST = "kabsi.co";
export const SITE = `https://${HOST}`;
/** The key is public by design: IndexNow checks it against this file at kabsi.co/<key>.txt. */
export const INDEXNOW_KEY = "b057a737155e3140809eae41b44a5f14";
export const KEY_LOCATION = `${SITE}/${INDEXNOW_KEY}.txt`;
export const ENDPOINT = "https://api.indexnow.org/IndexNow";

const url = (path) => (path === "/" ? SITE : `${SITE}${path}`);

/** { slug: publishAt (ISO) } read from the guide content files, with the schedule's own constants and weeklyAt. */
export async function guidePublishTimes(dir = "src/content/guides") {
  const sched = await import(new URL(`../../${dir}/schedule.ts`, import.meta.url).href);
  const out = {};
  for (const f of readdirSync(dir)) {
    if (!/^[a-z0-9-]+\.tsx$/.test(f) || f === "index.tsx") continue;
    const text = readFileSync(`${dir}/${f}`, "utf8");
    const m = /publishAt:\s*([^,\n]+),/.exec(text);
    if (!m) continue;
    const expr = m[1].trim();
    let at;
    if (expr === "FIRST_PUBLISH") at = sched.FIRST_PUBLISH;
    else if (expr === "PUBLISH_ALL_AT") at = sched.PUBLISH_ALL_AT;
    else if (/^weeklyAt\((\d+)\)$/.test(expr))
      at = sched.weeklyAt(Number(/\((\d+)\)/.exec(expr)[1]));
    else if (/^"[0-9T:Z-]+"$/.test(expr)) at = expr.slice(1, -1);
    if (at) out[f.replace(/\.tsx$/, "")] = at;
  }
  return out;
}

/**
 * The addresses whose page changed between two deploys, given the files that changed. A page that is not public yet
 * (a guide whose publishAt is still ahead) is left out. The guides list is added when any guide is.
 */
export function changedUrls({ changedFiles, pages, guides, now }) {
  const files = new Set(changedFiles);
  const out = new Set();
  for (const p of pages) if (p.sources.some((s) => files.has(s))) out.add(url(p.path));
  let anyGuide = false;
  for (const [slug, at] of Object.entries(guides)) {
    if (!files.has(`src/content/guides/${slug}.tsx`)) continue;
    if (Date.parse(at) > now.getTime()) continue;
    out.add(url(`/guides/${slug}`));
    anyGuide = true;
  }
  if (anyGuide) out.add(url("/guides"));
  return [...out].sort();
}

/** The guides that became public in the 24 hours up to `now` (the daily send), as addresses with the guides list. */
export function publishedToday({ guides, now, hours = 24 }) {
  const from = now.getTime() - hours * 3600 * 1000;
  const slugs = Object.entries(guides)
    .filter(([, at]) => Date.parse(at) > from && Date.parse(at) <= now.getTime())
    .map(([slug]) => slug)
    .sort();
  return slugs.length ? [...slugs.map((s) => url(`/guides/${s}`)), url("/guides")] : [];
}

/** The body IndexNow takes: one host, the key and where to read it, and up to 10,000 addresses. */
export function payload(urls) {
  return {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls.slice(0, 10000),
  };
}
