// Mock of the Account Management API: Kabsi's business group with no pending invitations. Manager access in mock
// mode is granted by api/cron.ts without asking Google.
import type { ListAccountsResponse, ListInvitationsResponse } from "../types.ts";

export const MOCK_ACCOUNT = "accounts/mock-kabsi-clients";

export const listAccounts = (): Promise<ListAccountsResponse> => Promise.resolve({
  accounts: [{ name: MOCK_ACCOUNT, accountName: "Kabsi Clients", type: "LOCATION_GROUP", role: "OWNER", verificationState: "UNVERIFIED", vettedState: "NOT_VETTED" }],
});
export const listInvitations = (_account: string): Promise<ListInvitationsResponse> => Promise.resolve({});
export const acceptInvitation = (_invitation: string): Promise<Record<string, never>> => Promise.resolve({});
