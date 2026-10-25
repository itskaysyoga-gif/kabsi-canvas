#!/usr/bin/env bash
# Weekly backup (Ops 1 part B, R-66, master plan 19.1). Run by .github/workflows/backup.yml.
#
#   bash scripts/backup/backup.sh [--dry-run]
#
# One backup set is four files in the private Cloudflare R2 bucket kabsi-backups, each encrypted with age in
# passphrase (scrypt) mode before it leaves the runner:
#   weekly/<UTC stamp>/db.dump.age                the Postgres dump (schemas public, private, auth, storage, supabase_migrations)
#   weekly/<UTC stamp>/photos.tar.gz.age          every file in Supabase Storage
#   weekly/<UTC stamp>/kabsi-canvas.bundle.age    a git bundle of every branch and tag of the repository
#   weekly/<UTC stamp>/manifest.json              names, sizes, sha256 of the encrypted files, row counts. No customer data.
# The manifest is uploaded last, so a set without one is unfinished and the restore drill ignores it.
# The newest BACKUP_KEEP (3) sets are kept, 21 days of weekly sets (master plan 30.10 point 1: with the 7 day purge after a
# business leaves, no copy of its Google data outlives 28 days); older ones are deleted only after the new set is uploaded.
#
# Secrets (GitHub, Settings, Secrets and variables, Actions): SUPABASE_DB_URL, BACKUP_PASSPHRASE, R2_ACCOUNT_ID,
# R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and SUPABASE_ACCESS_TOKEN (already there for deploy.yml). Values are never
# printed. Nothing here uses set -x.
#
# --dry-run builds and encrypts everything it has the inputs for, proves the encryption by decrypting it again, prints
# what it would upload and uploads nothing. A missing secret is reported by name and skipped instead of failing.
set -euo pipefail
cd "$(dirname "$0")/../.."

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

REF="${SUPABASE_PROJECT_REF:-ynjdqjlmdwjgbfezevxy}"
BUCKET="${R2_BUCKET:-kabsi-backups}"
KEEP="${BACKUP_KEEP:-3}"
AWS="${AWS_BIN:-aws}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
W="${BACKUP_WORKDIR:-$(mktemp -d)}"
PLAIN="$W/plain"
OUT="$W/out"
mkdir -p "$PLAIN" "$OUT"
# Plaintext never outlives the script.
trap 'rm -rf "$PLAIN"' EXIT

say() { printf '%s\n' "$*"; }
have() { [ -n "${!1:-}" ]; }

# The five secrets this workflow adds (SUPABASE_ACCESS_TOKEN is the sixth and already exists).
MISSING=()
for n in SUPABASE_DB_URL BACKUP_PASSPHRASE R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY; do
  have "$n" || MISSING+=("$n")
done
if [ "${#MISSING[@]}" -eq 5 ] && [ "$DRY_RUN" -eq 0 ]; then
  say "::warning::Backups are not set up yet: none of the five backup secrets exist. Nothing was backed up. Follow docs/RUNBOOK.md, section Backups, to add them."
  exit 0
fi
if [ "${#MISSING[@]}" -gt 0 ]; then
  if [ "$DRY_RUN" -eq 1 ]; then
    say "::notice::Dry run: these secrets are not set, so the steps that need them are skipped: ${MISSING[*]}"
  else
    say "::error::These backup secrets are missing: ${MISSING[*]}. Add them (docs/RUNBOOK.md, section Backups)."
    exit 1
  fi
fi
if ! have BACKUP_PASSPHRASE; then
  # Only a dry run gets here. A throwaway passphrase proves the encryption round trip and is forgotten at once.
  BACKUP_PASSPHRASE="dry-run-$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9')"
  export BACKUP_PASSPHRASE
fi
export BACKUP_PASSPHRASE

record_failure() {
  local code=$?
  [ "$DRY_RUN" -eq 0 ] || exit "$code"
  node scripts/ops/record-event.mjs --kind backup_failed --channel alerts \
    --title "The weekly backup failed" \
    --body "Open the run, read the failing step, then follow docs/RUNBOOK.md, section Backups." \
    --field "Run=${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-itskaysyoga-gif/kabsi-canvas}/actions/runs/${GITHUB_RUN_ID:-0}" \
    --dedupe-key "backup_failed:${STAMP}" || true
  exit "$code"
}
trap 'record_failure' ERR

