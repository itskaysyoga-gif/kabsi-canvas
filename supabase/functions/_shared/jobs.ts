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
export type JobState = "pending" | "succeeded" | "retrying" | "dead" | "failed";
export type JobHandler = (job: Job) => Promise<void>;

// Thrown by a handler when another try cannot help (the job ends as failed, not retried).
export class PermanentJobError extends Error {}

// Thrown when the work has to wait for something that is not the job's fault (Google paused by the circuit breaker,
// or no place left under the rate limit, P0.1-12b): the job is put back to run at `until`, and the try is not counted.
export class RetryLater extends Error {
  constructor(message: string, readonly until: Date) {
    super(message);
  }
}

/** The text stored for a failed job (APP-2): an Error's message, or the JSON of a plain object such as a Postgres error
 * ({ message, details, hint, code }), never "[object Object]". */
export function errorText(e: unknown): string {
  if (e instanceof Error) return String(e);
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown };
    if (typeof o.message === "string" && o.message) {
      try {
        const { message: _m, ...rest } = o as Record<string, unknown>;
        return Object.keys(rest).length ? `${o.message} ${JSON.stringify(rest)}` : o.message;
      } catch {
        return o.message;
      }
    }
    try {
      return JSON.stringify(e);
    } catch {
      return Object.prototype.toString.call(e);
    }
  }
  return String(e);
}

export type RunDeps = {
  finish: (job: Job, ok: boolean, error?: string, retry?: boolean) => Promise<JobState | null>;
  postpone: (job: Job, until: Date, reason: string) => Promise<JobState | null>;
  report: (job: Job, error: unknown) => Promise<void>;
};

// Run one claimed job and record the outcome. A thrown error is retried with backoff by finish_job until the job's
// last try; a PermanentJobError or an unknown kind is not retried; RetryLater postpones the job without counting the
// try (and is not reported as an error). Null means the job was no longer this worker's.
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
  if (error instanceof RetryLater) return await deps.postpone(job, error.until, errorText(error).slice(0, 1000));
  await deps.report(job, error);
  return await deps.finish(job, false, errorText(error).slice(0, 1000), !(error instanceof PermanentJobError));
}
