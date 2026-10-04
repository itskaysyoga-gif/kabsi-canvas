// Job queue (K-35, R-06, P0.1-12a). The table, claim and finish live in the database
// (migration 20261004190000_jobs_queue.sql); the dispatcher route is api/jobs.ts. This file holds what runs one
// claimed job, with no database import so its tests run without credentials.

export type Job = {
  id: number;
  kind: string;
  location_id: string | null;
  dedupe_key: string | null;
  payload: Record<string, unknown>;
  attempts: number;
  max_attempts: number;
};
export type JobState = "succeeded" | "retrying" | "dead" | "failed";
export type JobHandler = (job: Job) => Promise<void>;

// Thrown by a handler when another try cannot help (the job ends as failed, not retried).
export class PermanentJobError extends Error {}

export type RunDeps = {
  finish: (job: Job, ok: boolean, error?: string, retry?: boolean) => Promise<JobState | null>;
  report: (job: Job, error: unknown) => Promise<void>;
};

// Run one claimed job and record the outcome. A thrown error is retried with backoff by finish_job until the job's
// last try; a PermanentJobError or an unknown kind is not retried. Null means the job was no longer this worker's.
export async function runJob(job: Job, handlers: Record<string, JobHandler>, deps: RunDeps): Promise<JobState | null> {
  const handler = handlers[job.kind];
  let ok = true;
  let error: unknown;
  try {
    if (!handler) throw new PermanentJobError(`no handler for job kind ${job.kind}`);
    await handler(job);
  } catch (e) {
    ok = false;
    error = e;
  }
  if (ok) return await deps.finish(job, true);
  await deps.report(job, error);
  return await deps.finish(job, false, String(error).slice(0, 1000), !(error instanceof PermanentJobError));
}
