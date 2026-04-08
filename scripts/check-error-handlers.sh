#!/usr/bin/env bash
set -euo pipefail

missings=0
leaks=0
shopt -s globstar nullglob

# Heuristic checks for app/api routes.
for f in app/api/**/route.ts; do
  if [ ! -f "$f" ]; then
    continue
  fi

  if grep -q "ERROR_HANDLER_EXEMPT" "$f"; then
    continue
  fi

  if ! grep -Eq "handleApiError|internalErrorMessage|serverErrorResponse|toSafeErrorResponse" "$f"; then
    echo "WARN: missing centralized error helper in $f"
    missings=$((missings + 1))
  fi

  if grep -Eq "error\s*:\s*(err|error)\.message|instanceof Error \? (err|error)\.message" "$f"; then
    echo "ERROR: potential error-message leakage in $f"
    leaks=$((leaks + 1))
  fi
done

if [ "$leaks" -gt 0 ]; then
  echo "FAILED: ${leaks} route(s) with potential leakage."
  echo "See docs/ops/ERROR_HANDLING_POLICY.md"
  exit 1
fi

if [ "$missings" -gt 0 ]; then
  echo "WARN: ${missings} API route(s) are still on legacy/manual error handling paths."
  echo "INFO: migrate to handleApiError(route, err) over time."
fi

echo "OK: no direct error-message leakage patterns detected in app/api routes."
