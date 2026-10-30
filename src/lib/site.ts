// Public-site facts and SEO helpers. Every number here comes from knowledge/kabsi-facts.md; every sentence
// must pass docs/KABSI-PLAN.md section 2.2 (no promises of reviews, ratings or rankings; no invented numbers; no Google affiliation).

import { WHATSAPP_DIGITS, WHATSAPP_ON } from "../../supabase/functions/_shared/whatsapp-setting.ts";
import { CONSENT_ASK_FIRST } from "./region";
import { SOCIAL_LINKS } from "../../supabase/functions/_shared/social-links.ts";

/** Where the consent bar asks first (the one list is CONSENT_ASK_FIRST in src/lib/region.ts). */
export const CONSENT_COUNTRIES: readonly string[] = CONSENT_ASK_FIRST;

// Canonical origin (P0.1-03: kabsi.co is served by Vercel). Canonical links are built from the route path only, so a query string never reaches them.
// Public Cloudflare Turnstile site key (safe in the browser). The secret lives in Supabase secrets.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFHvWh4ra3THq5g0";
export const SITE_URL = "https://kabsi.co";
export const CONTACT_EMAIL = "hello@kabsi.co";
// Kabsi's Google business group (plan Appendix B). Owners invite this ID as a Manager. It is an identifier, not a secret.
export const KABSI_GROUP_ID = "5481006796";
export const KABSI_GROUP_NAME = "Kabsi Clients";
// Google's third-party policies (master plan 30.10 point 5): a paid manager says Business Profile itself is free and
// links Google's "Working with a third party" page. The Edge Functions keep the same words in _shared/access-notice.ts.
export const FREE_FROM_GOOGLE =
  "Google Business Profile is free from Google. Kabsi is an independent paid service.";
export const THIRD_PARTY_HELP_URL = "https://support.google.com/business/answer/7163406";

/**
 * Kabsi's one WhatsApp number (K-122) lives in one setting, `supabase/functions/_shared/whatsapp-setting.ts`, read by
 * the site, the Edge Functions and the auth email builder. It is empty while Kabsi has no number: `WHATSAPP_ON` is then
 * false and every WhatsApp link and line is hidden (hello@kabsi.co stays).
 */
export {
  WHATSAPP_DIGITS,
  WHATSAPP_NUMBER,
  WHATSAPP_ON,
} from "../../supabase/functions/_shared/whatsapp-setting.ts";

/**
 * The short prefilled message for each placement. Plain text only: no business name, email, review text or any
 * private detail travels in a wa.me link (K-58). The visitor presses send themselves.
 */
export const WHATSAPP_MESSAGES = {
  general: "Hello Kabsi, I have a question.",
  setup: "Hello Kabsi, I would like help setting up my Google Business Profile.",
  partner: "Hello Kabsi, I am an agency and would like to talk about partnering.",
  handover:
    "Hello Kabsi, I was chatting with the assistant on kabsi.co and would like to talk to a person.",
  email: "Hello Kabsi, I have a question about an email I got from Kabsi.",
} as const;
export type WhatsappKind = keyof typeof WHATSAPP_MESSAGES;

/** The click-to-chat link for one placement: opens WhatsApp with the short message filled in. */
export function whatsappHref(
  kind: WhatsappKind = "general",
  digits: string = WHATSAPP_DIGITS,
): string {
  return `https://wa.me/${digits}?text=${encodeURIComponent(WHATSAPP_MESSAGES[kind])}`;
}

/**
 * The Free Visibility Scan hand-off (master plan 24.3, 24.8, 28.1): "Get this on WhatsApp" and "Send the full map to my
 * WhatsApp" open a chat with the prefilled message carrying the scan code, so Nora picks up the scan. Plain text, no
 * link; the code (KAB- and 8 to 12 letters or digits) points only to the public scan result. Null for a malformed code.
 */
