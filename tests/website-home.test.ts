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
  NAV_LINKS,
  ORG_LD,
  OPERATOR_LINE,
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
    expect(all.some(([, s]) => s.includes("Taken care of through WhatsApp."))).toBe(true);
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
      expect(s, at).not.toMatch(
        /\b(autopilot|automatically|guaranteed?|approved by google|google partner|google-approved|more customers|set and forget|fully automatic|we manage everything|we remove bad reviews|no work needed)\b/i,
      );
      expect(s, at).not.toMatch(/Profile Score|Do now|Listing Shield|Put mine back/);
      // The Results Report replaces the Weekly Care Report (30.18); the legal text changes with the lawyer's.
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
    expect(SCAN_LINE).toBe("Free check. No Google access needed. Takes about 10 seconds.");
    expect(TRIAL_LINE).toBe("Free for 14 days once Kabsi is connected. No card.");
    const home = read("src/routes/index.tsx");
    expect(home).toContain("Your business on Google.");
    expect(home).toContain(
      '<span className="text-kb-yellow">Taken care of through WhatsApp.</span>',
    );
  });
  it("puts Businesses and Founding 25 in the header", () => {
    expect(NAV_LINKS.map((n) => n.label)).toEqual([
      "How it works",
      "Pricing",
      "Businesses",
      "Free tools",
      "Founding 25",
      "Partners",
    ]);
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
    expect(rows).toMatch(/More checks come later\./);
    expect(rows).not.toMatch(
      /Competitor Watch|category check|voice notes|monthly PDF|ChatGPT|search terms? checked/,
    );
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
    expect(read("src/components/kabsi/site-chrome.tsx")).toContain("{WHATSAPP_ON && (");
    if (!WHATSAPP_ON) expect(WHATSAPP_URL).toBe("mailto:hello@kabsi.co");
  });
});

describe("the operator, the merchant of record and the social links", () => {
  it("names Rashid with no city, and Creem as the merchant of record", () => {
    expect(OPERATOR_LINE).toBe("Kabsi is operated by Rashid Abou Hamzy. Contact: hello@kabsi.co.");
    const footer = read("src/components/kabsi/site-footer.tsx");
    expect(footer).toContain("Kabsi is operated by Rashid Abou Hamzy.");
    expect(footer).toContain("Payments are processed by Creem, our merchant of record.");
    expect(read("src/routes/terms.tsx")).toMatch(/processed by Creem,[\s\S]*merchant of record/);
    expect(ORG_LD).not.toHaveProperty("address");
  });
  it("no public page, email, fact file or JSON-LD names Hussein or the old operator city (R-55)", () => {
    const files = [
      ...PUBLIC_FILES,
      "src/lib/site.ts",
      "src/lib/faq.ts",
      "knowledge/kabsi-facts.md",
      "public/llms.txt",
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
      if (/pageHead\(/.test(code)) expect(code, r).toMatch(/image: "\w+"/);
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
