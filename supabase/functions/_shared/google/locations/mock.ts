// Mock of the Business Information API. The mock listing lives in mock_listings as display strings (the staff mock
// edit screen writes the same strings), so Google Protection reads and puts back those strings in mock mode.
// A new mock listing starts from the business's own details only: no invented phone, category, open status or pin
// (K-99, A13), so mock values can never become part of a real baseline.
// fields.merchant holds the values the business itself sent (the seed, and every put-back). A field whose shown value
// differs from it is Google's own update, which the mock getGoogleUpdated reports (P0.2-04).
import { mockDb } from "../client.ts";
import {
  type ListLocationsResponse, type Listing, type Location, type MockSeed, PROTECTION_FIELDS, type ProtectionField,
  type SpecialHourPeriod,
} from "../types.ts";

// Special hours are kept beside the Protection fields in the same row, in Google's own shape (P0.1-13b), so a period
// Kabsi adds can be read back. Google Protection compares the PROTECTION_FIELDS only.
export type Fields = Record<string, unknown> & { specialHours?: SpecialHourPeriod[]; merchant?: Record<string, unknown> };

// The key each Protection field has in mock_listings.fields (the staff mock edit screen uses the same keys).
export const MOCK_KEY: Record<ProtectionField, string> = {
  name: "title", phone: "phone", address: "address", website: "website", regular_hours: "hours", main_category: "categories",
  open_status: "open_status", map_pin: "map_pin",
};
// Google's field name (readMask, diffMask, updateMask) for each Protection field.
export const GOOGLE_FIELD: Record<ProtectionField, string> = {
  name: "title", phone: "phoneNumbers", address: "storefrontAddress", website: "websiteUri", regular_hours: "regularHours",
  main_category: "categories", open_status: "openInfo", map_pin: "latlng",
};

export const OPEN_LABEL: Record<string, string> = {
  OPEN: "Open", CLOSED_TEMPORARILY: "Temporarily closed", CLOSED_PERMANENTLY: "Permanently closed",
};

const text = (f: Fields, k: string) => (f[k] == null ? "" : String(f[k]));

// "33.88457, 35.54615" as Google's latlng.
export function parsePin(s: string): { latitude: number; longitude: number } | null {
  const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return m ? { latitude: Number(m[1]), longitude: Number(m[2]) } : null;
}

// The documented Location shape for a mock listing. Regular hours stay out: the mock keeps them as free text.
export function locationFromFields(location: string, f: Fields): Location {
  const out: Location = { name: location, title: text(f, "title") };
  if (text(f, "phone")) out.phoneNumbers = { primaryPhone: text(f, "phone") };
  if (text(f, "address")) out.storefrontAddress = { addressLines: [text(f, "address")] };
  if (text(f, "website")) out.websiteUri = text(f, "website");
  if (text(f, "categories")) out.categories = { primaryCategory: { name: "categories/mock", displayName: text(f, "categories") } };
  if (text(f, "open_status")) out.openInfo = { status: text(f, "open_status") };
  const pin = parsePin(text(f, "map_pin"));
  if (pin) out.latlng = pin;
  if (Array.isArray(f.specialHours) && f.specialHours.length) out.specialHours = { specialHourPeriods: f.specialHours };
  return out;
}

export const seedFields = (seed: MockSeed) => ({
  title: seed.name, phone: seed.phone || "", address: seed.address ?? "", website: "",
  hours: seed.hours || "Mon to Sun 09:00 to 18:00", categories: "", open_status: "", map_pin: "",
});

// The Protection fields Google shows differently from what the business sent (Google's names, as in diffMask).
export function mockDiff(f: Fields): string[] {
  const own = f.merchant ?? {};
  return PROTECTION_FIELDS.filter((k) => MOCK_KEY[k] in own && String(own[MOCK_KEY[k]] ?? "") !== text(f, MOCK_KEY[k]))
    .map((k) => GOOGLE_FIELD[k]);
}

export const listLocations = (_account: string, _readMask: string, _pageToken = ""): Promise<ListLocationsResponse> => Promise.resolve({});

export async function getLocation(location: string, _readMask: string): Promise<Location> {
  const { data } = await (await mockDb()).from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  return locationFromFields(location, (data?.fields ?? {}) as Fields);
}

export function listingFromFields(f: Fields): Listing {
  return Object.fromEntries(PROTECTION_FIELDS.map((k) => {
    const v = text(f, MOCK_KEY[k]);
    return [k, { display: k === "open_status" ? (OPEN_LABEL[v] ?? v) : v, raw: v }];
  })) as Listing;
}

// The listing for Google Protection, created from the seed on first read. The business's own values start as the
// seed; a listing made before P0.2-04 takes what it shows now.
export async function getListing(location: string, seed: MockSeed): Promise<Listing> {
  const db = await mockDb();
  const { data, error } = await db.from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (error) throw error;
  let fields = (data?.fields ?? null) as Fields | null;
  if (!fields) {
    const seeded = seedFields(seed);
    fields = { ...seeded, merchant: { ...seeded } };
    const { error: ie } = await db.from("mock_listings").insert({ google_location_id: location, fields });
    if (ie) throw ie;
  } else if (!fields.merchant) {
    const own = Object.fromEntries(PROTECTION_FIELDS.map((k) => [MOCK_KEY[k], text(fields!, MOCK_KEY[k])]));
    fields = await setField(location, "merchant", own);
  }
  return listingFromFields(fields);
}

// One field at a time under the row lock (mock_listing_set), as Google's updateMask does, so two writes to the same
// business side by side never undo each other. A business with no mock listing answers 404 like Google.
async function setField(location: string, key: string, value: unknown, fn = "mock_listing_set"): Promise<Fields> {
  const { data, error } = await (await mockDb()).rpc(fn, { p_location: location, p_key: key, p_value: value ?? null });
  if (error) throw error;
  if (!data) throw new Error(`google 404 mock/${location}: {"error":{"code":404,"status":"NOT_FOUND"}}`);
  return data as Fields;
}

// A put-back: Google shows the value and takes it as the business's own (no longer Google's update).
export async function patchListing(location: string, field: ProtectionField, raw: unknown) {
  await setField(location, MOCK_KEY[field], raw, "mock_listing_send");
}

// PATCH with updateMask specialHours, as Google: the list is replaced as a whole. The listing row is made by Google
// Protection's first read, from the business's own details.
export async function patchLocation(location: string, updateMask: string, body: Partial<Location>): Promise<Location> {
  if (updateMask !== "specialHours") throw new Error(`mock patchLocation: ${updateMask} is not modelled`);
  return locationFromFields(location, await setField(location, "specialHours", body.specialHours?.specialHourPeriods ?? []));
}

// The mock row as stored, or null when the business has no mock listing yet.
export async function readFields(location: string): Promise<Fields | null> {
  const { data, error } = await (await mockDb()).from("mock_listings").select("fields").eq("google_location_id", location).maybeSingle();
  if (error) throw error;
  return (data?.fields ?? null) as Fields | null;
}
