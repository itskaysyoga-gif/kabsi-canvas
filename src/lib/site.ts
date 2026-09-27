// Public-site facts and SEO helpers. Every number here comes from KABSI-SPEC §1; every sentence
// must pass §3 (no promises of reviews, ratings or rankings; no invented numbers; no Google affiliation).

// Canonical origin. Moves to https://kabsi.co at the domain switch (D215).
export const SITE_URL = "https://kabsi-app.lovable.app";
export const CONTACT_EMAIL = "hello@kabsi.co";
export const CONTACT_PHONE = "+961 3 956 917";

export const PRICES = {
  card: 20,
  pro6: 75,
  pro12: 120,
  extraCard: 10,
  fiveCards: 40,
  partnerRate: 8,
  foundingRate: 6,
} as const;

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
      content: "Kabsi: Every Google review, answered. You just tap Post.",
    },
    { property: "og:locale", content: "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: o.title },
    { name: "twitter:description", content: o.description },
    { name: "twitter:image", content: og },
    {
      name: "twitter:image:alt",
      content: "Kabsi: Every Google review, answered. You just tap Post.",
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
    "Kabsi is a Google Business Profile assistant for local businesses. Every new Google review arrives by email with a reply drafted in the reviewer's language, and nothing is posted until the owner approves it.",
  logo: `${SITE_URL}/kabsi-mark.svg`,
  email: CONTACT_EMAIL,
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
    "A Google Business Profile assistant. Every new Google review arrives by email with a reply drafted in the reviewer's language; nothing is posted until the owner approves it.",
  brand: { "@type": "Brand", name: "Kabsi" },
  offers: [
    {
      "@type": "Offer",
      name: "Kabsi Pro, 6 months",
      price: PRICES.pro6,
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Kabsi Pro, 12 months",
      price: PRICES.pro12,
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
    },
    {
      "@type": "Offer",
      name: "Kabsi card",
      price: PRICES.card,
      priceCurrency: "USD",
      url: `${SITE_URL}/pricing`,
    },
  ],
};
