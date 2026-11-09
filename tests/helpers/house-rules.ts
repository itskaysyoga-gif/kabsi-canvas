// One list of the house rules that every surface in docs/SYNC.md answers to (Sync 1 part B, master plan 30.45 item 6).
// The per-surface tests (website-home, plan-choice, the email catalog, the WhatsApp conversations) keep their own checks
// of their own screens; this file is the shared list that tests/sync-guards.test.ts runs over all of them at once, and
// the two vitest files that already had the same lists now import them from here.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { FOUNDING_PRICES, FOUNDING_TOTAL, PLAN_PRICES } from "../../src/lib/site";
import { FOUNDING25_TOTAL } from "../../src/components/kabsi/founding-total";
import { readText } from "./facts";

// ─── the never-say lists (CLAUDE.md, kabsi-copy)

/** Names that never appear on a surface a reader sees (K-02 and the retired lines of master plan 30.15 to 30.18). */
export const RETIRED_NAMES =
  /Profile Score|Do now|Listing Shield|Put mine back|Profile Care|Monday Report|Weekly Care Report|Review Link and Card/;
/** The four names CLAUDE.md lists first. The legal pages and the facts may name the older retired ones to say they are gone. */
export const NEVER_NAMES = /Profile Score|Do now|Listing Shield|Put mine back/;
/** Promises and claims no surface may make (plan 2.11, K-53, the claims rule). */
export const NEVER_CLAIMS =
  /\b(autopilot|automatically|guaranteed?|approved by google|partner of google|google partner|google-approved|more customers|set and forget|fully automatic|we manage everything|we remove bad reviews|no work needed)\b/i;
/** A line that says a name or claim is gone, refused or never made may name it. */
export const SAYS_NOT =
  /\b(never|not|nothing|then called|no guide|no longer|retired|replaces?d?|removed|changed|instead of|without|cannot|can't|don't|doesn't|does not|nobody|no one|banned|forbidden|refuse[sd]?)\b|n['’]t\b/i;

/** The house style: no em dash, no en dash. */
export const DASHES = /[–—]/;
/** An exclamation mark that ends a word or sentence in text (not code, not a URL, not "!=" or "!important"). */
export const BANG = /[A-Za-z0-9.)'"?]!(?=\s|$)/;

// ─── the numbers (read from the constants, never typed here)

const set = (...n: number[]) => new Set(n);
const EXTRA = set(PLAN_PRICES.extraLocationMonthly, PLAN_PRICES.extraLocationYearly);
const ESSENTIALS = set(
  PLAN_PRICES.essentialsMonthly,
  PLAN_PRICES.essentialsYearly,
  FOUNDING_PRICES.essentialsMonthly,
  FOUNDING_PRICES.essentialsYearly,
);
const PRO = set(
  PLAN_PRICES.proMonthly,
  PLAN_PRICES.proYearly,
  FOUNDING_PRICES.proMonthly,
  FOUNDING_PRICES.proYearly,
);
const MONTHLY = set(
  PLAN_PRICES.essentialsMonthly,
  PLAN_PRICES.proMonthly,
  PLAN_PRICES.extraLocationMonthly,
  FOUNDING_PRICES.essentialsMonthly,
  FOUNDING_PRICES.proMonthly,
);
const YEARLY = set(
  PLAN_PRICES.essentialsYearly,
  PLAN_PRICES.proYearly,
  PLAN_PRICES.extraLocationYearly,
  FOUNDING_PRICES.essentialsYearly,
  FOUNDING_PRICES.proYearly,
);
export const ALL_PLAN_AMOUNTS = new Set([...ESSENTIALS, ...PRO, ...EXTRA]);

/** A sentence about money that is not the price of a plan: a partner payout, an agency's fee, a credit. */
const NOT_A_PLAN_PRICE =
  /\b(partners?|payouts?|earn(s|ed|ing)?|commission|referr\w*|agency|agencies|cleared|minimum|credit|dollars? of|lebanon bundle)\b/i;
/** A sentence that names an old price to say it is gone. */
const OLD_PRICE =
  /\b(retired|earlier|used to|was|were|changed from|becomes|replaces?d?|instead of|removed|no longer)\b/i;

