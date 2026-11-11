// Home 2 (lane R R-158 item 4, 11 Nov 2026): the new Home. The hero says what Kabsi is, with one WhatsApp day in the
// Look 2 style; the four jobs; the problem in owner words; what Kabsi does and what you do; control; how it starts; your
// kind of business; the plans; five questions; the free check. Lines and sources: docs/site4/home.md.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOME2_H1, HOME2_HERO_LINE } from "@/components/kabsi/home2-hero-data";
import {
  HOME2_THREAD,
  HOME2_THREAD_CAPTION,
  HOME2_CONTROL,
  HOME2_JOBS,
  HOME2_DOES,
  HOME2_EXAMPLES,
  HOME2_FAQ,
  HOME2_PROBLEM,
  HOME2_START,
  HOME2_TRADES,
} from "@/components/kabsi/home2-data";
import { HOME_LINE } from "@/components/kabsi/hero-lines";
import { INDUSTRIES, industryIndexed } from "@/content/industries";
import { TRIAL_LINE } from "@/lib/site";

const read = (f: string) => readFileSync(f, "utf8");
const DASH_OR_BANG = /[–—!]/;
const words = (s: string) => s.trim().split(/\s+/).length;

/** Every line a reader sees on Home 2, flattened. */
const LINES: string[] = [
  HOME2_H1,
  HOME2_HERO_LINE,
  HOME2_THREAD_CAPTION,
  ...HOME2_JOBS.map((j) => j.title),
  ...HOME2_THREAD.flatMap((m) =>
    "owner" in m ? [m.text] : [m.title, m.business, m.status, ...m.facts.map((f) => f.text)],
  ),
  HOME2_PROBLEM.title,
  HOME2_PROBLEM.line,
  ...HOME2_PROBLEM.seen.flatMap((x) => [x.title, x.text]),
  ...HOME2_DOES.flatMap((j) => [j.title, j.kabsi, j.you, j.plan ?? "", j.note ?? ""]),
  JSON.stringify(HOME2_EXAMPLES),
  HOME2_CONTROL.title,
  HOME2_CONTROL.line,
  ...HOME2_CONTROL.points.flatMap((p) => [p.title, p.text]),
  ...HOME2_START.steps.flatMap((s) => [s.title, s.text]),
  HOME2_TRADES.title,
  HOME2_TRADES.line,
  ...HOME2_TRADES.chips.map((c) => c.label),
  ...HOME2_FAQ.flatMap((f) => [f.q, f.a]),
  HOME_LINE,
];
const ALL = LINES.join("\n");

