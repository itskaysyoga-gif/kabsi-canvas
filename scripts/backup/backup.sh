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
#   weekly/<UTC stamp>/kabsi-harvey-run.bundle.age and kabsi-harvey.bundle.age   git bundles of the two Harvey repositories, all refs (Safe 1, R-151 section C)
#   weekly/<UTC stamp>/harvey-release/<tag>/<asset>   the release assets of kabsi-harvey-run, copied as they are: Harvey
#                                                  already encrypted them (AES-256, HARVEY_DB_KEY). Only files that end in .enc and start with
#                                                  the openssl "Salted__" header are accepted; anything else is skipped and named in a warning
# The manifest is uploaded last, so a set without one is unfinished and the restore drill ignores it.
# The newest BACKUP_KEEP (3) sets are kept, 21 days of weekly sets (master plan 30.10 point 1: with the 7 day purge after a
# business leaves, no copy of its Google data outlives 28 days); older ones are deleted only after the new set is uploaded.
#
# Secrets (GitHub, Settings, Secrets and variables, Actions): SUPABASE_DB_URL, BACKUP_PASSPHRASE, R2_ACCOUNT_ID,
# R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and SUPABASE_ACCESS_TOKEN (already there for deploy.yml). Values are never
# printed. Nothing here uses set -x.
# HARVEY_READ_TOKEN is optional: a fine-grained token with Contents read-only on kabsi-harvey-run and kabsi-harvey (both
# private). If it is missing, expired or cannot read, the Harvey step logs a warning and the job still succeeds.
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

# Clean 4 (10 Nov 2026): one failed part of a big upload (R2 answered InvalidPart on 10 Nov) must not fail the whole weekly
# run. An upload of one file is tried up to BACKUP_UPLOAD_TRIES (3) times with BACKUP_UPLOAD_PAUSE (20) seconds between
# tries; the file is sent again from the start. After the last try the failure stops the run, as before.
UPLOAD_TRIES="${BACKUP_UPLOAD_TRIES:-3}"
UPLOAD_PAUSE="${BACKUP_UPLOAD_PAUSE:-20}"
case "$UPLOAD_TRIES" in '' | *[!0-9]* | 0) UPLOAD_TRIES=3 ;; esac # a bad value must never mean "retry forever"
with_retry() { # with_retry <what> <command...>
  local what="$1" n=1
  shift
  until "$@"; do
    if [ "$n" -ge "$UPLOAD_TRIES" ]; then
      say "::${RETRY_GIVEUP_LEVEL:-error}::$what failed $n times; giving up"
      return 1
    fi
    say "::warning::$what failed (try $n of $UPLOAD_TRIES); pausing ${UPLOAD_PAUSE}s, then sending it again"
    sleep "$UPLOAD_PAUSE"
    n=$((n + 1))
  done
  if [ "$n" -gt 1 ]; then say "$what went through on try $n"; fi
  return 0
}

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
  # Sec 2: GitHub's runners have no IPv6 and the direct address answers on IPv6 only; db-url.mjs swaps it for the
  # session pooler (IPv4). The resolved address is kept in this variable only, never printed.
  SUPABASE_DB_URL="$(node scripts/backup/db-url.mjs)"
  export SUPABASE_DB_URL
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
    # The CLI prints one line per file (names, some with a phone number inside) and this repository's logs are public, so
    # its output goes to a file and a failure shows only the lines that do not name a file.
    if ! supabase storage cp -r "ss:///$b" "$PLAIN/storage/$b" --experimental --project-ref "$REF" >/dev/null 2> "$W/storage.err"; then
      say "::error::Copying the Storage bucket $b failed. The CLI's output is not printed because it names files (some hold a phone number); run the backup by hand to read it."
      false
    fi
  done <<< "$BUCKETS"
  OBJECTS="$(find "$PLAIN/storage" -type f | wc -l | tr -d ' ')"
  tar -C "$PLAIN" -czf "$PLAIN/photos.tar.gz" storage
  seal photos.tar.gz "$PLAIN/photos.tar.gz" "$(jq -n --argjson n "$OBJECTS" --arg b "$(printf '%s' "$BUCKETS" | tr '\n' ' ')" '{objects: $n, buckets: $b}')"
  say "  $OBJECTS files"
else
  say "Storage skipped: SUPABASE_ACCESS_TOKEN is not set"
fi

