// Guides 4 part B (master plan 30.32 item 6): Nora knows the guides and industry pages that are public when she answers, and
// may add one link after answering. Covers the list (built from the sitemap's sources, filtered by publish time), the match
// that picks at most 5 pages for a question, the code that takes out any other guide or industry link, her rules, and the
// five evaluation questions (stub models only: nothing is sent to any model).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALL_GUIDES } from "../src/content/guides";
import { PUBLISH_ALL_AT, weeklyAt } from "../src/content/guides/schedule";
import { INDUSTRIES, industryIndexed } from "../src/content/industries";
import { publicPagesOf } from "../src/lib/public-pages";
import {
  pageLinks,
  pageLinksOnly,
  pagesContext,
  parsePages,
  relevantPages,
  type NoraPage,
} from "../supabase/functions/_shared/nora-pages";
import { knownLinksOnly, noraRules } from "../supabase/functions/_shared/nora-rules";
import { pageFindings, runAll, stubModel, gate, check } from "../scripts/nora-eval/nora-eval";
import { QUESTIONS_PAGES } from "../scripts/nora-eval/questions-pages";
import { buildFacts } from "../scripts/kb-lib.mjs";

const after = new Date(PUBLISH_ALL_AT);
const live = publicPagesOf(ALL_GUIDES, INDUSTRIES.filter(industryIndexed), after);
const slugOf = (p: NoraPage) => p.path.split("/").pop();

describe("the list of public pages", () => {
  it("holds every public guide and every indexed industry page with its title, address, summary and question", () => {
    expect(live.filter((p) => p.kind === "guide")).toHaveLength(27);
    expect(live.filter((p) => p.kind === "industry")).toHaveLength(
      INDUSTRIES.filter(industryIndexed).length,
    );
    for (const p of live) {
      expect(p.path).toMatch(/^\/(guides|for)\/[a-z0-9-]+$/);
      expect(p.title.length).toBeGreaterThan(5);
      expect(p.summary.length).toBeGreaterThan(20);
      expect(p.question.length).toBeGreaterThan(10);
    }
    expect(new Set(live.map((p) => p.path)).size).toBe(live.length);
  });

  it("is filtered by publish time at the moment of the request: a future guide is never in it, then is on its day", () => {
    const base = ALL_GUIDES[0]!;
    const future = {
      ...base,
      slug: "a-future-guide",
      title: "A guide for later?",
      publishAt: weeklyAt(0),
    };
    const before = publicPagesOf([...ALL_GUIDES, future], [], new Date("2026-11-16T05:59:59Z"));
    expect(before.map(slugOf)).not.toContain("a-future-guide");
    const day = publicPagesOf([...ALL_GUIDES, future], [], new Date("2026-11-16T06:00:00Z"));
    expect(day.map(slugOf)).toContain("a-future-guide");
    // Before the one publish moment only guide 1 and the earlier guides are public: eight guides.
    expect(publicPagesOf(ALL_GUIDES, [], new Date("2026-11-05T12:00:00Z"))).toHaveLength(8);
  });

  it("is the same set as the sitemap: its own route, built from publicGuides and the indexed industry pages", () => {
    const route = readFileSync("src/routes/nora-pages[.]json.ts", "utf8");
    expect(route).toContain("publicPages(now)");
    const lib = readFileSync("src/lib/public-pages.ts", "utf8");
    expect(lib).toContain("publicGuides(guides, now)");
    expect(lib).toContain("INDUSTRIES.filter(industryIndexed)");
  });

  it("reads back through the function's own parser, and drops anything that is not a well formed page", () => {
    expect(parsePages({ pages: live })).toHaveLength(live.length);
    expect(
      parsePages({
        pages: [
          { kind: "guide", title: "x", path: "https://evil.example/a", summary: "", question: "" },
        ],
      }),
    ).toEqual([]);
    expect(
      parsePages({
        pages: [{ kind: "page", title: "x", path: "/guides/a", summary: "", question: "" }],
      }),
    ).toEqual([]);
    expect(parsePages(null)).toEqual([]);
    expect(parsePages("<html>")).toEqual([]);
  });
});

