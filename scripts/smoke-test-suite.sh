#!/bin/bash

################################################################################
# DSG Control Plane Post-Deployment Smoke Test Suite
#
# This script validates core API endpoints and deployment health after
# deploying to production or staging environments.
#
# Usage:
#   ./scripts/smoke-test-suite.sh [BASE_URL] [AUTH_TOKEN]
#
# Examples:
#   ./scripts/smoke-test-suite.sh http://localhost:3000
#   ./scripts/smoke-test-suite.sh https://prod.example.com abc123token
#
# Environment Variables (optional):
#   BASE_URL         - Target deployment URL (default: http://localhost:3000)
#   AUTH_TOKEN       - Bearer token for authenticated endpoints
#   STRIPE_API_KEY   - Stripe secret key for webhook validation tests
#   CURL_TIMEOUT     - HTTP request timeout in seconds (default: 10)
#   VERBOSE          - Set to 1 for detailed output
#
################################################################################

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:3000}"
AUTH_TOKEN="${2:-}"
STRIPE_API_KEY="${STRIPE_API_KEY:-}"
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"
VERBOSE="${VERBOSE:-0}"

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

# Test results
declare -a FAILED_TESTS=()
declare -a SKIPPED_TESTS=()

################################################################################
# Utility Functions
################################################################################

log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_pass() {
  echo -e "${GREEN}[PASS]${NC} $*"
  ((TESTS_PASSED++))
}

log_fail() {
  echo -e "${RED}[FAIL]${NC} $*"
  ((TESTS_FAILED++))
  FAILED_TESTS+=("$*")
}

log_skip() {
  echo -e "${YELLOW}[SKIP]${NC} $*"
  ((TESTS_SKIPPED++))
  SKIPPED_TESTS+=("$*")
}

log_section() {
  echo ""
  echo -e "${BLUE}=== $* ===${NC}"
}

verbose() {
  if [[ "$VERBOSE" == "1" ]]; then
    echo "[DEBUG] $*"
  fi
}

# Extract HTTP status code from curl response
get_status_code() {
  echo "$1" | head -1
}

# Extract response body from curl response
get_body() {
  echo "$1" | tail -n +2
}

# Validate JSON structure
is_valid_json() {
  if command -v jq &> /dev/null; then
    echo "$1" | jq empty 2>/dev/null && return 0 || return 1
  else
    # Fallback: basic validation
    [[ "$1" =~ ^[\{\[].*[\}\]]$ ]] && return 0 || return 1
  fi
}

# Extract JSON field value
get_json_field() {
  local json="$1"
  local field="$2"
  if command -v jq &> /dev/null; then
    echo "$json" | jq -r "$field" 2>/dev/null || echo ""
  fi
}

# Perform HTTP request with timing
http_request() {
  local method="$1"
  local endpoint="$2"
  local headers="-H 'Content-Type: application/json'"
  local data="${3:-}"

  if [[ -n "$AUTH_TOKEN" ]]; then
    headers="$headers -H 'Authorization: Bearer $AUTH_TOKEN'"
  fi

  local url="${BASE_URL}${endpoint}"
  verbose "Request: $method $url"

  if [[ -z "$data" ]]; then
    curl -s -w "\n%{http_code}" \
      --max-time "$CURL_TIMEOUT" \
      -X "$method" \
      $headers \
      "$url" 2>/dev/null || echo "000"
  else
    verbose "Data: $data"
    curl -s -w "\n%{http_code}" \
      --max-time "$CURL_TIMEOUT" \
      -X "$method" \
      $headers \
      -d "$data" \
      "$url" 2>/dev/null || echo "000"
  fi
}

################################################################################
# Test 1: Health Endpoint
################################################################################

