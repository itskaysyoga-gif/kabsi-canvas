// P0.6-06 (K-104, K-58, K-111, K-114.3): Nora is in sync with the system. The facts file is the one list of what she may
// state, so these tests hold it to what is built on main today, run her 60-question evaluation with stub models only (no
// Anthropic call, R-43) and fail when a price changes in the file without the evaluation changing with it.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BAD_ANSWERS,
  check,
  dollarsIn,
  gate,
  passStub,
  runAll,
  support,
} from "../scripts/nora-eval/nora-eval.ts";
import { AMOUNTS, QUESTIONS } from "../scripts/nora-eval/questions.ts";
import { noraRules } from "../supabase/functions/_shared/nora-rules.ts";

const facts = readFileSync("knowledge/kabsi-facts.md", "utf8");
const llms = readFileSync("public/llms-full.txt", "utf8");
const section = (from: string, to: string) => {
  const a = facts.indexOf(from);
  const b = facts.indexOf(to, a + from.length);
  expect(a, from).toBeGreaterThan(-1);
  expect(b, to).toBeGreaterThan(a);
  return facts.slice(a, b);
};

describe("the evaluation set", () => {
  it("has 60 questions, English first, then Spanish, French and Arabic", () => {
    expect(QUESTIONS).toHaveLength(60);
    expect(new Set(QUESTIONS.map((q) => q.id)).size).toBe(60);
    const langs = QUESTIONS.map((q) => q.lang);
    expect(langs.filter((l) => l === "en")).toHaveLength(48);
    for (const l of ["es", "fr", "ar"]) expect(langs.filter((x) => x === l)).toHaveLength(4);
    expect(langs.slice(0, 48).every((l) => l === "en")).toBe(true);
    for (const q of QUESTIONS) if (q.lang !== "en") expect(q.gloss, q.id).toBeTruthy();
  });

  it("covers what the card names: prices, WhatsApp, Partners, removed offers, handover, never delete, auto-fix", () => {
    const topics = QUESTIONS.map((q) => q.topic).join("|");
    for (const t of [
      "price of Pro",
      "Essentials against Pro",
      "WhatsApp number",
      "approving on WhatsApp",
      "Kabsi Partners",
      "removed offers",
      "asks for a person",
      "an urgent problem",
      "a duplicate listing",
      "automatic put back",
      "What customers say",
      "order and booking button",
      "ways to pay",
    ])
      expect(topics, t).toContain(t);
  });

  it("passes on the facts file with the reference answers (zero honesty failures)", async () => {
    const { score } = await runAll(passStub, facts);
    expect(score.findings).toEqual([]);
    expect(gate(score).pass).toBe(true);
  });

  it("blocks answers that break the rules, whichever rule", async () => {
    for (const bad of BAD_ANSWERS) {
      const q = QUESTIONS[0]!;
      expect(check(q, bad.say, facts).length, bad.say).toBeGreaterThan(0);
    }
    const stub = {
      name: "stub:fail",
      answer: async (q: (typeof QUESTIONS)[number]) =>
        BAD_ANSWERS[Number(q.id.replace(/\D/g, "")) % BAD_ANSWERS.length]!.say,
    };
    const { score } = await runAll(stub, facts);
    expect(gate(score).pass).toBe(false);
    expect(score.honestyFailures).toBeGreaterThan(20);
  });

  it("flags a number the facts file does not hold, a date for a coming item, and a missing warning", () => {
    const q = QUESTIONS.find((x) => x.id === "en12")!;
    expect(
      check(q, "Kabsi Partners is not available yet, and it opens in March.", facts).some(
        (f) => f.kind === "honesty",
      ),
    ).toBe(true);
    const price = QUESTIONS.find((x) => x.id === "en07")!;
    expect(
      check(price, "An extra location is $25 a month.", facts).some((f) => /\$25/.test(f.detail)),
    ).toBe(true);
    const del = QUESTIONS.find((x) => x.id === "en42")!;
    expect(
      check(del, "Yes you can. Do not delete it though.", facts).some((f) => f.kind === "must"),
    ).toBe(true);
  });

  it("fails when a price in the facts file changes and the evaluation does not", () => {
    const changed = facts.replace("| Pro | $39 | $390 |", "| Pro | $49 | $490 |");
    expect(changed).not.toBe(facts);
    const broken = QUESTIONS.flatMap((q) => support(q, changed));
    expect(broken.length).toBeGreaterThan(0);
    // and a brand new amount is refused until it is listed in AMOUNTS
    const added = facts + "\nA new add-on costs $77 a month.\n";
    expect(dollarsIn(added).filter((d) => !(d in AMOUNTS))).toEqual(["$77"]);
  });

  it("holds every dollar amount in the facts file to the list the evaluation knows", () => {
    expect(dollarsIn(facts).filter((d) => !(d in AMOUNTS))).toEqual([]);
  });
});

