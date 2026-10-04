// Business Information API: locations (the listing itself).
// https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations
import { BI, gbp } from "../client.ts";
import type { ListLocationsResponse, Location } from "../types.ts";

export const listLocations = (account: string, readMask: string, pageToken = ""): Promise<ListLocationsResponse> =>
  gbp(`${BI}/${account}/locations?readMask=${readMask}&pageSize=100${pageToken ? `&pageToken=${pageToken}` : ""}`);
export const getLocation = (location: string, readMask: string): Promise<Location> => gbp(`${BI}/${location}?readMask=${readMask}`);
// PATCH replaces each field named in updateMask as a whole.
export const patchLocation = (location: string, updateMask: string, body: Partial<Location>): Promise<Location> =>
  gbp(`${BI}/${location}?updateMask=${updateMask}`, { method: "PATCH", body: JSON.stringify(body) });
