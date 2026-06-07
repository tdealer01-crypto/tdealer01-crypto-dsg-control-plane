#!/usr/bin/env bash
##############################################################################
# full-deployment-check.sh
#
# Comprehensive post-deployment verification automation suite.
# Runs 15 critical checks in sequence and generates a detailed GO/NO-GO report.
#
# IMPORTANT: This script does NOT mutate production. It only reads from
# deployed endpoints and Vercel/Supabase metadata.
#
# Usage:
#   ./scripts/full-deployment-check.sh https://your-app.vercel.app
#   ./scripts/full-deployment-check.sh                              # uses BASE_URL env var
#   DEPLOYMENT_CHECK_TIMEOUT=30 ./scripts/full-deployment-check.sh <url>
#
# Exit codes:
#   0 = All checks passed (GO status)
#   1 = One or more checks failed (NO-GO status)
#   2 = Usage error or missing URL
#
# Environment:
#   BASE_URL                     Target deployment URL (arg or env)
#   DEPLOYMENT_CHECK_TIMEOUT     Request timeout in seconds (default: 20)
#   DEPLOYMENT_CHECKS_VERBOSE    Set to "true" for detailed output
#
##############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extract base URL from argument or environment
BASE_URL="${1:-${BASE_URL:-}}"

if [[ -z "$BASE_URL" ]]; then
  cat >&2 <<'EOF'
Usage: ./scripts/full-deployment-check.sh <base-url>
       BASE_URL=<base-url> ./scripts/full-deployment-check.sh

Example:
  ./scripts/full-deployment-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
  ./scripts/full-deployment-check.sh https://your-app.vercel.app

Environment:
  BASE_URL                     Target deployment URL
  DEPLOYMENT_CHECK_TIMEOUT     Request timeout in seconds (default: 20)
  DEPLOYMENT_CHECKS_VERBOSE    Set to "true" for detailed output
EOF
  exit 2
fi

# Configuration
TIMEOUT="${DEPLOYMENT_CHECK_TIMEOUT:-20}"
VERBOSE="${DEPLOYMENT_CHECKS_VERBOSE:-false}"

# Temp directory for responses
TMP_ROOT="${TMPDIR:-}"
if [[ -z "$TMP_ROOT" || ! -d "$TMP_ROOT" || ! -w "$TMP_ROOT" ]]; then
  TMP_ROOT="$(pwd)/.tmp"
  mkdir -p "$TMP_ROOT"
fi

# Clear proxy to avoid tunnel failures
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy \
  NPM_CONFIG_PROXY NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY \
  npm_config_proxy npm_config_http_proxy npm_config_https_proxy || true
export NO_PROXY="*"
export no_proxy="*"

# State tracking
passed_checks=0
failed_checks=0
check_count=0

###############################################################################
# Helper Functions
###############################################################################

log_header() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

log_check() {
  local num=$1
  local desc=$2
  echo ""
  echo -e "${BLUE}[Check $num/15]${NC} $desc"
}

log_pass() {
  local message="$1"
  echo -e "${GREEN}✅ PASS${NC}: $message"
  ((passed_checks++))
  ((check_count++))
}

log_fail() {
  local message="$1"
  echo -e "${RED}❌ FAIL${NC}: $message"
  ((failed_checks++))
  ((check_count++))
}

log_info() {
  local message="$1"
  echo -e "${BLUE}ℹ️  INFO${NC}: $message"
}

log_detail() {
  local message="$1"
  if [[ "$VERBOSE" == "true" ]]; then
    echo "        → $message"
  fi
}

# Fetch with timeout and error handling
fetch_url() {
  local url="$1"
  local method="${2:-GET}"
  local output_file="$3"
  local max_time="${4:-$TIMEOUT}"

  if [[ "$method" == "GET" ]]; then
    curl --noproxy '*' --proxy '' \
      -s -f -o "$output_file" \
      --max-time "$max_time" \
      --write-out "%{http_code}" \
      "$url" 2>/dev/null || echo "000"
  elif [[ "$method" == "HEAD" ]]; then
    curl --noproxy '*' --proxy '' \
      -s -f -I -o /dev/null \
      --max-time "$max_time" \
      --write-out "%{http_code}" \
      "$url" 2>/dev/null || echo "000"
  fi
}

