// Mock of the verification reads: a verified profile with Voice of Merchant.
import type { ListVerificationsResponse, VoiceOfMerchantState } from "../types.ts";

export const getVoiceOfMerchantState = (_location: string): Promise<VoiceOfMerchantState> => Promise.resolve({ hasVoiceOfMerchant: true, hasBusinessAuthority: true });
export const listVerifications = (location: string): Promise<ListVerificationsResponse> => Promise.resolve({
  verifications: [{ name: `${location}/verifications/mock-1`, method: "EMAIL", state: "COMPLETED", createTime: "2026-01-01T00:00:00Z" }],
});