export function scanHandoffText(code: string): string | null {
  const c = code.trim().toUpperCase();
  return /^KAB-[A-Z0-9]{8,12}$/.test(c) ? `Hi Kabsi, my scan code is ${c}` : null;
}
export function scanHandoffHref(code: string, digits: string = WHATSAPP_DIGITS): string | null {
  const text = scanHandoffText(code);
  return text && digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

/**
 * The one booking link (P0.1-V3, R-31): a single Calendly event type, "Call with Kabsi", 20 minutes, with one required
 * question, "What's the call about?". Replace the placeholder with the event's public URL and nothing else changes.
 * Until it is replaced every booking link falls back to an email to the team, so no page points at a dead address.
 */
export const BOOKING_URL = "https://calendly.com/BOOKING_URL_PLACEHOLDER/call-with-kabsi";
export const BOOKING_READY = !BOOKING_URL.includes("PLACEHOLDER");
export const SETUP_CALL_MINUTES = 20;
/** The three answers to the required question. Each placement preselects one through Calendly's `a1` parameter. */
export const BOOKING_ANSWERS = {
  setup: "Setting up my Google profile",
  partner: "Partner or agency",
  other: "Something else",
} as const;
export type BookingKind = keyof typeof BOOKING_ANSWERS;

/** The booking URL for one placement, with its answer preselected. `embed` adds the inline-widget parameters. */
export function bookingUrl(kind: BookingKind, embed = false): string {
  const q = [`a1=${encodeURIComponent(BOOKING_ANSWERS[kind])}`];
  if (embed) q.push("embed_domain=kabsi.co", "embed_type=Inline", "hide_gdpr_banner=1");
  return `${BOOKING_URL}?${q.join("&")}`;
}

/** Where a booking link goes: Calendly once the link is set, otherwise an email that asks for a time. */
export function bookingHref(kind: BookingKind): string {
  if (BOOKING_READY) return bookingUrl(kind);
  const subject = `Call with Kabsi: ${BOOKING_ANSWERS[kind]}`;
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}

/** Who operates Kabsi and answers for the personal data (lane R, 22 Oct 2026, R-55). No city, never a street address. Change it here and nowhere else. */
export const OPERATOR_NAME = "Rashid Abou Hamzy";
/** Who signs the founder note on the homepage (lane R, 22 Oct 2026). */
export const FOUNDER_SIGNATURE = `${OPERATOR_NAME}, founder`;
/** The operator line for the footer, terms, privacy page and emails (R-55). Payments are processed by Creem, the merchant of record. */
export const OPERATOR_LINE = `Kabsi is operated by ${OPERATOR_NAME}. Contact: ${CONTACT_EMAIL}.`;

/** The brand line (master plan 30.15 section 1; was "Your reviews and listing. Taken care of."). Google's name only as
 * plain words, never in a logo or graphic (K-112). */
export const BRAND_LINE = "Your business on Google. Taken care of.";
/** Every footer, About and the share text say it (K-112). */
export const NOT_AFFILIATED = "Kabsi is independent and not affiliated with Google.";
/** The trial, always apart from the free check (master plan 30.15 section 3.10). */
export const TRIAL_LINE = "Free for 14 days once Kabsi is connected. No card.";
/** Under every scan box: the free check needs nothing from the owner. */
export const SCAN_LINE = "Free check. No Google access needed. Takes about 10 seconds.";
/** The main button on every public page (master plan 30.15 section 1). */
export const MAIN_CTA = "Check my business free";
/** Google's own page on working with a third party (footer small print, master plan 30.10 point 5). */
export const GOOGLE_THIRD_PARTY_URL = THIRD_PARTY_HELP_URL;

/** Kabsi's social channels, the one list (R-59). Every footer and the About page read it. Facebook and Instagram only. */
// The one constant lives beside the Edge Functions so every email footer reads the same two links.
export { SOCIAL_LINKS };

/**
 * Where a "WhatsApp" button on the public site goes. While WHATSAPP_ON is false (no number in the one setting) it is an
 * email to hello@kabsi.co, and the parts that only make sense in WhatsApp (the WhatsApp glyph button) hide.
 */
export const WHATSAPP_URL = WHATSAPP_ON ? whatsappHref("general") : `mailto:${CONTACT_EMAIL}`;

/** Header links (COPY.md shared pieces, Design 5: "Businesses" and "Founding 25"). */
export const NAV_LINKS = [
  { to: "/how-it-works", label: "How it works" },
  { to: "/pricing", label: "Pricing" },
  { to: "/for", label: "Businesses" },
  { to: "/google-review-link", label: "Free tools" },
  { to: "/founding", label: "Founding 25" },
  { to: "/partners", label: "Partners" },
] as const;
export const BRAND_EXPLAINER =
  "Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You just approve.";
/** The calls to action, worded once (R-02). */
export const CTA_PRIMARY = "Join early access";
/** The trial button on the free tools when they are busy for the day (lane R, 22 Oct 2026). Never "Join early access" there. */
export const CTA_TRIAL = "Start your free trial";
export {
  FREE_TOOL_BUSY,
  FREE_TOOL_BUSY_CODES,
} from "../../supabase/functions/_shared/free-tool-busy.ts";
/** The hero button on every public page (K-140): the free Profile Check, at all times, never a trial button. */
export const CTA_CHECK = "Check my Google profile free";
export const CTA_HOW = "See how it works";
/** The line above the business search in the homepage hero (lane R, 22 Oct 2026). */
export const HERO_CHECK_LABEL = "Check your Google profile free";

/**
 * The line under the homepage headline (K-140, lane R 22 Oct 2026). "You approve on WhatsApp." is true only while
 * `WHATSAPP_NUMBER` is set; with none it ends "You approve in one tap." Both switch with the one setting, with no code
 * change.
 */
export function heroSub(whatsappOn: boolean = WHATSAPP_ON): string {
  return `Every review answered, every change to your Google profile caught, a fresh post every week. ${
    whatsappOn ? "You approve on WhatsApp." : "You approve in one tap."
  }`;
}
/**
 * The line beside every "on WhatsApp" line while Kabsi's WhatsApp number is not set (Design 6 audit section 4, Price 1).
 * Shown only while WHATSAPP_ON is false; the plain line stands alone once the number is set.
 */
export const WHATSAPP_LAUNCH_LINE = "WhatsApp opens at launch. Until then you approve on kabsi.co.";
/** The full non-affiliation notice, shown in every public footer (K-112). */
export const GOOGLE_NOTICE =
  "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.";

/**
 * The plans on the website (K-126, 22 Oct 2026), in US dollars. Card payments through Creem (P0.4-07) are not open, so
 * every plan button starts the free Profile Check and the pages say card payments are coming. These are the only prices
 * in the product: the Plan page, the Home card, the trial emails, the FAQ and the terms all read them or repeat
 * `PRICES_SENTENCE`. The earlier single Pro price is retired, and tests/prices.test.ts fails if it comes back.
 */
export const PLAN_PRICES = {
  essentialsMonthly: 29,
  essentialsYearly: 290,
  proMonthly: 59,
  proYearly: 590,
  extraLocationMonthly: 15,
  extraLocationYearly: 150,
} as const;
/**
 * Price 1 (master plan 30.20 section 6, Rashid's "yes 29/59" of 30 Oct 2026): the list prices above are for new
 * businesses; the first 30 paying businesses, and Founding 25, pay the founding price and keep it while they stay
 * subscribed. The places left come from billing-creem/founding; a line naming the founding price shows only while places
 * remain. Never shown as a crossed-out price.
 */
export const FOUNDING_PRICES = {
  essentialsMonthly: 19,
  essentialsYearly: 190,
  proMonthly: 39,
  proYearly: 390,
} as const;
export const FOUNDING_TOTAL = 30;
/** The founding line on a plan card: "Founding price for the first 30 paying businesses: 19 US dollars a month, kept while
 * you stay subscribed. Then 29." */
export function foundingLine(plan: "essentials" | "pro", yearly: boolean): string {
  const k = `${plan}${yearly ? "Yearly" : "Monthly"}` as const;
  return `Founding price for the first ${FOUNDING_TOTAL} paying businesses: ${FOUNDING_PRICES[k]} US dollars ${
    yearly ? "a year" : "a month"
  }, kept while you stay subscribed. Then ${PLAN_PRICES[k]}.`;
}
/** The places left, under the plan cards while any remain. */
export const foundingPlacesLine = (left: number) =>
  `${left} of ${FOUNDING_TOTAL} founding places left.`;
/** The three lines under the plan cards (facts 4.1, 4.2, 4.5; Design 6 audit section 4). */
export const PRICE_TAX_LINE = "Prices are in US dollars, plus tax where it applies.";
export const PAY_TODAY_LINE = "Nothing to pay today. Card payments in US dollars are coming.";
export const REFUND_LINE =
  "Monthly plans can be cancelled at any time. Yearly plans are refundable within 14 days.";
/** The help lines, exactly as master plan 30.21 section 2 words them, with the working hours beside them. */
export const HELP_LINES = {
  essentials: "A person answers on WhatsApp the same working day.",
  pro: "Priority help: a person answers on WhatsApp within 4 working hours, and a call when you need one.",
} as const;
export const WORKING_HOURS = "Working hours: Monday to Friday, 9:00 to 18:00, UAE time.";
/** The three prices in one sentence, worded once, for the Plan page, the Home card, the FAQ and the trial emails. */
export const PRICES_SENTENCE = `Essentials is $${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year. Pro is $${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year. An extra location is $${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year. Prices are in US dollars, plus tax where it applies.`;
/** The founding price in one sentence, for the Plan page, the FAQ, the terms and the emails. */
export const FOUNDING_SENTENCE = `The first ${FOUNDING_TOTAL} paying businesses pay the founding price and keep it while they stay subscribed: Essentials $${FOUNDING_PRICES.essentialsMonthly} a month or $${FOUNDING_PRICES.essentialsYearly} a year, Pro $${FOUNDING_PRICES.proMonthly} a month or $${FOUNDING_PRICES.proYearly} a year.`;
/** The three rows the Plan page lists, worded from the same numbers. */
export const PLAN_PRICE_ROWS = [
  {
    name: "Kabsi Essentials",
    price: `$${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year`,
  },
  {
    name: "Kabsi Pro",
    price: `$${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year`,
  },
  {
    name: "Extra location",
    price: `$${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year`,
  },
] as const;
/** The marker on a feature or payment that is decided and not open. No date, ever. */
export const COMING_SOON = "Coming soon";
/** True once Creem checkout is merged and live (P0.4-07). While false, no page may link to a checkout. */
export const CHECKOUT_LIVE = false;
/** The words after a price, worded once. */
export const TAX_NOTE = "plus tax where it applies";

type Meta = { title?: string; name?: string; property?: string; content?: string };

// Per-route <head>: title, description, canonical, Open Graph, optional JSON-LD blocks.
export type Crumb = { name: string; path: string };

/** BreadcrumbList for a page: Home, then each crumb (the last one is the page itself). */
export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...crumbs].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE_URL}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

