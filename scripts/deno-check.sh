#!/usr/bin/env bash
# Type-checks every Edge Function and runs the Deno tests. Copies supabase/functions to a scratch folder with
# nodeModulesDir set, because the functions import npm packages (see docs/KABSI-PLAN.md Appendix A, working notes).
# The copy keeps the repo layout (supabase/functions next to tests/fixtures) so the Google layer's tests can import
# their fixtures from tests/fixtures/google/ (P0.1-11).
set -euo pipefail
scratch="$(mktemp -d)"
mkdir -p "$scratch/supabase/functions" "$scratch/tests"
cp -r supabase/functions/. "$scratch/supabase/functions/"
cp -r tests/fixtures "$scratch/tests/"
echo '{"nodeModulesDir":"auto"}' > "$scratch/deno.json"
cd "$scratch/supabase/functions"
for dir in */; do
  fn="${dir%/}"
  [ "$fn" = "_shared" ] && continue
  deno check "$fn/index.ts"
done
deno test --no-check _shared/
