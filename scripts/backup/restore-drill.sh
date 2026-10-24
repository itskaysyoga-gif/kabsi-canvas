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
#   4. the photos archive lists exactly the number of files the manifest counted.
# The result goes to the daily staff summary: an ops_events row (daily when it passed, alerts when it failed) and the
# app_settings key backup_drill, which the summary reads. The job fails when any check fails.
#
# Secrets: BACKUP_PASSPHRASE, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and SUPABASE_ACCESS_TOKEN (to write
# the result). The scratch database is a throwaway container with a throwaway password. Nothing here uses set -x, and the
# restored data is never printed (only table names and counts).
set -uo pipefail
cd "$(dirname "$0")/../.."

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

TABLES=0; BAD_TABLES=0; RESTORE_ERRORS=0; COMMITS=0; PHOTOS=0
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
  '{ok: $ok, day: $day, backup_set: $set, tables_checked: $tables, tables_wrong: $bad, restore_errors: $errs,
    commits: $commits, photo_files: $photos, run: $run, problems: $fails}' > "$RESULT"
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