describe("Home 2: the hero", () => {
  it("keeps lane R's H1 and a line under 35 words that says what Kabsi is", () => {
    expect(HOME2_H1).toBe("Your business on Google. Taken care of through WhatsApp.");
    expect(words(HOME2_HERO_LINE)).toBeLessThan(35);
    expect(HOME2_HERO_LINE).toMatch(/^Kabsi is an AI agent for your Google listing\./);
    expect(HOME2_HERO_LINE).toMatch(/Nothing goes live until you tap yes\.$/);
  });
  it("keeps the free check as the one action with TRIAL_LINE beside it", () => {
    const hero = read("src/components/kabsi/home2-hero.tsx");
    expect(hero).toContain('<ScanBox id="hero-scan" note={TRIAL_LINE} />');
    expect(hero.match(/<ScanBox /g)).toHaveLength(1);
    expect(TRIAL_LINE).toBe("Free for 14 days once Kabsi is connected. No card.");
    // The Example free check result left the hero: the thread is the one picture.
    expect(hero).not.toContain("ResultPreview");
  });
  it("shows one day on WhatsApp, labelled Example: a review, Closed Monday to hours, a photo to a post", () => {
    const kabsi = HOME2_THREAD.filter((m) => !("owner" in m));
    expect(kabsi.map((m) => ("marker" in m ? m.marker : ""))).toEqual(["review", "hours", "post"]);
    const owner = HOME2_THREAD.filter((m) => "owner" in m);
    expect(owner.map((m) => ("owner" in m ? m.text : ""))).toEqual([
      "Closed Monday",
      "New balayage colours this month. Open Saturdays.",
    ]);
    // The picture is drawn by the lower sections' code (kept from the server HTML on a first visit) inside the hero.
    expect(read("src/components/kabsi/d9-home-lower.tsx")).toMatch(
      /export function HeroThread[\s\S]*<ExampleBadge[\s\S]*HOME2_THREAD_CAPTION/,
    );
    expect(read("src/components/kabsi/home2-hero.tsx")).toMatch(/<HeroPicture \/>/);
    expect(HOME2_THREAD_CAPTION).toMatch(/^Example:/);
  });
  for (const m of HOME2_THREAD) {
    if ("owner" in m) continue;
    it(`${m.id}: Look 2, a title of five words or fewer, at most 3 buttons, Approve first`, () => {
      expect(words(m.title)).toBeLessThanOrEqual(5);
      expect(m.buttons?.length ?? 0).toBeLessThanOrEqual(3);
      expect(m.buttons?.[0]).toBe("Approve");
    });
  }
  it("names the four jobs under the hero, and How it works opens with the same four", () => {
    expect(HOME2_JOBS.map((j) => j.title)).toEqual([
      "Reviews answered",
      "Listing kept right",
      "Posts from your photos",
      "Found in AI answers",
    ]);
    expect(HOME2_DOES.map((j) => j.title)).toEqual(HOME2_JOBS.map((j) => j.title));
    expect(read("src/components/kabsi/how-page.tsx")).toContain("<HandlesGroups");
    // The strip is the first of the lower sections, right under the hero (its server HTML shows at once).
    const sections = read("src/components/kabsi/d9-home-lower.tsx");
    expect(sections.slice(sections.indexOf("export function D9HomeLowerSections"))).toMatch(
      /<>\s*<JobsStrip \/>\s*<Problem \/>/,
    );
    const lower = read("src/components/kabsi/d9-home-lower.tsx");
    const groups = lower.slice(lower.indexOf("export function HandlesGroups"));
    expect(groups.slice(0, groups.indexOf("\n}\n"))).toContain("HOME2_DOES.map(");
  });
});

describe("Home 2: what Kabsi does, and what you do", () => {
  it("gives every job a Kabsi line, one tap for the owner, and a small Example", () => {
    for (const j of HOME2_DOES) {
      expect(j.kabsi, j.id).toMatch(/^(Kabsi|Send a photo)/);
      expect(j.you, j.id).toMatch(/tap|Approve/i);
    }
    expect(read("src/components/kabsi/d9-home-lower.tsx")).toMatch(
      /function WhatKabsiDoes[\s\S]*<ExampleBadge \/>[\s\S]*<JobExample id=\{j\.id\} \/>/,
    );
  });
  it("names the plan amounts of the facts (02, 01: plan_limits)", () => {
    const facts = read("knowledge/facts/02-facts-that-change.md");
    const ai = HOME2_DOES.find((j) => j.id === "ai")!;
    expect(ai.plan).toBe("3 questions a month on Essentials, 10 every 2 weeks on Pro.");
    expect(facts).toContain(
      "3 questions every month on Essentials and 10 questions every 2 weeks on Pro",
    );
    expect(HOME2_DOES.find((j) => j.id === "posts")!.plan).toBe(
      "2 posts a month on Essentials, every week on Pro.",
    );
  });
  it("is honest about AI answers and reviews: no promise of a recommendation, no reward, nothing hidden", () => {
    expect(HOME2_DOES.find((j) => j.id === "ai")!.note).toBe(
      "No one can promise an AI assistant will recommend you.",
    );
    expect(HOME2_DOES.find((j) => j.id === "reviews")!.note).toBe(
      "Kabsi never offers anything for a review and never hides one.",
    );
    expect(HOME2_FAQ.at(-1)!.a).toMatch(/^No one can promise that\./);
  });
});

