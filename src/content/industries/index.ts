// Wave 1 industries and the nine hubs (master plan 30.17 section 2). /for lists the hubs, /for/<hub> lists its
// industries and /for/<industry> is one page from one content file.
import { SALON_CHECK, SALON_RANKS, type NearbyCheck } from "@/components/kabsi/map-data";
import type { Hub, HubId, Industry } from "./types";
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

export type { ChatLine, Hub, HubId, Industry, Task } from "./types";

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
];

export const HUBS: Hub[] = [
  {
    id: "beauty-and-wellness",
    name: "Beauty and wellness",
    lead: "Salons, barbers, nails and spas: businesses where clients book a person, and reviews name them.",
    coming: [],
  },
  {
    id: "food-and-drink",
    name: "Food and drink",
    lead: "Restaurants, cafes and bakeries: menus, hours by the meal and photos that make people hungry.",
    coming: [],
  },
  {
    id: "health",
    name: "Health",
    lead: "Dental, medical, aesthetic and physio clinics: careful replies, exact hours and no patient details, ever.",
    coming: ["Pharmacies", "Pet grooming and vets"],
  },
  {
    id: "auto",
    name: "Auto",
    lead: "Garages and car services: drivers choose on trust, price and how soon you can take the car.",
    coming: ["Car washes"],
  },
  {
    id: "home-services",
    name: "Home services",
    lead: "Plumbers, electricians and cleaners: the area you cover, how fast you come and a phone that answers.",
    coming: ["Plumbers and electricians", "Cleaning services"],
  },
  {
    id: "hospitality",
    name: "Hospitality",
    lead: "Small hotels and guest houses: rooms, breakfast hours and a reply to every stay.",
    coming: ["Small hotels"],
  },
  {
    id: "fitness-and-sport",
    name: "Fitness and sport",
    lead: "Gyms and studios: class times, trial offers and coaches members name in reviews.",
    coming: [],
  },
  {
    id: "retail",
    name: "Retail",
    lead: "Shops and florists: opening hours that match the door, stock people can see and holiday trading.",
    coming: ["Shops", "Florists"],
  },
  {
    id: "professional-services",
    name: "Professional services",
    lead: "Estate agents, tutors and other offices: who you help, where you are, and the next free appointment.",
    coming: ["Real estate agents", "Tutoring centres"],
  },
];

export const industry = (slug: string) => INDUSTRIES.find((i) => i.slug === slug);
export const hub = (id: string) => HUBS.find((h) => h.id === id);
export const hubOf = (i: Industry) => HUBS.find((h) => h.id === i.hub)!;
export const industriesIn = (id: HubId) => INDUSTRIES.filter((i) => i.hub === id);
/** A hub is indexed when it holds at least one finished page. */
export const hubIndexed = (id: HubId) => industriesIn(id).some((i) => i.finished);

/** Old addresses, kept working (brief section 16, item 3). */
export const MOVED: Record<string, string> = {
  salon: "hair-salon",
  "barber-shop": "barbershop",
  "auto-repair-shop": "auto-repair",
  "small-hotel": "hospitality",
};

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