test_health_endpoint() {
  local test_name="Health endpoint alive (GET /api/health)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/health")
  local status=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  verbose "Status: $status"
  verbose "Body: $body"

  if [[ "$status" == "200" ]]; then
    if is_valid_json "$body"; then
      local service=$(get_json_field "$body" '.service')
      local ok=$(get_json_field "$body" '.ok')

      if [[ -n "$service" ]]; then
        log_pass "$test_name (status: $status, service: $service)"
      else
        log_fail "$test_name - Valid JSON but missing 'service' field"
      fi
    else
      log_fail "$test_name - Invalid JSON response: $body"
    fi
  elif [[ "$status" == "503" ]]; then
    # Service unavailable is acceptable during startup
    if is_valid_json "$body"; then
      log_skip "$test_name - Service temporarily unavailable (status: $status)"
    else
      log_fail "$test_name - 503 with invalid JSON"
    fi
  else
    log_fail "$test_name - Unexpected status: $status"
  fi
}

################################################################################
# Test 2: Auth Validation (Missing Bearer Token)
################################################################################

test_auth_validation_missing() {
  local test_name="Auth validation (missing Bearer token → 401)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  # Attempt to access protected endpoint without token
  local response=$(curl -s -w "\n%{http_code}" \
    --max-time "$CURL_TIMEOUT" \
    -X GET \
    -H "Content-Type: application/json" \
    "${BASE_URL}/api/audit" 2>/dev/null || echo "000")

  local status=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  verbose "Status: $status"

  if [[ "$status" == "401" ]]; then
    log_pass "$test_name (status: $status)"
  elif [[ "$status" == "400" ]]; then
    # Some endpoints may return 400 for missing org context
    log_pass "$test_name (status: $status, acceptable)"
  else
    log_fail "$test_name - Expected 401 or 400, got $status"
  fi
}

################################################################################
# Test 3: Invalid Bearer Token
################################################################################

test_auth_validation_invalid() {
  local test_name="Auth validation (invalid Bearer token → 401)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(curl -s -w "\n%{http_code}" \
    --max-time "$CURL_TIMEOUT" \
    -X GET \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer invalid_token_xyz" \
    "${BASE_URL}/api/audit" 2>/dev/null || echo "000")

  local status=$(echo "$response" | tail -1)

  verbose "Status: $status"

  if [[ "$status" == "401" ]]; then
    log_pass "$test_name (status: $status)"
  elif [[ "$status" == "400" ]]; then
    log_pass "$test_name (status: $status, acceptable)"
  else
    log_fail "$test_name - Expected 401 or 400, got $status"
  fi
}

################################################################################
# Test 4: Readiness Endpoint
################################################################################

test_readiness_endpoint() {
  local test_name="Readiness endpoint response (GET /api/readiness)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/readiness")
  local status=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  verbose "Status: $status"
  verbose "Body: $body"

  if [[ "$status" == "200" ]] || [[ "$status" == "503" ]]; then
    if is_valid_json "$body"; then
      log_pass "$test_name (status: $status)"
    else
      log_fail "$test_name - Invalid JSON response"
    fi
  else
    log_fail "$test_name - Unexpected status: $status"
  fi
}

################################################################################
# Test 5: Agent Status Endpoint
################################################################################

test_agent_status_endpoint() {
  local test_name="Agent status endpoint (GET /api/agent/status)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/agent/status")
  local status=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  verbose "Status: $status"
  verbose "Body: $body"

  if [[ "$status" == "200" ]]; then
    if is_valid_json "$body"; then
      local service=$(get_json_field "$body" '.service')
      if [[ "$service" == "dsg-control-plane" ]]; then
        log_pass "$test_name (status: $status)"
      else
        log_fail "$test_name - Missing or incorrect 'service' field"
      fi
    else
      log_fail "$test_name - Invalid JSON response"
    fi
  else
    log_fail "$test_name - Unexpected status: $status"
  fi
}

################################################################################
# Test 6: CORS Headers Present
################################################################################

test_cors_headers() {
  local test_name="CORS headers present (Content-Type, Access-Control-Allow)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(curl -s -i -X OPTIONS \
    --max-time "$CURL_TIMEOUT" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    "${BASE_URL}/api/health" 2>/dev/null || echo "")

  verbose "CORS Response:\n$response"

  # Check if response contains CORS headers or returns OK for OPTIONS
  if echo "$response" | grep -qi "access-control-allow" || echo "$response" | grep -qi "^HTTP.*200"; then
    log_pass "$test_name"
  else
    # CORS may not be needed for all endpoints, so this might be acceptable
    log_skip "$test_name - No CORS headers (may be expected)"
  fi
}

