// Marketing photos (D256): plain local businesses from anywhere, no faces, no readable text, no brands.
// Generated on Higgsfield, converted to WebP and reviewed by the internal `site-assets` Edge Function,
// served from the public `site` Storage bucket (cached for a year). Never presented as customers.
import { supabaseUrl } from "@/lib/supabase";

const BASE = `${supabaseUrl}/storage/v1/object/public/site/v2`;

type Photo = { file: string; w: number; h: number; widths: readonly number[]; alt: string };

const HERO = [1600, 800] as const;
const TILE = [1200, 800, 480] as const;
const COVER = [1600, 800, 480] as const;

export const PHOTOS = {
  // Page heroes: dark on the left for the headline, the subject on the right.
  heroHome: {
    file: "hero-home",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "A customer taps a phone on a review card at a café counter in the evening",
  },
  heroHow: {
    file: "hero-how",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "A bakery owner checks a phone on the counter next to coffee and fresh bread",
  },
  heroPricing: {
    file: "hero-pricing",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "A black review card stand on a restaurant table by candlelight",
  },
  heroPartners: {
    file: "hero-partners",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "An agency desk at night with a laptop, a notebook and a stack of review cards",
  },
  heroFaq: {
    file: "hero-faq",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "A florist's workbench with fresh flowers, scissors and a notebook under a lamp",
  },
  heroGuides: {
    file: "hero-guides",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "A desk at night with an open notebook, a cup of tea and a phone",
  },
  heroTool: {
    file: "hero-tool",
    w: 1600,
    h: 900,
    widths: HERO,
    alt: "A café table with a small card stand, an espresso and a phone",
  },
  // Business types.
  bakery: {
    file: "biz-bakery",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A neighbourhood bakery with pastries in a glass counter and bread on wooden shelves",
  },
  restaurant: {
    file: "biz-restaurant",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A bistro dining room set for service, with warm lights and a large window",
  },
  dentist: {
    file: "biz-dentist",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A bright dental clinic reception with a wooden desk and plants",
  },
  salon: {
    file: "biz-salon",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A hair salon with two styling chairs in front of round mirrors",
  },
  florist: {
    file: "biz-florist",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A florist shop full of fresh flowers in buckets",
  },
  garage: {
    file: "biz-garage",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "An auto repair garage with a car on a lift and a wall of tools",
  },
  boutique: {
    file: "biz-boutique",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A clothing boutique with garments on a wooden rail and a mirror",
  },
  hotel: {
    file: "biz-hotel",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A small hotel reception desk with a brass bell, flowers and room keys",
  },
  cafe: {
    file: "biz-cafe",
    w: 1200,
    h: 896,
    widths: TILE,
    alt: "A café counter with an espresso machine and glass cups in morning light",
  },
  // Guide covers.
  guideReply: {
    file: "guide-reply",
    w: 1600,
    h: 900,
    widths: COVER,
    alt: "Hands typing a reply on a phone at a café table",
  },
  guideNegative: {
    file: "guide-negative",
    w: 1600,
    h: 900,
    widths: COVER,
    alt: "A cup of tea next to a phone lying face down on a table",
  },
  guideRemove: {
    file: "guide-remove",
    w: 1600,
    h: 900,
    widths: COVER,
    alt: "A hand with a pen over a notepad next to a laptop",
  },
  guideManager: {
    file: "guide-manager",
    w: 1600,
    h: 900,
    widths: COVER,
    alt: "Two people working together at a laptop on a shop counter",
  },
  guideLink: {
    file: "guide-link",
    w: 1600,
    h: 900,
    widths: COVER,
    alt: "A review card stand on a café table beside a cappuccino and a croissant",
  },
} as const satisfies Record<string, Photo>;

export type PhotoId = keyof typeof PHOTOS;

export function photoSrc(id: PhotoId, width: number) {
  return `${BASE}/${PHOTOS[id].file}-${width}.webp`;
}

export function photoSrcSet(id: PhotoId) {
  return PHOTOS[id].widths.map((w) => `${photoSrc(id, w)} ${w}w`).join(", ");
}

/** The smallest variant at least `min` px wide (for `src`, the fallback when srcset isn't used). */
export function photoFallback(id: PhotoId, min = 800) {
  const ws = [...PHOTOS[id].widths].sort((a, b) => a - b);
  return photoSrc(id, ws.find((w) => w >= min) ?? ws[ws.length - 1]!);
}
