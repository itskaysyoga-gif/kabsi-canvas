// The nearby places (master plan 30.15 section 2, V4 item 5): what an owner sees first, on the website and as the WhatsApp
// image. Three checked places as cards (near the business, plus the two checked points whose results differ most from it),
// each with the owner's position and who came first, then one count from every checked place. The 7 by 7 dots stay behind
// "Detailed results". Pure, apart from the place names, which are passed in.
//
// Place names come only from reverse geocoding the real checked point (the nearest named landmark, station or street), never
// invented and never a whole neighbourhood from one point. When no name is close enough the card says how far and which way
// the place is from the business, which is also only what was measured. No corrective task is made because a competitor came
// first (30.15 section 2).
import { DEPTH, isSame, type Identity } from "./dataforseo.ts";
import { type Direction, directionOf, GRID_SIZE, type LatLng } from "./grid.ts";
import type { CellResult } from "./scan.ts";

export const SAMPLE_NOTE = "Sample Google Maps results, not customer counts.";

/** A reverse-geocoded name for one checked point, or null. Supplied by geoapify.ts in production, a fake in tests. */
export type PlaceName = (p: LatLng) => Promise<string | null>;

export type NearbyCard = {
  kind: "home" | "away";
  row: number;
  col: number;
  /** "Near your salon", "Near Dubai Mall Metro Station", "About 2 km north east of your salon". */
  place: string;
  /** The reverse-geocoded name, when there is one (kept so the website can show it apart). */
  name: string | null;
  rank: number | null;
  /** "2nd", "not in the first 20". */
  position: string;
  /** The business that came first there, or null when it was the owner's own. */
  first: string | null;
  firstIsYou: boolean;
};
export type Nearby = { cards: NearbyCard[]; top3: number; points: number; count_line: string; keyword: string; note: string };

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}
export const positionWords = (rank: number | null) => (rank == null || rank > DEPTH ? `not in the first ${DEPTH}` : ordinal(rank));

/** "In the first 3 at 18 of 49 places Kabsi checked." */
export const countLine = (top3: number, points: number) => `In the first 3 at ${top3} of ${points} places Kabsi checked.`;

const ord = (r: number | null) => (r == null ? DEPTH + 1 : r);
const firstOf = (c: CellResult) => c.items.find((i) => i.rank === 1) ?? c.items[0] ?? null;

/**
 * The two checked points whose results differ most from the centre: the owner's position moved the most, or someone else came
 * first. The second is never right beside the first, so the two cards show two different parts of the area.
 */
export function pickAway(cells: CellResult[]): CellResult[] {
  const half = (GRID_SIZE - 1) / 2;
  const centre = cells.find((c) => c.row === half && c.col === half);
  if (!centre) return [];
  const centreFirst = firstOf(centre);
  const score = (c: CellResult) => {
    const f = firstOf(c);
    const otherFirst = f && centreFirst && !isSame(f, { cid: centreFirst.cid, place_id: centreFirst.place_id, title: centreFirst.title }) ? 5 : 0;
    return Math.abs(ord(c.rank) - ord(centre.rank)) + otherFirst;
  };
  const dist = (a: { row: number; col: number }, b: { row: number; col: number }) => Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col));
  const ranked = cells
    .filter((c) => c !== centre)
    .map((c) => ({ c, s: score(c), d: dist(c, centre) }))
    .sort((a, b) => b.s - a.s || b.d - a.d || a.c.row - b.c.row || a.c.col - b.c.col);
  const out: CellResult[] = [];
  for (const r of ranked) {
    if (out.length === 2) break;
    if (out.some((o) => dist(o, r.c) < 2)) continue;
    out.push(r.c);
  }
  return out;
}

/** How far and which way a checked point is from the business, from the grid's own spacing. */
export function offsetWords(row: number, col: number, radiusKm: number, businessType: string): string {
  const half = (GRID_SIZE - 1) / 2;
  const step = radiusKm / half;
  const km = Math.hypot((row - half) * step, (col - half) * step);
  const d: Direction | null = directionOf([{ row, col }]);
  const dist = km < 1 ? `${Math.round(km * 10) * 100} m` : `${Math.round(km)} km`;
  return d ? `About ${dist} ${d} of your ${businessType}` : `Near your ${businessType}`;
}

/** The three cards and the one count. `name` reverse-geocodes a point; a failure there leaves the distance words. */
export async function nearbyPlaces(o: {
  cells: (CellResult & LatLng)[];
  who: Identity;
  keyword: string;
  radiusKm: number;
  businessType: string;
  name?: PlaceName;
}): Promise<Nearby> {
  const half = (GRID_SIZE - 1) / 2;
  const centre = o.cells.find((c) => c.row === half && c.col === half);
  const card = async (c: CellResult & LatLng, kind: "home" | "away"): Promise<NearbyCard> => {
    let name: string | null = null;
    if (kind === "away" && o.name) {
      try {
        name = await o.name({ lat: c.lat, lng: c.lng });
      } catch {
        name = null;
      }
    }
    const f = firstOf(c);
    const firstIsYou = !!f && isSame(f, o.who);
    return {
      kind, row: c.row, col: c.col, name, rank: c.rank, position: positionWords(c.rank),
      place: kind === "home" ? `Near your ${o.businessType}` : name ? `Near ${name}` : offsetWords(c.row, c.col, o.radiusKm, o.businessType),
      first: f && !firstIsYou ? f.title : null, firstIsYou,
    };
  };
  const cards: NearbyCard[] = [];
  if (centre) cards.push(await card(centre, "home"));
  for (const c of pickAway(o.cells)) cards.push(await card(c as CellResult & LatLng, "away"));
  const top3 = o.cells.filter((c) => c.rank != null && c.rank <= 3).length;
  return { cards, top3, points: o.cells.length, count_line: countLine(top3, o.cells.length), keyword: o.keyword, note: SAMPLE_NOTE };
}

/** One card in words: "Near your salon you came up 2nd for 'hair salon'." / "Near the metro station, Juniper Hair Studio came first." */
export function cardLine(c: NearbyCard, keyword: string): string {
  if (c.kind === "home") {
    return c.rank != null && c.rank <= DEPTH
      ? `${c.place} you came up ${c.position} for '${keyword}'.`
      : `${c.place} you were ${c.position} for '${keyword}'.`;
  }
  if (c.firstIsYou) return `${c.place}, you came first.`;
  return c.first ? `${c.place}, ${c.first} came first. You were ${c.position}.` : `${c.place}, you were ${c.position}.`;
}

/** The WhatsApp text that goes with the image (docs/COPY.md 0.1). */
export function nearbyText(n: Nearby, date: string): string {
  return [...n.cards.map((c) => cardLine(c, n.keyword)), n.count_line, `'${n.keyword}', ${date}. ${n.note}`].join(" ");
}