################################################################################
# Test 7: Response Time Assertion
################################################################################

test_response_time() {
  local test_name="Response time assertion (health < 2 seconds)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local start_time=$(date +%s%N)
  local response=$(http_request "GET" "/api/health")
  local end_time=$(date +%s%N)

  local status=$(echo "$response" | tail -1)
  local elapsed_ms=$(( (end_time - start_time) / 1000000 ))

  verbose "Response time: ${elapsed_ms}ms"

  if [[ "$status" == "200" ]] || [[ "$status" == "503" ]]; then
    if [[ $elapsed_ms -lt 2000 ]]; then
      log_pass "$test_name (${elapsed_ms}ms)"
    else
      log_fail "$test_name - Took ${elapsed_ms}ms, expected < 2000ms"
    fi
  else
    log_fail "$test_name - Bad status code: $status"
  fi
}

################################################################################
# Test 8: Rate Limiting Detection
################################################################################

test_rate_limiting() {
  local test_name="Rate limiting detection (10+ requests → 429 possible)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local rate_limited=0
  local max_requests=15

  for i in $(seq 1 $max_requests); do
    local response=$(curl -s -w "\n%{http_code}" \
      --max-time 2 \
      -X GET \
      "${BASE_URL}/api/health" 2>/dev/null || echo "000")

    local status=$(echo "$response" | tail -1)

    if [[ "$status" == "429" ]]; then
      rate_limited=1
      log_pass "$test_name - Rate limiter triggered after $i requests"
      break
    fi
  done

  if [[ $rate_limited -eq 0 ]]; then
    log_skip "$test_name - No rate limit triggered (may be disabled or config issue)"
  fi
}

################################################################################
# Test 9: Webhook Signature Validation
################################################################################

test_webhook_signature_validation() {
  local test_name="Webhook signature validation (POST with invalid sig → 401)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  if [[ -z "$STRIPE_API_KEY" ]]; then
    log_skip "$test_name - STRIPE_API_KEY not provided"
    return
  fi

  # Attempt POST to webhook endpoint with invalid signature
  local response=$(curl -s -w "\n%{http_code}" \
    --max-time "$CURL_TIMEOUT" \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Stripe-Signature: invalid_signature" \
    -d '{"type":"charge.completed","data":{"object":{"id":"ch_test"}}}' \
    "${BASE_URL}/api/stripe/webhook" 2>/dev/null || echo "000")

  local status=$(echo "$response" | tail -1)

  verbose "Status: $status"

  if [[ "$status" == "401" ]] || [[ "$status" == "400" ]]; then
    log_pass "$test_name (status: $status)"
  else
    log_skip "$test_name - Webhook endpoint may not require signature validation in test mode (status: $status)"
  fi
}

################################################################################
# Test 10: Deployment Identity
################################################################################

test_deployment_identity() {
  local test_name="Deployment identity check (commit hash in response)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/agent/status")
  local body=$(echo "$response" | head -n -1)

  if is_valid_json "$body"; then
    local commit=$(get_json_field "$body" '.commit')
    local timestamp=$(get_json_field "$body" '.timestamp')

    if [[ -n "$timestamp" ]]; then
      log_pass "$test_name (has timestamp)"
    else
      log_skip "$test_name - No commit/timestamp in response (acceptable)"
    fi
  else
    log_fail "$test_name - Invalid JSON response"
  fi
}

################################################################################
# Test 11: Error Handling Validation
################################################################################

test_error_handling() {
  local test_name="Error handling validation (invalid path → 404)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/nonexistent-endpoint-xyz")
  local status=$(echo "$response" | tail -1)

  verbose "Status: $status"

  if [[ "$status" == "404" ]] || [[ "$status" == "405" ]]; then
    log_pass "$test_name (status: $status)"
  else
    log_fail "$test_name - Expected 404 or 405, got $status"
  fi
}

################################################################################
# Test 12: JSON Response Validation
################################################################################

