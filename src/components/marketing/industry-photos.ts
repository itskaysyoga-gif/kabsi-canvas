// SITE-4: the hero photo of each industry page that has one of the new photos (the others keep their library photo).
// Only the industry pages load this file. Credits in public/photos/CREDITS.md.
import { wide, type PubPhoto } from "./public-photos";

// SITE-7: the restaurant's cook at the pass read as a shop counter at card size; the restaurant page uses its library
// photos (the chef owner in the hero, the dining room on the /for card, the tables in the /for collage).
export const TRADE_WIDE: Record<string, PubPhoto> = {
  "hair-salon": wide("hair-salon", "A stylist blow-drying a client's hair in a bright salon"),
  barbershop: wide("barbershop", "A barber shaping a client's hair in his shop"),
  "nail-salon": wide("nail-salon", "A nail technician working on a client's nails"),
  "spa-and-massage": wide("spa", "A massage therapist working on a client's back"),
  cafe: wide("cafe", "A barista at work behind a sunlit café counter"),
  "auto-repair": wide("auto-repair", "A mechanic working under the hood of a car"),
  cleaner: wide("cleaner", "A cleaner vacuuming an office floor"),
};

/** The "Send a photo" band's photo where the trade's library photo is weak (the others use their own second photo). */
export const TRADE_SECOND: Record<string, PubPhoto> = {
  "hair-salon": wide("salon-wash", "A stylist washing a client's hair at the basin"),
  "auto-repair": wide("garage-hands", "A mechanic's hands at work on a car's fuse box"),
};

/** SITE-5: pages whose hero uses the trade's own library photo (the index in `industry.photos`) instead of its new photo. */
export const HERO_LIBRARY: Record<string, number> = { restaurant: 0 };
