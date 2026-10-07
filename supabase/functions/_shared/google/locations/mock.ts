// Mock of the Business Information API. The mock listing lives in mock_listings as display strings (the staff mock
// edit screen writes the same strings), so Google Protection reads and puts back those strings in mock mode.
// A new mock listing starts from the business's own details only: no invented phone or category (K-99, A13), so
// mock values can never become part of a real baseline.
import { mockDb } from "../client.ts";
import {
  SHIELD_FIELDS, type ListLocationsResponse, type Listing, type Location, type MockSeed, type ShieldField, type SpecialHourPeriod,
} from "../types.ts";

// Special hours are kept beside the Protection fields in the same row, in Google's own shape (P0.1-13b), so a period
// Kabsi adds can be read back. Google Protection compares the SHIELD_FIELDS only.
type Fields = Partial<Record<ShieldField, unknown>> & { specialHours?: SpecialHourPeriod[] };

// The documented Location shape for a mock listing. Regular hours stay out: the mock keeps them as free text.
export function locationFromFields(location: string, f: Fields): Location {
  const s = (k: ShieldField) => (f[k] == null ? "" : String(f[k]));
  const out: Location = { name: location, title: s("title") };
  if (s("phone")) out.phoneNumbers = { primaryPhone: s("phone") };
  if (s("address")) out.storefrontAddress = { addressLines: [s("address")] };
  if (s("website")) out.websiteUri = s("website");
  if (s("categories")) out.categories = { primaryCategory: { name: "categories/mock", displayName: s("categories") } };
  if (Array.isArray(f.specialHours) && f.specialHours.length) out.specialHours = { specialHourPeriods: f.specialHours };
  return out;
}

export const seedFields = (seed: MockSeed) => ({
  title: seed.name, phone: seed.phone || "", address: seed.address ?? "", website: "",
  hours: seed.hours || "Mon to Sun 09:00 to 18:00", categories: "",
});

export const listLocations = (_account: string, _readMask: string, _pageToken = ""): Promise<ListLocationsResponse> => Promise.resolve({});

export async function getLocation(location: string, _readMask: string): Promise<Location> {
  const { data } = await (await mockDb()).from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  return locationFromFields(location, (data?.fields ?? {}) as Fields);
}

// The listing for Google Protection, created from the seed on first read.
export async function getListing(location: string, seed: MockSeed): Promise<Listing> {
  const db = await mockDb();
  let { data } = await db.from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (!data) {
    const fields = seedFields(seed);
    await db.from("mock_listings").insert({ google_location_id: location, fields });
    data = { fields };
  }
  const f = data.fields as Record<string, string>;
  return Object.fromEntries(SHIELD_FIELDS.map((k) => [k, { display: String(f[k] ?? ""), raw: String(f[k] ?? "") }])) as Listing;
}

export async function patchListing(location: string, field: ShieldField, raw: unknown) {
  const db = await mockDb();
  const { data } = await db.from("mock_listings").select("fields").eq("google_location_id", location).single();
  const fields = { ...(data!.fields as Record<string, unknown>), [field]: raw };
  await db.from("mock_listings").update({ fields, updated_at: new Date().toISOString() }).eq("google_location_id", location);
}

// PATCH with updateMask specialHours, as Google: the list is replaced as a whole. A business with no mock listing yet
// answers 404 like Google; the listing row is made by Google Protection's first read, from the business's own details.
export async function patchLocation(location: string, updateMask: string, body: Partial<Location>): Promise<Location> {
  if (updateMask !== "specialHours") throw new Error(`mock patchLocation: ${updateMask} is not modelled`);
  const db = await mockDb();
  const { data, error } = await db.from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`google 404 mock/${location}: {"error":{"code":404,"status":"NOT_FOUND"}}`);
  const fields = { ...(data.fields as Fields), specialHours: body.specialHours?.specialHourPeriods ?? [] };
  const { error: e2 } = await db.from("mock_listings").update({ fields, updated_at: new Date().toISOString() }).eq("google_location_id", location);
  if (e2) throw e2;
  return locationFromFields(location, fields);
}

// The display string Google Protection keeps for one field, or null when the mock has no listing for the business.
export async function fieldDisplay(location: string, field: ShieldField): Promise<string | null> {
  const { data, error } = await (await mockDb()).from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (error) throw error;
  return data ? String((data.fields as Record<string, unknown>)[field] ?? "") : null;
}