describe("Home 2: the copy rules", () => {
  it("says AI agent only in the hero line and in You stay in control, and never agentic", () => {
    const found = LINES.filter((l) => /\bAI agent\b/.test(l));
    expect(found).toEqual([HOME2_HERO_LINE, HOME2_CONTROL.line]);
    const files = [
      "src/components/kabsi/home2-hero.tsx",
      "src/components/kabsi/d9-home.tsx",
      "src/components/kabsi/d9-home-lower.tsx",
      "src/components/kabsi/home2-hero-data.ts",
      "src/components/kabsi/home2-data.ts",
      "src/routes/index.tsx",
    ];
    for (const f of files) expect(read(f), f).not.toMatch(/agentic/i);
  });
  it("has no dash, exclamation mark, Arabic, statistic or banned claim", () => {
    for (const l of LINES) expect(l).not.toMatch(DASH_OR_BANG);
    expect(ALL).not.toMatch(/[؀-ۿ]/);
    expect(ALL).not.toMatch(/\d+ ?(%|percent)/);
    expect(ALL).not.toMatch(
      /\b(rank|ranking|more customers|more reviews|guarantee|revenue|request book|agency|Profile Score|Listing Shield)\b/i,
    );
  });
  it("shows no logo of Google, ChatGPT or Perplexity", () => {
    const code = ["home2-hero.tsx", "d9-home-lower.tsx", "look2.tsx"]
      .map((f) => read(join("src/components/kabsi", f)))
      .join("\n");
    expect(code).not.toMatch(
      /si(Google|Openai|Perplexity)|google-logo|chatgpt\.svg|perplexity\.svg/i,
    );
    expect(readdirSync("public").join(" ")).not.toMatch(/chatgpt|perplexity/i);
  });
  // Voice 2 (11 Nov 2026, R-158 item 3): voice notes are on from today, so facts 01 no longer says "not on". Home 2 still leaves them
  // out of its own line; adding them is a Home decision (docs/LATER.md, the Home 2 row).
  it("keeps voice notes out of the trades line, and facts 01 says they are on (Voice 2)", () => {
    expect(HOME2_TRADES.line).not.toMatch(/voice/i);
    expect(read("knowledge/facts/01-decisions-coming-and-changing.md")).toMatch(
      /Ask Kabsi with voice notes \(on for every business from 11 Nov 2026/,
    );
  });
});

describe("Home 2: your kind of business, the plans, the questions", () => {
  it("links each trade chip to an indexed industry page", () => {
    for (const c of HOME2_TRADES.chips) {
      const i = INDUSTRIES.find((x) => x.slug === c.slug);
      expect(i, c.slug).toBeDefined();
      expect(industryIndexed(i!), c.slug).toBe(true);
    }
  });
  it("shows the launch price with the real count of places left", () => {
    const lower = read("src/components/kabsi/d9-home-lower.tsx");
    const preview = lower.slice(lower.indexOf("export function PricingPreview"));
    expect(preview).toContain("useFoundingLeft()");
    expect(preview).toContain("{foundingPlacesLine(left)}");
    expect(preview).toContain("left !== null && left > 0 &&");
  });
  it("asks the five questions lane R set", () => {
    expect(HOME2_FAQ.map((f) => f.q)).toEqual([
      "Do I need to be good with technology?",
      "Will Kabsi post anything without asking me?",
      "What is a Manager on Google, and can I remove Kabsi?",
      "Does it work in my country?",
      "Will Kabsi make ChatGPT recommend me?",
    ]);
  });
  it("has the final copy with sources in docs/site4/home.md", () => {
    const doc = read("docs/site4/home.md");
    for (const l of [HOME2_H1, HOME2_HERO_LINE, HOME_LINE, ...HOME2_FAQ.map((f) => f.a)])
      expect(doc).toContain(l);
    for (const j of HOME2_DOES) expect(doc).toContain(j.kabsi);
  });
});
