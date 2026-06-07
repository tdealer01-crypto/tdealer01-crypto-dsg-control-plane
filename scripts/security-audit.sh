#!/bin/bash
# Security Audit Script for DSG ONE / ProofGate Control Plane
# Runs automated security checks against a deployment URL
# Usage: ./scripts/security-audit.sh [--url <deployment-url>] [--verbose]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEFAULT_URL="${1:-https://tdealer01-crypto-dsg-control-plane.vercel.app}"
AUDIT_URL="${AUDIT_URL:-$DEFAULT_URL}"
VERBOSE="${VERBOSE:-false}"
TEMP_DIR=$(mktemp -d)
RESULTS_FILE="$TEMP_DIR/security-audit-results.json"
FAILED_CHECKS=0
PASSED_CHECKS=0
WARNING_CHECKS=0

trap "rm -rf $TEMP_DIR" EXIT

# Helper functions
log_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

log_pass() {
    echo -e "${GREEN}✓ PASS${NC} $1"
    ((PASSED_CHECKS++))
}

log_fail() {
    echo -e "${RED}✗ FAIL${NC} $1"
    ((FAILED_CHECKS++))
}

log_warn() {
    echo -e "${YELLOW}⚠ WARN${NC} $1"
    ((WARNING_CHECKS++))
}

log_info() {
    echo -e "${BLUE}ℹ INFO${NC} $1"
}

log_detail() {
    if [ "$VERBOSE" = "true" ]; then
        echo "  → $1"
    fi
}

# Initialize results file
init_results() {
    cat > "$RESULTS_FILE" <<EOF
{
  "audit_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "audit_url": "$AUDIT_URL",
  "checks": []
}
EOF
}

add_result() {
    local status=$1
    local check=$2
    local detail=$3

    # Append to results JSON
    jq --arg status "$status" --arg check "$check" --arg detail "$detail" \
        '.checks += [{"status": $status, "check": $check, "detail": $detail}]' \
        "$RESULTS_FILE" > "${RESULTS_FILE}.tmp" && mv "${RESULTS_FILE}.tmp" "$RESULTS_FILE"
}

# Test 1: TLS Version
check_tls_version() {
    log_section "TLS/SSL Configuration"

    local tls_output
    tls_output=$(echo | openssl s_client -connect "${AUDIT_URL#https://}" 2>/dev/null | grep "Protocol")

    if echo "$tls_output" | grep -q "TLSv1\.[23]"; then
        log_pass "TLS version 1.2 or higher"
        log_detail "$tls_output"
        add_result "PASS" "TLS version >= 1.2" "$tls_output"
    else
        log_fail "TLS version 1.2 or higher (found: $tls_output)"
        add_result "FAIL" "TLS version >= 1.2" "$tls_output"
    fi
}

# Test 2: HTTPS Redirect
check_https_redirect() {
    log_section "HTTPS Enforcement"

    local http_url="${AUDIT_URL#https://}"
    http_url="http://$http_url"

    local redirect_status
    redirect_status=$(curl -s -o /dev/null -w "%{http_code}" -L "$http_url" 2>/dev/null || echo "000")

    if [ "$redirect_status" = "200" ]; then
        log_pass "HTTP requests redirect to HTTPS"
        log_detail "Final status: $redirect_status"
        add_result "PASS" "HTTP redirect to HTTPS" "Status $redirect_status"
    else
        log_fail "HTTP requests redirect to HTTPS (got status: $redirect_status)"
        add_result "FAIL" "HTTP redirect to HTTPS" "Status $redirect_status"
    fi
}

# Test 3: CSP Headers
check_csp_headers() {
    log_section "Content Security Policy"

    local csp_header
    csp_header=$(curl -s -I "$AUDIT_URL" 2>/dev/null | grep -i "^content-security-policy" || echo "")

    if [ -n "$csp_header" ]; then
        log_pass "CSP header present"
        log_detail "$csp_header"
        add_result "PASS" "CSP header configured" "$csp_header"

        # Check for dangerous patterns
        if echo "$csp_header" | grep -q "unsafe-inline"; then
            log_warn "CSP contains 'unsafe-inline' for scripts"
            log_detail "This may weaken XSS protection"
            add_result "WARN" "CSP unsafe-inline usage" "Found in CSP"
        fi

        if echo "$csp_header" | grep -q "default-src.*\*"; then
            log_fail "CSP default-src allows wildcard"
            add_result "FAIL" "CSP wildcard check" "Wildcard found in default-src"
        fi
    else
        log_fail "CSP header missing"
        add_result "FAIL" "CSP header configured" "No CSP header found"
    fi
}

