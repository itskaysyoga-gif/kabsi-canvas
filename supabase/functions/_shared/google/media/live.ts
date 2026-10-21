// Business Profile API v4: photos and videos.
// https://developers.google.com/my-business/reference/rest/v4/accounts.locations.media
// A photo goes up as bytes (P0.5-01): startUpload gives a data reference, the bytes are uploaded to it, then the
// media item is created with that reference. Kabsi never hands Google a link to its own storage.
import { gbp, UPLOAD, V4 } from "../client.ts";
import type { ListMediaItemsResponse, MediaItem, MediaItemDataRef } from "../types.ts";

export const createMedia = (account: string, location: string, body: MediaItem): Promise<MediaItem> =>
  gbp(`${V4}/${account}/${location}/media`, { method: "POST", body: JSON.stringify(body) });
export const startUpload = (account: string, location: string): Promise<MediaItemDataRef> =>
  gbp(`${V4}/${account}/${location}/media:startUpload`, { method: "POST", body: "{}" });
export const uploadBytes = (ref: MediaItemDataRef, bytes: Uint8Array, mime: string): Promise<unknown> =>
  gbp(`${UPLOAD}/v1/media/${encodeURIComponent(ref.resourceName)}?upload_type=media`, {
    method: "POST", body: bytes as Uint8Array<ArrayBuffer>, headers: { "content-type": mime },
  });
export const listMedia = (account: string, location: string): Promise<ListMediaItemsResponse> =>
  gbp(`${V4}/${account}/${location}/media?pageSize=100`);
// item is "accounts/{a}/locations/{l}/media/{id}".
export const getMedia = (item: string): Promise<MediaItem> => gbp(`${V4}/${item}`);
