#!/usr/bin/env bash
# Flags POST/PUT/PATCH route handlers that use raw request.json() without the
# readJsonBody wrapper, which skips size limiting (64KB default) and depth
# checking. Routes that are intentionally exempt should add:
#   // BODY_PARSE_EXEMPT: <reason>
set -euo pipefail

violations=0
shopt -s globstar nullglob

for f in app/api/**/route.ts; do
  [ -f "$f" ] || continue

  if grep -q "BODY_PARSE_EXEMPT" "$f"; then
    continue
  fi

  # Only check files that export POST/PUT/PATCH handlers
  if ! grep -Eq "^export (async )?function (POST|PUT|PATCH)" "$f"; then
    continue
  fi

  if grep -Eq "await (request|req)\.(json)\(\)" "$f"; then
    echo "WARN: raw request.json() in $f — use readJsonBody from lib/security/request-json"
    violations=$((violations + 1))
  fi
done

if [ "$violations" -gt 0 ]; then
  echo ""
  echo "INFO: ${violations} route(s) still use raw request.json() without size/depth guards."
  echo "INFO: migrate to readJsonBody(request, { maxBytes: N }) at your own pace."
  echo "INFO: this check is informational — it does not block CI."
fi

echo "OK: body-safety check complete (${violations} informational warning(s))."
