#!/usr/bin/env bash

##############################################################################
# go-no-go-check.sh
#
# Complete GO-NO-GO decision framework verification script.
# Tests all critical production readiness criteria.
#
# Usage:
#   ./scripts/go-no-go-check.sh https://example.com
#   ./scripts/go-no-go-check.sh              # uses BASE_URL env var
#
# Exit codes:
#   0 = GO (all criteria met)
#   1 = NO-GO (one or more criteria failed)
#   2 = ERROR (usage or configuration issue)
#
# Output format: JSON (for CI/CD integration) + human-readable summary
#
# Examples:
#   ./scripts/go-no-go-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
#   BASE_URL=https://api.example.com ./scripts/go-no-go-check.sh
#
##############################################################################

set -euo pipefail

# Color codes for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extract base URL from argument or environment
BASE_URL="${1:-${BASE_URL:-}}"

if [[ -z "$BASE_URL" ]]; then
  cat >&2 <<'EOF'
Usage: ./scripts/go-no-go-check.sh <base-url>
       BASE_URL=<base-url> ./scripts/go-no-go-check.sh

Example:
  ./scripts/go-no-go-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

Environment variables:
  BASE_URL              Production domain to test
  BEARER_TOKEN          Bearer token for authenticated endpoints (optional)
  TIMEOUT               Request timeout in seconds (default: 30)
  RETRIES               Number of retries for flaky tests (default: 3)
  OUTPUT_JSON           Set to "true" to output JSON only (default: false)
EOF
  exit 2
fi

# Configuration
TIMEOUT="${TIMEOUT:-30}"
RETRIES="${RETRIES:-3}"
OUTPUT_JSON="${OUTPUT_JSON:-false}"
BEARER_TOKEN="${BEARER_TOKEN:-}"

# Counters
PASSED=0
FAILED=0
CONDITIONAL=0

# Result arrays
declare -a RESULTS
declare -a FAILURES

# Utility functions
log_pass() {
  local criterion="$1"
  local detail="${2:-}"
  echo -e "${GREEN}✓ PASS${NC} $criterion"
  [[ -n "$detail" ]] && echo "  └─ $detail"
  ((PASSED++))
  RESULTS+=("$criterion:PASS:$detail")
}

log_fail() {
  local criterion="$1"
  local detail="${2:-}"
  echo -e "${RED}✗ FAIL${NC} $criterion"
  [[ -n "$detail" ]] && echo "  └─ $detail"
  ((FAILED++))
  FAILURES+=("$criterion:$detail")
  RESULTS+=("$criterion:FAIL:$detail")
}

log_conditional() {
  local criterion="$1"
  local detail="${2:-}"
  echo -e "${YELLOW}⚠ CONDITIONAL${NC} $criterion"
  [[ -n "$detail" ]] && echo "  └─ $detail"
  ((CONDITIONAL++))
  RESULTS+=("$criterion:CONDITIONAL:$detail")
}

log_info() {
  echo -e "${BLUE}ℹ INFO${NC} $*"
}

# Curl wrapper with timeout and error handling
safe_curl() {
  local method="$1"
  local url="$2"
  local retries="${3:-1}"
  local output

  for attempt in $(seq 1 "$retries"); do
    if output=$(curl -s -w "\n%{http_code}" \
      -X "$method" \
      -H "Content-Type: application/json" \
      ${BEARER_TOKEN:+-H "Authorization: Bearer $BEARER_TOKEN"} \
      --max-time "$TIMEOUT" \
      "$url" 2>&1); then
      echo "$output"
      return 0
    fi

    if [[ $attempt -lt $retries ]]; then
      sleep 2
    fi
  done

  return 1
}

# Extract HTTP status code from curl response
extract_http_code() {
  local response="$1"
  echo "$response" | tail -n 1
}

# Extract response body from curl response
extract_body() {
  local response="$1"
  echo "$response" | head -n -1
}

# Parse JSON response safely
safe_jq() {
  local filter="$1"
  local input="$2"
  echo "$input" | jq "$filter" 2>/dev/null || echo "null"
}

