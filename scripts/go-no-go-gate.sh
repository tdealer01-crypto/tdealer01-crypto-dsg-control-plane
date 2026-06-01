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
readiness_file="${TMP_ROOT%/}/go-no-go-readiness.json"

# Release checks must validate the public deployment directly. Some notebook/sandbox
# environments inject HTTP(S) proxy settings that turn public Vercel smoke checks into
# `CONNECT tunnel failed, response 403` false negatives. Clear proxy config for this
# script and force curl to bypass proxies.
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy \
  NPM_CONFIG_PROXY NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY \
  npm_config_proxy npm_config_http_proxy npm_config_https_proxy || true
export NO_PROXY="*"
export no_proxy="*"

http_code() {
  local url="$1"
  local output_file="$2"
  local code
  code=$(curl --noproxy '*' --proxy '' -sS -o "$output_file" -w "%{http_code}" --max-time 20 "$url") || code="000"
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
    if grep -qi "CONNECT tunnel failed" "$response_file" 2>/dev/null; then
      echo "   Proxy tunnel failure detected. Re-run from GitHub Actions or a direct-network shell."
    fi
    failures=$((failures + 1))
  fi
}

check_json_ok_endpoint() {
  local path="$1"
  local output_file="$2"
  local url="${BASE_URL%/}${path}"
  local code
  code=$(http_code "$url" "$output_file")
  if ! [[ "$code" =~ ^(2|3)[0-9][0-9]$ ]]; then
    echo "❌ ${path} -> HTTP ${code}"
    if grep -qi "CONNECT tunnel failed" "$output_file" 2>/dev/null; then
      echo "   Proxy tunnel failure detected. Re-run from GitHub Actions or a direct-network shell."
    fi
    failures=$((failures + 1))
    return
  fi

  if ! command -v jq >/dev/null 2>&1; then
    echo "❌ ${path} -> cannot verify JSON .ok because jq is not installed"
    failures=$((failures + 1))
    return
  fi

  local ok
  ok=$(jq -r '.ok // false' "$output_file" 2>/dev/null || echo false)
  if [[ "$ok" == "true" ]]; then
    echo "✅ ${path} -> HTTP ${code} ok=true"
  else
    echo "❌ ${path} -> HTTP ${code} ok=${ok}"
    jq -r '.error // .checks // .readiness // empty' "$output_file" 2>/dev/null || true
    failures=$((failures + 1))
  fi
}

echo "== Trust surface checks for ${BASE_URL} =="
check_endpoint "/terms"
check_endpoint "/privacy"
check_endpoint "/security"
check_endpoint "/support"

echo "== Runtime baseline checks =="
check_json_ok_endpoint "/api/health" "$response_file"
check_json_ok_endpoint "/api/readiness" "$readiness_file"

# /api/core/monitor is intentionally no longer a release dependency. /api/readiness is the source of truth.

# Enforce user-flow audit via Playwright. Run with proxy variables cleared so the browser
# follows the same direct-public-network assumption as curl.
if command -v npx >/dev/null 2>&1; then
  echo "== User-flow audit gate (Playwright) =="
  if ! env -u HTTP_PROXY -u HTTPS_PROXY -u ALL_PROXY -u http_proxy -u https_proxy -u all_proxy \
    NO_PROXY='*' no_proxy='*' PLAYWRIGHT_BASE_URL="$BASE_URL" \
    npx playwright test tests/e2e/finance-governance-live-supabase.spec.ts; then
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
