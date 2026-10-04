// Mock of the Business Information API. The mock listing lives in mock_listings as display strings (the staff mock
// edit screen writes the same strings), so Google Protection reads and puts back those strings in mock mode.
// A new mock listing starts from the business's own details only: no invented phone or category (K-99, A13), so
// mock values can never become part of a real baseline.
import { mockDb } from "../client.ts";
import { SHIELD_FIELDS, type ListLocationsResponse, type Listing, type Location, type MockSeed, type ShieldField } from "../types.ts";

type Fields = Partial<Record<ShieldField, unknown>>;

// The documented Location shape for a mock listing. Hours stay out: the mock keeps them as free text.
export function locationFromFields(location: string, f: Fields): Location {
  const s = (k: ShieldField) => (f[k] == null ? "" : String(f[k]));
  const out: Location = { name: location, title: s("title") };
  if (s("phone")) out.phoneNumbers = { primaryPhone: s("phone") };
  if (s("address")) out.storefrontAddress = { addressLines: [s("address")] };
  if (s("website")) out.websiteUri = s("website");
  if (s("categories")) out.categories = { primaryCategory: { name: "categories/mock", displayName: s("categories") } };
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