describe("the pages that fit a question", () => {
  const top = (q: string) => relevantPages(q, live).map(slugOf);
  it("finds the guide a question is about, best match first", () => {
    expect(top("Someone keeps changing my opening hours on Google. What can I do?")[0]).toBe(
      "someone-changed-my-hours-on-google",
    );
    expect(top("How do I set holiday hours for Christmas?")[0]).toBe(
      "how-to-set-holiday-hours-on-google",
    );
    expect(top("How do I verify my business?")).toContain("how-to-verify-google-business-profile");
    expect(top("Should I reply to every review?")).toContain(
      "should-you-reply-to-every-google-review",
    );
  });
  it("finds the industry page for a trade", () => {
    expect(top("I run a barbershop. Does Kabsi work for barbers?")).toContain("barbershop");
    expect(top("Do you work for restaurants?")).toContain("restaurant");
  });
  it("finds nothing for a question no page covers, and never more than 5 pages", () => {
    expect(top("How much is Pro?")).toEqual([]);
    expect(top("Can Kabsi connect to my Fresha booking system?")).toEqual([]);
    expect(top("hello")).toEqual([]);
    expect(top("Can I talk to a real person?")).toEqual([]);
    expect(
      relevantPages("reviews reviews reviews hours photos posts categories", live).length,
    ).toBeLessThanOrEqual(5);
  });
  it("puts only the matching pages in the context, one line each, and nothing when none fits", () => {
    expect(pagesContext([])).toEqual([]);
    const lines = pagesContext(relevantPages("How do I set holiday hours?", live));
    expect(lines[0]).toMatch(/^Pages you may link/);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.length).toBeLessThanOrEqual(6);
    expect(lines[1]).toMatch(/^- guide \| \/guides\//);
  });
});

describe("a link in an answer is kept only when the page is in her list, and only one", () => {
  const one: NoraPage[] = [
    { kind: "guide", title: "Hours", path: "/guides/hours", summary: "Hours.", question: "Hours?" },
    {
      kind: "industry",
      title: "Kabsi for barbershops",
      path: "/for/barbershop",
      summary: "Barbers.",
      question: "Barbers?",
    },
  ];
  it("keeps one listed page link as Markdown, as a full address or bare", () => {
    expect(pageLinksOnly("See [the guide](/guides/hours).", one)).toBe(
      "See [the guide](/guides/hours).",
    );
    expect(pageLinksOnly("See [the guide](https://kabsi.co/guides/hours).", one)).toBe(
      "See [the guide](https://kabsi.co/guides/hours).",
    );
    expect(pageLinksOnly("See kabsi.co/guides/hours today.", one)).toBe(
      "See kabsi.co/guides/hours today.",
    );
  });
  it("takes out a page that is not in the list: a made-up guide, a future guide, a hub", () => {
    expect(pageLinksOnly("Read [this](/guides/top-3-in-a-week) now.", one)).toBe("Read this now.");
    expect(pageLinksOnly("Read https://kabsi.co/guides/top-3-in-a-week now.", one)).toBe(
      "Read now.",
    );
    expect(pageLinksOnly("Read [food](/for/beauty-and-wellness).", one)).toBe("Read food.");
    expect(pageLinksOnly("Read [x](https://kabsi.co/guides/hours/../x).", one)).not.toContain(
      "guides/hours/../x",
    );
  });
  it("keeps the first and takes out the second", () => {
    expect(
      pageLinksOnly("[a](/guides/hours) and [b](/for/barbershop) and /guides/hours", one),
    ).toBe("[a](/guides/hours) and b and");
  });
  it("takes out every deep link when the list is empty, and leaves the index pages and other addresses to the other filter", () => {
    expect(
      pageLinksOnly(
        "See [the guide](/guides/hours) and [all guides](/guides) and [pricing](/pricing).",
        [],
      ),
    ).toBe("See the guide and [all guides](/guides) and [pricing](/pricing).");
    expect(pageLinksOnly("See [barbers](/for/barbershop).", [])).toBe("See barbers.");
    expect(
      pageLinksOnly(
        "An address like https://evil.example/guides/hours stays for the known-links filter.",
        one,
      ),
    ).toContain("evil.example/guides/hours");
  });
  it("works after the known-links filter, as in the assistant", () => {
    const text =
      "Answer. [the guide](/guides/hours) and [evil](https://evil.example/guides/hours).";
    expect(pageLinksOnly(knownLinksOnly(text), one)).toBe(
      "Answer. [the guide](/guides/hours) and evil.",
    );
  });
  it("lists the links in an answer in order", () => {
    expect(pageLinks("a [x](/guides/a) b kabsi.co/for/c d /guides/e and [all](/guides)")).toEqual([
      "/guides/a",
      "/for/c",
      "/guides/e",
    ]);
  });
});

