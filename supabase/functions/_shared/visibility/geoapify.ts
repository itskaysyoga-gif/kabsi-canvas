// The base street map (master plan 28.2): Geoapify Static Maps on its free plan (3000 credits a day; one map is about
// 2 credits), never OpenStreetMap's own tile servers. The key is GEOAPIFY_API_KEY in Supabase secrets; without it
// the map image is drawn on a plain ground and V1 runs on, so a missing key never stops a scan. Geoapify prints its
// own attribution on the map (default), and the image adds the credit line from docs/COPY.md section 21.
import type { LatLng } from "./grid.ts";
import { MAP_HEIGHT, SIZE } from "./map-image.ts";

export const STYLE = "positron"; // light grey streets: the pins carry the colour

export function staticMapUrl(key: string, center: LatLng, zoom: number): string {
  const q = new URLSearchParams({
    style: STYLE,
    width: String(SIZE),
    height: String(MAP_HEIGHT),
    center: `lonlat:${center.lng},${center.lat}`,
    zoom: String(zoom),
    format: "jpeg",
    apiKey: key,
  });
  return `https://maps.geoapify.com/v1/staticmap?${q}`;
}

/** The base map, or null without a key or when Geoapify fails (the image then uses the plain ground). */
export async function baseMap(key: string | undefined, center: LatLng, zoom: number, fetcher: typeof fetch = fetch) {
  if (!key) return null;
  try {
    const res = await fetcher(staticMapUrl(key, center, zoom), { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").includes("png") ? "image/png" as const : "image/jpeg" as const;
    return { bytes: new Uint8Array(await res.arrayBuffer()), type };
  } catch {
    return null;
  }
}

// ─── Place names for the nearby cards (30.15 section 2, V4) ──────────────────────────────────────────────────────────
// Geoapify reverse geocoding (free plan, 3000 requests a day; three a map) turns one real checked point into the nearest
// named landmark, station or street. A whole neighbourhood, district or city is never used as a place's name, a name more
// than 250 m from the point is not "near" it, and a name in another script is dropped (no Arabic shown, R-61): the card then
// says how far and which way the point is instead. Names are © OpenStreetMap contributors (the image carries the credit).
type GeoResult = { name?: string; street?: string; result_type?: string; distance?: number; category?: string };

const LANDMARK = new Set(["amenity", "building"]);
const MAX_METRES = 250;

export function reverseUrl(key: string, p: LatLng): string {
  const q = new URLSearchParams({ lat: String(p.lat), lon: String(p.lng), format: "json", limit: "1", lang: "en", apiKey: key });
  return `https://api.geoapify.com/v1/geocode/reverse?${q}`;
}

/** The name an owner would recognise, or null: a named landmark or station close by, else the street. */
export function nameFrom(r: GeoResult | null | undefined): string | null {
  if (!r) return null;
  if (typeof r.distance === "number" && r.distance > MAX_METRES) return null;
  const clean = (s: string | undefined) => {
    const t = (s ?? "").replace(/\s+/g, " ").trim();
    // Latin letters, digits and plain punctuation only; anything else (another script) is not shown.
    return t && t.length <= 60 && /^[\p{Script=Latin}\p{N}\s'&.,()/-]+$/u.test(t) && /\p{L}/u.test(t) ? t : null;
  };
  const landmark = LANDMARK.has(r.result_type ?? "") ? clean(r.name) : null;
  if (landmark && !/^\d/.test(landmark)) return landmark;
  return r.result_type === "street" || r.result_type === "building" || r.result_type === "amenity" ? clean(r.street) : null;
}

/** One reverse lookup, or null without a key or on any failure (the card falls back to the distance words). */
export function placeNamer(key: string | undefined, fetcher: typeof fetch = fetch) {
  return async (p: LatLng): Promise<string | null> => {
    if (!key) return null;
    try {
      const res = await fetcher(reverseUrl(key, p), { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) {
        await res.body?.cancel();
        return null;
      }
      const body = (await res.json()) as { results?: GeoResult[] };
      return nameFrom(body.results?.[0]);
    } catch {
      return null;
    }
  };
}