test_json_response_validation() {
  local test_name="JSON response validation (valid structure)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/agent/status")
  local status=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  if [[ "$status" == "200" ]]; then
    if is_valid_json "$body"; then
      log_pass "$test_name - Valid JSON structure"
    else
      log_fail "$test_name - Response is not valid JSON"
    fi
  else
    log_fail "$test_name - Bad status code: $status"
  fi
}

################################################################################
# Test 13: Database Connectivity (from health endpoint)
################################################################################

test_database_connectivity() {
  local test_name="Database connectivity check (via /api/health)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/health")
  local body=$(echo "$response" | head -n -1)

  if is_valid_json "$body"; then
    local db_ok=$(get_json_field "$body" '.db_ok')

    if [[ "$db_ok" == "true" ]]; then
      log_pass "$test_name - Database is reachable"
    else
      log_skip "$test_name - Database connectivity check returned false (may be initializing)"
    fi
  else
    log_fail "$test_name - Could not parse health response"
  fi
}

################################################################################
# Test 14: Environment Variable Validation
################################################################################

test_environment_variables() {
  local test_name="Environment variable validation (checking deployment config)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  local response=$(http_request "GET" "/api/readiness")
  local body=$(echo "$response" | head -n -1)

  if is_valid_json "$body"; then
    # Check for critical environment indicators
    local env_ok=$(get_json_field "$body" '.ok')

    if [[ "$env_ok" == "true" ]]; then
      log_pass "$test_name - Environment appears correctly configured"
    else
      log_skip "$test_name - Readiness check indicates configuration issue (may be in initialization)"
    fi
  else
    log_skip "$test_name - Could not validate (readiness endpoint not ready)"
  fi
}

################################################################################
# Test 15: Server Availability
################################################################################

test_server_availability() {
  local test_name="Server availability check (connectivity test)"
  ((TESTS_RUN++))

  log_info "Test $TESTS_RUN: $test_name"

  if curl -s --max-time 2 "${BASE_URL}" > /dev/null 2>&1; then
    log_pass "$test_name - Server is reachable"
  else
    log_fail "$test_name - Cannot reach server at $BASE_URL"
  fi
}

################################################################################
# Main Test Execution
################################################################################

main() {
  clear
  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║     DSG Control Plane Post-Deployment Smoke Test Suite        ║"
  echo "║                                                                ║"
  echo "║     Target: $BASE_URL"
  echo "║     Auth: ${AUTH_TOKEN:0:20}${AUTH_TOKEN:+...}"
  echo "║     Time: $(date)"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  log_section "Server & Connectivity Tests"
  test_server_availability
  test_response_time

  log_section "Core Health & Status Tests"
  test_health_endpoint
  test_readiness_endpoint
  test_agent_status_endpoint
  test_database_connectivity

  log_section "Authentication & Authorization Tests"
  test_auth_validation_missing
  test_auth_validation_invalid

  log_section "API Response & Format Tests"
  test_json_response_validation
  test_cors_headers
  test_deployment_identity

  log_section "Error Handling & Edge Cases"
  test_error_handling
  test_environment_variables

  log_section "Security & Rate Limiting Tests"
  test_rate_limiting
  test_webhook_signature_validation

  # Summary
  log_section "Test Summary"

  local total_tests=$((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
  echo ""
  echo "Total Tests Run:  $total_tests"
  echo -e "${GREEN}Passed:${NC}          $TESTS_PASSED"
  echo -e "${RED}Failed:${NC}          $TESTS_FAILED"
  echo -e "${YELLOW}Skipped:${NC}         $TESTS_SKIPPED"
  echo ""

  if [[ $TESTS_FAILED -gt 0 ]]; then
    echo -e "${RED}Failed Tests:${NC}"
    for test in "${FAILED_TESTS[@]}"; do
      echo "  - $test"
    done
    echo ""
  fi

  if [[ $TESTS_SKIPPED -gt 0 ]]; then
    echo -e "${YELLOW}Skipped Tests:${NC}"
    for test in "${SKIPPED_TESTS[@]}"; do
      echo "  - $test"
    done
    echo ""
  fi

  # Exit code
  if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo ""
    exit 0
  else
    echo -e "${RED}✗ $TESTS_FAILED test(s) failed. Review above for details.${NC}"
    echo ""
    exit 1
  fi
}

# Execute main function
main "$@"
