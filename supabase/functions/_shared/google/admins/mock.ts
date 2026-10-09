// Mock of a location's admins: the owner and Kabsi's business group as Manager (P0.2-02). The state lives in
// mock_listings, beside the mock listing: kabsi_removed_at once Kabsi's entry was deleted, and admin_removal 'refuse'
// to make the delete fail the way Google would refuse it (the staff follow-up path). Tests swap the store.
import { MOCK_ACCOUNT } from "../accounts/mock.ts";
import { mockDb } from "../client.ts";
import type { ListAdminsResponse } from "../types.ts";

export type AdminStore = {
  read: (location: string) => Promise<{ removed: boolean; refuse: boolean }>;
  remove: (location: string) => Promise<void>;
};

const dbStore: AdminStore = {
  async read(location) {
    const { data, error } = await (await mockDb()).from("mock_listings").select("kabsi_removed_at, admin_removal")
      .eq("google_location_id", location).maybeSingle();
    if (error) throw error;
    return { removed: !!data?.kabsi_removed_at, refuse: data?.admin_removal === "refuse" };
  },
  async remove(location) {
    const db = await mockDb();
    const at = new Date().toISOString();
    const { data, error } = await db.from("mock_listings").update({ kabsi_removed_at: at }).eq("google_location_id", location)
      .select("google_location_id");
    if (error) throw error;
    if (data?.length) return;
    const { error: ie } = await db.from("mock_listings").insert({ google_location_id: location, fields: {}, kabsi_removed_at: at });
    if (ie) throw ie;
  },
};

let store: AdminStore = dbStore;
export const useAdminStore = (s: AdminStore | null) => void (store = s ?? dbStore);

const kabsiAdmin = (location: string) => `${location}/admins/mock-kabsi`;

export async function listLocationAdmins(location: string): Promise<ListAdminsResponse> {
  const { removed } = await store.read(location);
  const admins: NonNullable<ListAdminsResponse["admins"]> = [{ name: `${location}/admins/mock-owner`, admin: "Business owner", role: "PRIMARY_OWNER" }];
  if (!removed) admins.push({ name: kabsiAdmin(location), admin: "Kabsi Clients", account: MOCK_ACCOUNT, role: "MANAGER" });
  return { admins };
}

export async function deleteLocationAdmin(admin: string): Promise<Record<string, never>> {
  const location = admin.split("/admins/")[0];
  if (admin !== kabsiAdmin(location)) throw new Error(`google 404 mock: no such admin ${admin}`);
  if ((await store.read(location)).refuse) throw new Error("google 403 mock: PERMISSION_DENIED, the caller cannot remove this admin");
  await store.remove(location);
  return {};
}
