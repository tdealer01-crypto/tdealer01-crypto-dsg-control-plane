#!/usr/bin/env bash
set -euo pipefail

missings=0
shopt -s globstar nullglob

# Heuristic: ensure each app/api/**/route.ts references handleApiError
for f in app/api/**/route.ts; do
  if [ ! -f "$f" ]; then
    continue
  fi
  if ! grep -q "handleApiError" "$f"; then
    echo "ERROR: missing handleApiError in $f"
    missings=$((missings+1))
  fi
done

if [ "$missings" -gt 0 ]; then
  echo "FAILED: $missings API route(s) missing centralized error handler. See docs/ops/ERROR_HANDLING_POLICY.md"
  exit 1
fi

echo "OK: all API routes reference handleApiError (or manual exception)."
