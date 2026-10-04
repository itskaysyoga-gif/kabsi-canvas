// Place Actions API: booking, order and reservation links on the profile (K-117, P1-06d).
// https://developers.google.com/my-business/reference/placeactions/rest/v1/locations.placeActionLinks
import { gbp, PLACE_ACTIONS } from "../client.ts";
import type { ListPlaceActionLinksResponse } from "../types.ts";

export const listPlaceActionLinks = (location: string): Promise<ListPlaceActionLinksResponse> => gbp(`${PLACE_ACTIONS}/${location}/placeActionLinks`);