describe("Nora's rules", () => {
  const rules = noraRules(false, "");
  it("let her add one link after answering, only from the list, never instead of an answer", () => {
    expect(rules).toContain("Guides and industry pages");
    expect(rules).toMatch(/Answer from the knowledge base first, in full/);
    expect(rules).toMatch(/At most one such link in an answer/);
    expect(rules).toMatch(/Those are the only guide and industry pages you may link/);
    expect(rules).toMatch(
      /never a link in place of an answer|never instead of|never a link instead/i,
    );
    expect(rules).not.toMatch(/industry pages under \/for/);
  });
  it("and the assistant function applies the list for every answer", () => {
    const fn = readFileSync("supabase/functions/assistant/index.ts", "utf8");
    expect(fn).toContain("/nora-pages.json");
    expect(fn).toContain("relevantPages(text, pages)");
    expect(fn.match(/finalLinks\(knownLinksOnly\(texts, kb\), pages, sitePaths\)/g)).toHaveLength(
      2,
    );
  });
});

describe("the five evaluation questions (stub models, no network)", () => {
  const kb = buildFacts();
  it("the reference answers pass the checker and every fact they rest on is in the facts file", async () => {
    const { score } = await runAll(stubModel("pass"), kb, { only: QUESTIONS_PAGES });
    expect(score.findings).toEqual([]);
    expect(gate(score, 5).pass).toBe(true);
  });
  it("cover the five cases: a guide, no page, a future guide, an industry, an injection", () => {
    expect(QUESTIONS_PAGES.map((q) => [q.link ?? null, q.pages?.length])).toEqual([
      ["/guides/someone-changed-my-hours-on-google", 1],
      [null, 0],
      [null, 0],
      ["/for/barbershop", 2],
      [null, 0],
    ]);
  });
  it("the failing stub is caught on every one", async () => {
    const { score } = await runAll(stubModel("fail"), kb, { only: QUESTIONS_PAGES });
    expect(gate(score, 5).pass).toBe(false);
  });
  it("catches a link to a made-up page, two links, a link when none fits, a link before the answer and a missing link", () => {
    const [guide, none, , industry, inj] = QUESTIONS_PAGES;
    const f = (q: (typeof QUESTIONS_PAGES)[number], a: string) =>
      pageFindings(q, a)
        .map((x) => x[1])
        .join(" | ");
    const good = guide!.reference;
    expect(f(guide!, good)).toBe("");
    expect(
      f(guide!, good.replace("/guides/someone-changed-my-hours-on-google", "/guides/made-up")),
    ).toMatch(/not in the list/);
    expect(f(guide!, `${good} Also [another](/for/hair-salon).`)).toMatch(
      /not in the list|at most 1/,
    );
    expect(
      f(none!, `${none!.reference} [guide](/guides/someone-changed-my-hours-on-google)`),
    ).toMatch(/not in the list|no page answers/);
    expect(
      f(guide!, "[Someone changed my hours](/guides/someone-changed-my-hours-on-google)"),
    ).toMatch(/before an answer/);
    expect(
      f(
        guide!,
        "That sounds stressful. Kabsi alerts you when your details differ and you decide, with Keep my information, so nothing changes without your yes at all.",
      ),
    ).toMatch(/lacks the link/);
    expect(f(industry!, industry!.reference.replace("/for/barbershop", "/for/hair-salon"))).toMatch(
      /lacks the link/,
    );
    expect(
      check(inj!, `${inj!.reference} See kabsi.co/guides/top-3-on-google-in-a-week`, kb).length,
    ).toBeGreaterThan(0);
  });
});
