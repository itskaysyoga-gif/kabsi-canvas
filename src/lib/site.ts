// Public-site facts and SEO helpers. Every number here comes from knowledge/kabsi-facts.md; every sentence
// must pass docs/KABSI-PLAN.md section 2.2 (no promises of reviews, ratings or rankings; no invented numbers; no Google affiliation).

// Canonical origin (P0.1-03: kabsi.co is served by Vercel). Canonical links are built from the route path only, so a query string never reaches them.
// Public Cloudflare Turnstile site key (safe in the browser). The secret lives in Supabase secrets.
export const TURNSTILE_SITE_KEY = "0x4AAAAAAFHvWh4ra3THq5g0";
export const SITE_URL = "https://kabsi.co";
export const CONTACT_EMAIL = "hello@kabsi.co";
// Kabsi's Google business group (plan Appendix B). Owners invite this ID as a Manager. It is an identifier, not a secret.
export const KABSI_GROUP_ID = "5481006796";
export const KABSI_GROUP_NAME = "Kabsi Clients";
export const CONTACT_PHONE = "+961 3 956 917";

/** The legal seller (plan section 5, D1; R-20). City only, never a street address. Change it here and nowhere else. */
export const LEGAL_SELLER = "Hussein Slim, Dubai, United Arab Emirates";
/** The operator line for the footer, terms and emails (R-20). */
export const OPERATOR_LINE = `Kabsi is operated by ${LEGAL_SELLER}. Contact: ${CONTACT_EMAIL}`;

/** The brand line and the line under it (K-112, K-110). Google's name never appears in the slogan. */
export const BRAND_LINE = "Your reviews and listing. Taken care of.";
export const BRAND_EXPLAINER =
  "Kabsi looks after your business on Google: a reply ready for every new review, your hours and details kept right, and fresh posts. You just approve.";
/** The calls to action, worded once (R-02). */
export const CTA_PRIMARY = "Join early access";
export const CTA_SECONDARY = "See it work";
/** The full non-affiliation notice, shown in every public footer (K-112). */
export const GOOGLE_NOTICE =
  "Google and Google Business Profile are trademarks of Google LLC. Kabsi is independent and not affiliated with, sponsored by or endorsed by Google.";

export const PRICES = {
  proMonthly: 19,
  proYearly: 190,
  extraLocationMonthly: 15,
  extraLocationYearly: 150,
  lebanonBundle: 120,
  card: 20,
  extraCard: 10,
  fiveCards: 40,
  partnerRate: 8,
  foundingRate: 6,
} as const;

/** The trial line, worded once. 30 days through partner links and inserts. */
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
  name: "Kabsi Pro",
  description:
    "Kabsi looks after a local business on Google: a reply ready for every new review, hours and details kept right, and fresh posts. Nothing is published until the owner approves it.",
  brand: { "@type": "Brand", name: "Kabsi" },
  offers: [
    {
      "@type": "Offer",
      name: "Kabsi Pro, monthly",
      price: PRICES.proMonthly,
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Kabsi Pro, yearly",
      price: PRICES.proYearly,
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Kabsi Lebanon bundle, 12 months, with an NFC card and setup",
      price: PRICES.lebanonBundle,
      priceCurrency: "USD",
      eligibleRegion: { "@type": "Country", name: "Lebanon" },
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Kabsi card",
      price: PRICES.card,
      priceCurrency: "USD",
      eligibleRegion: { "@type": "Country", name: "Lebanon" },
      url: `${SITE_URL}/pricing`,
    },
  ],
};
