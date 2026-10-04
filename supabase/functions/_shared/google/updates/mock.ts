// Mock of getGoogleUpdated: Google has suggested nothing (empty diff mask).
import type { GoogleUpdatedLocation } from "../types.ts";

export const getGoogleUpdated = (location: string, _readMask: string): Promise<GoogleUpdatedLocation> =>
  Promise.resolve({ location: { name: location }, diffMask: "", pendingMask: "" });
