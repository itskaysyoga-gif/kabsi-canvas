// Places API (New): text search, autocomplete and place details. Runs on PLACES_API_KEY, so it works before the
// Business Profile grant.
// https://developers.google.com/maps/documentation/places/web-service/text-search
// https://developers.google.com/maps/documentation/places/web-service/place-details
// https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
//
// Cost guard (K-100, migration 20261012100000_places_cost_guard.sql):
//   * every request but Autocomplete carries a field mask (callers pass it; never the reviews field);
//   * nothing from Places is stored except the place ID (master plan 30.10, Maps Platform Terms 3.2.3(b)): every
//     Place Details read goes to Google, and nothing is cached;
//   * every request that reaches Google is first counted by places_take(); past the day's cap it is not sent and the
//     result says backSoon (the tools show "Back soon"; background jobs skip the work until tomorrow);
//   * Autocomplete takes a session token, and so does the Place Details call that follows it, so a search plus one
//     lookup is billed as one session.
import { mockDb, places } from "../client.ts";
import type { AutocompleteResponse, Place, SearchTextResponse } from "../types.ts";

export type PlacesResult<T> = { ok: boolean; status: number; data: T; backSoon?: boolean };
type Kind = "search" | "details" | "autocomplete";

// What the guard needs besides Google itself; the tests replace it. The counter lives in the database, reached with
// the same lazily loaded service client as the rest of the Google layer.
export const guard = {
  // True when the request may go to Google. Fails closed: a counter that cannot be read sends nothing.
  take: async (kind: Kind): Promise<boolean> => {
    const { data, error } = await (await mockDb()).rpc("places_take", { p_kind: kind });
    if (error) return false;
    return (data as { allowed?: boolean } | null)?.allowed === true;
  },
};

const backSoon = <T>(): PlacesResult<T> => ({ ok: false, status: 503, data: {} as T, backSoon: true });
async function read<T>(res: Response): Promise<PlacesResult<T>> {
  return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) as T };
}

// languageCode (Access 2): the language of the names and addresses Google returns; left out, Google prefers English.
export async function searchText(key: string, textQuery: string, maxResultCount: number, fieldMask: string, languageCode?: string): Promise<PlacesResult<SearchTextResponse>> {
  if (!(await guard.take("search"))) return backSoon();
  const body = { textQuery, maxResultCount, ...(languageCode ? { languageCode } : {}) };
  return read(await places("/places:searchText", key, fieldMask, { method: "POST", body: JSON.stringify(body) }));
}

// Suggestions for a business name as the owner types. One session token for the whole typing session, passed again to
// getPlace for the chosen place. Autocomplete accepts no field mask.
export async function autocomplete(key: string, input: string, sessionToken: string): Promise<PlacesResult<AutocompleteResponse>> {
  if (!(await guard.take("autocomplete"))) return backSoon();
  return read(await places("/places:autocomplete", key, null, { method: "POST", body: JSON.stringify({ input, sessionToken }) }));
}

export async function getPlace(key: string, placeId: string, fieldMask: string, sessionToken?: string): Promise<PlacesResult<Place>> {
  if (!(await guard.take("details"))) return backSoon();
  const query = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : "";
  return read<Place>(await places(`/places/${encodeURIComponent(placeId)}${query}`, key, fieldMask));
}

// The free Profile Check (P0.4-01, K-100): the one field mask the snapshot ever sends. Rating, review count, hours,
// open status, phone, website, category and photo presence, plus the name and address to show. The reviews field is
// never in it (it moves the whole call to the 30 dollar per 1,000 tier); tests hold that.
export const SNAPSHOT_FIELD_MASK =
  "id,displayName,formattedAddress,primaryTypeDisplayName,businessStatus,rating,userRatingCount,regularOpeningHours,currentOpeningHours,nationalPhoneNumber,websiteUri,photos";

export const getSnapshotPlace = (key: string, placeId: string): Promise<PlacesResult<Place>> =>
  getPlace(key, placeId, SNAPSHOT_FIELD_MASK);

