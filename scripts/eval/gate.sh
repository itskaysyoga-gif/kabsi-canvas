#!/usr/bin/env bash
# The prompt gate (P0.3-04, K-104): the evaluation set on the real models. CI runs it when a file under
# supabase/functions/_shared/ai/prompts/ changes. Needs ANTHROPIC_API_KEY. Copies the functions and the evaluation next
# to a deno.json with nodeModulesDir (like scripts/deno-check.sh) and writes the results to eval-result.json.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
scratch="$(mktemp -d)"
mkdir -p "$scratch/supabase/functions" "$scratch/scripts/eval"
cp -r "$root/supabase/functions/." "$scratch/supabase/functions/"
cp -r "$root/scripts/eval/." "$scratch/scripts/eval/"
echo '{"nodeModulesDir":"auto"}' > "$scratch/deno.json"
cd "$scratch"
status=0
deno run -A scripts/eval/run-eval.ts --live --out "$root/eval-result.json" "$@" || status=$?
exit "$status"
