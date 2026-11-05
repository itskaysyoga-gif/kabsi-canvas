// Guides 4 part B (master plan 30.32 item 6): Nora knows the guides and industry pages that are public at the moment she
// answers. The website serves the list (kabsi.co/nora-pages.json, built from the same source as the sitemap and filtered by
// publish time on each request); the assistant function reads it for each answer, picks the pages that match the question
// (at most 5, a plain keyword match) and puts only those in her context. Her rules let her add one link after answering.
// This file holds the parts that need no network: reading the list, the match, the context lines, and the code that takes
// out any guide or industry link that is not in the list, or is a second one, whatever the model wrote.
// Pure on purpose: scripts/nora-eval and the Deno and Vitest tests import it as it is.

export type NoraPage = {
  kind: "guide" | "industry";
  title: string;
  /** The page's real address, for example /guides/how-to-verify-google-business-profile or /for/hair-salon. */
  path: string;
  /** One line, from the page's own summary. */
  summary: string;
  /** The question the page answers, in an owner's words. */
  question: string;
};

export const PAGE_PATH = /^\/(?:guides|for)\/[a-z0-9-]{1,120}$/;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** Reads the website's list. Anything that is not a well-formed page is left out, so a broken answer gives no pages. */
export function parsePages(json: unknown): NoraPage[] {
  const rows = (json as { pages?: unknown } | null)?.pages;
  if (!Array.isArray(rows)) return [];
  const out: NoraPage[] = [];
  for (const r of rows.slice(0, 300)) {
    const o = (r ?? {}) as Record<string, unknown>;
    const path = clip(o.path, 140);
    const title = clip(o.title, 160);
    if ((o.kind !== "guide" && o.kind !== "industry") || !PAGE_PATH.test(path) || !title) continue;
    out.push({ kind: o.kind, path, title, summary: clip(o.summary, 300), question: clip(o.question, 200) });
  }
  return out;
}

// Words that name Kabsi's whole subject match every page, so they say nothing about which page fits.
const STOP = new Set(
  (
    "about above after again also another because been before being between both business businesses could does doing down during each even " +
    "from google have having here hers into just kabsi like listing make many more most much need only other over please profile profiles " +
    "really same should some such than that their them then there these they this those through under until very want what when where which " +
    "while will with would your yours owner owners tell know help"
  ).split(" "),
);

/** A word reduced to a stem: "reviews", "reviewed" and "reviewing" meet at "review"; "replies" at "reply"; "changes" at "chang". */
function stem(w: string): string {
  let s = w;
  if (/(?:ies|ied)$/.test(s) && s.length > 5) s = `${s.slice(0, -3)}y`;
  else
    for (const end of ["ing", "ed", "es", "s"]) {
      if (s.length > end.length + 3 && s.endsWith(end)) {
        s = s.slice(0, -end.length);
        break;
      }
    }
  return s.length > 4 && s.endsWith("e") ? s.slice(0, -1) : s;
}
const stems = (text: string) =>
  new Set(
    (text.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter((w) => !STOP.has(w)).map(stem),
  );

/**
 * The pages that fit a question: a simple keyword match on the question and each page's title, question, summary and
 * address, at most `max`. A stem in the title or address counts 2, one in the summary or the page's question counts 1;
 * a page needs 2 to show, so one common word is not enough. The best match comes first.
 */
export function relevantPages(question: string, pages: NoraPage[], max = 5): NoraPage[] {
  const q = stems(question);
  if (!q.size) return [];
  const scored: { page: NoraPage; score: number; i: number }[] = [];
  pages.forEach((page, i) => {
    const head = stems(`${page.title} ${page.path.split("/").pop()!.replace(/-/g, " ")}`);
    const rest = stems(`${page.question} ${page.summary}`);
    let score = 0;
    for (const w of q) score += head.has(w) ? 2 : rest.has(w) ? 1 : 0;
    if (score >= 2) scored.push({ page, score, i });
  });
  return scored
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .slice(0, max)
    .map((s) => s.page);
}

/** The lines for Nora's context block: only the pages that fit this question, each on one line. Empty when none fits. */
export function pagesContext(pages: NoraPage[]): string[] {
  if (!pages.length) return [];
  return [
    "Pages you may link (public today; when one answers the visitor's question you may add one link after your answer, with the address word for word; never any other page):",
    ...pages.map((p) => `- ${p.kind} | ${p.path} | ${p.title} | ${p.summary}`),
  ];
}

// A guide or industry address in an answer: inside a Markdown link, as a full kabsi.co address, or bare. The index pages
// /guides and /for have no slug and are not "pages" here.
const LINK = /\[([^\]]{1,160})\]\((?:https?:\/\/(?:www\.)?kabsi\.co)?(\/(?:guides|for)\/[a-z0-9-]+)\/?(?:[?#][^)\s]*)?\)/gi;
const BARE = /(?<![\w@./-])(?:https?:\/\/(?:www\.)?)?(?:kabsi\.co)?(\/(?:guides|for)\/[a-z0-9-]+)\/?(?![\w/-])/gi;

/** Every guide or industry address in a text, in order, as a path. Used by the answer filter and by the evaluation. */
export function pageLinks(text: string): string[] {
  const hits: { at: number; path: string }[] = [];
  const marked = text.replace(LINK, (m, _l: string, path: string, off: number) => {
    hits.push({ at: off, path: path.toLowerCase() });
    return " ".repeat(m.length);
  });
  for (const m of marked.matchAll(BARE)) hits.push({ at: m.index!, path: m[1].toLowerCase() });
  return hits.sort((a, b) => a.at - b.at).map((h) => h.path);
}

/**
 * Takes out every guide or industry link that is not in the list, and every one after the first (at most one page link in
 * an answer, 30.32 item 6). A Markdown link keeps its words, a bare address goes. With an empty list every such link goes.
 */
export function pageLinksOnly(text: string, pages: NoraPage[]): string {
  const known = new Set(pages.map((p) => p.path.toLowerCase()));
  let kept = 0;
  const ok = (path: string) => {
    if (!known.has(path.toLowerCase()) || kept >= 1) return false;
    kept++;
    return true;
  };
  // Markdown links and bare addresses are walked in the order they appear, so "the first one" is the first the reader sees.
  const all = new RegExp(`${LINK.source}|${BARE.source}`, "gi");
  return text
    .replace(all, (m: string, label: string | undefined, mdPath: string | undefined, bare: string | undefined) => {
      const path = (mdPath ?? bare)!;
      if (ok(path)) return m;
      return label ?? "";
    })
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:])/g, "$1");
}
