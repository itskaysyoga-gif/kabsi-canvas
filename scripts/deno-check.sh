#!/usr/bin/env bash
# Type-checks every Edge Function and runs the Deno tests. Copies supabase/functions to a scratch folder with
# nodeModulesDir set, because the functions import npm packages (see docs/KABSI-PLAN.md Appendix A, working notes).
set -euo pipefail
scratch="$(mktemp -d)"
cp -r supabase/functions/. "$scratch/"
echo '{"nodeModulesDir":"auto"}' > "$scratch/deno.json"
cd "$scratch"
for dir in */; do
  fn="${dir%/}"
  [ "$fn" = "_shared" ] && continue
  deno check "$fn/index.ts"
done
deno test --no-check _shared/
