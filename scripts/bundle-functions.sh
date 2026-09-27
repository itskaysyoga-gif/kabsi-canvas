#!/usr/bin/env bash
# Bundles Edge Functions into one file each (whitespace-minified, ASCII-only) for deploying through the
# Supabase MCP tool, which needs every file's full text. The source of truth stays supabase/functions.
#   scripts/bundle-functions.sh api content posts-weekly   → .bundles/<name>/index.js
set -euo pipefail
cd "$(dirname "$0")/../supabase/functions"
for f in "$@"; do
  mkdir -p "../../.bundles/$f"
  npx -y esbuild@0.24.0 "$f/index.ts" --bundle --format=esm --platform=neutral --target=es2022 \
    --minify-whitespace --minify-syntax --charset=ascii --legal-comments=none \
    --external:'npm:*' --external:'https://*' --outfile="../../.bundles/$f/index.js" --log-level=warning
  echo "$f: $(wc -c < "../../.bundles/$f/index.js") bytes"
done
