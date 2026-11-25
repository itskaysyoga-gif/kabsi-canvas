// Run: deno test supabase/functions/_shared/jobs.test.ts
import assert from "node:assert/strict";
import { type Job, type JobState, PermanentJobError, RetryLater, runJob } from "./jobs.ts";

const job = (kind: string): Job => ({ id: 1, kind, location_id: null, dedupe_key: null, payload: {}, attempts: 1, max_attempts: 5 });

function recorder() {
  const calls: { ok: boolean; error?: string; retry?: boolean }[] = [];
  const postponed: { until: Date; reason: string }[] = [];
  const reported: unknown[] = [];
  return {
    calls,
    postponed,
    reported,
    deps: {
      postpone: (_j: Job, until: Date, reason: string): Promise<JobState | null> => {
        postponed.push({ until, reason });
        return Promise.resolve("pending");
      },
      finish: (_j: Job, ok: boolean, error?: string, retry?: boolean): Promise<JobState | null> => {
        calls.push({ ok, error, retry });
        return Promise.resolve(ok ? "succeeded" : retry ? "retrying" : "failed");
      },
      report: (_j: Job, e: unknown) => {
        reported.push(e);
        return Promise.resolve();
      },
    },
  };
}

Deno.test("a job whose handler returns succeeds", async () => {
  const r = recorder();
  assert.deepEqual(await runJob(job("ok"), { ok: () => Promise.resolve() }, r.deps), "succeeded");
  assert.deepEqual(r.calls, [{ ok: true, error: undefined, retry: undefined }]);
  assert.deepEqual(r.reported.length, 0);
});

Deno.test("a thrown error is reported and retried", async () => {
  const r = recorder();
  const state = await runJob(job("boom"), { boom: () => Promise.reject(new Error("google 500")) }, r.deps);
  assert.deepEqual(state, "retrying");
  assert.deepEqual(r.calls, [{ ok: false, error: "Error: google 500", retry: true }]);
  assert.deepEqual(r.reported.length, 1);
});

Deno.test("a PermanentJobError is not retried", async () => {
  const r = recorder();
  const state = await runJob(job("stop"), { stop: () => Promise.reject(new PermanentJobError("draft_attempts_exhausted")) }, r.deps);
  assert.deepEqual(state, "failed");
  assert.deepEqual(r.calls[0].retry, false);
});

Deno.test("an unknown kind fails without a retry", async () => {
  const r = recorder();
  assert.deepEqual(await runJob(job("nobody_handles_this"), {}, r.deps), "failed");
  assert.deepEqual(r.calls[0].retry, false);
  assert.deepEqual(r.calls[0].error, "Error: no handler for job kind nobody_handles_this");
});

Deno.test("RetryLater postpones the job without a failed try or an error report", async () => {
  const r = recorder();
  const until = new Date(Date.now() + 300_000);
  const state = await runJob(job("busy"), { busy: () => Promise.reject(new RetryLater("google paused", until)) }, r.deps);
  assert.deepEqual(state, "pending");
  assert.deepEqual(r.calls.length, 0);
  assert.deepEqual(r.reported.length, 0);
  assert.deepEqual(r.postponed[0].until, until);
  assert.match(r.postponed[0].reason, /google paused/);
});

Deno.test("a database error object is stored with its real message, never [object Object]", async () => {
  const r = recorder();
  const pg = { message: 'insert or update on table "subscriptions" violates foreign key constraint', code: "23503", details: "Key is not present" };
  await runJob(job("db"), { db: () => Promise.reject(pg) }, r.deps);
  assert.match(r.calls[0].error ?? "", /violates foreign key constraint/);
  assert.match(r.calls[0].error ?? "", /23503/);
  assert.ok(!(r.calls[0].error ?? "").includes("[object Object]"));
});