# 4b. (after the database and the photos, so a slow or refused Harvey read can never starve them) The two Harvey repositories (Safe 1, R-151 section C: if the GitHub account is lost, Kabsi must survive). Both are
# private, so the workflow's own token cannot read them: HARVEY_READ_TOKEN (read-only, optional) does. This step can never
# fail the job: a missing or refused token, an unreadable repository or a release that cannot be read is a warning and the
# set simply has no Harvey part this week. An encryption failure after a successful read is a real failure (seal exits).
# The token goes to git and gh through the environment only (never a command line), and every message that could carry it
# is passed through scrub first.
HARVEY_OWNER="${HARVEY_OWNER:-itskaysyoga-gif}"
HARVEY_RUN_SOURCE="${HARVEY_RUN_SOURCE:-https://github.com/$HARVEY_OWNER/kabsi-harvey-run.git}"
HARVEY_SOURCE="${HARVEY_SOURCE:-https://github.com/$HARVEY_OWNER/kabsi-harvey.git}"
GH="${GH_BIN:-gh}"
RELEASE_DIR="$OUT/harvey-release"      # already encrypted by Harvey; uploaded as it is
HARVEY_SKIPPED=()                      # what was not backed up and why (names only)
HARVEY_REPOS='{}'
RELEASE_FILES=()                       # paths relative to $RELEASE_DIR
RELEASE_JSON='[]'
scrub() { # stdin to stdout: web addresses (a download error can carry a signed one) and the token, in both forms, replaced
  local t="${HARVEY_READ_TOKEN:-}" b=""
  [ -z "$t" ] || b="$(printf 'x-access-token:%s' "$t" | base64 -w0)"
  SCRUB_T="$t" SCRUB_B="$b" python3 -I -c '
import os, re, sys
text = re.sub(r"[a-z]+://\S+", "<address>", sys.stdin.read())
for secret in (os.environ["SCRUB_T"], os.environ["SCRUB_B"]):
    if secret:
        text = text.replace(secret, "***")
sys.stdout.write(text)'
}
harvey_warn() { say "::warning::Harvey backup: $1"; HARVEY_SKIPPED+=("$2"); }
harvey_mirror() { # source, destination; the read-only token reaches git through the environment
  if [[ "$1" == https://* ]]; then
    GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=http.extraheader \
      GIT_CONFIG_VALUE_0="AUTHORIZATION: basic $(printf 'x-access-token:%s' "$HARVEY_READ_TOKEN" | base64 -w0)" \
      GIT_TERMINAL_PROMPT=0 timeout 600 git clone --mirror --quiet "$1" "$2" 2> "$W/harvey.err"
  else
    timeout 600 git clone --mirror --quiet "$1" "$2" 2> "$W/harvey.err"
  fi
}
harvey_bundle() { # name, source, out file. Returns 1 (never exits) when it cannot read.
  local mirror="${PLAIN:?}/harvey-${1:?}.git"
  harvey_mirror "$2" "$mirror" || { harvey_warn "$1 could not be read ($(head -n 1 "$W/harvey.err" | scrub | cut -c1-160)). Check that HARVEY_READ_TOKEN is valid and has Contents read on it. Not backed up this week." "$1"; return 1; }
  git -C "$mirror" bundle create "$3" --all 2> "$W/harvey.err" || { harvey_warn "$1: the bundle could not be made. Not backed up this week." "$1"; return 1; }
  rm -rf "${mirror:?}"
  git bundle verify "$3" >/dev/null 2>&1 || { harvey_warn "$1: the bundle did not verify. Not backed up this week." "$1"; return 1; }
  return 0
}
harvey_release() { # copies every release asset of kabsi-harvey-run as it is, and keeps only encrypted files
  # REST only (gh api): the list of assets, then each one by its id with the octet-stream header.
  local rows tag id name dir f
  rows="$(GH_TOKEN="$HARVEY_READ_TOKEN" timeout 120 "$GH" api "repos/$HARVEY_OWNER/kabsi-harvey-run/releases" --paginate \
    --jq '.[] | .tag_name as $t | .assets[] | [$t, (.id | tostring), .name] | @tsv' 2> "$W/harvey.err")" \
    || { harvey_warn "the releases of kabsi-harvey-run could not be listed ($(head -n 1 "$W/harvey.err" | scrub | cut -c1-160)). Release assets not backed up this week." "kabsi-harvey-run releases"; return 1; }
  [ -n "$rows" ] || { harvey_warn "kabsi-harvey-run has no release asset to copy." "kabsi-harvey-run releases"; return 1; }
  while IFS=$'\t' read -r tag id name; do
    # A tag or file name that could climb out of the folder is refused, never used in a path.
    if ! [[ "$tag" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ && "$name" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ && "$id" =~ ^[0-9]+$ ]]; then
      harvey_warn "a release asset has a name this backup will not use. It was NOT copied." "release asset with an unusual name"
      continue
    fi
    dir="${RELEASE_DIR:?}/${tag:?}"
    mkdir -p "$dir"
    f="$dir/${name:?}"
    if ! GH_TOKEN="$HARVEY_READ_TOKEN" timeout 600 "$GH" api -H "Accept: application/octet-stream" "repos/$HARVEY_OWNER/kabsi-harvey-run/releases/assets/$id" > "$f" 2> "$W/harvey.err"; then
      harvey_warn "release asset $tag/$name could not be downloaded ($(head -n 1 "$W/harvey.err" | scrub | cut -c1-160))." "release asset $tag/$name"
      rm -f "${f:?}"
      continue
    fi
    if [ "$(size "$f")" -gt "${HARVEY_ASSET_MAX_BYTES:-500000000}" ]; then
      harvey_warn "release asset $tag/$name is larger than the cap of ${HARVEY_ASSET_MAX_BYTES:-500000000} bytes. It was NOT copied." "release asset $tag/$name"
      rm -f "${f:?}"
      continue
    fi
    # Only what Harvey encrypted leaves the runner: a .enc name and the openssl "Salted__" header (checked on the first
    # 8 bytes, the content is never read or printed). Anything else is deleted here and named in a warning.
    if [[ "$name" == *.enc ]] && [ "$(head -c 8 "$f" | LC_ALL=C tr -d '\000')" = "Salted__" ]; then
      RELEASE_FILES+=("$tag/$name")
    else
      harvey_warn "release $tag has the file $name, which is not an encrypted .enc file. It was NOT copied." "release $tag/$name"
      rm -f "${f:?}"
    fi
  done <<< "$rows"
  [ "${#RELEASE_FILES[@]}" -gt 0 ] || return 1
  return 0
}

say "Harvey repositories"
if ! have HARVEY_READ_TOKEN; then
  say "::warning::HARVEY_READ_TOKEN is not set, so the two Harvey repositories (kabsi-harvey-run, kabsi-harvey) and the release assets were not backed up. Add the token (docs/SECRETS.md). The job continues."
  HARVEY_SKIPPED+=("HARVEY_READ_TOKEN not set")
else
  for spec in "kabsi-harvey-run:$HARVEY_RUN_SOURCE" "kabsi-harvey:$HARVEY_SOURCE"; do
    hname="${spec%%:*}"; hsrc="${spec#*:}"
    if harvey_bundle "$hname" "$hsrc" "$PLAIN/$hname.bundle"; then
      hrefs="$(git ls-remote "$PLAIN/$hname.bundle" | wc -l | tr -d ' ')"
      hhead="$(git ls-remote "$PLAIN/$hname.bundle" HEAD | cut -f1)"
      seal "$hname.bundle" "$PLAIN/$hname.bundle" "$(jq -n --argjson n "$hrefs" --arg h "$hhead" '{refs: $n, head_sha: $h}')"
      HARVEY_REPOS="$(jq --arg n "$hname" --argjson c "$hrefs" '.[$n] = {refs: $c}' <<< "$HARVEY_REPOS")"
      say "  $hname: $hrefs refs"
      rm -f "${PLAIN:?}/$hname.bundle"
    fi
  done
  if harvey_release; then
    for f in "${RELEASE_FILES[@]}"; do
      RELEASE_JSON="$(jq --arg f "$f" --argjson s "$(size "$RELEASE_DIR/$f")" --arg h "$(sha "$RELEASE_DIR/$f")" \
        '. + [{file: $f, bytes: $s, sha256: $h}]' <<< "$RELEASE_JSON")"
      say "  release asset $f: $(size "$RELEASE_DIR/$f") bytes"
    done
  fi
fi
jq --argjson r "$HARVEY_REPOS" --argjson a "$RELEASE_JSON" --argjson s "$(printf '%s\n' "${HARVEY_SKIPPED[@]:-}" | jq -R . | jq -s 'map(select(length > 0))')" \
  '. + {harvey: {repos: $r, release_assets: $a, skipped: $s}}' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST" || false

jq --arg t "$STAMP" --arg r "${GITHUB_RUN_ID:-local}" '. + {stamp: $t, run: $r, kind: "weekly"}' "$MANIFEST" > "$MANIFEST.tmp" && mv "$MANIFEST.tmp" "$MANIFEST"
cp "$MANIFEST" "$OUT/manifest.json"

say "Set $STAMP:"
for f in "${FILES[@]}" manifest.json; do printf '  %-32s %10s bytes\n' "$f" "$(size "$OUT/$f")"; done
for f in "${RELEASE_FILES[@]}"; do printf '  %-32s %10s bytes (already encrypted by Harvey)\n' "harvey-release/$f" "$(size "$RELEASE_DIR/$f")"; done

if [ "$DRY_RUN" -eq 1 ]; then
  # Proof of the upload retry (Clean 4): the same helper the upload uses, with two stand-in commands and no pause. One
  # fails twice then works (the 10 Nov InvalidPart case: the run goes on), one never works (the run stops after the last try).
  RETRY_COUNT="$W/retry-count"
  : > "$RETRY_COUNT"
  flaky() { echo x >> "$RETRY_COUNT"; [ "$(wc -l < "$RETRY_COUNT")" -ge 3 ]; }
  never() { return 1; }
  if ! (UPLOAD_TRIES=3 UPLOAD_PAUSE=0 with_retry "retry check, fails twice" flaky); then
    say "::error::Dry run: the upload retry did not recover from two failed tries"
    exit 1
  fi
  if (UPLOAD_TRIES=3 UPLOAD_PAUSE=0 RETRY_GIVEUP_LEVEL=notice with_retry "retry check, always fails" never); then
    say "::error::Dry run: the upload retry did not stop after the last try"
    exit 1
  fi
  say "Upload retry proved: a part that failed twice went through on the third try, and a part that never works stops the run after 3 tries."
  say "Dry run: nothing was uploaded. Would upload weekly/$STAMP/ to the bucket $BUCKET and keep the newest $KEEP sets."
  exit 0
fi

# 4. Upload, manifest last. R2 speaks the S3 API. aws-cli 2.23 and later add checksums R2 does not take, so they are
# switched to "only when required".
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" AWS_DEFAULT_REGION=auto
export AWS_REQUEST_CHECKSUM_CALCULATION=when_required AWS_RESPONSE_CHECKSUM_VALIDATION=when_required
EP="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
say "Upload"
for f in "${FILES[@]}"; do
  with_retry "Upload of $f" "$AWS" s3 cp --only-show-errors --endpoint-url "$EP" "$OUT/$f" "s3://$BUCKET/weekly/$STAMP/$f"
done
for f in "${RELEASE_FILES[@]}"; do
  with_retry "Upload of harvey-release/$f" "$AWS" s3 cp --only-show-errors --endpoint-url "$EP" "$RELEASE_DIR/$f" "s3://$BUCKET/weekly/$STAMP/harvey-release/$f"
done
with_retry "Upload of manifest.json" "$AWS" s3 cp --only-show-errors --endpoint-url "$EP" "$OUT/manifest.json" "s3://$BUCKET/weekly/$STAMP/manifest.json"

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
  '{ok: true, at: $t, run: $r, sets_kept: '"$KEEP"', files: ($m.files | map_values({encrypted_bytes})), harvey: {repos: ($m.harvey.repos | keys), release_assets: ($m.harvey.release_assets | length), skipped: ($m.harvey.skipped | length)}}' > "$RESULT"
BODY="The database, the Storage photos, the repository and the Harvey repositories were encrypted and stored in R2."
if [ "${#HARVEY_SKIPPED[@]}" -gt 0 ]; then
  BODY="The database, the Storage photos and the repository were encrypted and stored in R2. The Harvey part is incomplete: ${#HARVEY_SKIPPED[@]} item(s) skipped, read the run log (docs/runbooks/github-gone.md)."
fi
node scripts/ops/record-event.mjs --kind backup_done --channel daily --title "Weekly backup done" \
  --body "$BODY" \
  --field "Set=$STAMP" --dedupe-key "backup_done:$STAMP" --setting backup_last --value-file "$RESULT" || true
say "Done."
