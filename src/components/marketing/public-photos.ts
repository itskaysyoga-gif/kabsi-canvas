// SITE-4: the licensed Unsplash photos of owners and their places, served from public/photos (credits in
// public/photos/CREDITS.md). Each has its files at the sizes used, its width and height, and its alt text. No one shown is
// a Kabsi customer; no name or quote is ever attached to a photo. Kept small: Home's script budget carries it.

export type PubPhoto = {
  /** The file stem in public/photos, without the width. */
  stem: string;
  widths: readonly number[];
  w: number;
  h: number;
  alt: string;
};

export const wide = (name: string, alt: string, h = 800): PubPhoto => ({
  stem: `${name}-wide`,
  widths: [640, 1200],
  w: 1200,
  h,
  alt,
});

/** The trades of the "Built for your kind of business" strip: the /for page, the file name and the label. The tile is a
 * link named by its label, so its 4:5 photo is decorative (no alt text to repeat the label). */
export const TRADE_TILES = (
  [
    ["hair-salon", "hair-salon", "Hair salons"],
    ["barbershop", "barbershop", "Barbershops"],
    ["nail-salon", "nail-salon", "Nail salons"],
    ["spa-and-massage", "spa", "Spas"],
    ["cafe", "cafe", "Cafes"],
    ["restaurant", "restaurant", "Restaurants"],
    ["auto-repair", "auto-repair", "Auto repair"],
    ["cleaner", "cleaner", "Cleaning"],
  ] as const
).map(([slug, file, label]) => ({
  slug,
  label,
  photo: { stem: `${file}-tile`, widths: [400, 800], w: 800, h: 1000, alt: "" } as PubPhoto,
}));

export const PUB = {
  /** Home's hero, behind the drawn phone. Preloaded from the route head. */
  heroOwner: {
    stem: "owner-phone-tall",
    widths: [480, 960],
    w: 960,
    h: 1200,
    alt: "A smiling shop owner reading a message on his phone at his counter",
  } satisfies PubPhoto,
  florist: wide("florist-phone", "A florist checking her phone at the workbench of her shop", 900),
  barista: wide("barista", "A smiling barista at the espresso machine behind her café counter"),
  salonWash: wide("salon-wash", "A stylist washing a client's hair at the basin"),
  /** Pricing's Example month at a salon, on a phone. */
  salon: wide("hair-salon", "A stylist blow-drying a client's hair in a bright salon"),
  /** Home's week, Friday: the photo the owner sent, live as a post. */
  dayPost: wide("salon-wash", "A stylist washing a client's hair, the photo sent as a post"),
} as const;

export const pubSrc = (p: PubPhoto, width: number) => `/photos/${p.stem}-${width}.webp`;
export const pubSrcSet = (p: PubPhoto) => p.widths.map((x) => `${pubSrc(p, x)} ${x}w`).join(", ");