for tool in age jq git python3; do
  command -v "$tool" >/dev/null || { say "::error::$tool is not installed on this machine"; exit 1; }
done
encrypt() { python3 -I scripts/backup/age-pass.py encrypt "$1" "$2"; }
decrypt() { python3 -I scripts/backup/age-pass.py decrypt "$1" "$2"; }
size() { stat -c %s "$1"; }
sha() { sha256sum "$1" | cut -d' ' -f1; }

FILES=()   # names in $OUT, in order
MANIFEST="$W/manifest.json"
echo '{}' > "$MANIFEST"
add_manifest() { # name, plain source, extra jq object
  local name="$1" file="$OUT/$1.age" extra="$3"
  jq --arg n "$name" --argjson s "$(size "$file")" --arg h "$(sha "$file")" --argjson x "$extra" \
    '.files[$n] = ({encrypted_bytes: $s, sha256: $h} + $x)' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
  FILES+=("$name.age")
}
seal() { # name, plain file, extra json
  encrypt "$2" "$OUT/$1.age"
  # Dry-run proof, and a real-run safety net: the file must decrypt to exactly what went in.
  decrypt "$OUT/$1.age" "$PLAIN/check.tmp"
  cmp -s "$2" "$PLAIN/check.tmp" || { say "::error::$1 did not decrypt to the same bytes"; exit 1; }
  rm -f "$PLAIN/check.tmp"
  add_manifest "$1" "$2" "$3"
}

# 1. The repository. In Actions the source is the GitHub URL (a bare mirror: every branch and tag as they are on
# GitHub). Locally it is the working copy.
say "Git bundle"
SRC="${GIT_SOURCE:-.}"
if [ "$SRC" = "." ]; then
  git bundle create "$PLAIN/kabsi-canvas.bundle" --branches --tags
else
  AUTH=()
  if have GITHUB_TOKEN; then
    AUTH=(-c "http.extraheader=AUTHORIZATION: basic $(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)")
  fi
  git "${AUTH[@]}" clone --mirror --quiet "$SRC" "$PLAIN/mirror.git"
  git -C "$PLAIN/mirror.git" bundle create "$PLAIN/kabsi-canvas.bundle" --branches --tags
  rm -rf "$PLAIN/mirror.git"
fi
git bundle verify "$PLAIN/kabsi-canvas.bundle" >/dev/null
HEAD_SHA="$(git ls-remote "$PLAIN/kabsi-canvas.bundle" refs/heads/main | cut -f1)"
[ -n "$HEAD_SHA" ] || { say "::error::the bundle has no main branch"; exit 1; }
seal kabsi-canvas.bundle "$PLAIN/kabsi-canvas.bundle" "$(jq -n --arg h "$HEAD_SHA" '{main_sha: $h}')"
say "  main at $HEAD_SHA"

