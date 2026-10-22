// Mock of getGoogleUpdated: the fields the mock listing shows differently from what the business sent (fields.merchant)
// are Google's updates. As live: always the whole location, and the diffMask only when something differs (P0.2-04;
// Google returns the full location with no diffMask when nothing differs, seen live on Yawmiyati 8 Oct 2026).
import { mockDb } from "../client.ts";
import { type Fields, locationFromFields, mockDiff } from "../locations/mock.ts";
import type { GoogleUpdatedLocation } from "../types.ts";

export function googleUpdatedFromFields(location: string, f: Fields): GoogleUpdatedLocation {
  const diff = mockDiff(f);
  const full = locationFromFields(location, f);
  return diff.length ? { location: full, diffMask: diff.join(",") } : { location: full };
}

export async function getGoogleUpdated(location: string, _readMask: string): Promise<GoogleUpdatedLocation> {
  const { data, error } = await (await mockDb()).from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (error) throw error;
  return googleUpdatedFromFields(location, (data?.fields ?? {}) as Fields);
}