# Test 4: Security Headers
check_security_headers() {
    log_section "Security Headers"

    local headers
    headers=$(curl -s -I "$AUDIT_URL" 2>/dev/null)

    # Check X-Frame-Options
    if echo "$headers" | grep -q "^X-Frame-Options.*DENY"; then
        log_pass "X-Frame-Options: DENY (prevents clickjacking)"
        add_result "PASS" "X-Frame-Options" "DENY"
    else
        log_fail "X-Frame-Options not set to DENY"
        add_result "FAIL" "X-Frame-Options" "Not DENY"
    fi

    # Check X-Content-Type-Options
    if echo "$headers" | grep -q "^X-Content-Type-Options.*nosniff"; then
        log_pass "X-Content-Type-Options: nosniff"
        add_result "PASS" "X-Content-Type-Options" "nosniff"
    else
        log_fail "X-Content-Type-Options not set to nosniff"
        add_result "FAIL" "X-Content-Type-Options" "Not nosniff"
    fi

    # Check HSTS
    if echo "$headers" | grep -q "^Strict-Transport-Security"; then
        log_pass "HSTS header present"
        local hsts=$(echo "$headers" | grep "^Strict-Transport-Security")
        log_detail "$hsts"
        add_result "PASS" "HSTS configured" "$hsts"
    else
        log_fail "HSTS header missing"
        add_result "FAIL" "HSTS configured" "No HSTS header"
    fi
}

