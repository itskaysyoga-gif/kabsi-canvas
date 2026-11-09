// Web 2 (27 Oct 2026): the public website on the design studio's approved system (master plan 30.13 to 30.18). This
// replaces the tests of the 22 Oct homepage (P0.8-13), whose components are gone. It keeps their rules: the claims rule
// and the copy rules on every line a reader sees, no invented proof or number, hello@kabsi.co only, the operator named
// with no city, Creem as the merchant of record, WhatsApp shown only when the one setting has a number.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRAND_LINE,
  KABSI_GROUP_ID,
  MAIN_CTA,
  BUSINESS_MENU,
  HEADER_CTA,
  NAV_LINKS,
  ORG_LD,
  OPERATOR_LINE,
  MERCHANT_LINE,
  PLAN_PRICES,
  SCAN_LINE,
  SOCIAL_LINKS,
  TRIAL_LINE,
  WHATSAPP_ON,
  WHATSAPP_URL,
  pageHead,
} from "../src/lib/site";
import { PLANS } from "../src/components/kabsi/plans";
import { readText } from "./helpers/facts";
import { NEVER_CLAIMS, NEVER_NAMES } from "./helpers/house-rules";

const read = (f: string) => readFileSync(f, "utf8");
const filesIn = (dir: string) =>
  readdirSync(dir)
    .filter((n) => /\.(tsx?|ts)$/.test(n))
    .map((n) => join(dir, n));

/** Every public file Web 2 brought in, and the public routes. */
const PUBLIC_FILES = [
  ...filesIn("src/components/kabsi"),
  ...filesIn("src/content"),
  ...filesIn("src/content/industries"),
  ...[
    "index",
    "pricing",
    "how-it-works",
    "about",
    "security",
    "faq",
    "privacy",
    "terms",
    "partners",
    "partners_.terms",
    "founding",
    "manager-steps",
    "scan.index",
    "scan.$code",
    "google-profile-check",
    "google-review-link",
    "for.index",
    "for.$trade",
  ].map((r) => `src/routes/${r}.tsx`),
];

