// Launch 2 part A (master plan 30.36 item 3): a server-side filter takes out of Nora's final text any kabsi.co link that is
// not in the public page list (the sitemap's pages and the public guides and industry pages), and her rules give the setup
// call and hello@kabsi.co when a visitor asks for help.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOORS,
  FALLBACK_PATHS,
  finalLinks,
  parseSitePaths,
  siteLinksOnly,
  type NoraPage,
} from "../supabase/functions/_shared/nora-pages";
import { knownLinksOnly, noraRules } from "../supabase/functions/_shared/nora-rules";
import { SITEMAP_PAGES } from "../src/lib/sitemap";

const SITE = SITEMAP_PAGES.map((p) => p.path);
const POSTS: NoraPage = {
  kind: "guide",
  title: "Google posts for local businesses",
  path: "/guides/google-posts-for-local-businesses",
  summary: "What to post.",
  question: "What should I post?",
};

describe("Nora's kabsi.co links are checked against the public page list", () => {
  it("keeps a link to a public page", () => {
    expect(siteLinksOnly("See [pricing](/pricing) or book at kabsi.co/setup-call.", SITE)).toBe(
      "See [pricing](/pricing) or book at kabsi.co/setup-call.",
    );
    expect(siteLinksOnly("Start at [get set up](/start), then [Posts](/app/posts).", SITE)).toBe(
      "Start at [get set up](/start), then [Posts](/app/posts).",
    );
    expect(siteLinksOnly("Read [the FAQ](https://kabsi.co/faq#price).", SITE)).toBe(
      "Read [the FAQ](https://kabsi.co/faq#price).",
    );
  });
  it("removes a link to a page that is not public, and the sentence still reads", () => {
    expect(siteLinksOnly("Read kabsi.co/food-trucks for that.", SITE)).toBe(
      "Read kabsi.co for that.",
    );
    expect(siteLinksOnly("Go to https://www.kabsi.co/secret-offer.", SITE)).toBe("Go to kabsi.co.");
    expect(siteLinksOnly("Email hello@kabsi.co or visit kabsi.co.", SITE)).toBe(
      "Email hello@kabsi.co or visit kabsi.co.",
    );
  });
  it("catches every form of a kabsi.co address: //, a port, a user part, http, www, a query", () => {
    for (const raw of [
      "[admin](//kabsi.co/admin)",
      "[admin](https://kabsi.co:443/admin)",
      "[admin](https://x@kabsi.co/admin)",
      "[admin](http://www.kabsi.co/admin?x=1)",
      "[admin](/admin#top)",
    ])
      expect(siteLinksOnly(`See ${raw}.`, SITE)).toBe("See admin.");
    expect(siteLinksOnly("See //kabsi.co/admin now.", SITE)).toBe("See kabsi.co now.");
    expect(siteLinksOnly("See https://kabsi.co:443/admin.", SITE)).toBe("See kabsi.co.");
    expect(siteLinksOnly("See https://x@kabsi.co/admin.", SITE)).toBe("See kabsi.co.");
    expect(siteLinksOnly("See https://kabsi.co:443/pricing.", SITE)).toBe(
      "See https://kabsi.co:443/pricing.",
    );
    expect(siteLinksOnly("Links at go.kabsi.co/abc and [mail](mailto:hello@kabsi.co).", SITE)).toBe(
      "Links at go.kabsi.co/abc and [mail](mailto:hello@kabsi.co).",
    );
  });
  it("removes a link inside Markdown and keeps its words", () => {
    expect(siteLinksOnly("There is a [food truck guide](/guides/food-trucks) for you.", SITE)).toBe(
      "There is a food truck guide for you.",
    );
    expect(siteLinksOnly("See [our offer](https://kabsi.co/offer).", SITE)).toBe("See our offer.");
    expect(
      siteLinksOnly("[Posts guide](/guides/google-posts-for-local-businesses)", [
        ...SITE,
        POSTS.path,
      ]),
    ).toBe("[Posts guide](/guides/google-posts-for-local-businesses)");
  });
  it("runs on her final text after the other two filters, as in the assistant", () => {
    const raw =
      "Try [the posts guide](/guides/google-posts-for-local-businesses), [an offer](https://evil.example/x) and [made up](/made-up).";
    expect(finalLinks(knownLinksOnly(raw), [], SITE)).toBe(
      "Try the posts guide, an offer and made up.",
    );
    expect(finalLinks(knownLinksOnly(raw), [POSTS], SITE)).toBe(
      "Try [the posts guide](/guides/google-posts-for-local-businesses), an offer and made up.",
    );
  });
  it("falls back to the sitemap's own pages when the website's list cannot be read", () => {
    expect([...FALLBACK_PATHS].sort()).toEqual(SITE.filter((p) => !p.startsWith("/for/")).sort());
    expect(finalLinks("See [pricing](/pricing) and [x](/nope).", [], [])).toBe(
      "See [pricing](/pricing) and x.",
    );
    expect(DOORS).toEqual(["/login", "/start"]);
  });
  it("reads the website's paths and drops anything malformed", () => {
    expect(parseSitePaths({ paths: ["/pricing", "javascript:alert(1)", 3, "/for/cafe"] })).toEqual([
      "/pricing",
      "/for/cafe",
    ]);
    expect(parseSitePaths(null)).toEqual([]);
  });
  it("the website serves the sitemap's paths beside the pages", () => {
    const route = readFileSync("src/routes/nora-pages[.]json.ts", "utf8");
    expect(route).toContain("SITEMAP_PAGES.map((p) => p.path)");
    expect(route).toContain("JSON.stringify({ pages, paths })");
  });
});

describe("Nora's help line", () => {
  it("gives the setup call and hello@kabsi.co when a visitor asks for help or for a page that is not listed", () => {
    const rules = noraRules(false, "");
    expect(rules).toMatch(
      /When the visitor asks for help, or asks for a guide or page that is not in the list/,
    );
    expect(rules).toMatch(/kabsi\.co\/setup-call and hello@kabsi\.co/);
  });
});
