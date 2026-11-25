// SITE-1 (blueprint 3.1, R-163): the core public pages. What the task's "Done when" asks, checked once.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as offer from "../src/lib/offer";
import { HEADER_CTA, MAIN_CTA, NAV_LINKS, TRIAL_LINE } from "../src/lib/site";
import {
  FAQ_V31,
  HERO_CHAT,
  HOME_FAQ,
  HOME_HERO,
  OFFER2_ON,
  PRICE,
  PRICING,
  QR_IMAGE_ON,
  TELL_CHIPS,
} from "../src/components/marketing/v31-data";
import { FOUNDING25_UNDER, FOUNDING_HERO } from "../src/components/kabsi/founding-private";
import { SITEMAP_PAGES } from "../src/lib/sitemap";

const read = (f: string) => readFileSync(f, "utf8");
/** The file without its comments: a comment may name what the page leaves out. */
const code = (f: string) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const PAGES = [
  "src/components/marketing/v31.tsx",
  "src/components/marketing/v31-pricing.tsx",
  "src/components/marketing/v31-pages.tsx",
  "src/components/marketing/v31-data.ts",
  "src/components/marketing/v31-heads.ts",
];
const ALL = PAGES.map(code).join("\n");

describe("SITE-1: the offer in one place", () => {
  it("has src/lib/offer.ts byte for byte as the task gives it", () => {
    expect(read("src/lib/offer.ts")).toBe(
      [
        "// The public offer (blueprint 3.1, R-163). One place for price and trial wording.",
        "export const PRICE_MONTHLY_USD = 29;",
        "export const FOUNDING_MONTHLY_USD = 19;",
        "export const TRIAL_DAYS = 14;",
        'export const TRIAL_LINE = "14 days free. Then 29 US dollars a month until you cancel. A card is needed to start. Cancel before day 14 and you pay nothing.";',
        'export const FOUNDING_LINE = "19 US dollars a month for your first 12 months. From month 13 the price is 29 US dollars a month. We email you 14 days before the change.";',
        'export const PRIMARY_CTA = "Check my business free";',
        "",
      ].join("\n"),
    );
  });
  it("takes the trial line and the main action from it", () => {
    expect(TRIAL_LINE).toBe(offer.TRIAL_LINE);
    expect(MAIN_CTA).toBe(offer.PRIMARY_CTA);
    // SITE-6: the header button has its own words; the main action stays PRIMARY_CTA.
    expect(HEADER_CTA).toBe("Free Google check");
    expect(PRICE.terms).toBe(offer.TRIAL_LINE);
    expect(PRICE.amount).toBe(`${offer.PRICE_MONTHLY_USD} US dollars`);
  });
  it("puts the founding line only on the private page", () => {
    expect(FOUNDING25_UNDER).toBe(offer.FOUNDING_LINE);
    expect(FOUNDING_HERO.title).toContain(String(offer.FOUNDING_MONTHLY_USD));
    expect(ALL).not.toMatch(/FOUNDING|19 US dollars|founding/);
    for (const f of ["src/routes/pricing.tsx", "src/routes/index.tsx"])
      expect(code(f)).not.toMatch(/FOUNDING|founding/);
  });
});

