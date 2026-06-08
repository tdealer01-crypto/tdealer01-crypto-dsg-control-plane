#!/bin/bash

################################################################################
# DSG Control Plane Endpoint Testing Script
#
# Comprehensive curl-based tests for all critical API endpoints.
# This script validates endpoint availability and response formats without
# requiring a full test framework.
#
# Usage:
#   ./scripts/test-all-endpoints.sh [BASE_URL] [AUTH_TOKEN]
#
# Examples:
#   ./scripts/test-all-endpoints.sh http://localhost:3000
#   ./scripts/test-all-endpoints.sh https://prod.example.com sk_live_abc123
#
# Environment Variables:
#   BASE_URL         - API base URL (default: http://localhost:3000)
#   AUTH_TOKEN       - Bearer token for authenticated endpoints
#   STRIPE_API_KEY   - Stripe API key for webhook tests
#   PRETTY_PRINT     - Set to 1 to pretty-print JSON (requires jq)
#
################################################################################

set -u

# Configuration
BASE_URL="${1:-http://localhost:3000}"
AUTH_TOKEN="${2:-}"
STRIPE_API_KEY="${STRIPE_API_KEY:-}"
PRETTY_PRINT="${PRETTY_PRINT:-0}"
CURL_TIMEOUT="${CURL_TIMEOUT:-10}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Counter
ENDPOINT_COUNT=0

################################################################################
# Utility Functions
################################################################################

print_header() {
  echo ""
  echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
  echo -e "${MAGENTA}$1${NC}"
  echo -e "${MAGENTA}════════════════════════════════════════════════════════${NC}"
}

