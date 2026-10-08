// Run: deno test supabase/functions/_shared/retention.test.ts
import assert from "node:assert/strict";
import { type PhotoFileStore, removeDuePhotoFiles } from "./retention.ts";

function fakeStore(n: number, failRemoveOnce = false) {
  const rows = Array.from({ length: n }, (_, i) => ({ id: `p${i}`, storage_path: `loc/p${i}.jpg`, deleted: false }));
  const objects = new Set(rows.map((r) => r.storage_path));
  let failed = !failRemoveOnce;
  const store: PhotoFileStore = {
    due: (limit) => Promise.resolve(rows.filter((r) => !r.deleted).slice(0, limit).map(({ id, storage_path }) => ({ id, storage_path }))),
    remove: (paths) => {
      if (!failed) {
        failed = true;
        paths.slice(0, 1).forEach((p) => objects.delete(p));
        return Promise.reject(new Error("storage down"));
      }
      paths.forEach((p) => objects.delete(p));
      return Promise.resolve();
    },
    markDeleted: (ids) => {
      rows.filter((r) => ids.includes(r.id)).forEach((r) => (r.deleted = true));
      return Promise.resolve();
    },
  };
  return { store, rows, objects };
}

Deno.test("removes every due file, then marks the photos", async () => {
  const { store, rows, objects } = fakeStore(250);
  assert.deepEqual(await removeDuePhotoFiles(store), { photo_files: 250 });
  assert.equal(objects.size, 0);
  assert.ok(rows.every((r) => r.deleted));
});

Deno.test("nothing due: nothing removed", async () => {
  const { store } = fakeStore(0);
  assert.deepEqual(await removeDuePhotoFiles(store), { photo_files: 0 });
});

Deno.test("a Storage failure marks nothing, and the retry finishes the job", async () => {
  const { store, rows, objects } = fakeStore(3, true);
  await assert.rejects(removeDuePhotoFiles(store), /storage down/);
  assert.ok(rows.every((r) => !r.deleted), "no photo is marked deleted while its file may still exist");
  assert.deepEqual(await removeDuePhotoFiles(store), { photo_files: 3 });
  assert.equal(objects.size, 0);
});