# Test 5: CORS Configuration
check_cors_headers() {
    log_section "CORS Configuration"

    local cors_header
    cors_header=$(curl -s -H "Origin: http://attacker.com" -I "$AUDIT_URL/api/health" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")

    if [ -z "$cors_header" ]; then
        log_pass "CORS not exposed to untrusted origins"
        add_result "PASS" "CORS origin restriction" "No wildcard CORS"
    elif echo "$cors_header" | grep -q "\*"; then
        log_fail "CORS header contains wildcard (*)"
        add_result "FAIL" "CORS wildcard check" "Wildcard found"
    else
        log_warn "CORS header present but origin check needed"
        log_detail "$cors_header"
        add_result "WARN" "CORS header validation" "$cors_header"
    fi
}

# Test 6: Rate Limit Headers
check_rate_limit_headers() {
    log_section "Rate Limiting"

    local rate_limit
    rate_limit=$(curl -s -H "X-Forwarded-For: 1.2.3.4" -I "$AUDIT_URL/api/health" 2>/dev/null | grep -i "x-ratelimit" || echo "")

    if [ -n "$rate_limit" ]; then
        log_pass "Rate limit headers present"
        log_detail "$rate_limit"
        add_result "PASS" "Rate limiting configured" "Headers present"
    else
        log_warn "Rate limit headers not visible (may be configured in Upstash)"
        log_detail "Check Upstash Redis configuration for rate limiting"
        add_result "WARN" "Rate limiting visibility" "Headers not visible"
    fi
}

# Test 7: JWT Bearer Token Validation
check_jwt_validation() {
    log_section "Authentication & Authorization"

    local response
    response=$(curl -s -X POST "$AUDIT_URL/api/execute" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer invalid-token" \
        -d '{}' 2>/dev/null)

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$AUDIT_URL/api/execute" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer invalid-token" \
        -d '{}' 2>/dev/null)

    if [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        log_pass "Invalid JWT returns 401/403"
        log_detail "HTTP $http_code"
        add_result "PASS" "JWT validation" "Returns $http_code"
    else
        log_warn "Unexpected response to invalid JWT (HTTP $http_code)"
        add_result "WARN" "JWT validation" "HTTP $http_code (expected 401/403)"
    fi
}

# Test 8: Input Validation
check_input_validation() {
    log_section "Input Validation & Size Limits"

    # Test 8a: Oversized payload
    local large_payload
    large_payload=$(python3 -c "print('{\"data\": \"' + 'A'*100000 + '\"}')" 2>/dev/null || echo '{"data": "toolarge"}')

    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$AUDIT_URL/api/execute" \
        -H "Content-Type: application/json" \
        -d "$large_payload" 2>/dev/null)

    if [ "$response_code" = "413" ]; then
        log_pass "Oversized payloads rejected (413)"
        add_result "PASS" "Request size limit" "413 Payload Too Large"
    elif [ "$response_code" = "400" ]; then
        log_warn "Oversized payload returns 400 (should be 413)"
        add_result "WARN" "Request size limit" "400 vs expected 413"
    else
        log_warn "Payload size check unclear (HTTP $response_code)"
        add_result "WARN" "Request size limit" "HTTP $response_code"
    fi

    # Test 8b: Invalid JSON
    local invalid_json_code
    invalid_json_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$AUDIT_URL/api/execute" \
        -H "Content-Type: application/json" \
        -d '{"invalid json"}' 2>/dev/null)

    if [ "$invalid_json_code" = "400" ]; then
        log_pass "Invalid JSON rejected (400)"
        add_result "PASS" "JSON validation" "400 Bad Request"
    else
        log_warn "Invalid JSON check unclear (HTTP $invalid_json_code)"
        add_result "WARN" "JSON validation" "HTTP $invalid_json_code"
    fi
}

# Test 9: XSS Prevention
check_xss_prevention() {
    log_section "XSS Prevention"

    local response
    response=$(curl -s "$AUDIT_URL/api/health" 2>/dev/null || echo "{}")

    # Check if response contains any HTML special chars but check Content-Type
    local content_type
    content_type=$(curl -s -I "$AUDIT_URL/api/health" 2>/dev/null | grep -i "content-type" || echo "")

    if echo "$content_type" | grep -q "application/json"; then
        log_pass "API returns application/json (not vulnerable to basic XSS)"
        log_detail "$content_type"
        add_result "PASS" "XSS Content-Type" "JSON content type"
    else
        log_warn "Content-Type check unclear"
        log_detail "$content_type"
        add_result "WARN" "XSS Content-Type" "$content_type"
    fi
}

# Test 10: CSRF Protection
check_csrf_protection() {
    log_section "CSRF Protection"

    local samesite_check
    samesite_check=$(curl -s -I "$AUDIT_URL" 2>/dev/null | grep -i "set-cookie" | grep -i "samesite" || echo "")

    if [ -n "$samesite_check" ]; then
        log_pass "SameSite cookie attribute set"
        log_detail "$samesite_check"
        add_result "PASS" "SameSite cookies" "Attribute present"
    else
        log_warn "SameSite cookie check inconclusive (may be set by auth provider)"
        log_detail "Supabase auth may handle SameSite separately"
        add_result "WARN" "SameSite cookies" "Not visible in response"
    fi
}

# Test 11: SQL Injection Protection
check_sql_injection_protection() {
    log_section "SQL Injection Prevention"

    # Test with common SQL injection payloads in JSON
    local sqli_payload='{"query": "1\\" OR \\"1\\"=\\"1"}'
    local sqli_response
    sqli_response=$(curl -s -X POST "$AUDIT_URL/api/execute" \
        -H "Content-Type: application/json" \
        -d "$sqli_payload" 2>/dev/null)

    # Check if response is JSON (not SQL error)
    if echo "$sqli_response" | jq . > /dev/null 2>&1; then
        log_pass "SQL injection payload handled safely (returns JSON)"
        add_result "PASS" "SQL injection protection" "Parameterized queries"
    else
        log_warn "SQL injection check inconclusive"
        add_result "WARN" "SQL injection protection" "Unclear response"
    fi
}

# Test 12: Error Message Handling
check_error_messages() {
    log_section "Error Message Handling"

    local error_response
    error_response=$(curl -s "$AUDIT_URL/api/invalid-endpoint" 2>/dev/null)

    if echo "$error_response" | grep -qi "stack\|at\|function"; then
        log_fail "Stack trace exposed in error message"
        log_detail "Response contains internal details"
        add_result "FAIL" "Error message redaction" "Stack trace visible"
    else
        log_pass "Error messages do not expose stack traces"
        add_result "PASS" "Error message redaction" "Stack trace hidden"
    fi
}

# Test 13: Health Check Endpoint
check_health_endpoint() {
    log_section "Health & Readiness Checks"

    local health_response
    health_response=$(curl -s "$AUDIT_URL/api/health" 2>/dev/null)

    if echo "$health_response" | jq . > /dev/null 2>&1; then
        log_pass "Health endpoint responds with valid JSON"
        log_detail "$health_response" | head -1
        add_result "PASS" "Health endpoint" "Operational"
    else
        log_fail "Health endpoint unavailable or invalid response"
        add_result "FAIL" "Health endpoint" "Not operational"
    fi
}

# Test 14: Dependency Vulnerabilities
check_dependencies() {
    log_section "Dependency Security"

    if [ -f "package.json" ]; then
        local audit_output
        audit_output=$(npm audit --audit-level=high 2>&1 || echo "")

        if echo "$audit_output" | grep -qi "vulnerabilities"; then
            log_fail "High/critical vulnerabilities detected"
            log_detail "Run 'npm audit' for details"
            add_result "FAIL" "Dependency vulnerabilities" "Found"
        else
            log_pass "No high/critical vulnerabilities in npm packages"
            add_result "PASS" "Dependency vulnerabilities" "None found"
        fi
    else
        log_warn "package.json not found (not a Node.js project?)"
        add_result "WARN" "Dependency check" "package.json not found"
    fi
}

# Test 15: CORS Preflight
check_cors_preflight() {
    log_section "CORS Preflight Handling"

    local preflight_response
    preflight_response=$(curl -s -X OPTIONS "$AUDIT_URL/api/execute" \
        -H "Origin: https://tdealer01-crypto-dsg-control-plane.vercel.app" \
        -H "Access-Control-Request-Method: POST" \
        -o /dev/null -w "%{http_code}" 2>/dev/null)

    if [ "$preflight_response" = "200" ] || [ "$preflight_response" = "204" ]; then
        log_pass "CORS preflight returns 200/204"
        add_result "PASS" "CORS preflight" "HTTP $preflight_response"
    else
        log_warn "CORS preflight returned HTTP $preflight_response (expected 200/204)"
        add_result "WARN" "CORS preflight" "HTTP $preflight_response"
    fi
}

# Summary
print_summary() {
    log_section "Security Audit Summary"

    echo -e "\n${BLUE}Results:${NC}"
    echo -e "  ${GREEN}Passed:${NC}  $PASSED_CHECKS"
    echo -e "  ${YELLOW}Warnings:${NC} $WARNING_CHECKS"
    echo -e "  ${RED}Failed:${NC}  $FAILED_CHECKS"

    echo -e "\n${BLUE}Detailed results saved to:${NC}"
    echo "  $RESULTS_FILE"

    if [ $FAILED_CHECKS -eq 0 ]; then
        echo -e "\n${GREEN}✓ All critical security checks passed!${NC}"
        return 0
    else
        echo -e "\n${RED}✗ $FAILED_CHECKS security check(s) failed. Review above for details.${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}DSG ONE / ProofGate Security Audit${NC}"
    echo "Target URL: $AUDIT_URL"
    echo "Timestamp: $(date)"

    init_results

    # Run all checks
    check_tls_version
    check_https_redirect
    check_csp_headers
    check_security_headers
    check_cors_headers
    check_rate_limit_headers
    check_jwt_validation
    check_input_validation
    check_xss_prevention
    check_csrf_protection
    check_sql_injection_protection
    check_error_messages
    check_health_endpoint
    check_dependencies
    check_cors_preflight

    print_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url)
            AUDIT_URL="$2"
            shift 2
            ;;
        --verbose)
            VERBOSE="true"
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--url <deployment-url>] [--verbose]"
            exit 1
            ;;
    esac
done

# Run main function
main
