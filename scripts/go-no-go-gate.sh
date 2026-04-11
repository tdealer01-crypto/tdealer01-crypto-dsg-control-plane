#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: $0 <base-url>"
  exit 2
fi

failures=0

check_endpoint() {
  local path="$1"
  local url="${BASE_URL%/}${path}"
  local code
  code=$(curl -sS -o /tmp/go-no-go-response.json -w "%{http_code}" --max-time 20 "$url" || echo "000")
  if [[ "$code" =~ ^2|3 ]]; then
    echo "✅ ${path} -> HTTP ${code}"
  else
    echo "❌ ${path} -> HTTP ${code}"
    failures=$((failures + 1))
  fi
}

echo "== Trust surface checks for ${BASE_URL} =="
check_endpoint "/terms"
check_endpoint "/privacy"
check_endpoint "/security"
check_endpoint "/support"

echo "== Runtime baseline checks =="
check_endpoint "/api/health"

monitor_code=$(curl -sS -o /tmp/go-no-go-monitor.json -w "%{http_code}" --max-time 20 "${BASE_URL%/}/api/core/monitor" || echo "000")
if [[ "$monitor_code" == "200" ]]; then
  status=$(jq -r '.readiness.status // .readiness_status // "unknown"' /tmp/go-no-go-monitor.json 2>/dev/null || echo "unknown")
  if [[ "$status" == "ready" ]]; then
    echo "✅ /api/core/monitor readiness=$status"
  else
    echo "❌ /api/core/monitor readiness=$status"
    failures=$((failures + 1))
  fi
elif [[ "$monitor_code" == "401" || "$monitor_code" == "403" ]]; then
  echo "⚠️ /api/core/monitor requires auth (HTTP ${monitor_code})"
else
  echo "❌ /api/core/monitor -> HTTP ${monitor_code}"
  failures=$((failures + 1))
fi

if rg -n '/api/finance-governance/server-store/' app lib; then
  echo "❌ Legacy server-store caller(s) found"
  failures=$((failures + 1))
else
  echo "✅ No legacy /api/finance-governance/server-store callers found"
fi

if [[ "$failures" -gt 0 ]]; then
  echo "GO/NO-GO RESULT: NO-GO (${failures} failing checks)"
  exit 1
fi

echo "GO/NO-GO RESULT: PASS (all scripted checks green)"
