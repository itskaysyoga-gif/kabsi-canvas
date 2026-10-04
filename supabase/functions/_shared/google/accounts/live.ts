// Account Management API: accounts and Manager invitations.
// https://developers.google.com/my-business/reference/accountmanagement/rest
import { AM, gbp } from "../client.ts";
import type { ListAccountsResponse, ListInvitationsResponse } from "../types.ts";

export const listAccounts = (): Promise<ListAccountsResponse> => gbp(`${AM}/accounts`);
export const listInvitations = (account: string): Promise<ListInvitationsResponse> => gbp(`${AM}/${account}/invitations`);
export const acceptInvitation = (invitation: string): Promise<Record<string, never>> => gbp(`${AM}/${invitation}:accept`, { method: "POST", body: "{}" });

// One call with a token the caller already holds, no retry. For the health check only: before the Business Profile
// API grant Google answers 429 with a zero quota, which gbp() would retry four times.
export async function listAccountsOnce(accessToken: string): Promise<{ ok: boolean; status: number; body: ListAccountsResponse & { error?: { message?: string } } }> {
  const res = await fetch(`${AM}/accounts`, { headers: { authorization: `Bearer ${accessToken}` } });
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => ({})) };
}
