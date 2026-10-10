// Mock of getGoogleUpdated: the fields the mock listing shows differently from what the business sent (fields.merchant)
// are Google's updates. As live: only {location} when nothing differs, else Google's values and diffMask (P0.2-04).
import { mockDb } from "../client.ts";
import { type Fields, locationFromFields, mockDiff } from "../locations/mock.ts";
import type { GoogleUpdatedLocation } from "../types.ts";

export function googleUpdatedFromFields(location: string, f: Fields): GoogleUpdatedLocation {
  const diff = mockDiff(f);
  return diff.length ? { location: locationFromFields(location, f), diffMask: diff.join(",") } : { location: { name: location } };
}

export async function getGoogleUpdated(location: string, _readMask: string): Promise<GoogleUpdatedLocation> {
  const { data, error } = await (await mockDb()).from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (error) throw error;
  return googleUpdatedFromFields(location, (data?.fields ?? {}) as Fields);
}
