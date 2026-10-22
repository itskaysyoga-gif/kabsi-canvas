// Public-site facts and SEO helpers. Every number here comes from knowledge/kabsi-facts.md; every sentence
// must pass docs/KABSI-PLAN.md section 2.2 (no promises of reviews, ratings or rankings; no invented numbers; no Google affiliation).

import { WHATSAPP_DIGITS, WHATSAPP_ON } from "../../supabase/functions/_shared/whatsapp-setting.ts";

// Canonical origin (P0.1-03: kabsi.co is served by Vercel). Canonical links are built from the route path only, so a query string never reaches them.
// Public Cloudflare Turnstile site key (safe in the browser). The secret lives in Supabase secrets.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFHvWh4ra3THq5g0";
export const SITE_URL = "https://kabsi.co";
export const CONTACT_EMAIL = "hello@kabsi.co";
// Kabsi's Google business group (plan Appendix B). Owners invite this ID as a Manager. It is an identifier, not a secret.
export const KABSI_GROUP_ID = "5481006796";
export const KABSI_GROUP_NAME = "Kabsi Clients";

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

/** The legal seller (plan section 5, D1; R-20). City only, never a street address. Change it here and nowhere else. */
export const FOUNDER_NAME = "Hussein Slim";
/** Who signs the founder note on the homepage (lane R, 22 Oct 2026). The seller line above is separate and stays. */
export const FOUNDER_SIGNATURE = "Rashid Abou Hamzy, founder";
export const LEGAL_SELLER = `${FOUNDER_NAME}, Dubai, United Arab Emirates`;
/** The operator line for the footer, terms and emails (R-20). */
export const OPERATOR_LINE = `Kabsi is operated by ${LEGAL_SELLER}. Contact: ${CONTACT_EMAIL}`;

/** The brand line and the line under it (K-112, K-110). Google's name never appears in the slogan. */
export const BRAND_LINE = "Your reviews and listing. Taken care of.";
export const BRAND_EXPLAINER =
  "Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You just approve.";
/** The calls to action, worded once (R-02). */
export const CTA_PRIMARY = "Join early access";
export const CTA_SECONDARY = "See it work";
/** The hero button on every public page (K-140): the free Profile Check, at all times, never a trial button. */
export const CTA_CHECK = "Check my Google profile free";
export const CTA_HOW = "See how it works";

/**
 * The line under the homepage headline (K-140). "You approve on WhatsApp." is true only while Kabsi has a WhatsApp
 * number; with none it ends "You approve in one tap." Both switch with the one setting, with no code change.
 */
export function heroSub(whatsappOn: boolean = WHATSAPP_ON): string {
  return `Kabsi replies to your Google reviews, watches your Google Business Profile and makes it easy for customers to choose you. ${
    whatsappOn ? "You approve on WhatsApp." : "You approve in one tap."
  }`;
}
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
  essentialsMonthly: 19,
  essentialsYearly: 190,
  proMonthly: 39,
  proYearly: 390,
  extraLocationMonthly: 15,
  extraLocationYearly: 150,
} as const;
/** The three prices in one sentence, worded once, for the Plan page, the Home card, the FAQ and the trial emails. */
export const PRICES_SENTENCE = `Essentials is $${PLAN_PRICES.essentialsMonthly} a month or $${PLAN_PRICES.essentialsYearly} a year. Pro is $${PLAN_PRICES.proMonthly} a month or $${PLAN_PRICES.proYearly} a year. An extra location is $${PLAN_PRICES.extraLocationMonthly} a month or $${PLAN_PRICES.extraLocationYearly} a year. Prices are in US dollars, plus tax where it applies.`;
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

/** The trial line, worded once. */
export const TRIAL_LINE = "14-day free trial, no card";

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

export function pageHead(o: {
  title: string;
  description: string;
  path: string;
  jsonLd?: Record<string, unknown>[];
  noindex?: boolean;
  /** Breadcrumb trail after Home; adds BreadcrumbList JSON-LD. */
  crumbs?: Crumb[];
  type?: "website" | "article";
}) {
  // Share image: one designed 1200x630 PNG, because some link previews (LinkedIn, older WhatsApp) skip WebP.
  // Page photos are WebP and reach search through the image sitemap and Article JSON-LD instead.
  const og = `${SITE_URL}/og.png`;
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
      content: `Kabsi: ${BRAND_LINE} You approve every change.`,
    },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
    { name: "twitter:image", content: og },
    {
      name: "twitter:image:alt",
      content: `Kabsi: ${BRAND_LINE} You approve every change.`,
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
    "Kabsi looks after a local business on Google: a reply ready for every new review, hours and details kept right, and fresh posts. Nothing is published until the owner approves it.",
  logo: `${SITE_URL}/kabsi-mark.svg`,
  email: CONTACT_EMAIL,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Dubai",
    addressCountry: "AE",
  },
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
    "Kabsi looks after a local business on Google: a reply ready for every new review, hours and details kept right, and fresh posts. Nothing is published until the owner approves it.",
  brand: { "@type": "Brand", name: "Kabsi" },
  // Card payments are not open yet, so the offers say pre-order, not in stock.
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
