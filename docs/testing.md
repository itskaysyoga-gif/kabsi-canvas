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
  fails until it has a test. `google_mode()` executable by anon is a TODO until P0.1-08.

When you add a table or a browser-callable function, add its fixture row or its test in the same pull request.

## App and functions

`npm run typecheck`, `npm run lint:changed`, `npm test`, `npm run build`, and `bash scripts/deno-check.sh` for Edge
Functions (plan section 2.4).
