// Business Information API: Google's own updates to a listing (Google Protection, K-19, P0.2-04).
// https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/getGoogleUpdated
import { BI, gbp } from "../client.ts";
import type { GoogleUpdatedLocation } from "../types.ts";

export const getGoogleUpdated = (location: string, readMask: string): Promise<GoogleUpdatedLocation> =>
  gbp(`${BI}/${location}:getGoogleUpdated?readMask=${readMask}`);