/** The share images in public/og (1200 by 630, made by scripts/og.mjs), one per page type. */
export type ShareImage =
  "home" | "scan" | "pricing" | "tool" | "guide" | "industry" | "partner" | "about" | "founding";

export function pageHead(o: {
  title: string;
  description: string;
  path: string;
  /** The share image; Home's when not given. */
  image?: ShareImage;
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
  /** Breadcrumb trail after Home; adds BreadcrumbList JSON-LD. */
  crumbs?: Crumb[];
  type?: "website" | "article";
}) {
  // Share image: a designed 1200x630 PNG per page type, because some link previews (LinkedIn, older WhatsApp) skip
  // WebP. Page photos are WebP and reach search through the image sitemap and Article JSON-LD instead.
  const og = `${SITE_URL}/og/${o.image ?? "home"}.png`;
  const url = `${SITE_URL}${o.path === "/" ? "" : o.path}`;
  const meta: Meta[] = [
    { title: o.title },
    { name: "description", content: o.description },
    { property: "og:title", content: o.title },
    { property: "og:description", content: o.description },
    { property: "og:type", content: o.type ?? "website" },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "Kabsi" },
    { property: "og:image", content: og },
    { property: "og:image:type", content: "image/png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    {
      property: "og:image:alt",
      content: `Kabsi. ${BRAND_LINE}`,
    },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
    { name: "twitter:image", content: og },
    {
      name: "twitter:image:alt",
      content: `Kabsi. ${BRAND_LINE}`,
    },
  ];
  if (o.noindex) meta.push({ name: "robots", content: "noindex" });
  return {
    meta,
    links: [{ rel: "canonical", href: url }],
    scripts: [...(o.jsonLd ?? []), ...(o.crumbs ? [breadcrumbLd(o.crumbs)] : [])].map((data) => ({
      type: "application/ld+json",
      children: JSON.stringify(data),
    })),
  };
}