test_endpoint() {
  local method="$1"
  local endpoint="$2"
  local description="$3"
  local data="${4:-}"
  local auth_required="${5:-false}"

  ((ENDPOINT_COUNT++))

  echo ""
  echo -e "${BLUE}[${ENDPOINT_COUNT}] ${method}${NC} ${endpoint}"
  echo "    Description: $description"

  local url="${BASE_URL}${endpoint}"
  local headers="-H 'Content-Type: application/json'"

  if [[ "$auth_required" == "true" && -n "$AUTH_TOKEN" ]]; then
    headers="$headers -H 'Authorization: Bearer $AUTH_TOKEN'"
    echo "    Auth: Using Bearer token"
  elif [[ "$auth_required" == "true" ]]; then
    echo -e "    ${YELLOW}⚠ Auth required but no token provided${NC}"
  fi

  # Execute request
  if [[ -z "$data" ]]; then
    echo "    Request: curl -X $method $url"
    local response=$(curl -s -w "\n%{http_code}" \
      --max-time "$CURL_TIMEOUT" \
      -X "$method" \
      $headers \
      "$url" 2>/dev/null)
  else
    echo "    Request: curl -X $method $url -d '...'"
    local response=$(curl -s -w "\n%{http_code}" \
      --max-time "$CURL_TIMEOUT" \
      -X "$method" \
      $headers \
      -d "$data" \
      "$url" 2>/dev/null)
  fi

  local status=$(echo "$response" | tail -1)
  local body=$(echo "$response" | head -n -1)

  # Color status based on code
  local status_color="${RED}"
  if [[ "$status" == "200" ]] || [[ "$status" == "201" ]] || [[ "$status" == "204" ]]; then
    status_color="${GREEN}"
  elif [[ "$status" == "401" ]] || [[ "$status" == "403" ]] || [[ "$status" == "404" ]]; then
    status_color="${YELLOW}"
  elif [[ "$status" == "429" ]] || [[ "$status" == "503" ]]; then
    status_color="${YELLOW}"
  fi

  echo -e "    Status: ${status_color}${status}${NC}"

  # Pretty-print JSON if requested and jq is available
  if [[ "$PRETTY_PRINT" == "1" && -n "$body" ]]; then
    if command -v jq &> /dev/null; then
      if echo "$body" | jq . > /dev/null 2>&1; then
        echo "    Response:"
        echo "$body" | jq . | sed 's/^/      /'
      else
        echo "    Response: (not JSON)"
        echo "$body" | sed 's/^/      /'
      fi
    else
      echo "    Response:"
      echo "$body" | sed 's/^/      /'
    fi
  else
    # Show response length
    if [[ -n "$body" ]]; then
      local body_length=${#body}
      echo "    Response: ${body_length} bytes"
    fi
  fi
}

################################################################################
# Test Groups
################################################################################

test_public_endpoints() {
  print_header "Public/Health Endpoints (No Auth Required)"

  test_endpoint "GET" "/api/health" \
    "System health check - DB, core, and readiness status" \
    "" "false"

  test_endpoint "GET" "/api/readiness" \
    "Deployment readiness report with config status" \
    "" "false"

  test_endpoint "GET" "/api/agent/status" \
    "Agent status with commit, environment, and DB check" \
    "" "false"
}

test_protected_endpoints() {
  print_header "Protected Endpoints (Auth Required)"

  if [[ -z "$AUTH_TOKEN" ]]; then
    echo -e "${YELLOW}⚠ No AUTH_TOKEN provided. Skipping authenticated endpoint tests.${NC}"
    echo "   Provide a token as the second argument to test these endpoints."
    return
  fi

  test_endpoint "GET" "/api/audit" \
    "Audit events and determinism verification" \
    "" "true"
}

test_stripe_webhook() {
  print_header "Stripe Integration Endpoints"

  test_endpoint "POST" "/api/stripe/webhook" \
    "Stripe webhook endpoint for event processing" \
    '{"type":"charge.completed","data":{"object":{"id":"ch_test"}}}' \
    "false"
}

test_error_cases() {
  print_header "Error Handling Tests"

  test_endpoint "GET" "/api/nonexistent" \
    "Test 404 handling for non-existent endpoint" \
    "" "false"

  test_endpoint "POST" "/api/health" \
    "Test method not allowed for GET-only endpoint" \
    '{}' "false"

  test_endpoint "GET" "/api/audit" \
    "Test 401/400 for protected endpoint without auth" \
    "" "false"
}

test_response_headers() {
  print_header "Response Headers & CORS Tests"

  echo ""
  echo -e "${BLUE}[Testing OPTIONS /api/health for CORS headers]${NC}"
  local cors_response=$(curl -s -i -X OPTIONS \
    --max-time "$CURL_TIMEOUT" \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    "${BASE_URL}/api/health" 2>/dev/null)

  echo "    Response Headers:"
  echo "$cors_response" | head -20 | sed 's/^/      /'
}

test_performance() {
  print_header "Performance Tests"

  echo ""
  echo -e "${BLUE}[Testing response time for /api/health]${NC}"

  local total_time=0
  local iterations=5

  for i in $(seq 1 $iterations); do
    local start=$(date +%s%N)
    local response=$(curl -s -w "\n%{http_code}" \
      --max-time "$CURL_TIMEOUT" \
      -X GET \
      -H "Content-Type: application/json" \
      "${BASE_URL}/api/health" 2>/dev/null)
    local end=$(date +%s%N)

    local elapsed=$(( (end - start) / 1000000 ))
    local status=$(echo "$response" | tail -1)

    total_time=$((total_time + elapsed))
    echo "    Attempt $i: ${elapsed}ms (status: $status)"
  done

  local avg=$((total_time / iterations))
  echo "    Average: ${avg}ms over $iterations requests"

  if [[ $avg -lt 2000 ]]; then
    echo -e "    ${GREEN}✓ Performance acceptable (<2000ms average)${NC}"
  elif [[ $avg -lt 5000 ]]; then
    echo -e "    ${YELLOW}⚠ Performance degraded (${avg}ms average)${NC}"
  else
    echo -e "    ${RED}✗ Performance poor (${avg}ms average)${NC}"
  fi
}

test_concurrent_requests() {
  print_header "Concurrent Request Test"

  echo ""
  echo -e "${BLUE}[Testing 10 concurrent requests to /api/health]${NC}"

  local start=$(date +%s%N)

  # Run 10 requests in parallel
  for i in $(seq 1 10); do
    (curl -s -w "\n%{http_code}" \
      --max-time "$CURL_TIMEOUT" \
      -X GET \
      -H "Content-Type: application/json" \
      "${BASE_URL}/api/health" > "/tmp/concurrent_$i.tmp" 2>/dev/null) &
  done

  wait

  local end=$(date +%s%N)
  local elapsed=$(( (end - start) / 1000000 ))

  local success_count=0
  for i in $(seq 1 10); do
    local status=$(tail -1 "/tmp/concurrent_$i.tmp")
    if [[ "$status" == "200" ]] || [[ "$status" == "503" ]]; then
      ((success_count++))
    fi
    rm -f "/tmp/concurrent_$i.tmp"
  done

  echo "    Completed: $success_count/10 successful"
  echo "    Total time: ${elapsed}ms"
  echo "    Avg per request: $((elapsed / 10))ms"

  if [[ $success_count -eq 10 ]]; then
    echo -e "    ${GREEN}✓ All concurrent requests successful${NC}"
  else
    echo -e "    ${YELLOW}⚠ Some requests failed${NC}"
  fi
}

test_large_payload() {
  print_header "Large Payload Test"

  echo ""
  echo -e "${BLUE}[Testing with 1MB payload]${NC}"

  # Create a 1MB JSON payload
  local large_payload=$(python3 -c "print('{\"test\": \"' + 'x' * 1000000 + '\"}')" 2>/dev/null || echo '{"test":"payload"}')

  local start=$(date +%s%N)
  local response=$(curl -s -w "\n%{http_code}" \
    --max-time 30 \
    -X POST \
    -H "Content-Type: application/json" \
    -d "$large_payload" \
    "${BASE_URL}/api/health" 2>/dev/null)
  local end=$(date +%s%N)

  local status=$(echo "$response" | tail -1)
  local elapsed=$(( (end - start) / 1000000 ))

  echo "    Status: $status"
  echo "    Time: ${elapsed}ms"

  if [[ "$status" == "405" ]] || [[ "$status" == "413" ]] || [[ "$status" == "400" ]]; then
    echo -e "    ${GREEN}✓ Server correctly rejected POST to /api/health${NC}"
  fi
}

################################################################################
# Main Execution
################################################################################

main() {
  clear

  echo -e "${BLUE}"
  echo "╔════════════════════════════════════════════════════════════════╗"
  echo "║     DSG Control Plane Endpoint Testing Script                 ║"
  echo "╚════════════════════════════════════════════════════════════════╝"
  echo -e "${NC}"

  echo "Target: $BASE_URL"
  echo "Auth: ${AUTH_TOKEN:0:20}${AUTH_TOKEN:+...}"
  echo "Time: $(date)"
  echo "Timeout: ${CURL_TIMEOUT}s"

  # Run test groups
  test_public_endpoints
  test_protected_endpoints
  test_error_cases
  test_response_headers
  test_performance
  test_concurrent_requests
  test_large_payload
  test_stripe_webhook

  # Summary
  echo ""
  print_header "Test Execution Complete"
  echo -e "${GREEN}✓ Tested $ENDPOINT_COUNT endpoints${NC}"
  echo ""
  echo "Review the output above for any failures or warnings."
  echo ""
}

main "$@"
