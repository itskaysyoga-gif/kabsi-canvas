// RB-T (master plan 30.50 item 8): each of Kabsi's 21 industries (src/content/industries, by slug) mapped to the request
// book pack that fits it, or to none. Data only, read by nothing that runs yet: no business gets a pack from this table,
// and the request book stays off until Gate 3. Clinics map to none (30.43 item 1: dental and other clinics stay on Google
// care only, with no patient or appointment records). "food" is the test-only pack in test-fixtures/food.v1.ts; it ships
// only when a session adds it to PACKS with Rashid's go.
export const INDUSTRY_PACKS: Readonly<Record<string, string | null>> = {
  "hair-salon": "salon",
  "barbershop": "salon",
  "beauty-salon": "salon",
  "nail-salon": "salon",
  "lash-and-brow-studio": "salon",
  "spa-and-massage": "salon",
  "gym-and-fitness": "gym",
  "yoga-and-pilates-studio": "gym",
  "auto-repair": "garage",
  "restaurant": "food",
  "cafe": "food",
  "bakery": "food",
  // Clinics and health: none, by decision.
  "dental-clinic": null,
  "medical-and-aesthetic-clinic": null,
  "physiotherapy": null,
  "veterinary-clinic": null,
  "optician": null,
  // No pack fits their words yet (a later pack, PK in docs/kabsi-3/build-plan.md).
  "car-wash": null,
  "florist": null,
  "pet-grooming": null,
  "tattoo-studio": null,
};

/** The industries that must never get a pack: clinics and health (30.43 item 1, 30.50 item 8). */
export const NO_PACK_EVER: readonly string[] = ["dental-clinic", "medical-and-aesthetic-clinic", "physiotherapy", "veterinary-clinic", "optician"];

/** The pack id an industry maps to, or null (none, or an industry Kabsi does not list). */
export const packForIndustry = (slug: string): string | null => INDUSTRY_PACKS[slug] ?? null;