describe("SITE-1: Home is the nine sections of blueprint section 3", () => {
  it("draws them in order with one H1, the brand line (SITE-3 order, R-164 item 7)", () => {
    const home = read("src/components/marketing/v31.tsx");
    const body = home.slice(home.indexOf("export function V31Home"));
    const order = [
      "<HomeHero />",
      "<Problem />",
      "<Week />",
      "<TellKabsi />",
      "<Starts />",
      "<Proof />",
      'id="price"',
      'id="trust"',
      'id="questions"',
      "<ClosingBand",
    ];
    const at = order.map((o) => body.indexOf(o));
    expect(at.every((i) => i > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(HOME_HERO.title).toBe("Your business on Google. Taken care of.");
    expect(HOME_HERO.under).toBe("Free check. No card. 20 seconds.");
  });
  it("labels every picture Example and draws the chat in Kabsi's own look", () => {
    const home = read("src/components/marketing/v31.tsx");
    expect(home.match(/<ExampleBadge/g)?.length).toBeGreaterThanOrEqual(3);
    expect(home).not.toMatch(/WhatsAppGlyph|bg-wa-|text-wa-|look2/);
    expect(HERO_CHAT.map((t) => t.from)).toEqual(["kabsi", "owner", "kabsi"]);
  });
  it("shows only the chips that work on main", () => {
    const asks = TELL_CHIPS.map((c) => c.ask);
    expect(asks).toContain(OFFER2_ON ? "What needs my attention?" : "Send me my review link");
    expect(asks.includes("Send me my review QR code")).toBe(QR_IMAGE_ON);
    for (const a of [
      "Make this reply shorter",
      "Close at 3 this Saturday",
      "Post this",
      "How many reviews this month?",
    ])
      expect(asks).toContain(a);
  });
  it("asks at most six questions, taken word for word from the FAQ", () => {
    expect(HOME_FAQ.length).toBeLessThanOrEqual(6);
    for (const q of HOME_FAQ) expect(FAQ_V31).toContain(q);
  });
});

describe("SITE-1: Pricing, the FAQ and the navigation", () => {
  // SITE-5 (lane R decision 3): Pricing has its own content, so Home's price card is not on it. The price and the
  // trial terms show once at the top, and what is not included is one list.
  it("shows the price and the trial terms once, and says what is not included once", () => {
    const p = read("src/components/marketing/v31-pricing.tsx");
    const page = p.slice(p.indexOf("export function V31Pricing"));
    expect(page.match(/<PriceCard/g)).toBeNull();
    expect(page.match(/\{PRICE\.terms\}/g)).toHaveLength(1);
    expect(page.match(/PLAN_LISTS\.not\.map/g)).toHaveLength(1);
    expect(PRICING.notIncluded).toBe(
      "Kabsi does not message your customers, run ads, build websites or promise rankings.",
    );
    expect(PRICING.free).toBe(
      "Google Business Profile is free from Google. Kabsi is an independent paid service.",
    );
  });
  it("keeps the blueprint's ten questions in its order", () => {
    expect(FAQ_V31.map((f) => f.q)).toEqual([
      "What does Kabsi do?",
      "Do I have to do anything?",
      "Can I ask Kabsi to change something?",
      "Does Kabsi contact my customers?",
      "Does Kabsi need my Google password?",
      "What if a bad review comes in?",
      "Will this raise my ranking?",
      "Which countries?",
      "How do I cancel?",
      "Is Kabsi part of Google?",
    ]);
  });
  it("leaves Partners out of the header, footer and sitemap, and keeps the pages noindex", () => {
    expect(NAV_LINKS.map((n) => n.to)).toEqual(["/how-it-works", "/pricing", "/guides"]);
    expect(read("src/components/kabsi/site-footer.tsx")).not.toMatch(
      /to: "\/partners|to="\/partners/,
    );
    expect(SITEMAP_PAGES.map((p) => p.path).filter((p) => p.startsWith("/partners"))).toEqual([]);
    expect(read("src/routes/partners.tsx")).toContain("noindex: true");
    expect(read("src/routes/partners_.terms.tsx")).toContain("noindex: true");
  });
});

describe("SITE-1: the removed words stay off the pages it owns", () => {
  const owned = [
    ...PAGES,
    "src/routes/index.tsx",
    "src/routes/pricing.tsx",
    "src/routes/how-it-works.tsx",
    "src/routes/faq.tsx",
    "src/routes/about.tsx",
    "src/routes/security.tsx",
    "src/routes/billing.done.tsx",
    "src/components/kabsi/founding-private.ts",
  ]
    .map(code)
    .join("\n");
  it("names no AI agent, AI answer check, map, Pro plan or card-free trial", () => {
    expect(owned).not.toMatch(
      /AI agent|ChatGPT|Perplexity|AI answers?|visibility map|Where you come up|\bPro\b|Essentials|Founding 25|launch price/i,
    );
    // "No card" only in the blueprint's free check line, never about the trial.
    expect(owned.match(/no card/gi)?.length ?? 0).toBe(1);
  });
  it("has no testimonials, star ratings of Kabsi, carousels, autoplay or pop-ups", () => {
    expect(ALL).not.toMatch(/testimonial|carousel|autoPlay|autoplay|<dialog|trusted by/i);
  });
});
