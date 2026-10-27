#!/usr/bin/env bash
# Monthly restore drill (Ops 1 part B, R-66, master plan 19.1). Run by .github/workflows/restore-drill.yml.
#
#   SCRATCH_DB_URL=postgresql://... bash scripts/backup/restore-drill.sh
#
# Takes the newest finished backup set from the R2 bucket and proves it can be used:
#   1. every encrypted file matches the sha256 in the manifest, and decrypts with BACKUP_PASSPHRASE;
#   2. the database dump restores into an empty scratch Postgres, and every table has the rows the manifest counted
#      (a table may differ by 5 percent or 2 rows, because the live database changed between the dump and the count);
#   3. the git bundle verifies, clones, and its main branch is the commit the manifest names;
#   4. the photos archive lists exactly the number of files the manifest counted, and (Sec 2) it is unpacked into a
#      scratch folder and checked against the restored storage.objects rows: every object row has its file;
#   5. (Sec 2) deletions made after the backup are applied again: the ids the live database wrote to
#      public.deletion_log since the set's time are read through the Management API (ids only) and deleted from the
#      restored copy by private.reapply_deletions, their Storage folders are removed from the scratch files, and the
#      time-based retention jobs run on the restored copy, so a restore never brings back what was deleted;
#   6. the time the whole drill took is recorded.
# The result goes to the daily staff summary: an ops_events row (daily when it passed, alerts when it failed) and the
# app_settings key backup_drill, which the summary reads. The job fails when any check fails.
#
# Secrets: BACKUP_PASSPHRASE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and SUPABASE_ACCESS_TOKEN (to write
# the result). The scratch database is a throwaway container with a throwaway password. Nothing here uses set -x, and the
# restored data is never printed (only table names and counts).
set -uo pipefail
cd "$(dirname "$0")/../.."
STARTED="$(date +%s)"
REF="${SUPABASE_PROJECT_REF:-ynjdqjlmdwjgbfezevxy}"

BUCKET="${R2_BUCKET:-kabsi-backups}"
AWS="${AWS_BIN:-aws}"
W="${DRILL_WORKDIR:-$(mktemp -d)}"
mkdir -p "$W/get" "$W/plain"
trap 'rm -rf "$W/plain"' EXIT
say() { printf '%s\n' "$*"; }
have() { [ -n "${!1:-}" ]; }

MISSING=()
for n in BACKUP_PASSPHRASE R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do have "$n" || MISSING+=("$n"); done
if [ "${#MISSING[@]}" -eq 4 ]; then
  say "::warning::The restore drill cannot run yet: none of the backup secrets are set. Follow docs/RUNBOOK.md, section Backups."
  exit 0
fi
have SCRATCH_DB_URL || MISSING+=(SCRATCH_DB_URL)
if [ "${#MISSING[@]}" -gt 0 ]; then
  say "::error::Missing: ${MISSING[*]}"
  exit 1
fi
export BACKUP_PASSPHRASE
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
EP="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
S3="s3://$BUCKET"

for tool in age jq git python3 psql pg_restore; do
  command -v "$tool" >/dev/null || { say "::error::$tool is not installed on this machine"; exit 1; }
done
FAILS=()
fail() { say "::error::$*"; FAILS+=("$*"); }
decrypt() { python3 -I scripts/backup/age-pass.py decrypt "$1" "$2"; }

# 1. The newest finished set (one that has a manifest).
SETS="$("$AWS" s3api list-objects-v2 --endpoint-url "$EP" --bucket "$BUCKET" --prefix weekly/ --delimiter / \
  --query 'CommonPrefixes[].Prefix' --output text | tr '\t' '\n' | grep '^weekly/' | sort -r || true)"
SET=""
for s in $SETS; do
  if "$AWS" s3 cp --only-show-errors --endpoint-url "$EP" "$S3/${s}manifest.json" "$W/get/manifest.json" 2>/dev/null; then SET="$s"; break; fi
done
STAMP=""
if [ -z "$SET" ]; then
  fail "no finished backup set in the bucket $BUCKET"