// JSON-LD. Never AggregateRating or Review markup about Kabsi (§3).
export const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "Kabsi",
  url: SITE_URL,
  description:
    "Kabsi prepares a local business's review replies, posts and updates to its business details. The owner approves each one on WhatsApp before it goes live.",
  logo: `${SITE_URL}/icon-512.png`,
  email: CONTACT_EMAIL,
  sameAs: SOCIAL_LINKS.map((l) => l.href),
};
export const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: "Kabsi",
  url: SITE_URL,
  inLanguage: "en",
  publisher: { "@id": `${SITE_URL}/#organization` },
};
export const PRODUCT_LD = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Kabsi",
  description:
    "Kabsi prepares a local business's review replies, posts and updates to its business details. The owner approves each one on WhatsApp before it goes live.",
  brand: { "@type": "Brand", name: "Kabsi" },
  // Card payments are not open yet, so the offers say pre-order, not in stock. The list prices (Price 1).
  offers: (
    [
      ["Kabsi Essentials, monthly", PLAN_PRICES.essentialsMonthly],
      ["Kabsi Essentials, yearly", PLAN_PRICES.essentialsYearly],
      ["Kabsi Pro, monthly", PLAN_PRICES.proMonthly],
      ["Kabsi Pro, yearly", PLAN_PRICES.proYearly],
    ] as const
  ).map(([name, price]) => ({
    "@type": "Offer",
    name,
    price,
    priceCurrency: "USD",
    availability: "https://schema.org/PreOrder",
    url: `${SITE_URL}/pricing`,
  })),
};
