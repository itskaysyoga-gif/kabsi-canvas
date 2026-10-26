// The Example map: 7 by 7 places around Corner Bakery where Kabsi searched "bakery" like a customer.
// Each number is where the bakery came up from that place. 0 means not in the top 20.
// Harbor Bakes sits east of the station (the right side), so the ranks fall away there.
// prettier-ignore
export const MAP_RANKS: number[] = [
  5, 3, 2, 6, 9, 14, 0,
  2, 1, 1, 2, 7, 12, 0,
  3, 1, 1, 1, 4, 8, 16,
  2, 1, 1, 1, 5, 11, 0,
  4, 2, 1, 3, 6, 13, 0,
  8, 5, 3, 6, 9, 15, 0,
  12, 9, 7, 10, 18, 0, 0,
];

/** The business itself sits in the middle, shown as the Kabsi mark. */
export const MAP_CENTER = 24;

export type RankBand = "top" | "mid" | "low" | "none";

export function rankBand(rank: number): RankBand {
  if (rank >= 1 && rank <= 3) return "top";
  if (rank >= 4 && rank <= 10) return "mid";
  if (rank >= 11 && rank <= 20) return "low";
  return "none";
}

export function countBands(ranks: number[] = MAP_RANKS) {
  const c: Record<RankBand, number> = { top: 0, mid: 0, low: 0, none: 0 };
  for (const r of ranks) c[rankBand(r)]++;
  return c;
}

export function averagePosition(ranks: number[] = MAP_RANKS) {
  const found = ranks.filter((r) => r > 0);
  return Math.round((found.reduce((a, b) => a + b, 0) / found.length) * 10) / 10;
}

export const BAND_LABEL: Record<RankBand, string> = {
  top: "1 to 3",
  mid: "4 to 10",
  low: "11 to 20",
  none: "Not in top 20",
};

/* ---------- The nearby check (master plan 30.15 section 2): three places first, the dots second ---------- */

export type NearbyPlace = {
  /** A, B, C: the letter links the card to the small drawing. */
  letter: "A" | "B" | "C";
  /** From reverse geocoding the real checked point in kabsi-canvas; never invented there. Example here. */
  name: string;
  /** Where the business came up from that point. 0 means not in the first 20. */
  rank: number;
  /** Who came first from that point. */
  first: string;
  /** Which of the 49 checked points (0 to 48, row by row) the place is. */
  point: number;
  /** A word for the drawing's screen reader line ("east", "south west"). */
  where: string;
};

export type NearbyCheck = {
  business: string;
  /** "salon", "barbershop": used in "Near your salon". */
  kind: string;
  keyword: string;
  date: string;
  ranks: number[];
  places: [NearbyPlace, NearbyPlace, NearbyPlace];
  /** Something the drawing shows near B and C: a station, a park. */
  landmarks?: { station?: number; park?: number };
};

// The Example salon (brief section 14.3): Rose Lane Salon, Dubai. 7 by 7 points, 18 of them in the first 3.
// The metro station is east (B), the park south west (C), where other salons come up first.
// prettier-ignore
export const SALON_RANKS: number[] = [
  4, 3, 3, 5, 9, 12, 16,
  3, 2, 1, 2, 6, 11, 14,
  5, 2, 1, 1, 3, 7, 9,
  6, 2, 1, 2, 4, 8, 13,
  9, 4, 1, 1, 3, 6, 12,
  14, 7, 2, 3, 5, 9, 15,
  18, 0, 0, 7, 10, 14, 0,
];

export const SALON_CHECK: NearbyCheck = {
  business: "Rose Lane Salon",
  kind: "salon",
  keyword: "hair salon",
  date: "25 October 2026",
  ranks: SALON_RANKS,
  places: [
    {
      letter: "A",
      name: "Near your salon",
      rank: 2,
      first: "Juniper Hair Studio",
      point: 24,
      where: "at the salon",
    },
    {
      letter: "B",
      name: "Near the metro station",
      rank: 8,
      first: "Juniper Hair Studio",
      point: 26,
      where: "east",
    },
    {
      letter: "C",
      name: "By the park",
      rank: 0,
      first: "Lark Salon",
      point: 44,
      where: "south west",
    },
  ],
  landmarks: { station: 26, park: 44 },
};

/** "2nd", "8th", "11th", "21st". */
export function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th");
  return `${n}${s}`;
}

/** The owner's position from one place, in words. */
export function positionLine(rank: number) {
  return rank >= 1 && rank <= 20
    ? `You came up ${ordinal(rank)}.`
    : "You were not in the first 20.";
}

/** The one count under the cards. */
export function countLine(ranks: number[]) {
  return `In the first 3 at ${countBands(ranks).top} of ${ranks.length} places Kabsi checked.`;
}

export const NEARBY_SAMPLE = "Sample Google Maps results, not customer counts.";
