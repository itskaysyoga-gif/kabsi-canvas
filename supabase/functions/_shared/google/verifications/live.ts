// Verifications API, read only. Kabsi never starts a verification for the owner; it links them to Google.
// https://developers.google.com/my-business/reference/verifications/rest
import { gbp, VERIF } from "../client.ts";
import type { ListVerificationsResponse, VoiceOfMerchantState } from "../types.ts";

export const getVoiceOfMerchantState = (location: string): Promise<VoiceOfMerchantState> => gbp(`${VERIF}/${location}/VoiceOfMerchantState`);
export const listVerifications = (location: string): Promise<ListVerificationsResponse> => gbp(`${VERIF}/${location}/verifications`);
