// Mock of a location's admins: the owner and Kabsi's business group as Manager.
import { MOCK_ACCOUNT } from "../accounts/mock.ts";
import type { ListAdminsResponse } from "../types.ts";

export const listLocationAdmins = (location: string): Promise<ListAdminsResponse> => Promise.resolve({
  admins: [
    { name: `${location}/admins/mock-owner`, admin: "Business owner", role: "PRIMARY_OWNER" },
    { name: `${location}/admins/mock-kabsi`, admin: "Kabsi Clients", account: MOCK_ACCOUNT, role: "MANAGER" },
  ],
});
export const deleteLocationAdmin = (_admin: string): Promise<Record<string, never>> => Promise.resolve({});
