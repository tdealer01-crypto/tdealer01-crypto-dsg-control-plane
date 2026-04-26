#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: $0 <base-url>"
  exit 2
fi

failures=0
TMP_ROOT="${TMPDIR:-}"
if [[ -z "$TMP_ROOT" || ! -d "$TMP_ROOT" || ! -w "$TMP_ROOT" ]]; then
  TMP_ROOT="$(pwd)/.tmp"
  mkdir -p "$TMP_ROOT"
fi

response_file="${TMP_ROOT%/}/go-no-go-response.json"
monitor_file="${TMP_ROOT%/}/go-no-go-monitor.json"

http_code() {
  local url="$1"
  local output_file="$2"
  local code
  code=$(curl -sS -o "$output_file" -w "%{http_code}" --max-time 20 "$url") || code="000"
  printf '%s' "$code"
}

check_endpoint() {
  local path="$1"
  local url="${BASE_URL%/}${path}"
  local code
  code=$(http_code "$url" "$response_file")
  if [[ "$code" =~ ^(2|3)[0-9][0-9]$ ]]; then
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
check_endpoint "/api/readiness"

monitor_code=$(http_code "${BASE_URL%/}/api/core/monitor" "$monitor_file")
if [[ "$monitor_code" == "200" ]]; then
  status=$(jq -r '.readiness.status // .readiness_status // "unknown"' "$monitor_file" 2>/dev/null || echo "unknown")
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

# NEW: enforce user-flow audit via Playwright
if command -v npx >/dev/null 2>&1; then
  echo "== User-flow audit gate (Playwright) =="
  if ! PLAYWRIGHT_BASE_URL="$BASE_URL" npx playwright test tests/e2e/finance-governance-live-supabase.spec.ts; then
    echo "❌ user-flow audit failed"
    failures=$((failures + 1))
  else
    echo "✅ user-flow audit passed"
  fi
else
  echo "⚠️ playwright not available, skipping user-flow audit gate"
fi

if rg -n --glob '!scripts/go-no-go-gate.sh' '/api/finance-governance/server-store/' app lib components scripts; then
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