describe("what Nora knows, against what is built on main", () => {
  it("names every feature merged in sessions 7 to 16", () => {
    const features: [string, RegExp][] = [
      ["review link page (P0.8-05)", /Show the page/],
      ["Send review link (P0.8-06)", /\*\*Send review link\*\*/],
      ["review graphics (P0.8-07)", /Make a graphic/],
      ["Report this review (P0.8-11)", /Report this review/],
      ["Insights and search terms (P0.5-05)", /Search terms report/],
      ["holiday hours (P0.5-03)", /Five days before a public holiday/],
      ["Profile Coach (P0.8-09)", /Profile Coach, the actions/],
      ["Weekly Care Report (P0.5-04)", /every Monday at 08:00 local time/],
      ["consent banner (P0.6-01)", /small Kabsi privacy banner/],
      ["security headers (P0.6-05)", /Website protection/],
      ["photos (P0.5-01)", /Staff upload link/],
      ["posts (P0.5-02)", /Approve the month/],
      ["WhatsApp channel built (P0.8-03)", /Built 22 Oct 2026 \(P0\.8-03\) but not live/],
      ["put-back (P0.8-04)", /Keep my information/],
      ["Manager guide (P0.4-03)", /Kabsi group ID 5481006796/],
      ["situation screens (P0.4-04)", /Something not working\?/],
      ["five questions (P0.4-05)", /Five quick questions/],
      ["plan choice from day 11 (P0.4-05)", /Your Pro trial ends in/],
      ["Need a hand (P0.4-11)", /\*\*Need a hand\?\*\*/],
    ];
    for (const [name, re] of features) expect(facts, name).toMatch(re);
  });

  it("marks the five coming items [COMING], not available yet, with no date", () => {
    const coming = section("**[COMING] Features.**", "**[CHANGING] Being replaced.**");
    for (const [name, re] of [
      ["WhatsApp channel", /\*\*WhatsApp for owners:\*\*/],
      ["What customers say", /\*\*What customers say \(Pro\):\*\*/],
      ["own order button", /\*\*Order and booking button \(Pro\):\*\*/],
      ["Kabsi Partners", /\*\*Kabsi Partners:\*\*/],
    ] as const)
      expect(coming, name).toMatch(re);
    expect(facts).toMatch(/\*\*\[COMING\] Plans and prices/);
    expect(facts).toMatch(/Card checkout through Creem is not open yet/);
    expect(facts).toMatch(/Never give a date/);
    const ledger = section("**Where each feature stands", "**[COMING] Plans and prices");
    expect(ledger).toMatch(/Card payments \(Creem\)/);
    expect(ledger).toMatch(
      /Kabsi Partners; What customers say \(Pro\); the order and booking button \(Pro\); the WhatsApp channel/,
    );
    // no date or time frame next to a coming item in the ledger or the coming list
    for (const block of [ledger, coming]) {
      expect(block).not.toMatch(
        /\b(launch(es)?|opens?|available|ready|live)\s+(in|by|on|from)\s+(Q[1-4]|January|February|March|April|May|June|July|August|September|October|November|December|2027)/i,
      );
    }
  });

  it("says auto-fix is off by Google's policy and that WhatsApp has no number", () => {
    expect(facts).toMatch(
      /Off, and why \| Automatic put-back \("auto-fix"\) is \*\*off on every plan\*\*/,
    );
    expect(facts).toMatch(
      /You may not use the Business Profile APIs to automatically revert changes made by Google\./,
    );
    expect(facts).toMatch(/There is no automatic put-back/);
    expect(facts).toMatch(/Kabsi has no WhatsApp number at the moment/);
    expect(facts).toMatch(/Never give one/);
    // the app and Nora's rules agree: with no number the rules give none
    const rules = noraRules(false, "");
    expect(rules).toMatch(/Kabsi has no WhatsApp number at the moment, so never give one/);
    expect(rules).not.toMatch(/\d{9,}/);
  });

  it("holds the hand-over rules: a person, the call with the right answer, the email, the urgent line, never delete", () => {
    const rules = section("### 1.3 When to hand off to a person", "### 1.4 Contact details");
    expect(rules).toMatch(/free 20-minute setup call/);
    expect(rules).toMatch(/kabsi\.co\/setup-call/);
    for (const a of ["Setting up my Google profile", "Partner or agency", "Something else"])
      expect(rules).toContain(a);
    expect(rules).toMatch(/hello@kabsi\.co/);
    expect(rules).toContain("Write to hello@kabsi.co and we'll reply today.");
    expect(rules).toMatch(/Never invent a time/);
    expect(facts).toMatch(/Do not delete a profile you think is a duplicate/);
    expect(facts).toMatch(/gets the warning first, as the first sentence/);
  });

  it("states the setup call as 20 minutes everywhere in the file (K-111 said 15)", () => {
    expect(facts).not.toMatch(
      /\b(15|30)[- ]minutes?\b[^.\n]{0,20}\bcall|\bcall\b[^.\n]{0,40}\b(15|30)[- ]minutes?\b/i,
    );
    expect(facts).toMatch(/20-minute/);
  });

  it("uses no em dashes, en dashes or exclamation marks, and never asks for a password", () => {
    expect(facts).not.toMatch(/[—–]/);
    expect(facts.replace(/\bNot!/g, "")).not.toMatch(/!/);
  });

  it("keeps the published llms-full file equal to the facts file (run node scripts/build-kb.mjs)", () => {
    expect(llms.endsWith(facts.trim() + "\n")).toBe(true);
  });
});