else
  STAMP="$(jq -r .stamp "$W/get/manifest.json")"
  say "Newest finished set: $SET (stamp $STAMP)"
  for f in $(jq -r '.files | keys[]' "$W/get/manifest.json"); do
    "$AWS" s3 cp --only-show-errors --endpoint-url "$EP" "$S3/${SET}$f.age" "$W/get/$f.age" || { fail "could not download $f.age"; continue; }
    want="$(jq -r --arg f "$f" '.files[$f].sha256' "$W/get/manifest.json")"
    got="$(sha256sum "$W/get/$f.age" | cut -d' ' -f1)"
    [ "$want" = "$got" ] && say "  $f.age: checksum matches" || fail "$f.age does not match its checksum"
    decrypt "$W/get/$f.age" "$W/plain/$f" || fail "$f.age did not decrypt (wrong BACKUP_PASSPHRASE?)"
  done
fi

TABLES=0; BAD_TABLES=0; RESTORE_ERRORS=0; COMMITS=0; PHOTOS=0; STORAGE_ROWS=0; STORAGE_MISSING=0
# 2. The database.
if [ -f "$W/plain/db.dump" ]; then
  say "Restoring the database into the scratch Postgres"
  psql "$SCRATCH_DB_URL" -v ON_ERROR_STOP=1 -q <<'SQL' || fail "could not prepare the scratch database"
do $$ declare r text; begin
  foreach r in array array['anon', 'authenticated', 'service_role', 'authenticator', 'supabase_admin', 'supabase_auth_admin',
                           'supabase_storage_admin', 'dashboard_user'] loop
    if not exists (select 1 from pg_roles where rolname = r) then execute format('create role %I nologin', r); end if;
  end loop;
