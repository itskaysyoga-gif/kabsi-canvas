#!/usr/bin/env bash
# P0.1-13a (K-38): a dashboard approval and an email approval of the same reply at the same moment make one
# publication and one publish job, and two publish jobs claiming it at the same moment get it once.
# P0.1-13b: the same two races for a post, a photo, a special hours period and a Google Protection put-back. Needs two real
# sessions, so it runs from scripts/db-test.sh after the pgTAP suite, against the local test database only:
# bash supabase/tests/publication_concurrency.sh "<db url>".
#
# Session 1 approves and holds its transaction open for 1.5 seconds; 0.3 s later session 2 approves the same reply.
# Session 2 waits for the lock on the review, then finds session 1's publication and returns it. The same pattern
# then runs for claim_publication.
set -euo pipefail
db="$1"
out="$(mktemp -d)"
q() { psql "$db" -v ON_ERROR_STOP=1 -qtAX "$@"; }

user=00000000-0000-4000-8000-00000000ccc1
loc=00000000-0000-4000-8000-00000000ccc2
review=00000000-0000-4000-8000-00000000ccc3
# The rows stay: the test database is thrown away after the run.
q -c "insert into auth.users (instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      values ('00000000-0000-0000-0000-000000000000', '$user', 'authenticated', 'authenticated', 'race-owner@example.test', now(), '{}', '{}', now(), now())" \
  -c "insert into public.locations (id, name, place_id, status, consent_at, access_granted_at, google_account_id, google_location_id)
      values ('$loc', 'Race Bakery', 'race-place', 'active', now(), now(), 'accounts/race', 'locations/mock-race')" \
  -c "insert into public.location_members (location_id, user_id, role) values ('$loc', '$user', 'owner')" \
  -c "insert into public.reviews (id, location_id, google_review_id, star_rating, review_created_at, state)
      values ('$review', '$loc', 'race-review', 5, now(), 'drafted')" >/dev/null

approve() {
  q -c "begin" \
    -c "select (r ->> 'publication_id') || ' ' || (r ->> 'created') from public.approve_publication('review_reply', '$review', 'Thank you.', '$user', '$2') r" \
    -c "select pg_sleep($3)" -c "commit" | grep -E '^[0-9a-f-]{36} ' > "$out/$1" || true
}
approve dashboard dashboard 1.5 &
sleep 0.3
approve email email_link 0 &
wait

d=$(cat "$out/dashboard"); e=$(cat "$out/email")
pubs=$(q -c "select count(*) from public.publications where target_id = '$review'")
jobs=$(q -c "select count(*) from public.jobs where kind = 'publish' and location_id = '$loc'")
echo "publication approval race: dashboard [$d], email [$e], publications $pubs, publish jobs $jobs"

fail=0
[ "${d% *}" = "${e% *}" ] && [ -n "${d% *}" ] || { echo "not ok: both approvals should return the same publication"; fail=1; }
[ "${d#* }" = "true" ] && [ "${e#* }" = "false" ] || { echo "not ok: the first creates, the second finds it"; fail=1; }
[ "$pubs" -eq 1 ] || { echo "not ok: one publication expected"; fail=1; }
[ "$jobs" -eq 1 ] || { echo "not ok: one publish job expected"; fail=1; }

pub="${d% *}"
q -c "update public.publications set publish_after = now() - interval '1 second' where id = '$pub'" >/dev/null
claim() {
  q -c "begin" -c "select public.claim_publication('$pub') ->> 'result'" -c "select pg_sleep($2)" -c "commit" \
    | grep -E '^[a-z_]+$' > "$out/claim-$1" || true
}
claim w1 1.5 &
sleep 0.3
claim w2 0 &
wait
c1=$(cat "$out/claim-w1"); c2=$(cat "$out/claim-w2")
attempts=$(q -c "select attempts from public.publications where id = '$pub'")
echo "publication claim race: w1 $c1, w2 $c2, attempts $attempts"
[ "$c1" = "claimed" ] && [ "$c2" = "not_approved" ] || { echo "not ok: exactly one claim expected"; fail=1; }
[ "$attempts" -eq 1 ] || { echo "not ok: one attempt expected"; fail=1; }