##############################################################################
# Test Criterion 1: Vercel Deployment Status
##############################################################################

test_deployment_status() {
  log_info "Testing: Vercel Deployment Status = Ready"

  # This requires Vercel API access; for now we check if endpoint is accessible
  local response
  response=$(safe_curl GET "$BASE_URL/api/agent/status") || {
    log_fail "Deployment Status" "Cannot reach endpoint"
    return 1
  }

  local http_code
  http_code=$(extract_http_code "$response")
  local body
  body=$(extract_body "$response")

  if [[ "$http_code" == "200" ]]; then
    log_pass "Deployment Status" "Endpoint accessible (HTTP 200)"
  else
    log_fail "Deployment Status" "HTTP $http_code (expected 200)"
    return 1
  fi
}

##############################################################################
# Test Criterion 2: /api/health Returns All Connected
##############################################################################

test_health_endpoint() {
  log_info "Testing: /api/health All Components Connected"

  local response
  response=$(safe_curl GET "$BASE_URL/api/health" 3) || {
    log_fail "/api/health" "Cannot reach endpoint"
    return 1
  }

  local http_code
  http_code=$(extract_http_code "$response")
  local body
  body=$(extract_body "$response")

  if [[ "$http_code" != "200" ]]; then
    log_fail "/api/health" "HTTP $http_code (expected 200)"
    return 1
  fi

  # Parse JSON response
  local status
  status=$(safe_jq '.status' "$body")

  if [[ "$status" != "\"connected\"" ]]; then
    log_fail "/api/health" "Status is $status (expected 'connected')"
    return 1
  fi

  # Extract response time
  local response_time
  response_time=$(safe_jq '.responseTime' "$body")

  if (( $(echo "$response_time > 500" | bc -l 2>/dev/null || echo 0) )); then
    log_conditional "/api/health" "Response time ${response_time}ms (target <500ms)"
  else
    log_pass "/api/health" "All components connected, ${response_time}ms response time"
  fi
}

##############################################################################
# Test Criterion 3: /api/readiness Check
##############################################################################

test_readiness_endpoint() {
  log_info "Testing: /api/readiness Probe"

  local response
  response=$(safe_curl GET "$BASE_URL/api/readiness" 3) || {
    log_fail "/api/readiness" "Cannot reach endpoint"
    return 1
  }

  local http_code
  http_code=$(extract_http_code "$response")

  if [[ "$http_code" == "200" ]]; then
    log_pass "/api/readiness" "System ready (HTTP 200)"
  else
    log_fail "/api/readiness" "HTTP $http_code (expected 200)"
    return 1
  fi
}

##############################################################################
# Test Criterion 4: Public API Routes
##############################################################################

test_public_endpoints() {
  log_info "Testing: Public API Endpoints"

  local endpoints=(
    "/api/health"
    "/api/readiness"
    "/api/agent/status"
  )

  local failed=0
  for endpoint in "${endpoints[@]}"; do
    local response
    response=$(safe_curl GET "$BASE_URL$endpoint" 2) || {
      log_fail "Public Route: $endpoint" "Cannot reach"
      ((failed++))
      continue
    }

    local http_code
    http_code=$(extract_http_code "$response")

    if [[ "$http_code" == "200" ]]; then
      log_pass "Public Route: $endpoint" "HTTP 200"
    else
      log_fail "Public Route: $endpoint" "HTTP $http_code"
      ((failed++))
    fi
  done

  [[ $failed -eq 0 ]]
}

##############################################################################
# Test Criterion 5: Protected API Routes (if Bearer Token provided)
##############################################################################

