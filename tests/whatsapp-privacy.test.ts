import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readText } from "./helpers/facts";

// P0.6-12: the WhatsApp privacy text on /privacy and /terms, Nora's facts and the public llms file say the same
// thing (K-122, K-104). Nothing here calls an AI model: Nora's source is the facts file, published as
// public/llms-full.txt, and these checks read it directly.
const privacy = readFileSync("src/routes/privacy.tsx", "utf8");
const terms = readFileSync("src/routes/terms.tsx", "utf8");
const facts = readText("knowledge/kabsi-facts.md");
const llms = readText("public/llms-full.txt");

const between = (text: string, from: string, to: string) => {
  const a = text.indexOf(from);
  const b = text.indexOf(to, a);
  expect(a, `${from} not found`).toBeGreaterThan(-1);
  expect(b, `${to} not found`).toBeGreaterThan(a);
  return text.slice(a, b).replace(/\s+/g, " ");
};
const privacySection = between(privacy, "<h2>14. WhatsApp</h2>", "<h2>15. Changes</h2>");
const termsSection = between(terms, "<h2>16. WhatsApp</h2>", "<h2>17. Kabsi Partners</h2>");
const processors = between(privacy, "<h2>6. Who helps us (processors)</h2>", "<h2>7. ");
const factsBlock = between(facts, "### 9.5b WhatsApp: privacy", "### 9.6 Cookies");

describe("WhatsApp processors and privacy text (P0.6-12)", () => {
  it("/privacy names Kapso and Meta in the processors list and has a WhatsApp section", () => {
    expect(processors).toMatch(/Kapso/);
    expect(processors).toMatch(/Meta/);
    expect(privacySection).toMatch(/Kapso/);
    expect(privacySection).toMatch(/Meta/);
  });

  it("/terms names Kapso and Meta and points to the privacy section", () => {
    expect(termsSection).toMatch(/Kapso/);
    expect(termsSection).toMatch(/Meta/);
    expect(termsSection).toMatch(/section 14/);
  });

  it("says what is sent, how long it is kept, that nothing is approved and that alerts are not live", () => {
    for (const text of [privacySection, termsSection, factsBlock]) {
      expect(text).toMatch(/approved/i);
      expect(text).toMatch(/Google password/);
      expect(text).toMatch(/kabsi\.co/);
      expect(text).toMatch(/not available yet|Not available yet|Not live yet/);
      expect(text).toMatch(/STOP/);
      expect(text).toMatch(/opt in|opts in/);
    }
    for (const text of [privacySection, factsBlock]) {
      expect(text).toMatch(/phone number/);
      expect(text).toMatch(/no automatic deletion date/i);
      expect(text).toMatch(/review text/);
    }
  });

  it("never claims Google approves, endorses, sponsors or partners with Kabsi (K-112)", () => {
    for (const text of [privacySection, termsSection, factsBlock]) {
      expect(text).not.toMatch(/approved by Google|Google partner|endorsed by Google/i);
    }
  });

  it("uses no em dashes, en dashes or exclamation marks in the new text", () => {
    for (const text of [privacySection, termsSection, factsBlock, processors]) {
      expect(text).not.toMatch(/[—–]/);
    }
    for (const text of [factsBlock]) expect(text).not.toMatch(/!/);
    // JSX text only: strip tags and expressions before looking for "!".
    for (const text of [privacySection, termsSection]) {
      expect(text.replace(/<[^>]*>|\{[^}]*\}/g, "")).not.toMatch(/!/);
    }
  });

  it("keeps the facts file and the published llms-full file equal (run node scripts/build-kb.mjs)", () => {
    expect(llms.endsWith(facts.trim() + "\n")).toBe(true);
  });
});

// Offline stand-in for the Nora test question: the assistant answers only from the file it fetches
// (public/llms-full.txt), so the answers must be found in it. A plain word-overlap search over its lines
// must put the answer in the top results.
const stop = new Set(
  "the a an is are do does did can i my me you your to of on in for and or it that this with how what who will be at by".split(
    " ",
  ),
);
const words = (s: string) =>
  s
    .toLowerCase()
    .match(/[a-z0-9+]+/g)
    ?.filter((w) => !stop.has(w)) ?? [];
function top(question: string, n = 5) {
  const q = new Set(words(question));
  return llms
    .split("\n")
    .filter((l) => l.trim())
    .map((line) => {
      const w = words(line);
      return { line, score: w.filter((x) => q.has(x)).length / Math.sqrt(w.length + 20) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((r) => r.line)
    .join("\n");
}

describe("Nora's source answers WhatsApp questions without calling an AI model", () => {
  const cases: [string, RegExp[]][] = [
    [
      "Who answers my WhatsApp messages, a person or a bot?",
      [/person at Kabsi|A person answers/, /not an automatic bot/],
    ],
    [
      "Do you ask for my Google password or a code on WhatsApp?",
      [
        /never asks for a Google password or a code Google sends, on WhatsApp|password or code on WhatsApp\?" Never/i,
      ],
    ],
    [
      "Can I approve a reply or a post on WhatsApp?",
      [/approved, published or changed over WhatsApp|approve on kabsi\.co/],
    ],
    ["Who are the processors of my WhatsApp messages, Kapso and Meta?", [/Kapso/, /Meta/]],
    ["How long do you keep my WhatsApp chat?", [/no automatic deletion date/i]],
    [
      "Will Kabsi send me alerts on WhatsApp? How do I stop them, STOP?",
      [/not available yet/i, /STOP/],
    ],
  ];
  for (const [question, patterns] of cases) {
    it(question, () => {
      const found = top(question);
      for (const p of patterns) expect(found).toMatch(p);
    });
  }
});
