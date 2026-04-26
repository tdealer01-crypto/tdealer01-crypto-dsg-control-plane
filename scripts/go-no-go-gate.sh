#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-}"
if [[ -z "$BASE_URL" ]]; then
  echo "usage: $0 <base-url>"
  exit 2
fi

if [[ "$BASE_URL" == *"your-preview-url"* || "$BASE_URL" == *"<"* || "$BASE_URL" == *">"* ]]; then
  echo "❌ Invalid base URL: ${BASE_URL}"
  echo "   Replace the placeholder with a real deployed URL, for example:"
  echo "   ./scripts/go-no-go-gate.sh https://your-real-preview.vercel.app"
  exit 2
fi

failures=0
TMP_ROOT="${TMPDIR:-}"
if [[ -z "$TMP_ROOT" || ! -d "$TMP_ROOT" || ! -w "$TMP_ROOT" ]]; then
  TMP_ROOT="$(pwd)/.tmp"
  mkdir -p "$TMP_ROOT"
fi

response_file="${TMP_ROOT%/}/go-no-go-response.json"
readiness_file="${TMP_ROOT%/}/go-no-go-readiness.json"

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

readiness_code=$(http_code "${BASE_URL%/}/api/readiness" "$readiness_file")
if [[ "$readiness_code" =~ ^(2|3)[0-9][0-9]$ ]]; then
  readiness_status=$(jq -r '.status // .readiness.status // .readiness_status // "ready"' "$readiness_file" 2>/dev/null || echo "ready")
  echo "✅ /api/readiness -> HTTP ${readiness_code} status=${readiness_status}"
elif [[ "$readiness_code" == "500" ]]; then
  echo "❌ /api/readiness -> HTTP 500"
  echo "   Deployment readiness endpoint returned an internal server error. Inspect Vercel deployment logs before any agent execution."
  failures=$((failures + 1))
else
  echo "❌ /api/readiness -> HTTP ${readiness_code}"
  failures=$((failures + 1))
fi

# /api/core/monitor is intentionally no longer a release dependency. /api/readiness is the source of truth.

if [[ "$(uname -o 2>/dev/null || true)" == "Android" ]]; then
  echo "⚠️ Android/Termux detected; skipping Playwright user-flow audit locally. Run this gate in GitHub Actions, Vercel CI, or a Linux/macOS workstation before merge."
elif command -v npx >/dev/null 2>&1; then
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
