// Industry 1 (R-144): SEO 1's duplicate measure for the 21 industry pages, in one place, so the CLI
// (scripts/industry-dup.mjs, on a built or live site) and the test (tests/industry1-dup.test.ts) count the same way.
// Method (docs/progress/archive/2026-11-09-seo1.md section 4): the visible text of the page's <main>, split at every tag
// and then into sentences; lower case; a sentence counts once per page. A pair's share is its identical sentences over
// the sentences of the shorter page. A chunk with no letter or digit (a lone "/" or bracket) is not counted.
//
// Own text (R-144: "each page at least 70 percent its own text"): SEO 1 called the sentences on every page the template.
// This measure is stricter: a sentence on half the industry pages or more (11 of 21) counts as template, and a page's
// own share is the rest of its sentences over all of them. `unique` (sentences on no other industry page) is reported
// beside it; it also counts the six related business names and the three guide titles every page links to.

/** The limits lane R set in R-144. */
export const OWN_MIN = 0.7;
export const PAIR_MAX = 0.35;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#")
      return String.fromCodePoint(
        e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : +e.slice(1),
      );
    return ENTITIES[e.toLowerCase()] ?? m;
  });

/** The inner HTML of the page's <main>, without scripts, styles and templates. */
export function mainHtml(html) {
  const start = html.search(/<main[\s>]/i);
  if (start < 0) return "";
  const end = html.lastIndexOf("</main>");
  return html
    .slice(start, end < 0 ? undefined : end)
    .replace(/<(script|style|template|noscript)[\s\S]*?<\/\1>/gi, " ");
}

/** The page's sentences: the text between tags, split into sentences, lower case, each once. */
export function sentences(html) {
  const out = new Set();
  for (const chunk of mainHtml(html).split(/<[^>]*>/)) {
    const text = decode(chunk).replace(/\s+/g, " ").trim();
    if (!text) continue;
    for (const s of text.split(/(?<=[.?!])\s+/)) {
      const t = s.trim().toLowerCase();
      // A chunk of punctuation alone ("/", "(", "'.") is not a sentence.
      if (/[\p{L}\p{N}]/u.test(t)) out.add(t);
    }
  }
  return out;
}

/**
 * The measure over a map of page name to its set of sentences: each page's own share and every pair's share.
 * @param {Record<string, Set<string>>} pages
 */
export function measure(pages) {
  const names = Object.keys(pages).sort();
  const count = new Map();
  for (const n of names) for (const s of pages[n]) count.set(s, (count.get(s) ?? 0) + 1);
  const onEvery = [...count].filter(([, c]) => c === names.length).length;
  const half = Math.ceil(names.length / 2);
  const own = names.map((n) => {
    const total = pages[n].size;
    const mine = [...pages[n]].filter((s) => (count.get(s) ?? 0) < half).length;
    const unique = [...pages[n]].filter((s) => count.get(s) === 1).length;
    return {
      page: n,
      total,
      own: mine,
      share: total ? mine / total : 0,
      unique,
      uniqueShare: total ? unique / total : 0,
    };
  });
  const pairs = [];
  for (let a = 0; a < names.length; a++)
    for (let b = a + 1; b < names.length; b++) {
      const A = pages[names[a]];
      const B = pages[names[b]];
      let same = 0;
      for (const s of A) if (B.has(s)) same++;
      const shorter = Math.min(A.size, B.size);
      pairs.push({ a: names[a], b: names[b], same, shorter, share: shorter ? same / shorter : 0 });
    }
  pairs.sort((x, y) => y.share - x.share || x.a.localeCompare(y.a));
  own.sort((x, y) => x.share - y.share || x.page.localeCompare(y.page));
  return { own, pairs, onEvery };
}

/** The pages under OWN_MIN and the pairs above PAIR_MAX. */
export function failures(m) {
  return {
    own: m.own.filter((o) => o.share < OWN_MIN),
    pairs: m.pairs.filter((p) => p.share > PAIR_MAX),
  };
}

export const pct = (x) => `${(x * 100).toFixed(1)} percent`;
