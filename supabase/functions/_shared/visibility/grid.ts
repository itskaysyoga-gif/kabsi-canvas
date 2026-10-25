// The Visibility Map's grid (master plan 27.3 item 1, 28.2): 7 by 7 points around the business, spaced evenly in
// metres, at a radius picked by trade (about 1 km for a cafe, 3 km for a salon, 5 km for a clinic or auto repair).
// The points come from @turf/destination (30.8). The same Web Mercator maths places each point on the base map, so
// the pins sit where the ranks were checked. Pure functions, no network.
import destination from "npm:@turf/destination@7.2.0";
import { point } from "npm:@turf/helpers@7.2.0";

export type LatLng = { lat: number; lng: number };
export type GridPoint = LatLng & { row: number; col: number };

export const GRID_SIZE = 7;

// Radius in km by trade. The words are matched against the business's category (DataForSEO's or the owner's).
const RADIUS_BY_TRADE: [RegExp, number][] = [
  [/dent|clinic|doctor|medical|physio|vet|hospital|auto|car repair|mechanic|garage|tyre|tire|body shop/i, 5],
  [/salon|barber|hair|nail|beauty|spa|gym|fitness|tattoo|laundr|dry clean/i, 3],
  [/cafe|café|coffee|bakery|restaurant|bar|pub|juice|dessert|ice cream|pizza|food|deli|grocery/i, 1],
];
export const DEFAULT_RADIUS_KM = 3;

export function radiusFor(category: string | null | undefined): number {
  const c = (category ?? "").trim();
  for (const [re, km] of RADIUS_BY_TRADE) if (re.test(c)) return km;
  return DEFAULT_RADIUS_KM;
}

/** 49 points, row 0 at the north edge and col 0 at the west edge; the centre (3, 3) is the business. */
export function gridPoints(center: LatLng, radiusKm: number, size = GRID_SIZE): GridPoint[] {
  const half = (size - 1) / 2;
  const step = radiusKm / half;
  const out: GridPoint[] = [];
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const north = (half - row) * step;
      const east = (col - half) * step;
      const a = north === 0 ? [center.lng, center.lat] : destination(point([center.lng, center.lat]), Math.abs(north), north > 0 ? 0 : 180).geometry.coordinates;
      const b = east === 0 ? a : destination(point(a), Math.abs(east), east > 0 ? 90 : -90).geometry.coordinates;
      out.push({ row, col, lat: round6(b[1]), lng: round6(b[0]) });
    }
  }
  return out;
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

// Web Mercator with 256 px tiles: the world is 256 * 2^zoom pixels wide.
const TILE = 256;
const worldX = (lng: number, z: number) => ((lng + 180) / 360) * TILE * 2 ** z;
const worldY = (lat: number, z: number) => {
  const s = Math.sin((lat * Math.PI) / 180);
  return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * TILE * 2 ** z;
};

/** The zoom at which the grid's full width (2 x radius) spans `spanPx` pixels. Fractional, as the static map takes it. */
export function zoomFor(center: LatLng, radiusKm: number, spanPx: number): number {
  const metresPerPx = (2 * radiusKm * 1000) / spanPx;
  const z = Math.log2((156543.03392 * Math.cos((center.lat * Math.PI) / 180)) / metresPerPx);
  return Math.round(z * 100) / 100;
}

/** Where a point lands, in pixels from the map's centre (x to the east, y to the south). */
export function project(center: LatLng, zoom: number, p: LatLng): { x: number; y: number } {
  return { x: worldX(p.lng, zoom) - worldX(center.lng, zoom), y: worldY(p.lat, zoom) - worldY(center.lat, zoom) };
}

export type Direction = "north" | "north east" | "east" | "south east" | "south" | "south west" | "west" | "north west";

/** The side of the business a set of grid cells leans to, or null when they sit all around it. */
export function directionOf(cells: { row: number; col: number }[], size = GRID_SIZE): Direction | null {
  if (!cells.length) return null;
  const half = (size - 1) / 2;
  const dx = cells.reduce((s, c) => s + (c.col - half), 0) / cells.length;
  const dy = cells.reduce((s, c) => s + (half - c.row), 0) / cells.length;
  if (Math.hypot(dx, dy) < 0.75) return null;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI; // 0 = north, 90 = east
  const names: Direction[] = ["north", "north east", "east", "south east", "south", "south west", "west", "north west"];
  return names[((Math.round(deg / 45) % 8) + 8) % 8];
}
