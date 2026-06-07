#!/usr/bin/env bash

##############################################################################
# health-check.sh
#
# Lightweight health check for post-deployment verification.
# Verifies critical endpoints respond within SLA and all required
# components are operational.
#
# Usage:
#   ./scripts/health-check.sh https://example.com
#   ./scripts/health-check.sh              # uses HEALTH_CHECK_URL env var
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed
#   2 = Usage error or missing URL
#
##############################################################################

set -euo pipefail

# Extract base URL from argument or environment
BASE_URL="${1:-${HEALTH_CHECK_URL:-}}"

if [[ -z "$BASE_URL" ]]; then
  cat >&2 <<'EOF'
Usage: ./scripts/health-check.sh <base-url>
       HEALTH_CHECK_URL=<base-url> ./scripts/health-check.sh

Example:
  ./scripts/health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
  HEALTH_CHECK_URL=http://localhost:3000 ./scripts/health-check.sh

Environment:
  HEALTH_CHECK_URL      Base URL for health checks
  HEALTH_CHECK_TIMEOUT  Request timeout in seconds (default: 20)
  HEALTH_CHECK_RETRIES  Number of retries (default: 3)
EOF
  exit 2
fi

# Configuration
TIMEOUT="${HEALTH_CHECK_TIMEOUT:-20}"
RETRIES="${HEALTH_CHECK_RETRIES:-3}"
RESPONSE_TIME_THRESHOLD_MS=500

# Temp directory for responses
TMP_ROOT="${TMPDIR:-}"
if [[ -z "$TMP_ROOT" || ! -d "$TMP_ROOT" || ! -w "$TMP_ROOT" ]]; then
  TMP_ROOT="$(pwd)/.tmp"
  mkdir -p "$TMP_ROOT"
fi

# Clear proxy to avoid tunnel failures in sandboxed environments
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy \
  NPM_CONFIG_PROXY NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY \
  npm_config_proxy npm_config_http_proxy npm_config_https_proxy || true
export NO_PROXY="*"
export no_proxy="*"

# State tracking
failed_checks=0
passed_checks=0
warning_count=0

###############################################################################
# Helper Functions
###############################################################################

log_pass() {
  local message="$1"
  echo "✅ $message"
  ((passed_checks++))
}

log_fail() {
  local message="$1"
  echo "❌ $message"
  ((failed_checks++))
}

log_warn() {
  local message="$1"
  echo "⚠️  $message"
  ((warning_count++))
}

log_info() {
  local message="$1"
  echo "ℹ️  $message"
}

# Fetch with automatic retries
fetch_with_retries() {
  local url="$1"
  local method="${2:-GET}"
  local response_file="$3"
  local attempt=1

  while [[ $attempt -le $RETRIES ]]; do
    local http_code
    local time_total

    if [[ "$method" == "GET" ]]; then
      http_code=$(curl \
        --noproxy '*' --proxy '' \
        -s -o "$response_file" -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        --write-out "%{time_total}" \
        "$url" 2>/dev/null || echo "000")
    elif [[ "$method" == "HEAD" ]]; then
      http_code=$(curl \
        --noproxy '*' --proxy '' \
        -s -I -o /dev/null -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        "$url" 2>/dev/null || echo "000")
    elif [[ "$method" == "OPTIONS" ]]; then
      http_code=$(curl \
        --noproxy '*' --proxy '' \
        -s -X OPTIONS -o /dev/null -w "%{http_code}" \
        --max-time "$TIMEOUT" \
        "$url" 2>/dev/null || echo "000")
    fi

    if [[ "$http_code" =~ ^(2|3)[0-9][0-9]$ ]]; then
      echo "$http_code"
      return 0
    fi

    if [[ $attempt -lt $RETRIES ]]; then
      sleep 1
    fi
    ((attempt++))
  done

  echo "000"
  return 1
}

# Check endpoint health
check_endpoint() {
  local endpoint="$1"
  local expected_code="${2:-200}"
  local description="${3:-$endpoint}"

  local url="${BASE_URL%/}${endpoint}"
  local response_file="${TMP_ROOT%/}/health-check-response.json"

  local http_code
  http_code=$(fetch_with_retries "$url" "GET" "$response_file" || echo "000")

  if [[ "$http_code" == "$expected_code" ]]; then
    log_pass "$description -> HTTP $http_code"
    return 0
  else
    log_fail "$description -> HTTP $http_code (expected $expected_code)"
    if grep -qi "CONNECT tunnel failed\|proxy\|tunnel" "$response_file" 2>/dev/null; then
      log_info "  Proxy tunnel failure detected. Run from GitHub Actions or a direct-network shell."
    fi
    return 1
  fi
}

