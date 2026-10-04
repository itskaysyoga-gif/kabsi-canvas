# Testing

## Database suite (P0.1-07)

pgTAP tests in `supabase/tests/`, run by the `database` job in `.github/workflows/ci.yml` on every pull request.

- `scripts/db-test.sh` starts a local Supabase stack, applies every file in `supabase/migrations/` in one transaction,
  deletes the pg_cron jobs and queued pg_net requests before it commits (the jobs call the production function URL),
  then runs `supabase test db`. Run it locally with Docker and the Supabase CLI: `bash scripts/db-test.sh`, then
  `supabase stop`.
- `supabase/tests/_fixtures.psql` builds a victim (owner A of business LA, partner P with member PA, one row in every
  table signed-in users can read) and the personas: anon, a stranger, the owner of another business, a member of
  another partner. Each test file includes it with `\ir` inside its own transaction and rolls back.
- `rls_tables.sql`: for every table in `public`, each persona's `select count(*)` of the victim's rows is 0. It also
  checks RLS is on everywhere, no policy for anon or authenticated is `using (true)`, no readable view bypasses RLS,
  and every readable table has a victim row. A new table fails until it gets a fixture row.
- `rls_functions.sql`: every SECURITY DEFINER function in `public` that authenticated can execute is called by a
  signed-in stranger against the victim and must refuse. The list is checked against `pg_proc`, so a new function
  fails until it has a test, and every function on the list must still be callable (nothing revoked by mistake).
  Since P0.1-08 it also checks that anon can run no SECURITY DEFINER function at all, that the helpers only triggers
  use are closed to authenticated, and that schema `private` (cron-only functions) is out of reach of anon and
  authenticated. A function the browser does not call belongs in `private`, or in public with no execute for anon
  and authenticated when an Edge Function calls it through the service role.
- `tenant_model.sql` (P0.1-09): every business has an organisation and a `google_connections` row; signing up puts a
  second business in the same organisation; owners of a business are owners of its organisation, managers and staff
  are not; partner members are mirrored into the partner organisation; the Google columns and `partner_id` on
  `locations` flow into `google_connections` and `partner_clients`; demo businesses get a demo organisation; the
  approval policy accepts only known kinds and needs consent to delegate; only org owners and admins read
  `subscriptions`; the API roles cannot write the new tables.
- `audit_log.sql` (P0.1-10): `audit_events` takes inserts only through `private.audit`; UPDATE, DELETE and TRUNCATE
  fail for the table owner and the service role outside `private.run_retention`, and inside it only redaction and
  rows older than 24 months are allowed; approvals, publications, drafts, skips, knowledge edits, onboarding steps,
  role changes and concierge tasks write events, with the request context from the `x-kabsi-*` headers (service role
  only) or the browser's own headers; no review text or reviewer name is copied in; owners read only their own
  businesses' events; `activity_feed` returns plain lines with routine checks collapsed into one a day.

- `jobs_queue.sql` (P0.1-12a): `jobs` is closed to anon and authenticated and written only through `enqueue_job`,
  `claim_jobs` and `finish_job` (service role); a dedupe key is taken while a job is pending, running or retrying; a
  claimed job is not claimed again; failed tries wait about 30 s, 1, 2 and 4 minutes, and the fifth failure makes
  the job dead with one #kabsi-alerts event; a handler can rule out a retry (failed); a job left running for 10
  minutes is handed on; the producers offer one review sync per business every 5 minutes (concierge businesses
  excluded), one draft per new review and one owner email run when an email is due; the tick calls the dispatcher
  only when a job is due; `record_sync_result` fills `google_connections`; staff job health lists stopped jobs.
- `jobs_claim_concurrency.sh` (P0.1-12a), run by `scripts/db-test.sh` after the pgTAP suite because it needs two
  real sessions: 100 committed jobs, dispatcher w1 claims 60 and holds its transaction 2 seconds, w2 asks 0.3 s later
  and must get the other 40 at once; every job is claimed exactly once and w2 never waits (it fails if SKIP LOCKED is
  removed).
