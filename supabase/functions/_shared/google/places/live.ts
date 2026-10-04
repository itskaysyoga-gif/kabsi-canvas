// Places API (New): text search and place details, always with a field mask. Runs on PLACES_API_KEY, so it works
// before the Business Profile grant.
// https://developers.google.com/maps/documentation/places/web-service/text-search
// https://developers.google.com/maps/documentation/places/web-service/place-details
import { places } from "../client.ts";
import type { Place, SearchTextResponse } from "../types.ts";

export type PlacesResult<T> = { ok: boolean; status: number; data: T };

async function read<T>(res: Response): Promise<PlacesResult<T>> {
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) as T };
}
export const searchText = async (key: string, textQuery: string, maxResultCount: number, fieldMask: string): Promise<PlacesResult<SearchTextResponse>> =>
  read(await places("/places:searchText", key, fieldMask, { method: "POST", body: JSON.stringify({ textQuery, maxResultCount }) }));
export const getPlace = async (key: string, placeId: string, fieldMask: string): Promise<PlacesResult<Place>> =>
  read(await places(`/places/${encodeURIComponent(placeId)}`, key, fieldMask));
