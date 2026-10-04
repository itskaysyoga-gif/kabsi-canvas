// Mock of Places API (New) for the Deno tests: Places has no mock switch at run time (it needs only
// PLACES_API_KEY), and demo businesses have no place id, so no live path reaches this module.
import type { PlacesResult } from "./live.ts";
import type { Place, SearchTextResponse } from "../types.ts";

const MOCK_PLACE: Place = {
  id: "ChIJmockPlace0000000000000", name: "places/ChIJmockPlace0000000000000",
  displayName: { text: "Harbour Lane Coffee", languageCode: "en" }, formattedAddress: "12 Harbour Lane, Example Town",
  addressComponents: [
    { longText: "Example Town", shortText: "Example Town", types: ["locality", "political"], languageCode: "en" },
    { longText: "United States", shortText: "US", types: ["country", "political"], languageCode: "en" },
  ],
  primaryType: "coffee_shop", primaryTypeDisplayName: { text: "Coffee Shop", languageCode: "en-US" },
  types: ["coffee_shop", "cafe", "food", "point_of_interest", "establishment"], rating: 4.6, userRatingCount: 128,
};

// Field masks name fields as "places.x" in a search and "x" in details; keep only those, as Google does.
function pick(place: Place, fields: string[]): Place {
  const out: Record<string, unknown> = {};
  for (const f of fields) if (f in place) out[f] = (place as Record<string, unknown>)[f];
  return out as Place;
}
export const searchText = (_key: string, _textQuery: string, maxResultCount: number, fieldMask: string): Promise<PlacesResult<SearchTextResponse>> => {
  const fields = fieldMask.split(",").map((f) => f.trim().replace(/^places\./, ""));
  return Promise.resolve({ ok: true, status: 200, data: { places: [pick(MOCK_PLACE, fields)].slice(0, maxResultCount) } });
};
export const getPlace = (_key: string, _placeId: string, fieldMask: string): Promise<PlacesResult<Place>> =>
  Promise.resolve({ ok: true, status: 200, data: pick(MOCK_PLACE, fieldMask.split(",").map((f) => f.trim())) });
