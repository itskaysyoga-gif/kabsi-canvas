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
