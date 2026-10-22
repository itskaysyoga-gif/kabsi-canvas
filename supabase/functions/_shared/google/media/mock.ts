// Mock of the v4 media API. The mock keeps no photos; a created item echoes Google's documented fields. `calls`
// counts the writes, so the tests can prove one upload and one create per approved photo.
import type { ListMediaItemsResponse, MediaItem, MediaItemDataRef } from "../types.ts";

export const calls = { startUpload: 0, upload: 0, create: 0 };

export function createMedia(account: string, location: string, body: MediaItem): Promise<MediaItem> {
  calls.create++;
  const id = crypto.randomUUID().replace(/-/g, "");
  // Google answers with the stored item, not the upload reference or source address it was given (real media, 22 Oct 2026).
  const { dataRef: _ref, sourceUrl: _src, ...item } = body;
  return Promise.resolve({
    ...item, name: `${account}/${location}/media/${id}`, createTime: new Date().toISOString(),
    googleUrl: "https://kabsi.co/mock-photo", thumbnailUrl: "https://kabsi.co/mock-photo",
  });
}
export function startUpload(_account: string, _location: string): Promise<MediaItemDataRef> {
  calls.startUpload++;
  return Promise.resolve({ resourceName: `mock-upload-${crypto.randomUUID()}` });
}
export function uploadBytes(_ref: MediaItemDataRef, bytes: Uint8Array, _mime: string): Promise<unknown> {
  calls.upload++;
  if (!bytes.length) return Promise.reject(new Error("google 400 mock upload: {\"message\": \"empty file\"}"));
  return Promise.resolve({});
}
export const listMedia = (_account: string, _location: string): Promise<ListMediaItemsResponse> => Promise.resolve({ totalMediaItemCount: 0 });
export const getMedia = (item: string): Promise<MediaItem> => Promise.resolve({ name: item, mediaFormat: "PHOTO" });
