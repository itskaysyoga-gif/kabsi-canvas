// P0.8-13: the homepage (K-140, K-144, K-112, R-02). The order of the sections, the WhatsApp switch, the Coming soon
// markers, the plan buttons while Creem is not live, and the claims rule on every word of the page.
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CHECKOUT_LIVE,
  CTA_CHECK,
  CTA_PRIMARY,
  FOUNDER_SIGNATURE,
  GOOGLE_NOTICE,
  LEGAL_SELLER,
  PLAN_PRICES,
  WHATSAPP_ON,
  heroSub,
} from "../src/lib/site";
import {
  COMING_SOON,
  CONTROL_ITEMS,
  FOUNDER_NOTE,
  HOME_ORDER,
  CAN,
  CANNOT,
  LOOP,
  PAYMENT_LINE,
  PILLARS,
  PRICE_LINES,
  PROOF_NOTE,
  TRIAL_BOX,
  homeFaq,
  howSteps,
  planButton,
  planGrid,
  pricingFaq,
  whatsappText,
} from "../src/lib/website";
import { EXAMPLE_REVIEW, ExampleTag, WhatsappChat } from "../src/components/marketing/mockups";

const flat = (v: unknown, out: string[] = []): string[] => {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => flat(x, out));
  else if (v && typeof v === "object") Object.values(v).forEach((x) => flat(x, out));
  return out;
};

/** Every sentence the homepage can show, with the WhatsApp setting both ways. */
function pageWords(): string[] {
  return [true, false].flatMap((on) =>
    flat([
      heroSub(on),
      PILLARS,
      howSteps(on),
      planGrid(on),
      whatsappText(on),
      homeFaq(on),
      CONTROL_ITEMS,
      FOUNDER_NOTE,
      PROOF_NOTE,
      TRIAL_BOX,
      PAYMENT_LINE,
      Object.values(PRICE_LINES),
      pricingFaq(on),
      LOOP,
      CAN,
      CANNOT,
    ]),
  );
}

describe("homepage order", () => {
  it("is the order of K-140", () => {
    expect([...HOME_ORDER]).toEqual([
      "hero",
      "how",
      "pillars",
      "whatsapp",
      "plans",
      "pricing",
      "control",
      "founder",
      "industries",
      "faq",
      "final",
    ]);
  });
  it("has the three pillars and four steps of the card", () => {
    expect(PILLARS.map((p) => p.title)).toEqual([
      "Every review answered",
      "Your profile protected",
      "Ready to be found",
    ]);
    expect(howSteps()).toHaveLength(4);
    expect(homeFaq()).toHaveLength(6);
  });
});

