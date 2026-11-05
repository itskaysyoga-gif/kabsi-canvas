// The industries (master plan 30.17 section 2; Industries 2, 5 Nov 2026: one flat list, no groups). /for lists every
// indexed page alphabetically and /for/<industry> is one page from one content file. The old group pages answer a 301 to
// /for (vercel.json).
import { SALON_CHECK, SALON_RANKS, type NearbyCheck } from "@/components/kabsi/map-data";
import type { Industry } from "./types";
import { hairSalon } from "./hair-salon";
import { barbershop } from "./barbershop";
import { nailSalon } from "./nail-salon";
import { spaMassage } from "./spa-massage";
import { dentalClinic } from "./dental-clinic";
import { medicalAestheticClinic } from "./medical-aesthetic-clinic";
import { physiotherapy } from "./physiotherapy";
import { restaurant } from "./restaurant";
import { cafe } from "./cafe";
import { bakery } from "./bakery";
import { autoRepair } from "./auto-repair";
import { gymFitness } from "./gym-fitness";
import { lashAndBrowStudio } from "./lash-and-brow-studio";
import { tattooStudio } from "./tattoo-studio";
import { petGrooming } from "./pet-grooming";
import { veterinaryClinic } from "./veterinary-clinic";
import { carWash } from "./car-wash";
import { florist } from "./florist";
import { optician } from "./optician";
import { yogaAndPilatesStudio } from "./yoga-and-pilates-studio";
import { beautySalon } from "./beauty-salon";

export type { Card, ChatLine, D9Trade, Industry, Task, TradeCard, TradePage } from "./types";

export const INDUSTRIES: Industry[] = [
  hairSalon,
  barbershop,
  nailSalon,
  spaMassage,
  dentalClinic,
  medicalAestheticClinic,
  physiotherapy,
  restaurant,
  cafe,
  bakery,
  autoRepair,
  gymFitness,
  // Industries 2 (5 Nov 2026): nine new industries (the dental clinic page above, finished, and these eight).
  lashAndBrowStudio,
  tattooStudio,
  petGrooming,
  veterinaryClinic,
  carWash,
  florist,
  optician,
  yogaAndPilatesStudio,
  // Site 2 (5 Nov 2026, master plan 30.34 item 4): the 21st industry.
  beautySalon,
];

export const industry = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
/** Breadcrumb items for an industry page (docs/SEO-PLAN.md: Home, Businesses, the page). Lives with the content so a
 * route can use it without loading the page code. */
export function crumbsFor(i: Industry) {
  return [
    { name: "Businesses", to: "/for" },
    { name: i.plural, to: `/for/${i.slug}` },
  ];
}
/** An industry page is in search when it is finished and has its claim sheet (`indexed` not false). */
export const industryIndexed = (i: Industry) => i.finished && i.indexed !== false;
/** Every indexed page, alphabetical by its plural name: the /for list. */
export const industriesAtoZ = () =>
  INDUSTRIES.filter(industryIndexed).sort((a, b) => a.plural.localeCompare(b.plural, "en"));

/**
 * Old addresses, kept working (brief section 16, item 3). "" means /for itself: the group pages are gone (Industries 2)
 * and an old address of a kind with no page of its own lands on the list.
 */
export const MOVED: Record<string, string> = {
  salon: "hair-salon",
  "barber-shop": "barbershop",
  "auto-repair-shop": "auto-repair",
  "small-hotel": "",
};
/** The group pages removed by Industries 2 (Rashid: no categories). Each answers a 301 to /for (vercel.json). */
export const OLD_GROUPS = [
  "beauty-and-wellness",
  "food-and-drink",
  "health",
  "auto",
  "home-services",
  "hospitality",
  "fitness-and-sport",
  "retail",
  "professional-services",
] as const;

/** Each industry's nearby check (Example): the salon's pattern of 49 places, with the trade's own names. */
export function industryCheck(e: Industry["example"], keyword: string): NearbyCheck {
  const [a, b, c] = SALON_CHECK.places;
  return {
    ...SALON_CHECK,
    business: e.business,
    kind: e.kind,
    keyword,
    ranks: SALON_RANKS,
    places: [
      { ...a, name: `Near your ${e.kind}`, first: e.rival },
      { ...b, name: e.near[0], first: e.rival },
      { ...c, name: e.near[1], first: e.rival2 },
    ],
  };
}
