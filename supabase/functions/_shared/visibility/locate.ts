// Finding the business in public Google Maps results (master plan 30.10.2): the grid's centre, its cid and place ID,
// and its category (for the radius) all come from one DataForSEO live search for "<name> <address>" in its country.
// Nothing from Places is used for it. One call, 0.2 cents; the result is kept on the keyword row.
import { type Identity, isSame, type MapsItem, type MapsProvider } from "./dataforseo.ts";

// Google's location codes for the countries Kabsi sells in first (27.5) and their neighbours.
export const COUNTRY_CODES: Record<string, number> = {
  AE: 2784, GB: 2826, US: 2840, SA: 2682, QA: 2634, KW: 2414, BH: 2048, OM: 2512, JO: 2400, LB: 2422, EG: 2818,
  CA: 2124, AU: 2036, IE: 2372, ES: 2724, FR: 2250, DE: 2276,
};

export type Located = { lat: number; lng: number; title: string; cid: string | null; place_id: string | null; category: string | null };

export async function locate(provider: MapsProvider, b: { name: string; address: string | null; country: string | null; place_id: string | null }): Promise<Located | null> {
  const code = COUNTRY_CODES[(b.country ?? "").toUpperCase()];
  if (!code) return null;
  const items = await provider.liveOne({ keyword: [b.name, b.address].filter(Boolean).join(" "), locationCode: code, tag: "locate" });
  const who: Identity = { place_id: b.place_id, title: b.name };
  const hit: MapsItem | undefined = items.find((i) => isSame(i, who)) ?? (items.length === 1 ? items[0] : undefined);
  if (!hit || hit.lat == null || hit.lng == null) return null;
  return { lat: hit.lat, lng: hit.lng, title: hit.title, cid: hit.cid, place_id: hit.place_id, category: hit.category };
}
