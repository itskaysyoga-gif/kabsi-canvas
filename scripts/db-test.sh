#!/usr/bin/env bash
# Database test suite (P0.1-07, docs/testing.md): a local Supabase stack, every migration in one transaction, then the
# pgTAP files in supabase/tests through `supabase test db`.
#
# The migrations schedule pg_cron jobs that call the production function URL (call_internal). They are applied by
# this script, not by `supabase start`, so the jobs and any queued pg_net request are deleted before the transaction
# commits and the local stack never calls production.
set -euo pipefail
cd "$(dirname "$0")/.."

started=$(date +%s)
parked="$(mktemp -d)"
mv supabase/migrations "$parked/migrations"
mkdir supabase/migrations
restore() { rm -rf supabase/migrations && mv "$parked/migrations" supabase/migrations; }
trap restore EXIT
supabase start -x realtime,studio,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor,postgres-meta
restore
trap - EXIT

db_url="$(supabase status -o env | sed -n 's/^DB_URL="\(.*\)"$/\1/p')"
{
  for f in supabase/migrations/*.sql; do
    printf '\\echo %s\n' "$f"
    cat "$f"
    printf '\n;\n'
  done
  printf 'select count(cron.unschedule(jobid)) as unscheduled from cron.job;\ndelete from net.http_request_queue;\n'
} | psql "$db_url" -v ON_ERROR_STOP=1 --single-transaction -q -X
echo "Applied $(ls supabase/migrations/*.sql | wc -l) migrations; cron jobs left: $(psql "$db_url" -tAX -c 'select count(*) from cron.job'), queued requests: $(psql "$db_url" -tAX -c 'select count(*) from net.http_request_queue')"

supabase test db
# Two real sessions at once (P0.1-12a): not expressible inside one pgTAP transaction.
bash supabase/tests/jobs_claim_concurrency.sh "$db_url"
echo "Database suite finished in $(( $(date +%s) - started )) s"