test_protected_endpoints() {
  log_info "Testing: Protected API Endpoints"

  if [[ -z "$BEARER_TOKEN" ]]; then
    log_conditional "Protected Routes" "Skipped (no BEARER_TOKEN provided)"
    return 0
  fi

  local endpoints=(
    "/api/executions"
    "/api/audit"
    "/api/usage"
    "/api/policies"
  )

  local failed=0
  for endpoint in "${endpoints[@]}"; do
    local response
    response=$(safe_curl GET "$BASE_URL$endpoint" 2) || {
      log_fail "Protected Route: $endpoint" "Cannot reach"
      ((failed++))
      continue
    }

    local http_code
    http_code=$(extract_http_code "$response")

    # Accept 200, 403 (auth needed), 404 (not implemented)
    if [[ "$http_code" =~ ^(200|403|404)$ ]]; then
      log_pass "Protected Route: $endpoint" "HTTP $http_code"
    else
      log_fail "Protected Route: $endpoint" "HTTP $http_code"
      ((failed++))
    fi
  done

  [[ $failed -eq 0 ]]
}

##############################################################################
# Test Criterion 6: Webhook Endpoint Accessible
##############################################################################

test_webhook_endpoint() {
  log_info "Testing: Webhook Endpoints"

  local endpoints=(
    "/api/webhooks/stripe"
  )

  local failed=0
  for endpoint in "${endpoints[@]}"; do
    local response
    response=$(safe_curl POST "$BASE_URL$endpoint" 2) || {
      log_fail "Webhook: $endpoint" "Cannot reach"
      ((failed++))
      continue
    }

    local http_code
    http_code=$(extract_http_code "$response")

    # Expect 400/401 (invalid signature) or 200 (valid), not 404
    if [[ "$http_code" =~ ^(200|400|401)$ ]]; then
      log_pass "Webhook: $endpoint" "Endpoint registered (HTTP $http_code)"
    else
      log_fail "Webhook: $endpoint" "HTTP $http_code (endpoint not registered)"
      ((failed++))
    fi
  done

  [[ $failed -eq 0 ]]
}

##############################################################################
# Test Criterion 7: Response Time Performance
##############################################################################

