// Uploaded photo files past their K-40 limit (P0.2-01). private.run_retention reads the limit from retention_policies,
// marks each due photo (file_due_at: 30 days after it is on Google, or at once when skipped) and offers one
// photo_files job. This removes the Storage objects through the Storage API (SQL cannot remove them), then stamps
// file_deleted_at. The photo row (id, category, state, dates) stays. Removing an object that is already gone is not an
// error, so a retry after a failure part way through is safe.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export const PHOTO_BUCKET = "owner-photos";
const BATCH = 100;
const MAX_BATCHES = 20;

type Due = { id: string; storage_path: string };

export interface PhotoFileStore {
  due(limit: number): Promise<Due[]>;
  remove(paths: string[]): Promise<void>;
  markDeleted(ids: string[]): Promise<void>;
}

export async function removeDuePhotoFiles(store: PhotoFileStore) {
  let removed = 0;
  for (let i = 0; i < MAX_BATCHES; i++) {
    const rows = await store.due(BATCH);
    if (!rows.length) break;
    await store.remove(rows.map((r) => r.storage_path));
    await store.markDeleted(rows.map((r) => r.id));
    removed += rows.length;
    if (rows.length < BATCH) break;
  }
  return { photo_files: removed };
}

// The store over a service-role client (the api function passes admin()).
export function photoFileStore(db: SupabaseClient): PhotoFileStore {
  return {
    async due(limit) {
      const { data, error } = await db.from("photos").select("id, storage_path")
        .not("file_due_at", "is", null).is("file_deleted_at", null).order("file_due_at").limit(limit);
      if (error) throw error;
      return (data ?? []) as Due[];
    },
    async remove(paths) {
      const { error } = await db.storage.from(PHOTO_BUCKET).remove(paths);
      if (error) throw error;
    },
    async markDeleted(ids) {
      const { error } = await db.from("photos").update({ file_deleted_at: new Date().toISOString() }).in("id", ids);
      if (error) throw error;
    },
  };
}