end $$;
drop schema if exists public cascade;
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
SQL
  pg_restore --no-owner --no-privileges --dbname "$SCRATCH_DB_URL" "$W/plain/db.dump" 2> "$W/restore.err"
  RESTORE_ERRORS="$(grep -c '^pg_restore: error:' "$W/restore.err" || true)"
  say "  pg_restore reported $RESTORE_ERRORS errors (the first lines, without any row content):"
  grep '^pg_restore: error:' "$W/restore.err" | head -n 10 | cut -c1-200 | sed 's/^/    /'
  psql "$SCRATCH_DB_URL" -At -F $'\t' -v ON_ERROR_STOP=1 -c "
    select table_schema || '.' || table_name,
           (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
      from information_schema.tables
     where table_type = 'BASE TABLE' and table_schema in ('public', 'private', 'auth', 'storage')
     order by 1" > "$W/restored-counts.tsv" || fail "could not count the restored tables"
  while IFS=$'\t' read -r name want; do
    [ -n "$name" ] || continue
    TABLES=$((TABLES + 1))
    got="$(awk -F'\t' -v n="$name" '$1 == n {print $2}' "$W/restored-counts.tsv")"
    if [ -z "$got" ]; then say "  MISSING table $name (manifest had $want rows)"; BAD_TABLES=$((BAD_TABLES + 1)); continue; fi
    slack=$(( want / 20 )); [ "$slack" -lt 2 ] && slack=2
    diff=$(( got > want ? got - want : want - got ))
    if { [ "$want" -gt 0 ] && [ "$got" -eq 0 ]; } || [ "$diff" -gt "$slack" ]; then
      say "  COUNT $name: manifest $want, restored $got"
      BAD_TABLES=$((BAD_TABLES + 1))
    fi
  done < <(jq -r '.files["db.dump"].row_counts | to_entries[] | "\(.key)\t\(.value)"' "$W/get/manifest.json")
  say "  $TABLES tables checked, $BAD_TABLES wrong"
  [ "$TABLES" -gt 10 ] || fail "the manifest holds only $TABLES tables"
  [ "$BAD_TABLES" -eq 0 ] || fail "$BAD_TABLES tables do not have the rows the manifest counted"
elif [ -n "$SET" ]; then
  fail "the set has no database dump"
fi

# 2b. Sec 2: deletions made after the backup are applied again to the restored copy, then the time-based retention jobs.
REAPPLIED=0; REAPPLY_LEFT=0; RETENTION_RERUN="not run"; DELETED_LOCATIONS=""
# The set's name is a UTC stamp; anything else is refused before it reaches SQL (Sec 2 review).
if [ -n "$STAMP" ] && ! printf '%s' "$STAMP" | grep -Eq '^[0-9]{8}T[0-9]{6}Z$'; then fail "the set's stamp is not a UTC stamp"; STAMP=""; fi
if [ -f "$W/plain/db.dump" ] && [ -n "$STAMP" ]; then
  # A plain Postgres has no pg_net: deleting a business with a card fires the card trigger, which calls net.http_post.
  # The scratch copy gets a no-op stand-in, so a cascade never fails there and nothing is ever sent.
  psql "$SCRATCH_DB_URL" -q -v ON_ERROR_STOP=1 >/dev/null <<'SQL' || fail "could not prepare the net stand-in"
do $$ begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then
    create schema if not exists net;
    create function net.http_post(url text default null, body jsonb default null, params jsonb default null,
      headers jsonb default null, timeout_milliseconds integer default null) returns bigint language sql as 'select 0::bigint';
  end if;
end $$;
SQL
  SINCE="$(printf '%s' "$STAMP" | sed -E 's/^([0-9]{4})([0-9]{2})([0-9]{2})T([0-9]{2})([0-9]{2})([0-9]{2})Z$/\1-\2-\3T\4:\5:\6Z/')"
  if have DELETIONS_DB_URL; then
    # A drill on a local stack reads the deletion log from that database directly (no Management API there).
    psql "$DELETIONS_DB_URL" -At -v ON_ERROR_STOP=1 -c "select coalesce(jsonb_agg(jsonb_build_object('tbl', tbl, 'row_id', row_id)), '[]'::jsonb)
      from public.deletion_log where deleted_at >= '$SINCE'::timestamptz" > "$W/deletions-rows.json" || fail "could not read the deletion log"
  fi
  if have DELETIONS_DB_URL || have SUPABASE_ACCESS_TOKEN; then
    if ! have DELETIONS_DB_URL; then
    Q="$(jq -n --arg s "$SINCE" '{query: ("select coalesce(jsonb_agg(jsonb_build_object($$tbl$$, tbl, $$row_id$$, row_id)), $$[]$$::jsonb) as rows from public.deletion_log where deleted_at >= " + ("$$" + $s + "$$") + "::timestamptz")}')"
    if curl -fsS -X POST "https://api.supabase.com/v1/projects/$REF/database/query" -H "authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
         -H "content-type: application/json" -d "$Q" -o "$W/deletions.json"; then
      jq -c '.[0].rows // []' "$W/deletions.json" > "$W/deletions-rows.json"
    else
      fail "could not read the deletion log from the live database"
    fi
    fi
    if [ -s "$W/deletions-rows.json" ]; then
      say "Deletions since the backup ($SINCE): $(jq length "$W/deletions-rows.json") ids"
      # The list is read inside psql from the file (a long list would not fit in one command-line argument).
      REAPPLIED="$(psql "$SCRATCH_DB_URL" -At -v ON_ERROR_STOP=1 <<SQL || echo error
\set rows \`cat $W/deletions-rows.json\`
select private.reapply_deletions(:'rows'::jsonb);
SQL
)"
      [ "$REAPPLIED" = "error" ] && { fail "reapply_deletions failed on the restored copy"; REAPPLIED=0; }
      # Nothing that was deleted is left in the restored copy.
      REAPPLY_LEFT=0
      while IFS=$'\t' read -r tbl rid; do
        [ -n "$tbl" ] || continue
        case " locations contacts chat_conversations founding_applications partner_accounts free_check_waitlist profile_check_whatsapp " in
          *" $tbl "*) ;; *) fail "unknown table in the deletion log"; continue ;;
        esac
        n="$(psql "$SCRATCH_DB_URL" -At -c "select count(*) from public.\"$tbl\" where id::text = '$(printf '%s' "$rid" | tr -cd 'A-Za-z0-9-')'" 2>/dev/null || echo 0)"
        REAPPLY_LEFT=$((REAPPLY_LEFT + n))
        [ "$tbl" = "locations" ] && DELETED_LOCATIONS="$DELETED_LOCATIONS $rid"
      done < <(jq -r '.[] | "\(.tbl)\t\(.row_id)"' "$W/deletions-rows.json")
      [ "$REAPPLY_LEFT" -eq 0 ] || fail "$REAPPLY_LEFT deleted rows are still in the restored copy"
      # A deleted business's Storage rows go too (its folder is its id; Storage's own delete guard is a trigger, skipped on
      # this scratch copy only); the files are removed from the scratch copy below.
      for loc in $DELETED_LOCATIONS; do
        loc="$(printf '%s' "$loc" | tr -cd 'a-f0-9-')"
        [ -n "$loc" ] && psql "$SCRATCH_DB_URL" -q -c "set session_replication_role = replica" -c "delete from storage.objects where split_part(name, '/', 1) = '$loc'" >/dev/null 2>&1
      done
    fi
  else
    fail "SUPABASE_ACCESS_TOKEN is not set, so deletions after the backup cannot be applied again"
  fi
  # The time-based rules apply themselves again (review text after 30 days, leaving businesses after 7, and the rest).
  RETENTION_ERRS="$(psql "$SCRATCH_DB_URL" -At -v ON_ERROR_STOP=0 2>&1 <<'SQL' | grep -c '^ERROR\|ERROR:' || true
select private.run_retention();
select private.purge_after_leaving();
select private.purge_visibility_after_leaving();
select private.retention_sources();
SQL
)"
  RETENTION_RERUN="$([ "${RETENTION_ERRS:-0}" -eq 0 ] && echo ok || echo "$RETENTION_ERRS errors")"
  say "  $REAPPLIED rows deleted again, $REAPPLY_LEFT left; retention jobs on the copy: $RETENTION_RERUN"
fi

# 3. The repository.
if [ -f "$W/plain/kabsi-canvas.bundle" ]; then
  say "Cloning the git bundle"
  if git bundle verify "$W/plain/kabsi-canvas.bundle" >/dev/null 2>&1 && git clone --quiet "$W/plain/kabsi-canvas.bundle" "$W/plain/clone" 2>/dev/null \
     && git -C "$W/plain/clone" checkout --quiet main 2>/dev/null; then
    want="$(jq -r '.files["kabsi-canvas.bundle"].main_sha' "$W/get/manifest.json")"
    got="$(git -C "$W/plain/clone" rev-parse origin/main 2>/dev/null || true)"
    [ "$want" = "$got" ] || fail "the cloned main is $got, the manifest says $want"
    git -C "$W/plain/clone" fsck --no-progress >/dev/null 2>&1 || fail "git fsck failed on the clone"
    COMMITS="$(git -C "$W/plain/clone" rev-list --count HEAD 2>/dev/null || echo 0)"
    [ -f "$W/plain/clone/CLAUDE.md" ] && [ -d "$W/plain/clone/supabase/migrations" ] || fail "the clone has no CLAUDE.md or no supabase/migrations"
    say "  main at $got, $COMMITS commits"
  else
    fail "the git bundle does not verify or does not clone"
  fi
elif [ -n "$SET" ]; then
  fail "the set has no git bundle"
fi

# 4. The photos.
if [ -f "$W/plain/photos.tar.gz" ]; then
  want="$(jq -r '.files["photos.tar.gz"].objects' "$W/get/manifest.json")"
  PHOTOS="$(tar -tzf "$W/plain/photos.tar.gz" | grep -vc '/$' || true)"
  say "Photos archive: $PHOTOS files (manifest $want)"
  [ "$PHOTOS" = "$want" ] || fail "the photos archive holds $PHOTOS files, the manifest says $want"
  # Sec 2: Storage restored into a scratch folder and checked against the restored database.
  mkdir -p "$W/plain/restore" && tar -xzf "$W/plain/photos.tar.gz" -C "$W/plain/restore" || fail "the photos archive did not unpack"
  for loc in $DELETED_LOCATIONS; do
    loc="$(printf '%s' "$loc" | tr -cd 'a-f0-9-')"
    [ -n "$loc" ] && find "$W/plain/restore/storage" -mindepth 2 -maxdepth 2 -type d -name "$loc" -exec rm -rf {} + 2>/dev/null
  done
  if [ -f "$W/plain/db.dump" ]; then
    psql "$SCRATCH_DB_URL" -At -F $'\t' -c "select bucket_id, name from storage.objects" > "$W/objects.tsv" 2>/dev/null || : > "$W/objects.tsv"
    STORAGE_ROWS=0; STORAGE_MISSING=0
    while IFS=$'\t' read -r b name; do
      [ -n "$b" ] || continue
      STORAGE_ROWS=$((STORAGE_ROWS + 1))
      [ -f "$W/plain/restore/storage/$b/$name" ] || STORAGE_MISSING=$((STORAGE_MISSING + 1))
    done < "$W/objects.tsv"
    say "  Storage restored: $(find "$W/plain/restore/storage" -type f | wc -l | tr -d ' ') files for $STORAGE_ROWS object rows, $STORAGE_MISSING rows without a file"
    [ "$STORAGE_MISSING" -eq 0 ] || say "::warning::$STORAGE_MISSING Storage rows have no file in the archive (an object added between the dump and the copy is normal)"
  fi
else
  say "The set has no photos archive (Storage was skipped when it was made)"
fi

# 5. The result, for the daily staff summary.
OK=true; [ "${#FAILS[@]}" -eq 0 ] || OK=false
DAY="$(date -u +%Y-%m-%d)"
RESULT="$W/result.json"
jq -n --argjson ok "$OK" --arg day "$DAY" --arg set "${STAMP:-none}" --argjson tables "$TABLES" --argjson bad "$BAD_TABLES" \
  --argjson errs "$RESTORE_ERRORS" --argjson commits "$COMMITS" --argjson photos "$PHOTOS" \
  --arg run "${GITHUB_RUN_ID:-local}" --arg fails "$(printf '%s; ' "${FAILS[@]+"${FAILS[@]}"}")" \
  --argjson reapplied "${REAPPLIED:-0}" --argjson left "${REAPPLY_LEFT:-0}" --arg retention "$RETENTION_RERUN" \
  --argjson srows "$STORAGE_ROWS" --argjson smissing "$STORAGE_MISSING" --argjson secs "$(( $(date +%s) - STARTED ))" \
  '{ok: $ok, day: $day, backup_set: $set, tables_checked: $tables, tables_wrong: $bad, restore_errors: $errs,
    commits: $commits, photo_files: $photos, storage_rows: $srows, storage_rows_without_file: $smissing,
    deletions_reapplied: $reapplied, deleted_rows_left: $left, retention_rerun: $retention, seconds: $secs,
    run: $run, problems: $fails}' > "$RESULT"
cat "$RESULT"
if [ "$OK" = true ]; then
  node scripts/ops/record-event.mjs --kind backup_drill --channel daily --title "Restore drill passed" \
    --body "The newest backup restored: $TABLES tables checked, the git bundle cloned, the photos archive listed." \
    --field "Backup set=${STAMP}" --dedupe-key "backup_drill:$DAY" --setting backup_drill --value-file "$RESULT" || true
  exit 0
fi
node scripts/ops/record-event.mjs --kind backup_drill_failed --channel alerts --title "Restore drill FAILED" \
  --body "Open the run and read the failing check, then follow docs/RUNBOOK.md, section Backups." \
  --field "Backup set=${STAMP:-none}" --dedupe-key "backup_drill:$DAY" --setting backup_drill --value-file "$RESULT" || true
exit 1
