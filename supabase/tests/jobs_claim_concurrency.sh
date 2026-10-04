#!/usr/bin/env bash
# P0.1-12a (K-35, R-06): two dispatchers claiming at the same moment never get the same job, and the second one does
# not wait for the first. Needs two real sessions, so it runs from scripts/db-test.sh after the pgTAP suite, against
# the local test database only: bash supabase/tests/jobs_claim_concurrency.sh "<db url>".
#
# 100 jobs are committed. Dispatcher w1 claims 60 and holds its transaction open for 2 seconds; 0.3 s later w2 asks
# for 60 too. With SKIP LOCKED w2 gets the other 40 at once; a plain FOR UPDATE would make it wait for w1.
set -euo pipefail
db="$1"
out="$(mktemp -d)"
q() { psql "$db" -v ON_ERROR_STOP=1 -qtAX "$@"; }

q -c "delete from public.jobs where kind = 'concurrency_test'"
q -c "insert into public.jobs (kind, dedupe_key) select 'concurrency_test', 'concurrency_test:' || g from generate_series(1, 100) g"

claim() {
  q -c "begin" -c "select id from public.claim_jobs(60, '$1')" -c "select pg_sleep(2)" -c "commit" \
    | grep -E '^[0-9]+$' > "$out/$1" || true
}
started=$(date +%s%N)
claim w1 &
sleep 0.3
claim w2 &
wait
elapsed=$(( ($(date +%s%N) - started) / 1000000 ))

w1=$(wc -l < "$out/w1"); w2=$(wc -l < "$out/w2")
total=$(cat "$out/w1" "$out/w2" | wc -l); distinct=$(cat "$out/w1" "$out/w2" | sort -u | wc -l)
running=$(q -c "select count(*) from public.jobs where kind = 'concurrency_test' and state = 'running' and attempts = 1")
q -c "delete from public.jobs where kind = 'concurrency_test'"
echo "jobs claim concurrency: w1 $w1, w2 $w2, total $total, distinct $distinct, running once $running, ${elapsed} ms"

fail=0
[ "$w1" -eq 60 ] || { echo "not ok: w1 should claim 60"; fail=1; }
[ "$w2" -eq 40 ] || { echo "not ok: w2 should claim the other 40"; fail=1; }
[ "$total" -eq 100 ] && [ "$distinct" -eq 100 ] || { echo "not ok: a job was claimed twice or not at all"; fail=1; }
[ "$running" -eq 100 ] || { echo "not ok: every job should be running after exactly one claim"; fail=1; }
[ "$elapsed" -lt 3500 ] || { echo "not ok: w2 waited for w1's locks (${elapsed} ms)"; fail=1; }
[ "$fail" -eq 0 ] && echo "ok: two concurrent dispatchers claimed every job exactly once without waiting"
exit "$fail"
