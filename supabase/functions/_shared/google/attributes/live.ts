// Business Information API: a location's attributes.
// https://developers.google.com/my-business/reference/businessinformation/rest/v1/locations/getAttributes
import { BI, gbp } from "../client.ts";
import type { Attributes } from "../types.ts";

export const getAttributes = (location: string): Promise<Attributes> => gbp(`${BI}/${location}/attributes`);