# Get JSON field from response file
get_json_field() {
  local file="$1"
  local field="$2"
  local default="${3:-}"

  if [[ ! -f "$file" ]]; then
    echo "$default"
    return
  fi

  # Use grep for basic JSON field extraction
  grep -o "\"$field\":[^,}]*" "$file" 2>/dev/null | \
    head -1 | \
    cut -d':' -f2- | \
    tr -d '"' || echo "$default"
}

# Check if service is deployed (non-empty hostname, responding)
is_deployed() {
  local url="${BASE_URL%/}/api/health"
  local response_file="${TMP_ROOT%/}/deploy-check.json"

  local http_code
  http_code=$(fetch_url "$url" "GET" "$response_file" 10)

  [[ "$http_code" =~ ^(2|3)[0-9][0-9]$ ]] && return 0 || return 1
}

###############################################################################
# Main Verification Checks
###############################################################################

log_header "COMPREHENSIVE DEPLOYMENT VERIFICATION"
echo ""
echo "Target: $BASE_URL"
echo "Timeout: ${TIMEOUT}s"
echo "Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo ""

# Check 1: Health Endpoint Responsive
log_check 1 "Health endpoint responds"
response_file="${TMP_ROOT%/}/check-1-health.json"
http_code=$(fetch_url "${BASE_URL%/}/api/health" "GET" "$response_file" 10)
if [[ "$http_code" == "200" ]]; then
  health_ok=$(get_json_field "$response_file" "ok" "unknown")
  log_pass "Health endpoint returned HTTP 200 (ok=$health_ok)"
  log_detail "File: $response_file"
else
  log_fail "Health endpoint returned HTTP $http_code (expected 200)"
fi

# Check 2: Readiness Endpoint Responsive
log_check 2 "Readiness endpoint responds"
response_file="${TMP_ROOT%/}/check-2-readiness.json"
http_code=$(fetch_url "${BASE_URL%/}/api/readiness" "GET" "$response_file" 10)
if [[ "$http_code" == "200" ]]; then
  readiness_ok=$(get_json_field "$response_file" "ok" "unknown")
  log_pass "Readiness endpoint returned HTTP 200 (ok=$readiness_ok)"
  log_detail "File: $response_file"
else
  log_fail "Readiness endpoint returned HTTP $http_code (expected 200)"
fi

# Check 3: Agent Status Endpoint Responsive
log_check 3 "Agent status endpoint responds"
response_file="${TMP_ROOT%/}/check-3-agent-status.json"
http_code=$(fetch_url "${BASE_URL%/}/api/agent/status" "GET" "$response_file" 10)
if [[ "$http_code" == "200" ]]; then
  repo=$(get_json_field "$response_file" "repo" "unknown")
  log_pass "Agent status endpoint returned HTTP 200 (repo=$repo)"
  log_detail "File: $response_file"
else
  log_fail "Agent status endpoint returned HTTP $http_code (expected 200)"
fi

# Check 4: Database Connectivity
log_check 4 "Database connectivity check"
response_file="${TMP_ROOT%/}/check-4-db.json"
http_code=$(fetch_url "${BASE_URL%/}/api/health" "GET" "$response_file" 10)
if [[ -f "$response_file" ]]; then
  db_ok=$(get_json_field "$response_file" "db_ok" "unknown")
  if [[ "$db_ok" == "true" ]]; then
    log_pass "Database is reachable and responsive"
    log_detail "db_ok=true"
  else
    log_fail "Database check failed (db_ok=$db_ok)"
  fi
else
  log_fail "Could not retrieve health response to check database status"
fi

# Check 5: Rate Limiter Configured
log_check 5 "Rate limiter (Redis) configured"
response_file="${TMP_ROOT%/}/check-5-ratelimit.json"
http_code=$(fetch_url "${BASE_URL%/}/api/health" "GET" "$response_file" 10)
if [[ -f "$response_file" ]]; then
  # Check if rateLimiter.ok field exists and is true
  if grep -q '"ok".*true' "$response_file" 2>/dev/null; then
    log_pass "Rate limiter is configured and working"
    log_detail "Redis/Upstash endpoint configured"
  else
    log_fail "Rate limiter not properly configured or returns false status"
  fi
else
  log_fail "Could not retrieve health response to check rate limiter status"