# 2. The database. Row counts are taken right after the dump; the restore drill compares them with a tolerance
# because the live database keeps changing between the two.
if have SUPABASE_DB_URL; then
  say "Database dump"
  pg_dump --format=custom --compress=6 --no-owner --no-privileges \
    --schema=public --schema=private --schema=auth --schema=storage --schema=supabase_migrations \
    --file "$PLAIN/db.dump" "$SUPABASE_DB_URL"
  psql "$SUPABASE_DB_URL" -At -F $'\t' -v ON_ERROR_STOP=1 -c "
    select table_schema || '.' || table_name,
           (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text
      from information_schema.tables
     where table_type = 'BASE TABLE' and table_schema in ('public', 'private', 'auth', 'storage')
     order by 1" > "$PLAIN/row-counts.tsv"
  [ -s "$PLAIN/row-counts.tsv" ] || { say "::error::no row counts came back"; exit 1; }
  COUNTS="$(jq -R -s 'split("\n") | map(select(length > 0) | split("\t") | {(.[0]): (.[1] | tonumber)}) | add' "$PLAIN/row-counts.tsv")"
  seal db.dump "$PLAIN/db.dump" "$(jq -n --argjson c "$COUNTS" '{row_counts: $c}')"
  say "  $(printf '%s' "$COUNTS" | jq 'length') tables counted"
else
  say "Database dump skipped: SUPABASE_DB_URL is not set"
fi

# 3. Storage photos. The Supabase CLI fetches the project keys itself from SUPABASE_ACCESS_TOKEN, so the photos need
# no secret of their own.
if have SUPABASE_ACCESS_TOKEN; then
  say "Storage"
  mkdir -p "$PLAIN/storage"
  BUCKETS="$(supabase storage ls ss:/// --experimental --project-ref "$REF" | sed 's#/*[[:space:]]*$##' | grep -v '^$' || true)"
  [ -n "$BUCKETS" ] || { say "::error::no Storage buckets were listed"; exit 1; }
  while IFS= read -r b; do
    say "  bucket $b"
    supabase storage cp -r "ss:///$b" "$PLAIN/storage/$b" --experimental --project-ref "$REF" >/dev/null
  done <<< "$BUCKETS"
  OBJECTS="$(find "$PLAIN/storage" -type f | wc -l | tr -d ' ')"
  tar -C "$PLAIN" -czf "$PLAIN/photos.tar.gz" storage
  seal photos.tar.gz "$PLAIN/photos.tar.gz" "$(jq -n --argjson n "$OBJECTS" --arg b "$(printf '%s' "$BUCKETS" | tr '\n' ' ')" '{objects: $n, buckets: $b}')"
  say "  $OBJECTS files"
else
  say "Storage skipped: SUPABASE_ACCESS_TOKEN is not set"
fi

jq --arg t "$STAMP" --arg r "${GITHUB_RUN_ID:-local}" '. + {stamp: $t, run: $r, kind: "weekly"}' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
cp "$MANIFEST" "$OUT/manifest.json"

say "Set $STAMP:"
for f in "${FILES[@]}" manifest.json; do printf '  %-32s %10s bytes\n' "$f" "$(size "$OUT/$f")"; done

if [ "$DRY_RUN" -eq 1 ]; then
  say "Dry run: nothing was uploaded. Would upload weekly/$STAMP/ to the bucket $BUCKET and keep the newest $KEEP sets."
  exit 0
fi

# 4. Upload, manifest last. R2 speaks the S3 API. aws-cli 2.23 and later add checksums R2 does not take, so they are
# switched to "only when required".
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
EP="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
say "Upload"
for f in "${FILES[@]}" manifest.json; do
  "$AWS" s3 cp --only-show-errors --endpoint-url "$EP" "$OUT/$f" "s3://$BUCKET/weekly/$STAMP/$f"
done

# 5. Keep the newest KEEP sets. A set is a folder under weekly/; names sort by time.
say "Prune"
SETS="$("$AWS" s3api list-objects-v2 --endpoint-url "$EP" --bucket "$BUCKET" --prefix weekly/ --delimiter / \
  --query 'CommonPrefixes[].Prefix' --output text | tr '\t' '\n' | grep '^weekly/' | sort || true)"
TOTAL="$(printf '%s\n' "$SETS" | grep -c . || true)"
if [ "$TOTAL" -gt "$KEEP" ]; then
  printf '%s\n' "$SETS" | head -n "$((TOTAL - KEEP))" | while IFS= read -r old; do
    say "  deleting $old"
    "$AWS" s3 rm --only-show-errors --recursive --endpoint-url "$EP" "s3://$BUCKET/$old"
  done
fi
say "  $((TOTAL > KEEP ? KEEP : TOTAL)) sets kept"

# 6. Tell the daily staff summary.
RESULT="$W/result.json"
jq -n --arg t "$STAMP" --arg r "${GITHUB_RUN_ID:-local}" --argjson m "$(cat "$MANIFEST")" \
  '{ok: true, at: $t, run: $r, sets_kept: '"$KEEP"', files: ($m.files | map_values({encrypted_bytes}))}' > "$RESULT"
node scripts/ops/record-event.mjs --kind backup_done --channel daily --title "Weekly backup done" \
  --body "The database, the Storage photos and the repository were encrypted and stored in R2." \
  --field "Set=$STAMP" --dedupe-key "backup_done:$STAMP" --setting backup_last --value-file "$RESULT" || true
say "Done."