# P0.1-13b: the same for every other kind.
q -c "insert into public.gbp_posts (id, location_id, owner_input, body) values ('00000000-0000-4000-8000-00000000ccd1', '$loc', 'Race post', 'Draft')" \
  -c "insert into public.photos (id, location_id, storage_path, state) values ('00000000-0000-4000-8000-00000000ccd2', '$loc', 'race/p.jpg', 'draft')" \
  -c "insert into public.special_hours (id, location_id, start_date, end_date, closed) values ('00000000-0000-4000-8000-00000000ccd3', '$loc', '2026-12-25', '2026-12-25', true)" \
  -c "insert into public.listing_changes (id, location_id, field, old_value, new_value, detected_by)
      values ('00000000-0000-4000-8000-00000000ccd4', '$loc', 'phone', '{\"display\": \"1\", \"raw\": \"1\"}', '{\"display\": \"2\", \"raw\": \"2\"}', 'scheduled_check')" >/dev/null

race() { # kind target payload
  approve_kind() {
    q -c "begin" \
      -c "select (r ->> 'publication_id') || ' ' || (r ->> 'created') from public.approve_publication('$1', '$2', '$3'::jsonb, '$user', '$5') r" \
      -c "select pg_sleep($6)" -c "commit" | grep -E '^[0-9a-f-]{36} ' > "$out/$1-$4" || true
  }
  approve_kind "$1" "$2" "$3" dashboard dashboard 1.5 &
  sleep 0.3
  approve_kind "$1" "$2" "$3" email email_link 0 &
  wait
  local d e pubs jobs p c1 c2 attempts
  d=$(cat "$out/$1-dashboard"); e=$(cat "$out/$1-email")
  pubs=$(q -c "select count(*) from public.publications where target_id = '$2'")
  jobs=$(q -c "select count(*) from public.jobs j join public.publications p on j.dedupe_key = 'publish:' || p.id where p.target_id = '$2'")
  echo "$1 approval race: dashboard [$d], email [$e], publications $pubs, publish jobs $jobs"
  [ "${d% *}" = "${e% *}" ] && [ -n "${d% *}" ] || { echo "not ok: $1: both approvals should return the same publication"; fail=1; }
  [ "${d#* }" = "true" ] && [ "${e#* }" = "false" ] || { echo "not ok: $1: the first creates, the second finds it"; fail=1; }
  [ "$pubs" -eq 1 ] || { echo "not ok: $1: one publication expected"; fail=1; }
  [ "$jobs" -eq 1 ] || { echo "not ok: $1: one publish job expected"; fail=1; }
  p="${d% *}"
  q -c "update public.publications set publish_after = now() - interval '1 second' where id = '$p'" >/dev/null
  claim_kind() {
    q -c "begin" -c "select public.claim_publication('$p') ->> 'result'" -c "select pg_sleep($2)" -c "commit" \
      | grep -E '^[a-z_]+$' > "$out/$1-claim-$3" || true
  }
  claim_kind "$1" 1.5 w1 &
  sleep 0.3
  claim_kind "$1" 0 w2 &
  wait
  c1=$(cat "$out/$1-claim-w1"); c2=$(cat "$out/$1-claim-w2")
  attempts=$(q -c "select attempts from public.publications where id = '$p'")
  echo "$1 claim race: w1 $c1, w2 $c2, attempts $attempts"
  [ "$c1" = "claimed" ] && [ "$c2" = "not_approved" ] || { echo "not ok: $1: exactly one claim expected"; fail=1; }
  [ "$attempts" -eq 1 ] || { echo "not ok: $1: one attempt expected"; fail=1; }
}
race local_post 00000000-0000-4000-8000-00000000ccd1 '{"summary": "Fresh bread every Friday."}'
race photo 00000000-0000-4000-8000-00000000ccd2 '{"category": "EXTERIOR"}'
race special_hours 00000000-0000-4000-8000-00000000ccd3 '{}'
race listing_revert 00000000-0000-4000-8000-00000000ccd4 '{}'

[ "$fail" -eq 0 ] && echo "ok: two approvals at the same moment made one publication, claimed once, for every kind"
exit "$fail"
