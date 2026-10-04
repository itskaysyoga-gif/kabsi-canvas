// Business Profile API v4: photos and videos.
// https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media
import { gbp, V4 } from "../client.ts";
import type { ListMediaItemsResponse, MediaItem } from "../types.ts";

export const createMedia = (account: string, location: string, body: MediaItem): Promise<MediaItem> =>
  gbp(`${V4}/${account}/${location}/media`, { method: "POST", body: JSON.stringify(body) });
export const listMedia = (account: string, location: string): Promise<ListMediaItemsResponse> =>
  gbp(`${V4}/${account}/${location}/media?pageSize=100`);
