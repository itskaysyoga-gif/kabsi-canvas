#!/usr/bin/env bash
# Type-checks every Edge Function and runs the Deno tests. Copies supabase/functions to a scratch folder with
# nodeModulesDir set, because the functions import npm packages (see docs/KABSI-PLAN.md Appendix A, working notes).
# The copy keeps the repo layout (supabase/functions next to tests/fixtures) so the Google layer's tests can import
# their fixtures from tests/fixtures/google/ (P0.1-11). The evaluation set (scripts/eval, P0.3-04) is checked and its
# gate tested with stub models here too.
set -euo pipefail
scratch="$(mktemp -d)"
mkdir -p "$scratch/supabase/functions" "$scratch/tests" "$scratch/scripts/eval" "$scratch/scripts/nora-eval" "$scratch/knowledge"
cp -r supabase/functions/. "$scratch/supabase/functions/"
cp -r tests/fixtures "$scratch/tests/"
cp -r scripts/eval/. "$scratch/scripts/eval/"
cp -r scripts/nora-eval/. "$scratch/scripts/nora-eval/"
cp knowledge/kabsi-facts.md "$scratch/knowledge/"
echo '{"nodeModulesDir":"auto"}' > "$scratch/deno.json"
cd "$scratch/supabase/functions"
for dir in */; do
  fn="${dir%/}"
  [ "$fn" = "_shared" ] && continue
  deno check "$fn/index.ts"
done
# --allow-env: satori (the review graphic, P0.8-07) reads NODE_ENV and JEST_WORKER_ID when it loads. --allow-read and
# --allow-net: the photo engine tests (P0.5-01) read tests/fixtures/photos and load the image codecs.
deno test --no-check --allow-env --allow-read --allow-net=deno.land,cdn.jsdelivr.net _shared/
# P0.3-04: the evaluation set and the prompt gate, with stub models only (no network).
cd "$scratch"
deno check scripts/eval/*.ts
deno test --no-check scripts/eval/
# P0.6-06: Nora's evaluation (60 questions) is type-checked here; its stub run is a vitest test (tests/nora-sync.test.ts).
deno check scripts/nora-eval/*.ts
deno run --allow-read --allow-env scripts/nora-eval/run-nora-eval.ts --stub pass
