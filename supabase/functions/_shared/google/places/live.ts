// Places API (New): text search, autocomplete and place details. Runs on PLACES_API_KEY, so it works before the
// Business Profile grant.
// https://developers.google.com/maps/documentation/places/web-service/text-search
// https://developers.google.com/maps/documentation/places/web-service/place-details
// https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
//
// Cost guard (K-100, migration 20261012100000_places_cost_guard.sql):
//   * every request but Autocomplete carries a field mask (callers pass it; never the reviews field);
//   * Place Details are cached 24 hours by place ID and field mask: a cache hit makes no request and takes nothing
//     from the day's cap;
//   * every request that reaches Google is first counted by places_take(); past the day's cap it is not sent and the
//     result says backSoon (the tools show "Back soon"; background jobs skip the work until tomorrow);
//   * Autocomplete takes a session token, and so does the Place Details call that follows it, so a search plus one
//     lookup is billed as one session.
import { mockDb, places } from "../client.ts";
import type { AutocompleteResponse, Place, SearchTextResponse } from "../types.ts";

export type PlacesResult<T> = { ok: boolean; status: number; data: T; backSoon?: boolean; cached?: boolean };
type Kind = "search" | "details" | "autocomplete";

// What the guard needs besides Google itself; the tests replace these. The counter and the cache live in the
// database, reached with the same lazily loaded service client as the rest of the Google layer.
export const guard = {
  // True when the request may go to Google. Fails closed: a counter that cannot be read sends nothing.
  take: async (kind: Kind): Promise<boolean> => {
    const { data, error } = await (await mockDb()).rpc("places_take", { p_kind: kind });
    if (error) return false;
    return (data as { allowed?: boolean } | null)?.allowed === true;
  },
  // A cache that cannot be read is a miss, never an error.
  cacheGet: async (placeId: string, mask: string): Promise<Place | null> => {
    const { data, error } = await (await mockDb()).rpc("places_cache_get", { p_place_id: placeId, p_field_mask: mask });
    return error || !data ? null : data as Place;
  },
  cachePut: async (placeId: string, mask: string, place: Place): Promise<void> => {
    await (await mockDb()).rpc("places_cache_put", { p_place_id: placeId, p_field_mask: mask, p_data: place });
  },
};

const backSoon = <T>(): PlacesResult<T> => ({ ok: false, status: 503, data: {} as T, backSoon: true });
async function read<T>(res: Response): Promise<PlacesResult<T>> {
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) as T };
}

export async function searchText(key: string, textQuery: string, maxResultCount: number, fieldMask: string): Promise<PlacesResult<SearchTextResponse>> {
  if (!(await guard.take("search"))) return backSoon();
  return read(await places("/places:searchText", key, fieldMask, { method: "POST", body: JSON.stringify({ textQuery, maxResultCount }) }));
}

// Suggestions for a business name as the owner types. One session token for the whole typing session, passed again to
// getPlace for the chosen place. Autocomplete accepts no field mask.
export async function autocomplete(key: string, input: string, sessionToken: string): Promise<PlacesResult<AutocompleteResponse>> {
  if (!(await guard.take("autocomplete"))) return backSoon();
  return read(await places("/places:autocomplete", key, null, { method: "POST", body: JSON.stringify({ input, sessionToken }) }));
}

export async function getPlace(key: string, placeId: string, fieldMask: string, sessionToken?: string): Promise<PlacesResult<Place>> {
  const hit = await guard.cacheGet(placeId, fieldMask);
  if (hit) return { ok: true, status: 200, data: hit, cached: true };
  if (!(await guard.take("details"))) return backSoon();
  const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  const result = await read<Place>(await places(`/places/${encodeURIComponent(placeId)}${query}`, key, fieldMask));
  if (result.ok) await guard.cachePut(placeId, fieldMask, result.data).catch(() => {});
  return result;
}
