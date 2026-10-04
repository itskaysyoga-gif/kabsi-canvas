// Account Management API: accounts and Manager invitations.
// https://developers.google.com/my-business/reference/accountmanagement/rest
import { AM, gbp } from "../client.ts";
import type { ListAccountsResponse, ListInvitationsResponse } from "../types.ts";

export const listAccounts = (): Promise<ListAccountsResponse> => gbp(`${AM}/accounts`);
export const listInvitations = (account: string): Promise<ListInvitationsResponse> => gbp(`${AM}/${account}/invitations`);
export const acceptInvitation = (invitation: string): Promise<Record<string, never>> => gbp(`${AM}/${invitation}:accept`, { method: "POST", body: "{}" });