const AMOUNT = /\$(\d[\d,]*(?:\.\d+)?)(?![\d{])|(\d[\d,]*(?:\.\d+)?) US dollars/g;
const PERIOD_AFTER =
  /^[^.;|\n]{0,14}?(a month|per month|\/month|monthly|a year|per year|\/year|yearly)/i;

/** The sentences of a text: cut at full stops, table cells and line breaks. `${...}` parts are dropped, they carry no digits. */
export function sentencesOf(text: string): string[] {
  return text
    .replace(/\$\{[^}]*\}/g, "")
    .split(/(?<=[.?:;])\s+|\n+|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * The price problems in a text: an amount tied to a Kabsi plan that is not one of that plan's list or founding amounts, or
 * an amount with the wrong period ("$290 a month"). A sentence about partner payouts or an old price that is named to say
 * it is gone is not a statement of a plan price.
 */
export function priceProblems(text: string): string[] {
  const out: string[] = [];
  for (const s of sentencesOf(text)) {
    if (NOT_A_PLAN_PRICE.test(s) || OLD_PRICE.test(s)) continue;
    const essentials = /\bEssentials\b/.test(s);
    const pro = /\bPro\b/.test(s);
    const extra = /\bextra location/i.test(s);
    const plan = /\b(founding price|list price|plan prices?)\b/i.test(s);
    for (const m of s.matchAll(AMOUNT)) {
      const n = Number((m[1] ?? m[2]).replace(/,/g, ""));
      if (n === 0) continue; // "Tax $0.00" and "nothing to pay" are not a price
      const after = s.slice((m.index ?? 0) + m[0].length);
      const period = PERIOD_AFTER.exec(after)?.[1]?.toLowerCase();
      const monthly = period ? /month/.test(period) : null;
      let allowed: Set<number> | null = null;
      if (essentials || pro || extra) {
        allowed = new Set([
          ...(essentials ? ESSENTIALS : []),
          ...(pro ? PRO : []),
          ...(extra ? EXTRA : []),
        ]);
      } else if (plan || period) {
        // A price with a period and no plan word still has to be one of Kabsi's.
        allowed = ALL_PLAN_AMOUNTS;
      }
      if (!allowed) continue;
      if (!allowed.has(n)) out.push(`${m[0]} in: ${s.slice(0, 120)}`);
      else if (monthly === true && !MONTHLY.has(n))
        out.push(`${m[0]} is not a monthly amount in: ${s.slice(0, 120)}`);
      else if (monthly === false && !YEARLY.has(n))
        out.push(`${m[0]} is not a yearly amount in: ${s.slice(0, 120)}`);
    }
  }
  return out;
}

/**
 * The founding place counts. "The first 30 paying businesses" and "x of 30 founding places" are the founding price
 * (FOUNDING_TOTAL in src/lib/site.ts); "Founding 25", "25 places left" and "taking 25 founding businesses" are the
 * applications (FOUNDING25_TOTAL in src/components/kabsi/founding-total.ts).
 */
export function placeCountProblems(text: string): string[] {
  const out: string[] = [];
  const check = (re: RegExp, want: number, label: string) => {
    for (const m of text.matchAll(re)) {
      if (Number(m[1]) !== want) out.push(`${m[0]} (${label} is ${want})`);
    }
  };
  check(/first (\d+) paying businesses/gi, FOUNDING_TOTAL, "FOUNDING_TOTAL");
  check(/(\d+) founding places/gi, FOUNDING_TOTAL, "FOUNDING_TOTAL");
  check(/\bFounding (\d+)\b/g, FOUNDING25_TOTAL, "FOUNDING25_TOTAL");
  check(/taking (\d+) founding businesses/gi, FOUNDING25_TOTAL, "FOUNDING25_TOTAL");
  check(
    /(?<!founding )\b(\d+) places (?:are taken|left)\b/gi,
    FOUNDING25_TOTAL,
    "FOUNDING25_TOTAL",
  );
  return out;
}

// ─── the lines a reader can see

/** The words of a code file a reader can see: string literals and JSX text that read as words, comments left out. */
export function readerLines(code: string): string[] {
  const out: string[] = [];
  const clean = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const m of clean.matchAll(/"([^"\n]+)"/g)) out.push(m[1]!);
  for (const m of clean.matchAll(/'([^'\n]+)'/g)) out.push(m[1]!);
  for (const m of clean.matchAll(/`([^`]+)`/g)) out.push(m[1]!.replace(/\$\{[^}]*\}/g, " "));
  for (const m of clean.matchAll(/>([^<>{}]+)</g)) out.push(m[1]!.trim());
  // Class names, code and regular expressions are not reader lines.
  return out.filter(
    (s) =>
      / /.test(s) &&
      /[A-Za-z]/.test(s) &&
      !/^[a-z0-9:[\]()_./%#-]+( [a-z0-9:[\]()_./%#&>-]+)*$/.test(s) &&
      !/=>|\(\)|\bconst\b|\breturn\b|&&|\|\||className|data:|https?:|\(\?|\\[sdwbS]|\[\^|!inner|\bselect\b.*\bfrom\b/.test(
        s,
      ),
  );
}

/** The text of an HTML email: scripts, styles and tags out, entities for the marks we check read back. */
export function htmlText(html: string): string {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&mdash;|&#8212;|&#x2014;/gi, "—")
    .replace(/&ndash;|&#8211;|&#x2013;/gi, "–")
    .replace(/&#33;|&excl;/g, "!")
    .replace(/&nbsp;|&amp;|&#39;|&quot;/g, " ")
    .replace(/[ \t]+/g, " ");
}

// ─── the surfaces (docs/SYNC.md)

export type Surface = {
  /** The row of docs/SYNC.md it belongs to. */
  name: string;
  files: string[];
  /** Prose is read as text (markdown, text, rendered HTML); code is read as the lines a reader can see. */
  kind: "prose" | "html" | "code";
};

function walk(dir: string, re: RegExp): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return walk(p, re);
    return re.test(name) && !/\.test\.ts$|test-helpers\.ts$/.test(name) ? [p] : [];
  });
}
const SHARED = "supabase/functions/_shared";
const shared = walk(SHARED, /\.ts$/);
const under = (...prefixes: string[]) =>
  shared.filter((f) => prefixes.some((p) => f.startsWith(`${SHARED}/${p}`)));
const grabbed = new Set<string>();
const take = (files: string[]) => {
  files.forEach((f) => grabbed.add(f));
  return files;
};

export const SURFACES: Surface[] = [
  { name: "Facts", kind: "prose", files: take(walk("knowledge/facts", /\.(md|txt)$/)) },
  {
    name: "Built facts and llms files",
    kind: "prose",
    files: ["knowledge/kabsi-facts.md", "public/llms-full.txt", "src/content/llms-base.txt"],
  },
  { name: "Copy deck", kind: "prose", files: ["docs/COPY.md"] },
  { name: "Auth emails", kind: "html", files: walk("emails/auth", /\.html$/) },
  {
    name: "Product email previews (text)",
    kind: "prose",
    files: walk("docs/email-previews", /\.txt$/),
  },
  {
    name: "Product email previews (html)",
    kind: "html",
    files: walk("docs/email-previews", /\.html$/),
  },
  {
    name: "Product and lifecycle email builders",
    kind: "code",
    files: take(
      under(
        "email/",
        "lifecycle",
        "notify",
        "team.ts",
        "disconnect.ts",
        "profile-snapshot.ts",
        "care-report",
        "report.ts",
        "results-report",
        "insights",
        "review-graphic",
        "review-growth",
        "review-page",
        "holiday",
        "invitations",
        "unsubscribe",
      ),
    ),
  },
  {
    name: "WhatsApp agent, templates and request book",
    kind: "code",
    files: take([
      ...under("whatsapp/", "request-book/", "whatsapp-setting"),
      ...walk("supabase/functions/whatsapp", /\.ts$/),
    ]),
  },
  {
    name: "Outbound templates",
    kind: "code",
    files: take([
      ...under("outbound/"),
      ...walk("supabase/functions/outbound-send", /\.ts$/),
      ...walk("supabase/functions/outbound-prepare", /\.ts$/),
      ...walk("supabase/functions/outbound-inbox", /\.ts$/),
    ]),
  },
  {
    name: "Creem products and billing words",
    kind: "code",
    files: take([
      ...under("creem", "billing", "plans.ts", "founding"),
      ...walk("supabase/functions/billing-creem", /\.ts$/),
    ]),
  },
  {
    name: "Nora's rules and pages",
    kind: "code",
    files: take([
      ...under("nora-", "facts.ts", "kabsi-facts"),
      ...walk("supabase/functions/assistant", /\.ts$/),
    ]),
  },
  { name: "Other server-side copy", kind: "code", files: shared.filter((f) => !grabbed.has(f)) },
  { name: "Share image words", kind: "code", files: ["scripts/og.mjs", "scripts/industry-og.mjs"] },
];

/** The text a rule reads for one file of a surface. */
export function surfaceText(s: Surface, file: string): string {
  const raw = readText(file);
  if (s.kind === "html") return htmlText(raw);
  if (s.kind === "code") return readerLines(raw).join("\n");
  return raw;
}

/**
 * Findings of the Sync 1 truth pass that part B's guards caught and part C fixes. Each is a line that breaks a rule today. The
 * test below fails when one is fixed and still listed, so part C removes each entry with its fix and the list ends empty.
 */
export const KNOWN_FINDINGS: { text: string; why: string }[] = [
  {
    text: "the Weekly Care Report; Business Knowledge; Nora",
    why: "F-01 facts 01: a live-sounding line names the retired Weekly Care Report",
  },
  {
    text: "The Weekly Care Report is called the Results Report everywhere",
    why: "F-02 COPY.md shared pieces: says the retired name is called Results Report, which is not an owner name either",
  },
  {
    text: "explain what Google says it uses (relevance, distance, prominence)",
    why: "F-03 COPY.md guide template: tells an author to explain what Google uses, which K-144 and 30.32 item 7 replace with a quoted, dated source",
  },
];
export const isKnown = (line: string) => KNOWN_FINDINGS.some((k) => line.includes(k.text));