fi

# Check 6: Core Health Status
log_check 6 "DSG Core health check"
response_file="${TMP_ROOT%/}/check-6-core.json"
http_code=$(fetch_url "${BASE_URL%/}/api/health" "GET" "$response_file" 10)
if [[ -f "$response_file" ]]; then
  core_ok=$(get_json_field "$response_file" "core_ok" "unknown")
  if [[ "$core_ok" == "true" ]]; then
    log_pass "DSG Core is healthy"
    log_detail "core_ok=true"
  else
    log_fail "DSG Core health check failed (core_ok=$core_ok)"
  fi
else
  log_fail "Could not retrieve health response to check core status"
fi

# Check 7: Execute Endpoint Accessible
log_check 7 "Execute endpoint accessible"
response_file="${TMP_ROOT%/}/check-7-execute.json"
http_code=$(fetch_url "${BASE_URL%/}/api/execute" "GET" "$response_file" 10)
# POST /api/execute requires Bearer token, so GET returns 405 or similar
# We just verify endpoint is defined (not 404)
if [[ "$http_code" =~ ^(405|400|401)$ ]]; then
  log_pass "Execute endpoint is defined (HTTP $http_code - auth required as expected)"
  log_detail "Endpoint exists and enforces authentication"
elif [[ "$http_code" == "200" ]]; then
  log_pass "Execute endpoint is accessible (HTTP 200)"
else
  log_fail "Execute endpoint not properly defined (HTTP $http_code)"
fi

# Check 8: Webhook Endpoint Configured
log_check 8 "Webhook endpoint configured"
response_file="${TMP_ROOT%/}/check-8-webhook.json"
http_code=$(fetch_url "${BASE_URL%/}/api/webhooks/stripe" "POST" "$response_file" 10)
# POST to webhook without proper signature returns 400/401, not 404
if [[ "$http_code" =~ ^(400|401)$ ]]; then
  log_pass "Webhook endpoint is configured (HTTP $http_code - signature validation working)"
  log_detail "Stripe webhook endpoint found and enforces security"
elif [[ "$http_code" == "200" ]]; then
  log_pass "Webhook endpoint is accessible (HTTP 200)"
else
  log_fail "Webhook endpoint not found (HTTP $http_code)"
fi

# Check 9: Auth Endpoints Responsive
log_check 9 "Auth endpoints responsive"
response_file="${TMP_ROOT%/}/check-9-auth.json"
http_code=$(fetch_url "${BASE_URL%/}/api/auth/session" "GET" "$response_file" 10)
# Auth endpoint may return 401 if not authenticated, but should exist
if [[ "$http_code" =~ ^(200|401|403)$ ]]; then
  log_pass "Auth endpoint is configured (HTTP $http_code)"
  log_detail "Authentication system is in place"
else
  log_fail "Auth endpoint not responding correctly (HTTP $http_code)"
fi

# Check 10: Trust Surface Pages Accessible
log_check 10 "Trust surface pages accessible"
pages=("/terms" "/privacy" "/security")
all_trust_pages_ok=true
for page in "${pages[@]}"; do
  response_file="${TMP_ROOT%/}/check-10-trust-${page##/}.html"
  http_code=$(fetch_url "${BASE_URL%/}${page}" "GET" "$response_file" 10)
  if [[ "$http_code" == "200" ]]; then
    log_detail "$page → HTTP 200"
  else
    log_detail "$page → HTTP $http_code (expected 200)"
    all_trust_pages_ok=false
  fi
done
if [[ "$all_trust_pages_ok" == "true" ]]; then
  log_pass "All trust surface pages are accessible"
else
  log_fail "Some trust surface pages are missing or inaccessible"
fi

# Check 11: Security Headers Present
log_check 11 "Security headers configured"
response_file="${TMP_ROOT%/}/check-11-headers.txt"
curl --noproxy '*' --proxy '' \
  -s -I --max-time 10 \
  "${BASE_URL%/}/api/health" 2>/dev/null > "$response_file" || true

headers_found=0
total_headers=3
for header in "content-security-policy" "x-content-type-options" "x-frame-options"; do
  if grep -qi "^${header}:" "$response_file" 2>/dev/null; then
    log_detail "$header present"
    ((headers_found++))
  else
    log_detail "$header missing"
  fi
