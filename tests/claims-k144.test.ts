// K-144, plan 2.11 (lane R, 22 Oct 2026): nothing the owner, a visitor, Nora or an AI assistant can read says what
// Google's ranking uses or rewards. Kabsi says what it does instead. This reads the FAQ, the facts file, the published
// full-facts file and every page and library under src, so a retired line cannot come back.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_GUIDES } from "../src/content/guides";
import { guideText } from "../src/content/guides/text";
import type { GuideDoc } from "../src/content/guides/types";
import { FAQ } from "../src/lib/faq";
import { readText } from "./helpers/facts";

const RETIRED: RegExp[] = [
  /relevance,? distance,? and prominence/i,
  /\bprominence\b/i,
  /ways to improve (your )?(local )?rank/i,
  /Google'?s own (list|guidance) (of|lists)/i,
  /Google (ranks|prefers|rewards|favou?rs) /i,
  /Google doesn'?t say (that |they |it )/i,
  /Google says helpful replies/i,
];

// Guides 4 part C (master plan 30.32 item 7): a guide may quote Google's own help page on how local results are chosen, word for
// word, when it cites that page with its link and the date it was read. Inside such a quote the retired lines are Google's
// words, not Kabsi's. Outside it, and in every guide that does not cite the page, they still fail, and so does any promise
// of a ranking, anywhere outside a quote.
const GOOGLE_LOCAL_RANKING_PAGE = /support\.google\.com\/business\/answer\/7091/;
const PROMISES: RegExp[] = [
  /\b(will|can|to) (help you |get you |make you )?(rank|appear|show up|come up) (higher|first|at the top|in the top)/i,
  /\b(top 3|top three|first page|number one|#1) (of|on|in) google\b/i,
  /\b(guarantee[sd]?|promise[sd]?) (a |you )?(better |higher |top |first )?(rank|ranking|position)/i,
  /\b(boost|raise|improve|increase) your (local )?(rank|ranking|position)\b/i,
];
export const citesGoogleRankingPage = (g: Pick<GuideDoc, "sources">) =>
  g.sources.some((s) => GOOGLE_LOCAL_RANKING_PAGE.test(s.url) && /^20\d\d-\d\d-\d\d$/.test(s.read));
/** The text without its quotations (straight or curly marks, at least 12 characters between them). */
export const outsideQuotes = (text: string) =>
  text.replace(/"[^"\n]{12,}"|\u201c[^\u201d\n]{12,}\u201d/g, " ");
const NEGATED = /\b(no|not|never|nobody|nothing|cannot|without|neither|nor)\b|n['\u2019]t\b/i;
/** A promise is a sentence that matches and does not first say no: "Nobody outside Google can promise a position" is honest. */
const promises = (text: string) =>
  PROMISES.filter((re) =>
    text.split(/(?<=[.?:;])\s+|\n+/).some((sentence) => {
      const m = re.exec(sentence);
      return m !== null && !NEGATED.test(sentence.slice(0, m.index + 1));
    }),
  );
export function guideClaimProblems(g: GuideDoc, text: string): string[] {
  const own = citesGoogleRankingPage(g) ? outsideQuotes(text) : text;
  return [
    ...RETIRED.filter((re) => re.test(own)).map((re) => `${g.slug}: ${re}`),
    ...promises(outsideQuotes(text)).map((re) => `${g.slug}: promise ${re}`),
  ];
}

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.(ts|tsx)$/.test(name) && name !== "routeTree.gen.ts" ? [p] : [];
  });
}

describe("no line says what Google's ranking uses or rewards (K-144)", () => {
  it("the FAQ", () => {
    const words = FAQ.map((f) => `${f.q}\n${f.a}`).join("\n");
    for (const re of RETIRED) expect(words).not.toMatch(re);
  });
  it("the facts file and the published full-facts file", () => {
    for (const file of [
      "knowledge/kabsi-facts.md",
      "public/llms-full.txt",
      "src/content/llms-base.txt",
    ]) {
      const text = readText(file);
      for (const re of RETIRED) expect(text, `${file} ${re}`).not.toMatch(re);
    }
  });
  it("every page, library, component and Edge Function", () => {
    // The guides are checked on the words a reader sees, below, where a quotation of Google's page is allowed.
    const files = [...sources("src"), ...sources("supabase/functions")].filter(
      (f) =>
        !/\.test\.ts$/.test(f) &&
        !f.endsWith("review-graphic/assets.ts") &&
        !/^src\/content\/guides\/[a-z0-9-]+\.tsx$/.test(f),
    );
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      for (const re of RETIRED) expect(text, `${f} ${re}`).not.toMatch(re);
    }
  });
  it("still says Kabsi promises no ranking, and says what it does", () => {
    const facts = readText("knowledge/kabsi-facts.md");
    expect(facts).toMatch(
      /Nobody can promise a ranking, and we don't\. Kabsi does the parts you control/,
    );
    expect(facts).toMatch(/Never say what Google's ranking uses or rewards/);
  });

  it("every guide: no retired line outside a quote of Google's page, no promise of a ranking", () => {
    for (const g of ALL_GUIDES) {
      const text = [g.title, g.description, g.summary, g.topic, guideText(g)].join("\n");
      expect(guideClaimProblems(g, text), g.slug).toEqual([]);
    }
  });
  it("lets a guide quote Google's page when it cites it with its link and date, and nothing else", () => {
    const cited = {
      slug: "x",
      sources: [
        {
          title: "t",
          url: "https://support.google.com/business/answer/7091?hl=en",
          read: "2026-11-05",
        },
      ],
    } as GuideDoc;
    const uncited = {
      slug: "y",
      sources: [
        { title: "t", url: "https://support.google.com/business/answer/7091?hl=en", read: "" },
      ],
    } as GuideDoc;
    const quote =
      'Google says: "Local results are based on relevance, distance, and prominence." That is its page.';
    expect(guideClaimProblems(cited, quote)).toEqual([]);
    expect(
      guideClaimProblems(
        cited,
        "Google's help says \u201cGoogle ranks businesses that reply to reviews higher\u201d on this page.",
      ),
    ).toEqual([]);
    // the same quote without the link and the date, or from a guide that does not cite the page, fails
    expect(guideClaimProblems(uncited, quote).length).toBeGreaterThan(0);
    expect(
      guideClaimProblems({ slug: "z", sources: [] } as unknown as GuideDoc, quote).length,
    ).toBeGreaterThan(0);
    // outside a quote the word and the retired lines still fail, even in a guide that cites the page
    expect(
      guideClaimProblems(cited, "Kabsi improves your prominence on Google.").length,
    ).toBeGreaterThan(0);
    expect(
      guideClaimProblems(cited, "Google ranks businesses that reply higher.").length,
    ).toBeGreaterThan(0);
    // and a promise of a ranking fails everywhere, including next to a quote
    expect(
      guideClaimProblems(
        cited,
        'Google says "results use relevance, distance and popularity". Kabsi will help you rank higher.',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      guideClaimProblems(cited, "Kabsi will get you to the top 3 on Google.").length,
    ).toBeGreaterThan(0);
    expect(
      guideClaimProblems(cited, "Kabsi will improve your ranking.").length +
        guideClaimProblems(cited, "Kabsi can boost your ranking.").length,
    ).toBeGreaterThan(0);
  });
});