describe("the WhatsApp switch (lane R, 22 Oct 2026)", () => {
  it("ends the subline with the one-tap line while there is no number, and with WhatsApp when there is", () => {
    expect(heroSub(false)).toMatch(/You approve in one tap\.$/);
    expect(heroSub(true)).toMatch(/You approve on WhatsApp\.$/);
    expect(heroSub(false)).not.toMatch(/WhatsApp/);
    expect(WHATSAPP_ON ? heroSub() : heroSub()).toBe(heroSub(WHATSAPP_ON));
  });
  it("marks every WhatsApp feature Coming soon while there is no number, and none when there is", () => {
    const soon = (on: boolean) => {
      const g = planGrid(on);
      return [...g.essentials, ...g.proAdds].filter((i) => i.soon).map((i) => i.text);
    };
    expect(soon(false)).toContain("Approve on WhatsApp");
    expect(soon(false)).toContain("Send photos on WhatsApp");
    expect(soon(true)).not.toContain("Approve on WhatsApp");
    expect(soon(true)).not.toContain("Send photos on WhatsApp");
  });
  it("marks the features that are decided and not built, with no date", () => {
    const g = planGrid(true);
    const soon = [...g.essentials, ...g.proAdds].filter((i) => i.soon).map((i) => i.text);
    expect(soon).toEqual([
      "What customers say, a monthly summary",
      "Your own order and booking button on Google",
    ]);
    expect(COMING_SOON).toBe("Coming soon");
    expect(whatsappText(false).intro).toMatch(/no WhatsApp number yet/);
    expect(homeFaq(false)[3]!.a).toMatch(/coming soon/i);
    expect(homeFaq(true)[3]!.a).not.toMatch(/coming soon/i);
  });
  it("lists the search terms report under Pro with no Coming soon marker (lane R, 22 Oct 2026)", () => {
    for (const on of [true, false]) {
      const item = planGrid(on).proAdds.find((i) => i.text === "The search terms report");
      expect(item).toBeDefined();
      expect(item!.soon).toBeFalsy();
    }
    expect(
      planGrid(true)
        .essentials.map((i) => i.text)
        .join(" "),
    ).not.toMatch(/search terms/i);
    const facts = readFileSync("knowledge/kabsi-facts.md", "utf8");
    const para = facts.match(/\*\*Search terms report \(Pro[^\n]*/)?.[0] ?? "";
    expect(para).toMatch(/not marked Coming soon/);
    expect(facts).not.toMatch(/\[COMING\][^\n]*[Ss]earch terms/);
  });
  it("offers no auto-fix and no card payments before Creem", () => {
    const words = pageWords().join("\n");
    expect(words).not.toMatch(/auto-?fix/i);
    expect(words).toMatch(/Card payments are coming/);
  });
});

describe("plan buttons", () => {
  it("start the free Profile Check while Creem checkout is not live, never a dead checkout", () => {
    expect(CHECKOUT_LIVE).toBe(false);
    expect(planButton()).toEqual({ to: "/google-profile-check", label: CTA_CHECK });
    expect(planButton(true).to).toBe("/start");
    expect(planButton(true).label).toBe(CTA_PRIMARY);
  });
  it("show the prices of K-126", () => {
    expect(PLAN_PRICES).toEqual({
      essentialsMonthly: 19,
      essentialsYearly: 190,
      proMonthly: 39,
      proYearly: 390,
      extraLocationMonthly: 15,
      extraLocationYearly: 150,
    });
    expect(PRICE_LINES.extra).toBe("$15 a month or $150 a year");
    expect(TRIAL_BOX).toMatch(/^Try Pro free for 14 days\. No card\./);
  });
});

describe("the claims rule", () => {
  it("keeps every word of the page free of dashes, exclamation marks, percent signs and forbidden promises", () => {
    for (const text of pageWords()) {
      expect(text, text.slice(0, 50)).not.toMatch(/[—–!%]/);
      expect(text, text.slice(0, 50)).not.toMatch(
        /\b(ranking|rankings|rank|autopilot|automatically|guaranteed?|approved by google|google partner|more customers than)\b/i,
      );
      expect(text, text.slice(0, 50)).not.toMatch(
        /Profile Score|Do now|Listing Shield|Put mine back/,
      );
    }
  });
  it("names Google only as plain descriptive words and carries the non-affiliation notice", () => {
    expect(GOOGLE_NOTICE).toMatch(/not affiliated with, sponsored by or endorsed by Google/);
    expect(CONTROL_ITEMS.some((c) => c.text === GOOGLE_NOTICE)).toBe(true);
    for (const text of pageWords())
      expect(text, text.slice(0, 50)).not.toMatch(
        /partner(s|ed)? with Google|Google'?s? (partner|official)/i,
      );
  });
  it("shows no customer quote, logo or number of our own", () => {
    expect(PROOF_NOTE).toMatch(/no customer quotes/);
    const words = pageWords().join("\n");
    expect(words).not.toMatch(/\b\d[\d,]* (customers|businesses|reviews|users)\b/i);
  });
  it("uses hello@kabsi.co only", () => {
    const emails =
      pageWords()
        .join("\n")
        .match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
    for (const e of emails) expect(e).toBe("hello@kabsi.co");
  });
});

describe("the mockups", () => {
  it("are labelled Example and carry no date or time", () => {
    expect(renderToStaticMarkup(ExampleTag({}))).toContain("Example");
    expect(EXAMPLE_REVIEW.review_created_at).toBeNull();
  });
  it("draw the WhatsApp message with the same function that builds the real alert", () => {
    const html = renderToStaticMarkup(WhatsappChat());
    expect(html).toContain("new 4-star review from Emma");
    expect(html).toContain("Approve");
    expect(html).toContain("Edit in app");
  });
  it("never print a date or time from the visitor's locale (Sentry KABSI-WEB-7)", () => {
    for (const file of [
      "src/components/marketing/mockups.tsx",
      "src/components/marketing/home-sections.tsx",
      "src/lib/website.ts",
      "src/routes/index.tsx",
    ]) {
      const code = readFileSync(file, "utf8");
      expect(code, file).not.toMatch(
        /new Date\(|Date\.now\(|Math\.random\(|toLocale\w*\(|Intl\.|fmtDate|timeAgo|typeof window/,
      );
    }
  });
});

describe("the pricing and how it works pages (P0.8-13 part 3)", () => {
  const sources = [
    "src/routes/index.tsx",
    "src/routes/pricing.tsx",
    "src/routes/how-it-works.tsx",
    "src/routes/for.$slug.tsx",
    "src/routes/for.index.tsx",
    "src/components/marketing/home-sections.tsx",
    "src/lib/website.ts",
    "src/lib/verticals.tsx",
  ];
  it("have no Lebanon, card-sale, crypto or partner-resale text", () => {
    for (const file of sources)
      expect(readFileSync(file, "utf8"), file).not.toMatch(
        /Leban|USDT|Binance|Whish|\bOMT\b|NOWPayments|reseller|resale|NFC card sale|sell(s)? NFC/i,
      );
  });
  it("show no Free or Partner plan column and no picture of a card on the pricing page", () => {
    const code = readFileSync("src/routes/pricing.tsx", "utf8");
    expect(code).not.toMatch(/name="Free"|name="Partner"|CardRender|PricingVisual/);
    expect(code).toContain("Essentials");
    expect(code).toContain("planButton()");
  });
  it("name the plans, the trial, the extra location and the Creem line on the pricing page", () => {
    const words = pricingFaq()
      .map((f) => f.a)
      .join("\n");
    expect(words).toMatch(/\$39 a month or \$390 a year/);
    expect(words).toMatch(/\$15 a month or \$150 a year/);
    expect(words).toMatch(/14 days with no card/);
    expect(readFileSync("src/routes/pricing.tsx", "utf8")).toContain("Cards through Creem");
  });
  it("say what Kabsi cannot do, including the password and posting without you", () => {
    expect(CANNOT.join("\n")).toMatch(/password/);
    expect(CANNOT.join("\n")).toMatch(/without your approval/);
    expect(CANNOT.join("\n")).toMatch(/Lock your listing/);
    expect(LOOP.map((l) => l.title)).toEqual([
      "Kabsi watches",
      "Kabsi prepares",
      "Kabsi asks",
      "Kabsi publishes",
      "Kabsi reports",
    ]);
  });
  it("keep /partners the holding page and have no /meta page", () => {
    expect(readFileSync("src/routes/partners.tsx", "utf8")).toContain("opening soon");
    expect(existsSync("src/routes/meta.tsx")).toBe(false);
  });
});

describe("the founder note (lane R, 22 Oct 2026)", () => {
  it("is Rashid's note, signed by him, and the legal seller line is still Hussein Slim", () => {
    expect(FOUNDER_NOTE).toBe(
      "I spent years running ads and online presence for local businesses. The same thing came up every time: reviews left unanswered and details on Google out of date, because the owner was busy running the business. Kabsi takes that work off their hands, and nothing goes public without their yes. If something is not right, write to me at hello@kabsi.co.",
    );
    expect(FOUNDER_SIGNATURE).toBe("Rashid Abou Hamzy, founder");
    expect(FOUNDER_NOTE).not.toMatch(/Hussein/);
    expect(LEGAL_SELLER).toBe("Hussein Slim, Dubai, United Arab Emirates");
  });
});
