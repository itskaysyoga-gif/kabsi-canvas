import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { TRIAL_LINE as OFFER_TRIAL_LINE } from "../src/lib/offer";
import { describe, expect, it } from "vitest";
import { FOUNDING_LINE } from "../src/lib/offer";
import {
  FOUNDING_SENTENCE,
  ONE_PLAN,
  PLAN_PRICE_ROWS,
  PRICES_SENTENCE,
  foundingLine,
} from "../src/lib/site";
import { readerLines } from "./helpers/house-rules";
import { readText } from "./helpers/facts";

// PILOT-READY (R-165): one plan called Kabsi, 29 US dollars a month per location, an extra location 29, a 14 day trial that
// starts with a card (TRIAL_LINE in src/lib/offer.ts), and a private founding price of 19 for the first 12 months.
describe("the one plan", () => {
  it("is 29 a month per location, the extra location is 29 and the founding price is 19", () => {
    expect(ONE_PLAN).toEqual({
      name: "Kabsi",
      monthly: 29,
      extraLocationMonthly: 29,
      founding: 19,
    });
    expect(ONE_PLAN.extraLocationMonthly).toBe(ONE_PLAN.monthly);
  });
  it("reads the same in the sentence, the Plan page rows and the founding line", () => {
    expect(PRICES_SENTENCE).toBe(
      "Kabsi is $29 a month per location. An extra location is $29 a month. Prices are in US dollars, plus tax where it applies.",
    );
    expect(FOUNDING_SENTENCE).toBe(FOUNDING_LINE);
    expect(foundingLine()).toBe(FOUNDING_LINE);
    expect(PLAN_PRICE_ROWS.map((r) => `${r.name}: ${r.price}`)).toEqual([
      "Kabsi: $29 a month per location",
      "Extra location: $29 a month",
    ]);
  });
});

function files(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p, ext);
    return ext.test(name) && name !== "routeTree.gen.ts" && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

/** Every file a visitor, an owner or Nora can read a price in. */
const READABLE = [
  ...files("src", /\.(ts|tsx)$/),
  ...files("supabase/functions/_shared/email", /\.ts$/),
  ...files("docs/email-previews", /\.(txt|html)$/),
  "knowledge/kabsi-facts.md",
  "src/content/llms-base.txt",
  "public/llms-full.txt",
];

// A price that means something else, and where it is allowed.
const OTHER_AMOUNTS: Record<string, string[]> = {
  $35: ["src/components/app/knowledge-form.tsx"], // an example price in a help text
  $50: ["knowledge/kabsi-facts.md", "public/llms-full.txt", "src/content/llms-base.txt"], // the old partner payout minimum, named as changed
  $25: [
    "knowledge/kabsi-facts.md",
    "public/llms-full.txt",
    "src/content/llms-base.txt",
    "src/components/kabsi/faq-data.ts",
    "src/routes/partners_.terms.tsx",
  ], // the partner payout minimum (30.15 section 5)
  $0: ["knowledge/kabsi-facts.md", "public/llms-full.txt"],
  $15: ["src/components/kabsi/faq-data.ts"], // SITE-4 rewrites the FAQ price lines (PILOT-READY left them to it, see LATER)
  $150: ["src/components/kabsi/faq-data.ts"],
};

describe("no retired price (lane R, 22 Oct 2026)", () => {
  it("nothing calls $19 a month or $190 a year the Pro price", () => {
    for (const f of READABLE) {
      const text = readText(f);
      expect(text, `${f}: Pro at the retired price`).not.toMatch(
        /\bPro\b[^.\n|]{0,40}\$(19|190)\b/,
      );
      expect(text, `${f}: the earlier single price`).not.toMatch(
        /earlier Pro price|\$19 Pro price|Pro \| \$19|Pro, monthly \| \$19/,
      );
    }
  });
  it("every dollar amount a reader can see is one of the list or founding prices", () => {
    const allowed = new Set(
      [ONE_PLAN.monthly, ONE_PLAN.extraLocationMonthly, ONE_PLAN.founding].map((n) => `$${n}`),
    );
    for (const f of READABLE.filter((p) => !/kabsi-facts|llms-full/.test(p))) {
      const text = readText(f).replace(/\$\{[^}]*\}/g, "");
      for (const m of text.matchAll(/\$(\d{2,}[\d,]*)/g)) {
        const amount = `$${m[1]}`;
        if (allowed.has(amount)) continue;
        expect(OTHER_AMOUNTS[amount] ?? [], `${f} shows ${amount}`).toContain(f);
      }
    }
  });
  it("never calls 19 or 39 the list price (Price 1): those amounts appear only as the founding price", () => {
    for (const f of READABLE) {
      const text = readText(f);
      expect(text, `${f}: an old list price`).not.toMatch(
        /(Essentials|Pro) (is|at|costs) \$?(19|39|190|390)\b|Essentials is (19|39) US dollars|Pro is (19|39) US dollars/,
      );
    }
  });
  // SITE-1 (blueprint 3.1, R-163): one plan at 29 US dollars a month per location, the trial line of src/lib/offer.ts,
  // and none of the retired prices quoted as current.
  it("the facts file and llms-full.txt quote the one plan, its trial line and no retired price", () => {
    for (const f of ["knowledge/kabsi-facts.md", "public/llms-full.txt"]) {
      const text = readText(f);
      expect(text).toContain("29 US dollars a month per location");
      expect(text).toContain(OFFER_TRIAL_LINE);
      expect(text).not.toContain("Essentials is $29 a month or $290 a year");
      expect(text).not.toContain("Pro is $59 a month or $590 a year");
      expect(text).not.toContain("An extra location is $15 a month or $150 a year");
      // The no-card trial is named only on lines that say it was replaced.
      for (const line of text.split("\n").filter((l) => /trial,? (with )?no card/i.test(l)))
        expect(line, line.slice(0, 80)).toMatch(
          /retired|RETIRED|replaces?d?|switched off|never quote|no longer/i,
        );
    }
  });
});

// PILOT-READY (R-165): what a person can read on the surfaces this task owns says one plan. SITE-4 widens this list to the
// public pages and components it rewrites (LATER).
describe("one plan on the owner's own surfaces", () => {
  const PILOT = [
    ...files("supabase/functions/_shared/email", /\.ts$/),
    ...files("supabase/functions/_shared/whatsapp", /\.ts$/),
    "supabase/functions/_shared/billing-lines.ts",
    "supabase/functions/_shared/billing-words.ts",
    "supabase/functions/_shared/programs.ts",
    "src/lib/site.ts",
    "src/routes/terms.tsx",
  ].filter((f) => !/test-helpers|replay/.test(f));
  const RETIRED_WORDS =
    /\bEssentials\b|\bPro\b|\bno card\b|\bNo card\b|Start free|\b15 days\b|\b15-day\b|\$15\b|15 US dollars/;
  it("no Essentials, Pro, no card, 15 days or 15 dollars in a line a reader sees", () => {
    const found: string[] = [];
    for (const f of PILOT)
      for (const line of readerLines(readText(f)))
        if (RETIRED_WORDS.test(line)) found.push(`${f}: ${line.slice(0, 100)}`);
    expect(found).toEqual([]);
  });
  it("the WhatsApp prices answer and the trial lines carry TRIAL_LINE", () => {
    const say = readText("supabase/functions/_shared/whatsapp/say.ts");
    expect(say).toContain("TRIAL_LINE");
    expect(readText("supabase/functions/_shared/offer.ts")).toContain(OFFER_TRIAL_LINE);
  });
});
