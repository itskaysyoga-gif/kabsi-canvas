// Mock of the v4 media API. The mock keeps no photos; a created item echoes Google's documented fields.
import type { ListMediaItemsResponse, MediaItem } from "../types.ts";

export function createMedia(account: string, location: string, body: MediaItem): Promise<MediaItem> {
  const id = crypto.randomUUID().replace(/-/g, "");
  return Promise.resolve({
    ...body, name: `${account}/${location}/media/${id}`, createTime: new Date().toISOString(),
    googleUrl: "https://kabsi.co/mock-photo", thumbnailUrl: "https://kabsi.co/mock-photo",
  });
}
export const listMedia = (_account: string, _location: string): Promise<ListMediaItemsResponse> => Promise.resolve({ totalMediaItemCount: 0 });
export const getMedia = (item: string): Promise<MediaItem> => Promise.resolve({ name: item, mediaFormat: "PHOTO" });