/** The lines a reader can see: JSX text and string literals that read as words (a space and a letter). */
function sentences(code: string): string[] {
  const out: string[] = [];
  const clean = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const m of clean.matchAll(/"([^"\n]+)"/g)) out.push(m[1]!);
  for (const m of clean.matchAll(/`([^`]+)`/g)) out.push(m[1]!);
  for (const m of clean.matchAll(/>([^<>{}]+)</g)) out.push(m[1]!.trim());
  // Class names and code are not reader lines.
  return out.filter(
    (s) =>
      / /.test(s) &&
      /[A-Za-z]/.test(s) &&
      !/^[a-z0-9:[\]()_./%#-]+( [a-z0-9:[\]()_./%#&>-]+)*$/.test(s) &&
      !/=>|\(\)|\bconst\b|\breturn\b|&&|\|\||className|data:|https?:/.test(s),
  );
}

const ALL = PUBLIC_FILES.flatMap((f) => sentences(read(f)).map((s) => [f, s] as const));
/** Security, Privacy, Terms and the partner terms keep kabsi-canvas's own legal text until the lawyer's (29.8). */
const LEGAL = /routes\/(security|privacy|terms|partners_\.terms)\.tsx$/;

describe("the copy rules on every public line (kabsi-copy, K-112, K-144, 30.15)", () => {
  const all = ALL;

  it("finds the lines it checks", () => {
    expect(all.length).toBeGreaterThan(500);
    expect(all.some(([, s]) => s.includes("Kabsi does the work and asks for your yes"))).toBe(true);
  });
  it("uses no em or en dash anywhere, and no exclamation mark in a line", () => {
    for (const f of PUBLIC_FILES) expect(read(f), f).not.toMatch(/[–—]/);
    for (const [f, s] of all) expect(s, `${f}: ${s.slice(0, 50)}`).not.toMatch(/[A-Za-z.)']!/);
  });
  it("never promises what the claims rule forbids, and never names a retired product", () => {
    // The legal pages name these promises only to say Kabsi does not make them.
    for (const [f, s] of all.filter(([f]) => !LEGAL.test(f))) {
      const at = `${f}: ${s.slice(0, 60)}`;
      // A question that ends in "?" may name a claim only to answer "No one can promise that."
      if (!s.endsWith("?")) expect(s, at).not.toMatch(/\btop of google\b/i);
      expect(s, at).not.toMatch(NEVER_CLAIMS);
      expect(s, at).not.toMatch(NEVER_NAMES);
      // The weekly report replaces the Weekly Care Report (30.18); the legal text changes with the lawyer's.
      if (!LEGAL.test(f)) expect(s, at).not.toMatch(/Weekly Care Report/);
      expect(s, at).not.toMatch(/partner(s|ed)? with Google|Google'?s? (partner|official)/i);
    }
  });
  it("speaks to owners in their words: no listing, visibility, spot, grid, pin or app", () => {
    for (const [f, s] of all.filter(([f]) => !LEGAL.test(f))) {
      expect(s, `${f}: ${s.slice(0, 60)}`).not.toMatch(
        /\b(listing|visibility|grid point|the app)\b/i,
      );
    }
  });
  it("uses hello@kabsi.co as the only email address", () => {
    for (const f of PUBLIC_FILES)
      for (const e of read(f).match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [])
        expect(e, f).toMatch(/^(hello@kabsi\.co|name@shop\.com)$/);
  });
  it("shows no Arabic on the public website (R-61)", () => {
    for (const f of PUBLIC_FILES) expect(read(f), f).not.toMatch(/[؀-ۿ]/);
  });
});

describe("the lines of master plan 30.15 and 30.17", () => {
  it("are the brand line, the main button, the scan and trial lines", () => {
    expect(BRAND_LINE).toBe("Your business on Google. Taken care of.");
    expect(MAIN_CTA).toBe("Check my business free");
    expect(SCAN_LINE).toBe("Free check. No account and no Google access needed.");
    expect(TRIAL_LINE).toBe("Free for 14 days once Kabsi is connected. No card.");
    // Design 9 (Web 5 part B): the H1 is the brand line itself, "Taken care of." on the yellow bar; the meta description
    // stays Polish 2's line (HOME_LINE), the visible hero line is Design 9's.
    const home = read("src/components/kabsi/d9-hero.tsx");
    expect(home).toContain('<D9Title text="Your business on Google. Taken care of." />');
    expect(read("src/routes/index.tsx")).toContain("description: HOME_LINE");
    expect(read("src/components/kabsi/hero-lines.ts")).toContain(
      "Your details kept right, a reply ready for every review and your profile kept fresh, without doing it yourself. Kabsi prepares the work, and nothing goes live without your yes.",
    );
    // Go live 1 (30.28): the WhatsApp launch line is gone from the hero.
    expect(home).not.toMatch(/WHATSAPP_LAUNCH_LINE|opens at launch/);
  });
  it("puts the Site 2 links in the header, Businesses as one link, and three footer groups (30.34 item 4)", () => {
    expect(NAV_LINKS.map((n) => n.label)).toEqual([
      "How it works",
      "Businesses",
      "Pricing",
      "Guides",
      "About",
    ]);
    expect(NAV_LINKS.find((n) => n.label === "Businesses")?.to).toBe("/for");
    expect(HEADER_CTA).toBe("Free check");
    expect(BUSINESS_MENU.map((n) => n.label)).toEqual([
      "Hair salons",
      "Barbershops",
      "Nail salons",
      "Restaurants",
    ]);
    const header = read("src/components/kabsi/site-header.tsx");
    expect(header).toContain('variant="dark"');
    expect(header).toContain("{WHATSAPP_ON && (");
    const footer = read("src/components/kabsi/site-footer.tsx");
    for (const t of ['title: "Product"', 'title: "Explore"', 'title: "Company"'])
      expect(footer).toContain(t);
    // No industry links in the footer (Design 9); the free tool stays in the first group (lane R decision 4).
    expect(footer).not.toContain("BUSINESS_MENU");
    expect(footer).toContain('{ label: "Review link and QR code", to: "/google-review-link" }');
    expect(footer).toContain('{ label: "Partners", to: "/partners" }');
    expect(footer).toContain("SOCIAL_LINKS.map");
    expect(footer).toContain("openPrivacyChoices");
    expect(footer).toContain("WHATSAPP_ON ?");
    // Site 2: Security moves to Company; the legal row ends with one independence line and the year.
    expect(footer).toContain('{ label: "Security", to: "/security" }');
    expect(footer).toContain("{NOT_AFFILIATED} © 2026 Kabsi.");
    expect(footer).not.toContain("GOOGLE_THIRD_PARTY_URL");
    expect(read("src/components/kabsi/d8-faq.tsx")).toContain("GOOGLE_THIRD_PARTY_URL");
  });
  it("never types the Founding 25 count in the line above the header", () => {
    const line = read("src/components/kabsi/founding-line.tsx");
    expect(line).toContain("useFoundingPlaces()");
    expect(line).toContain("places && places.left > 0 &&");
    expect(line).not.toMatch(/\b\d+ places left/);
  });
  it("say the access steps the same everywhere, with Add (on some screens, Invite)", () => {
    const access = read("src/components/kabsi/d5-access.tsx");
    expect(access).toContain("choose Manager, then Add (on some screens, Invite).");
    expect(access).toContain('import { KABSI_GROUP_ID } from "@/lib/site";');
    expect(KABSI_GROUP_ID).toBe("5481006796");
    expect(read("docs/COPY.md")).toContain("choose Manager, then Add (on some screens, Invite).");
    // The group ID lives only in src/lib/site.ts (CLAUDE.md).
    for (const f of PUBLIC_FILES) expect(read(f), f).not.toMatch(/"5481006796"/);
  });
  it("list only built features on both plans (Price 1), and only the list prices", () => {
    const [essentials, pro] = PLANS;
    expect(essentials!.monthly).toBe(PLAN_PRICES.essentialsMonthly);
    expect(essentials!.yearly).toBe(PLAN_PRICES.essentialsYearly);
    expect(pro!.monthly).toBe(PLAN_PRICES.proMonthly);
    expect(pro!.yearly).toBe(PLAN_PRICES.proYearly);
    const rows = read("src/components/kabsi/plans.ts");
    expect(rows).toMatch(/Holiday hours, 2 posts a month and your photos/);
    // Design 6 round 2: Pro's card names what Pro adds; the Coach's actions are in the table only (lane R).
    expect(pro!.lead).toBe("Everything in Essentials, and:");
    expect(pro!.work.join(" ")).not.toMatch(/Profile Coach/);
    expect(rows).toMatch(
      /Profile Coach actions: the change made for you after your yes", "No", "Yes"/,
    );
    expect(rows).toMatch(/More checks come later\./);
    // Fix 2 (master plan 30.27 item 2): the nearby check and the AI answer are named with each plan's allowance, marked
    // At launch, in PLAN_CHECKS only; everything else not built stays off the plans.
    expect(rows).not.toMatch(
      /Competitor Watch|category check|voice notes|monthly PDF|search terms? checked/,
    );
    const outside = rows.replace(/export const PLAN_CHECKS = \{[\s\S]*?\} as const;/, "");
    expect(outside).not.toMatch(/ChatGPT/);
  });
});

describe("no invented proof or number (plan 2.11, Web 2 item 4)", () => {
  it("reads every count from Kabsi's functions, never a constant", () => {
    for (const f of PUBLIC_FILES)
      expect(read(f), f).not.toMatch(/FOUNDING25_LEFT|FOUNDING_LEFT|FOUNDING_PARTNERS_LEFT/);
    const api = read("src/lib/public-api.ts");
    expect(api).toContain('"programs/founding"');
    expect(api).toContain('"programs/partners"');
    expect(api).toContain('"billing-creem/founding"');
    const founding = read("src/components/kabsi/d5-founding.tsx");
    expect(founding).toContain("useFoundingPlaces()");
    expect(founding).toContain("applyFounding(");
    expect(read("src/components/kabsi/d2-partners.tsx")).toContain("applyPartner(");
  });
  it("labels every example, and the fixtures of the prototype are gone", () => {
    for (const gone of [
      "d2-data.ts",
      "scan-data.ts",
      "scan-result.tsx",
      "d2-customer.tsx",
      "home-sections.tsx",
    ])
      expect(readdirSync("src/components/kabsi"), gone).not.toContain(gone);
    expect(read("src/components/kabsi/nearby-places.tsx")).toContain("example = true");
    expect(read("src/components/kabsi/scan-live.tsx")).toContain("example={false}");
    expect(read("src/components/kabsi/whatsapp.tsx")).toContain("ExampleBadge");
  });
  it("keeps the ?state= links of the prototype to development", () => {
    const parts = read("src/components/kabsi/d2-parts.tsx");
    expect(parts).toContain('name === "state" && !import.meta.env.DEV ? null : raw');
  });
  it("shows no customer quote, logo or user count of Kabsi's own", () => {
    for (const [f, s] of ALL)
      expect(s, f).not.toMatch(
        /\b(trusted by|loved by|\d[\d,]* (customers|businesses use|users))\b/i,
      );
  });
});

describe("WhatsApp shows only when the one setting has a number (K-122)", () => {
  it("hides the WhatsApp buttons while there is no number", () => {
    expect(read("src/components/kabsi/ui.tsx")).toContain("if (!WHATSAPP_ON) return null;");
    // Design 9: the phone bar has no WhatsApp; the phone menu's quiet row shows it only while the setting has a number.
    expect(read("src/components/kabsi/site-chrome.tsx")).not.toContain("WHATSAPP");
    expect(read("src/components/kabsi/site-header.tsx")).toContain("{WHATSAPP_ON && (");
    if (!WHATSAPP_ON) expect(WHATSAPP_URL).toBe("mailto:hello@kabsi.co");
  });
});

describe("the operator, the merchant of record and the social links", () => {
  it("names Rashid with no city, and Creem as the merchant of record", () => {
    expect(OPERATOR_LINE).toBe("Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co.");
    expect(MERCHANT_LINE).toBe("Card payments will be processed by Creem, our merchant of record.");
    // Site 2 (30.34 item 4): both lines open /terms and /privacy instead of sitting in the footer.
    for (const f of ["src/routes/terms.tsx", "src/routes/privacy.tsx"])
      expect(read(f), f).toContain("{OPERATOR_LINE} {MERCHANT_LINE}");
    expect(read("src/routes/terms.tsx")).toMatch(/will be processed by\s+Creem,[\s\S]*merchant of record/);
    expect(ORG_LD).not.toHaveProperty("address");
  });
  it("no public page, email, fact file or JSON-LD names Hussein or the old operator city (R-55)", () => {
    const files = [
      ...PUBLIC_FILES,
      "src/lib/site.ts",
      "src/lib/faq.ts",
      "knowledge/kabsi-facts.md",
      "src/content/llms-base.txt",
      "public/llms-full.txt",
      "supabase/functions/_shared/email-layout.ts",
      "supabase/functions/_shared/email/template.ts",
      "supabase/functions/_shared/email/auth-templates.ts",
    ];
    for (const f of files) {
      const text = readText(f);
      expect(text, f).not.toMatch(/Hussein/);
      expect(text, f).not.toMatch(/operated by [^.]*Dubai|run by [^.]*Dubai/);
    }
  });
  it("links Facebook and Instagram only through SOCIAL_LINKS (R-59)", () => {
    expect(SOCIAL_LINKS.map((s) => s.name)).toEqual(["Facebook", "Instagram"]);
    for (const f of PUBLIC_FILES)
      expect(read(f), f).not.toMatch(/facebook\.com|instagram\.com|tiktok|twitter\.com|x\.com\//);
  });
});

describe("the head of every public page (30.16 section 4)", () => {
  it("has a title, a description, a canonical address and its own share image", () => {
    const h = pageHead({ title: "T", description: "D", path: "/pricing", image: "pricing" });
    expect(h.links).toEqual([{ rel: "canonical", href: "https://kabsi.co/pricing" }]);
    expect(h.meta).toContainEqual({
      property: "og:image",
      content: "https://kabsi.co/og/pricing.png",
    });
    for (const r of PUBLIC_FILES.filter((f) => f.startsWith("src/routes/"))) {
      const code = read(r);
      expect(code, r).toMatch(/pageHead\(|<LegalPage/);
      // Industries 3: an industry page names its own image, public/og/industries/<slug>.jpg (tests/industries3.test.ts).
      if (/pageHead\(/.test(code))
        expect(code, r).toMatch(/image: "\w+"|image: `industries\/\$\{i\.slug\}`/);
    }
    for (const img of [
      "home",
      "scan",
      "pricing",
      "tool",
      "guide",
      "industry",
      "partner",
      "about",
      "founding",
    ])
      expect(readdirSync("public/og"), img).toContain(`${img}.png`);
  });
  it("gives Home the Organization data and the share image of the new brand line", () => {
    expect(read("src/routes/index.tsx")).toMatch(/jsonLd: \[ORG_LD, WEBSITE_LD/);
    expect(read("scripts/og.mjs")).toContain("Your business on Google. Taken care of.");
  });
});

describe("Home on Design 9 (Web 5 part B, master plan 30.24)", () => {
  // Polish 4 part D: the sections below the first screen live in d9-home-lower.tsx.
  const home =
    read("src/components/kabsi/d9-home.tsx") + read("src/components/kabsi/d9-home-lower.tsx");
  const data = read("src/components/kabsi/d8-data.ts");
  it("never types a count: the Founding 25 count and the founding price come from the real readers", () => {
    expect(home).toContain("useFoundingPlaces()");
    expect(home).toContain("useFoundingLeft()");
    expect(home).toContain("left !== null && left > 0 &&");
    expect(home + data).not.toMatch(/\b\d+ (of 25 )?places left/);
  });
  it("uses lane R's hours buttons and marks nothing At launch (Go live 1)", () => {
    expect(data).toContain('buttons: ["Use my hours", "Keep Google\'s"]');
    expect(data).not.toMatch(/atLaunch|At launch/);
  });
  it("shows in the Example free check only what the free check can read (facts, K-82)", () => {
    const example = data.slice(data.indexOf("EXAMPLE_RESULT"));
    expect(example).not.toMatch(/without a reply|no reply|Last post|holiday hours/i);
    expect(data).not.toContain("Your hours, replies, posts, photos and links");
  });
  it("cards only for finished trades, each with a photo", () => {
    const cards = home.slice(home.indexOf("const TRADES"), home.indexOf("function D9PickBusiness"));
    expect(cards.match(/photo: (MORE_)?PHOTOS\./g)).toHaveLength(4);
  });
});
