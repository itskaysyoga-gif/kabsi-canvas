// Demo workspace helpers (P0.1-06, R-17). Pure, no imports, so they can be tested on their own.
// A demo business has a made-up Google location id, "locations/demo-<name>". It always runs on the mock, whatever
// GOOGLE_MODE says, so a recording or Google's reviewer can never touch a real Google profile.

export const DEMO_PREFIX = "locations/demo-";
export const isDemoLocationId = (id: string | null | undefined): boolean => !!id && id.startsWith(DEMO_PREFIX);

export const googleModeFor = (locationId: string | null | undefined, globalMode: "mock" | "live"): "mock" | "live" =>
  isDemoLocationId(locationId) ? "mock" : globalMode;