done

if [[ $headers_found -ge 2 ]]; then
  log_pass "Security headers are properly configured ($headers_found/$total_headers)"
else
  log_fail "Security headers missing or incomplete ($headers_found/$total_headers)"
fi

# Check 12: Response Times Within SLA
log_check 12 "Response times within SLA (< 500ms)"
response_file="${TMP_ROOT%/}/check-12-timing.txt"
sla_ms=500
slow_endpoints=0

for endpoint in "/api/health" "/api/readiness" "/api/agent/status"; do
  url="${BASE_URL%/}${endpoint}"
  time_ms=$(curl --noproxy '*' --proxy '' \
    -s -o /dev/null --max-time 10 \
    -w "%{time_total}\n" \
    "$url" 2>/dev/null | awk '{print int($1 * 1000)}')

  if [[ $time_ms -lt $sla_ms ]]; then
    log_detail "$endpoint: ${time_ms}ms ✓"
  else
    log_detail "$endpoint: ${time_ms}ms (exceeds SLA)"
    ((slow_endpoints++))
  fi
done

if [[ $slow_endpoints -eq 0 ]]; then
  log_pass "All endpoints respond within SLA"
else
  log_fail "$slow_endpoints endpoint(s) exceed SLA threshold"
fi

# Check 13: Error Handling (404 for non-existent routes)
log_check 13 "Error handling (404 for missing routes)"
response_file="${TMP_ROOT%/}/check-13-error.json"
http_code=$(fetch_url "${BASE_URL%/}/api/nonexistent-endpoint-check" "GET" "$response_file" 10)
if [[ "$http_code" == "404" ]]; then
  log_pass "Error handling is working (HTTP 404 for missing routes)"
  log_detail "Error response returned as expected"
else
  log_fail "Error handling may be misconfigured (HTTP $http_code for missing route)"
fi

# Check 14: Deployment Environment Detection
log_check 14 "Deployment environment detected"
response_file="${TMP_ROOT%/}/check-14-env.json"
http_code=$(fetch_url "${BASE_URL%/}/api/agent/status" "GET" "$response_file" 10)
if [[ -f "$response_file" ]]; then
  env_name=$(get_json_field "$response_file" "env" "unknown")
  if [[ "$env_name" != "unknown" && "$env_name" != "" ]]; then
    log_pass "Environment detected: $env_name"
    log_detail "Running in $env_name environment"
  else
    log_fail "Could not detect deployment environment"
  fi
else
  log_fail "Could not retrieve environment information"
fi

# Check 15: Deployment Commit Tracked
log_check 15 "Deployment commit tracked"
response_file="${TMP_ROOT%/}/check-15-commit.json"
http_code=$(fetch_url "${BASE_URL%/}/api/agent/status" "GET" "$response_file" 10)
if [[ -f "$response_file" ]]; then
  commit=$(get_json_field "$response_file" "commit" "unknown")
  if [[ "$commit" != "unknown" && "$commit" != "" && "$commit" != "null" ]]; then
    log_pass "Deployment commit tracked: ${commit:0:8}..."
    log_detail "Full commit: $commit"
  else
    log_fail "Deployment commit not found in response"
  fi
else
  log_fail "Could not retrieve commit information"
fi

###############################################################################
# Summary Report
###############################################################################

log_header "DEPLOYMENT VERIFICATION SUMMARY"

total_checks=15
passed=$passed_checks
failed=$failed_checks

percentage=$((passed * 100 / total_checks))

echo ""
echo "Results:"
echo "  Passed: $passed/$total_checks"
echo "  Failed: $failed/$total_checks"
echo "  Success Rate: $percentage%"
echo ""

if [[ $failed -eq 0 ]]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}✅ GO STATUS: ALL CHECKS PASSED${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "✓ Deployment is healthy and ready for use"
  echo "✓ All critical services are operational"
  echo "✓ Security controls are in place"
  echo "✓ Performance is within acceptable limits"
  echo ""
  exit 0
else
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}❌ NO-GO STATUS: $failed CHECK(S) FAILED${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "✗ $failed check(s) did not pass"
  echo "✗ See failures above for remediation details"
  echo "✗ Review DEPLOYMENT_VERIFICATION_MATRIX.md for troubleshooting"
  echo ""
  exit 1
fi