# Parse JSON field from response
get_json_field() {
  local file="$1"
  local field="$2"

  if [[ ! -f "$file" ]]; then
    return 1
  fi

  # Simple JSON field extraction (requires jq for robustness in production)
  grep -o "\"$field\":[^,}]*" "$file" 2>/dev/null | cut -d':' -f2- | tr -d '"' || echo ""
}

# Check response time is within threshold
check_response_time() {
  local endpoint="$1"
  local threshold_ms="${2:-$RESPONSE_TIME_THRESHOLD_MS}"

  local url="${BASE_URL%/}${endpoint}"
  local response_file="${TMP_ROOT%/}/health-check-time.json"

  local time_total
  time_total=$(curl \
    --noproxy '*' --proxy '' \
    -s -o "$response_file" -w "%{time_total}" \
    --max-time "$TIMEOUT" \
    "$url" 2>/dev/null || echo "0")

  local time_ms=$(($(echo "$time_total * 1000" | bc -l | cut -d'.' -f1)))

  if [[ $time_ms -lt $threshold_ms ]]; then
    log_pass "Response time for $endpoint: ${time_ms}ms (< ${threshold_ms}ms)"
    return 0
  else
    log_warn "Response time for $endpoint: ${time_ms}ms (threshold: ${threshold_ms}ms)"
    return 1
  fi
}

# Verify JSON response contains expected fields
check_json_response() {
  local endpoint="$1"
  local expected_fields=("${@:2}")

  local url="${BASE_URL%/}${endpoint}"
  local response_file="${TMP_ROOT%/}/health-check-json.json"

  local http_code
  http_code=$(fetch_with_retries "$url" "GET" "$response_file" || echo "000")

  if [[ "$http_code" != "200" ]]; then
    log_fail "JSON check for $endpoint: HTTP $http_code"
    return 1
  fi

  local missing_fields=()
  for field in "${expected_fields[@]}"; do
    if ! grep -q "\"$field\"" "$response_file" 2>/dev/null; then
      missing_fields+=("$field")
    fi
  done

  if [[ ${#missing_fields[@]} -eq 0 ]]; then
    log_pass "JSON response for $endpoint contains all expected fields"
    return 0
  else
    log_fail "JSON response for $endpoint missing fields: ${missing_fields[*]}"
    return 1
  fi
}

# Check security headers
check_security_headers() {
  local endpoint="$1"
  local url="${BASE_URL%/}${endpoint}"

  local headers_file="${TMP_ROOT%/}/health-check-headers.txt"

  curl \
    --noproxy '*' --proxy '' \
    -s -I --max-time "$TIMEOUT" \
    "$url" 2>/dev/null > "$headers_file" || true

  local security_headers=("content-security-policy" "x-content-type-options" "x-frame-options")
  local missing=()

  for header in "${security_headers[@]}"; do
    if ! grep -qi "^${header}:" "$headers_file"; then
      missing+=("$header")
    fi
  done

  if [[ ${#missing[@]} -eq 0 ]]; then
    log_pass "Security headers present for $endpoint"
    return 0
  else
    log_warn "Some security headers missing for $endpoint: ${missing[*]}"
    return 1
  fi
}

###############################################################################
# Main Health Checks
###############################################################################

echo ""
echo "============================================================"
echo "Health Check: $BASE_URL"
echo "============================================================"
echo ""

# 1. Basic connectivity
echo "1. CONNECTIVITY CHECKS"
echo "---"
check_endpoint "/api/health" "200" "Health endpoint"
check_endpoint "/api/agent/status" "200" "Agent status endpoint"
check_endpoint "/api/readiness" "200" "Readiness endpoint"

echo ""
echo "2. RESPONSE TIME CHECKS"
echo "---"
check_response_time "/api/health" 500
check_response_time "/api/agent/status" 500

echo ""
echo "3. JSON RESPONSE VALIDATION"
echo "---"
check_json_response "/api/agent/status" "ok" "repo" "version" "env" "ts"
check_json_response "/api/readiness" "ok" "checks" "timestamp"

echo ""
echo "4. SECURITY HEADERS"
echo "---"
check_security_headers "/api/health"

echo ""
echo "5. ERROR HANDLING"
echo "---"
check_endpoint "/api/nonexistent" "404" "404 response for missing endpoint"

echo ""
echo "============================================================"
echo "HEALTH CHECK SUMMARY"
echo "============================================================"
echo "Passed: $passed_checks"
echo "Failed: $failed_checks"
echo "Warnings: $warning_count"
echo ""

if [[ $failed_checks -eq 0 ]]; then
  echo "✅ All critical health checks passed!"
  echo ""
  exit 0
else
  echo "❌ $failed_checks critical check(s) failed"
  echo ""
  exit 1
fi