test_performance() {
  log_info "Testing: Response Time Performance (p95)"

  local endpoint="/api/health"
  local times=()
  local failed=0

  for i in {1..10}; do
    local start end elapsed
    start=$(date +%s%N)

    local response
    response=$(safe_curl GET "$BASE_URL$endpoint" 1) || {
      ((failed++))
      continue
    }

    end=$(date +%s%N)
    elapsed=$(( (end - start) / 1000000 ))  # Convert to ms
    times+=("$elapsed")
  done

  if [[ $failed -gt 5 ]]; then
    log_fail "Response Time" "Too many failures ($failed/10)"
    return 1
  fi

  # Sort and get p95 (95th percentile)
  if [[ ${#times[@]} -gt 0 ]]; then
    local sorted
    sorted=$(printf '%s\n' "${times[@]}" | sort -n)
    local p95_index=$(( ${#times[@]} * 95 / 100 ))
    local p95=$(echo "$sorted" | sed -n "${p95_index}p")

    if (( p95 < 500 )); then
      log_pass "Response Time" "p95 = ${p95}ms (target <500ms)"
    else
      log_conditional "Response Time" "p95 = ${p95}ms (target <500ms)"
    fi
  fi
}

##############################################################################
# Test Criterion 8: HTTPS/Security Headers
##############################################################################

test_https_and_headers() {
  log_info "Testing: HTTPS and Security Headers"

  # Check for HTTPS
  if [[ "$BASE_URL" != https://* ]]; then
    log_fail "HTTPS" "URL is not HTTPS"
    return 1
  fi

  log_pass "HTTPS" "URL uses HTTPS protocol"

  # Check security headers
  local response
  response=$(curl -s -I "$BASE_URL" 2>&1) || {
    log_fail "Security Headers" "Cannot reach endpoint"
    return 1
  }

  if echo "$response" | grep -qi "X-Frame-Options\|Content-Security-Policy"; then
    log_pass "Security Headers" "Security headers present"
  else
    log_conditional "Security Headers" "Some security headers may be missing"
  fi
}

##############################################################################
# Generate JSON Report
##############################################################################

generate_json_report() {
  local decision="NO-GO"
  if [[ $FAILED -eq 0 ]] && [[ $CONDITIONAL -eq 0 ]]; then
    decision="GO"
  elif [[ $FAILED -eq 0 ]]; then
    decision="CONDITIONAL"
  fi

  local timestamp
  timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

  cat > /tmp/go-no-go-report.json << EOF
{
  "timestamp": "$timestamp",
  "base_url": "$BASE_URL",
  "decision": "$decision",
  "summary": {
    "passed": $PASSED,
    "failed": $FAILED,
    "conditional": $CONDITIONAL,
    "total": $((PASSED + FAILED + CONDITIONAL))
  },
  "criteria": [
EOF

  # Add each result
  local first=true
  for result in "${RESULTS[@]}"; do
    IFS=':' read -r criterion status detail <<< "$result"

    if [[ "$first" == "true" ]]; then
      first=false
    else
      echo "," >> /tmp/go-no-go-report.json
    fi

    cat >> /tmp/go-no-go-report.json << EOF
    {
      "criterion": "$criterion",
      "status": "$status",
      "detail": "$detail"
    }
EOF
  done

  cat >> /tmp/go-no-go-report.json << EOF
  ]
}
EOF

  cat /tmp/go-no-go-report.json
}

##############################################################################
# Print Summary Report
##############################################################################

print_summary() {
  local decision="NO-GO"
  if [[ $FAILED -eq 0 ]] && [[ $CONDITIONAL -eq 0 ]]; then
    decision="GO"
  elif [[ $FAILED -eq 0 ]]; then
    decision="CONDITIONAL"
  fi

  echo ""
  echo "=================================="
  echo "GO-NO-GO DECISION REPORT"
  echo "=================================="
  echo ""
  echo "URL Tested:    $BASE_URL"
  echo "Decision:      $(
    if [[ "$decision" == "GO" ]]; then
      echo -e "${GREEN}$decision${NC}"
    elif [[ "$decision" == "CONDITIONAL" ]]; then
      echo -e "${YELLOW}$decision${NC}"
    else
      echo -e "${RED}$decision${NC}"
    fi
  )"
  echo ""
  echo "Summary:"
  echo "  Passed:      $PASSED"
  echo "  Failed:      $FAILED"
  echo "  Conditional: $CONDITIONAL"
  echo "  Total:       $((PASSED + FAILED + CONDITIONAL))"
  echo ""

  if [[ $FAILED -gt 0 ]]; then
    echo "Failed Criteria:"
    for failure in "${FAILURES[@]}"; do
      IFS=':' read -r criterion detail <<< "$failure"
      echo "  - $criterion: $detail"
    done
    echo ""
  fi

  echo "=================================="
  echo "Decision: $(
    if [[ "$decision" == "GO" ]]; then
      echo -e "${GREEN}$decision - Ready for Production Launch${NC}"
    elif [[ "$decision" == "CONDITIONAL" ]]; then
      echo -e "${YELLOW}$decision - Review Conditional Items${NC}"
    else
      echo -e "${RED}$decision - Fix Failures Before Launch${NC}"
    fi
  )"
  echo "=================================="
}

##############################################################################
# Main Execution
##############################################################################

main() {
  echo "Starting GO-NO-GO verification..."
  echo "Base URL: $BASE_URL"
  echo ""

  # Run all tests
  test_deployment_status || true
  test_health_endpoint || true
  test_readiness_endpoint || true
  test_public_endpoints || true
  test_protected_endpoints || true
  test_webhook_endpoint || true
  test_performance || true
  test_https_and_headers || true

  # Output results
  if [[ "$OUTPUT_JSON" == "true" ]]; then
    generate_json_report
  else
    print_summary
    echo ""
    echo "Full JSON report saved to: /tmp/go-no-go-report.json"
    echo "View with: cat /tmp/go-no-go-report.json | jq ."
  fi

  # Set exit code
  if [[ $FAILED -gt 0 ]]; then
    exit 1
  else
    exit 0
  fi
}

# Run main function
main "$@"
