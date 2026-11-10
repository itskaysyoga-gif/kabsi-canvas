#!/usr/bin/env bash
# Stand-ins for the two private Harvey repositories and the release of kabsi-harvey-run (Safe 1, R-151 section C).
#
#   bash scripts/backup/harvey-fixtures.sh <empty folder>        prints KEY=value lines for backup.sh
#
# A pull request run of backup.yml gets none of the secrets, so it cannot read the real repositories. These stand-ins let
# the dry run prove the whole Harvey path anyway: two small git repositories with branches and a tag, a stub `gh` (REST calls only) that
# serves a release with two encrypted-looking assets (the openssl "Salted__" header and random bytes) and one PLAIN file
# that backup.sh must refuse to copy. Nothing here is real data.
set -euo pipefail
D="${1:?usage: harvey-fixtures.sh <empty folder>}"
mkdir -p "$D"
export GIT_AUTHOR_NAME=fixture GIT_AUTHOR_EMAIL=fixture@example.invalid GIT_COMMITTER_NAME=fixture GIT_COMMITTER_EMAIL=fixture@example.invalid
for r in kabsi-harvey-run kabsi-harvey; do
  git init -q -b main "$D/$r.src"
  echo "fixture $r" > "$D/$r.src/README.md"
  git -C "$D/$r.src" add README.md
  git -C "$D/$r.src" commit -q -m "fixture commit"
  git -C "$D/$r.src" tag v0
  git -C "$D/$r.src" branch side
  git clone -q --bare "$D/$r.src" "$D/$r.git"
done
cat > "$D/gh" <<'STUB'
#!/usr/bin/env bash
# A stand-in for the gh command (REST calls only): one release named "data" with three files, ids 1 to 3.
set -euo pipefail
last="${*: -1}"
if [ "$1" = "api" ] && [[ "$last" == */releases/assets/* ]]; then
  case "${last##*/}" in
    1|2) { printf 'Salted__'; head -c 64 /dev/urandom; } ;;
    3) printf 'name,email\nfixture,fixture@example.invalid\n' ;;
  esac
elif [ "$1" = "api" ] && [[ "$2" == */releases ]]; then
  printf 'data\t1\tharvey.db.enc\ndata\t2\tregister.csv.enc\ndata\t3\tplain-by-mistake.csv\n'
else
  echo "gh stub: unexpected call" >&2; exit 2
fi
STUB
chmod +x "$D/gh"
printf 'HARVEY_RUN_SOURCE=%s\n' "$D/kabsi-harvey-run.git"
printf 'HARVEY_SOURCE=%s\n' "$D/kabsi-harvey.git"
printf 'GH_BIN=%s\n' "$D/gh"
printf 'HARVEY_READ_TOKEN=%s\n' "fixture-not-a-token"