- `google_limits.sql` (P0.1-12b): the rate limiter, circuit breaker and postponed jobs are closed to anon and
  authenticated; four Google requests in one second go and the fifth waits a second; five edits to one profile in a
  minute go and a sixth waits until the oldest is a minute old, without taking a place; a read is not held by the edit
  limit; 20 failures inside a minute open the breaker for 5 minutes with one #kabsi-alerts message, the gate then
  refuses every request, and after the 5 minutes it closes with a second message; a postponed job goes back to the
  queue without counting the try; Protection is one job per business (every 5 minutes on the mock, hourly on live
  Google, none for concierge businesses); access, ratings, weekly reports, deletions, trial and renewal reminders are
  one job each, offered every 5 minutes at their own minute; the tick clears rate buckets unused for a day; the
  ops watchdog alerts when no job has finished in 20 minutes (it no longer watches `kabsi_cron_tick`).

When you add a table or a browser-callable function, add its fixture row or its test in the same pull request.

## Job queue (P0.1-12a, P0.1-12b)

`supabase/functions/_shared/jobs.test.ts` (Deno) checks how one claimed job ends: success, a thrown error retried, a
`PermanentJobError` or an unknown kind not retried, `RetryLater` (Google paused or no place under the rate limit)
postponed without a failed try. The handlers and the `/api/dispatch` route are in `supabase/functions/api/jobs.ts`.

`supabase/functions/_shared/google/limits.test.ts` (Deno) checks what `gbp()` does with the gate's answers: a sixth
edit in a minute to one profile waits for its place and then goes; a wait over 65 seconds or an open breaker sends
nothing and throws `GoogleBusy`; every try passes the gate; 429, 5xx and no answer count as failures for the breaker,
a 403 does not.

Load test (`scripts/load/mock-500.ts`, workflow `.github/workflows/load.yml`): after `scripts/db-test.sh`, it seeds
500 mock businesses with three answered reviews each and runs one simulated hour: each loop runs the real producer and
the real dispatcher route (imported into the script, mock Google, limiter in the local database), then moves every
schedule back by what is left of the minute. It fails unless every business synced every 5 minutes after its first,
no job died or failed, nothing was due at the end and no dispatcher run came near the function time limit. CI adds
20 ms to every database call (`LOAD_LATENCY_MS`) to stand in for the network in production. Locally:
`bash scripts/db-test.sh`, then `eval "$(supabase status -o env)"; export API_URL SERVICE_ROLE_KEY DB_URL;
deno run -A scripts/load/mock-500.ts`.

## App and functions

`npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build`, and `bash scripts/deno-check.sh` for Edge
Functions (plan section 2.4).

## Google layer (P0.1-11)

Every Google call goes through `supabase/functions/_shared/google/` (K-34). Each area (accounts, locations, reviews,
posts, media, performance, attributes, notifications, updates, admins, verifications, placeActions, places) has a
`live.ts` and a `mock.ts` that return the same wire types (`types.ts`); `index.ts` picks one per business (a demo
business is always mock, R-17) and maps Google's responses to the app's shapes.

`tests/fixtures/google/*.json` hold one documented Google response per call, with the documentation page in `_doc`.
`_shared/google/mocks.test.ts` (run by `scripts/deno-check.sh`) checks that every field a mock returns exists in the
fixture with the same type. On Gate A day (P0.7-01) the fixtures are replaced with captured real responses and the
same test then holds the mocks to Google's real behaviour.

`scripts/check-google-calls.mjs` (`npm run check:google`, a step in CI's App job) fails when a Google API host appears
in code outside `_shared/google/` (src, supabase, workers, scripts). `tests/check-google-calls.test.ts` proves it fails
on `tests/fixtures/rogue-google-call.txt` and passes on the repo. Functions import the layer from
`_shared/google/index.ts`.
