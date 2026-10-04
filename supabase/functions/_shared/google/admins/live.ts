// Account Management API: a location's admins (disconnect removes Kabsi's own access, K-41, P0.2-02).
// https://developers.google.com/my-business/reference/accountmanagement/rest/v1/locations.admins
import { AM, gbp } from "../client.ts";
import type { ListAdminsResponse } from "../types.ts";

export const listLocationAdmins = (location: string): Promise<ListAdminsResponse> => gbp(`${AM}/${location}/admins`);
export const deleteLocationAdmin = (admin: string): Promise<Record<string, never>> => gbp(`${AM}/${admin}`, { method: "DELETE" });
