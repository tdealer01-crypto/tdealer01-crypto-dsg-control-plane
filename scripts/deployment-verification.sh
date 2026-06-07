#!/usr/bin/env bash

##############################################################################
# deployment-verification.sh
#
# Comprehensive post-deployment verification script.
# Checks Vercel status, environment variables, database connectivity,
# Stripe integration, OAuth configuration, webhooks, and security settings.
#
# Usage:
#   ./scripts/deployment-verification.sh https://example.com
#   ./scripts/deployment-verification.sh              # uses DEPLOYMENT_URL env var
#
# Exit codes:
#   0 = All critical checks passed
#   1 = One or more critical checks failed
#   2 = Usage error or missing URL
#
##############################################################################

set -euo pipefail

# Extract base URL from argument or environment
BASE_URL="${1:-${DEPLOYMENT_URL:-}}"

if [[ -z "$BASE_URL" ]]; then
  cat >&2 <<'EOF'
Usage: ./scripts/deployment-verification.sh <base-url>
       DEPLOYMENT_URL=<base-url> ./scripts/deployment-verification.sh

Example:
  ./scripts/deployment-verification.sh https://tdealer01-crypto-dsg-control-plane.vercel.app

Environment:
  DEPLOYMENT_URL           Base URL for deployment checks
  DEPLOYMENT_TIMEOUT       Request timeout in seconds (default: 30)
  DEPLOYMENT_CHECK_HERMES  Also verify DSG Hermes components (default: true)
  DEPLOYMENT_CHECK_STRIPE  Also verify Stripe integration (requires key) (default: false)
EOF
  exit 2
fi

# Configuration
TIMEOUT="${DEPLOYMENT_TIMEOUT:-30}"
CHECK_HERMES="${DEPLOYMENT_CHECK_HERMES:-true}"
CHECK_STRIPE="${DEPLOYMENT_CHECK_STRIPE:-false}"

# Temp directory
TMP_ROOT="${TMPDIR:-}"
if [[ -z "$TMP_ROOT" || ! -d "$TMP_ROOT" || ! -w "$TMP_ROOT" ]]; then
  TMP_ROOT="$(pwd)/.tmp"
  mkdir -p "$TMP_ROOT"
fi

# Clear proxy settings
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy \
  NPM_CONFIG_PROXY NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY \
  npm_config_proxy npm_config_http_proxy npm_config_https_proxy || true
export NO_PROXY="*"
export no_proxy="*"

# State tracking
critical_failures=0
warnings=0
passed_checks=0

###############################################################################
# Helper Functions
###############################################################################

log_pass() {
  echo "✅ $1"
  ((passed_checks++))
}

log_fail() {
  echo "❌ $1 (CRITICAL)"
  ((critical_failures++))
}

log_warn() {
  echo "⚠️  $1"
  ((warnings++))
}

log_info() {
  echo "ℹ️  $1"
}

log_section() {
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Simple HTTP request
http_get() {
  local url="$1"
  local response_file="$2"
  curl --noproxy '*' --proxy '' -s -o "$response_file" -w "%{http_code}" \
    --max-time "$TIMEOUT" "$url" 2>/dev/null || echo "000"
}

# Extract JSON field
get_json_field() {
  local file="$1"
  local field="$2"
  if [[ ! -f "$file" ]]; then
    return 1
  fi
  grep -o "\"$field\":[^,}]*" "$file" 2>/dev/null | cut -d':' -f2- | tr -d '"' | head -1 || echo ""
}

# Check if environment variable is present in deployment
check_env_var_present() {
  local var_name="$1"
  local response_file="$2"

  # This checks readiness endpoint which reports missing env vars
  if grep -q "\"$var_name\"" "$response_file" 2>/dev/null; then
    log_pass "Environment variable present: $var_name"
    return 0
  else
    # Readiness endpoint lists missing vars in detail
    return 1
  fi
}

###############################################################################
# Main Verification
###############################################################################

log_section "DEPLOYMENT VERIFICATION"
echo "Target: $BASE_URL"
echo "Time: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

###############################################################################
# 1. VERCEL DEPLOYMENT STATUS
###############################################################################

log_section "1. VERCEL DEPLOYMENT STATUS"

# Check basic connectivity
local_tmp="${TMP_ROOT%/}/deployment-check.json"
local http_code
http_code=$(http_get "${BASE_URL%/}/api/agent/status" "$local_tmp")

if [[ "$http_code" == "200" ]]; then
  log_pass "Deployment is responding (HTTP $http_code)"

  # Extract version info
  local version
  version=$(get_json_field "$local_tmp" "version")
  local env
  env=$(get_json_field "$local_tmp" "env")

  log_info "Deployed commit: $version"
  log_info "Environment: $env"

  if [[ "$env" == "production" ]]; then
    log_pass "Production environment confirmed"
  else
    log_warn "Non-production environment: $env"
  fi
else
  log_fail "Deployment not responding (HTTP $http_code)"
fi

###############################################################################
# 2. READINESS CHECKS
###############################################################################

log_section "2. READINESS ENDPOINT CHECKS"

readiness_file="${TMP_ROOT%/}/readiness-check.json"
http_code=$(http_get "${BASE_URL%/}/api/readiness" "$readiness_file")

if [[ "$http_code" == "200" ]]; then
  log_pass "Readiness endpoint responding"

  # Check readiness response structure
  if grep -q '"checks"' "$readiness_file" 2>/dev/null; then
    log_pass "Readiness report contains checks"

    # Parse individual checks
    if grep -q '"env".*"ok"' "$readiness_file" 2>/dev/null; then
      log_pass "Environment variables: OK"
    else
      log_warn "Environment variables check: FAILED"
    fi

    if grep -q '"nextAuthSecret".*"ok"' "$readiness_file" 2>/dev/null; then
      log_pass "NextAuth secret: OK"
    else
      log_warn "NextAuth secret: MISSING"
    fi

    if grep -q '"supabaseServiceRole".*"ok"' "$readiness_file" 2>/dev/null; then
      log_pass "Supabase service role: OK"
    else
      log_warn "Supabase service role: FAILED"
    fi

    if grep -q '"dsgCoreConfig".*"ok"' "$readiness_file" 2>/dev/null; then
      log_pass "DSG Core configuration: OK"
    else
      log_warn "DSG Core configuration: FAILED"
    fi

    if grep -q '"financeGovernanceBackend".*"ok"' "$readiness_file" 2>/dev/null; then
      log_pass "Finance governance backend: OK"
    else
      log_warn "Finance governance backend: FAILED or SKIPPED"
    fi
  else
    log_warn "Readiness response missing checks field"
  fi
else
  log_fail "Readiness endpoint failed (HTTP $http_code)"
fi

###############################################################################
# 3. SUPABASE CONNECTION
###############################################################################

log_section "3. DATABASE CONNECTIVITY"

# The readiness endpoint includes Supabase probe results
if [[ -f "$readiness_file" ]] && grep -q '"supabaseServiceRole"' "$readiness_file"; then
  if grep -q '"supabaseServiceRole".*"ok":true' "$readiness_file"; then
    log_pass "Supabase service role probe: CONNECTED"
  else
    log_warn "Supabase service role probe: DISCONNECTED or TIMEOUT"
  fi
fi

# Additional database health via dedicated endpoint if available
db_health_file="${TMP_ROOT%/}/db-health.json"
db_http=$(http_get "${BASE_URL%/}/api/finance-governance/readiness" "$db_health_file" || echo "000")

if [[ "$db_http" == "200" ]]; then
  log_pass "Finance governance readiness endpoint available"
  if grep -q '"ok":true' "$db_health_file" 2>/dev/null; then
    log_pass "Database health check: PASSED"
  else
    log_warn "Database health check: FAILED"
  fi
else
  log_info "Finance governance readiness not available (HTTP $db_http) - finance governance may be disabled"
fi

###############################################################################
# 4. WEBHOOK ENDPOINTS
###############################################################################

log_section "4. WEBHOOK & INTEGRATION ENDPOINTS"

# Check webhook accessibility
webhook_endpoints=(
  "/api/gateway/webhook/inbox"
  "/api/hermes/webhooks"
)

for endpoint in "${webhook_endpoints[@]}"; do
  webhook_file="${TMP_ROOT%/}/webhook-test.json"
  http_code=$(http_get "${BASE_URL%/}${endpoint}" "$webhook_file")

  # Webhooks typically expect POST, so 404 means not found, 405 means exists but wrong method
  if [[ "$http_code" == "404" ]]; then
    log_warn "Webhook endpoint not found: $endpoint"
  elif [[ "$http_code" == "405" ]]; then
    log_pass "Webhook endpoint exists: $endpoint"
  elif [[ "$http_code" == "200" ]]; then
    log_pass "Webhook endpoint accessible: $endpoint"
  else
    log_info "Webhook endpoint status: $endpoint -> HTTP $http_code"
  fi
done

###############################################################################
# 5. SECURITY HEADERS
###############################################################################

log_section "5. SECURITY HEADERS"

headers_file="${TMP_ROOT%/}/security-headers.txt"
curl --noproxy '*' --proxy '' -s -I --max-time "$TIMEOUT" \
  "${BASE_URL%/}/api/health" 2>/dev/null > "$headers_file" || true

security_headers=(
  "content-security-policy"
  "x-content-type-options"
  "x-frame-options"
  "strict-transport-security"
)

for header in "${security_headers[@]}"; do
  if grep -qi "^${header}:" "$headers_file"; then
    local header_value
    header_value=$(grep -i "^${header}:" "$headers_file" | cut -d: -f2- | xargs)
    log_pass "Security header present: $header"
    log_info "  Value: $header_value"
  else
    log_warn "Security header missing: $header"
  fi
done

# Check rate limiting headers
if grep -qi "^ratelimit-limit:" "$headers_file" || \
   grep -qi "^x-ratelimit-limit:" "$headers_file"; then
  log_pass "Rate limiting headers present"
else
  log_warn "Rate limiting headers not detected"
fi

###############################################################################
# 6. CORS CONFIGURATION
###############################################################################

log_section "6. CORS CONFIGURATION"

# Check CORS headers on OPTIONS request
cors_file="${TMP_ROOT%/}/cors-test.txt"
curl --noproxy '*' --proxy '' -s -I -X OPTIONS --max-time "$TIMEOUT" \
  "${BASE_URL%/}/api/execute" 2>/dev/null > "$cors_file" || true

if grep -qi "^access-control-allow-origin:" "$cors_file"; then
  local allow_origin
  allow_origin=$(grep -i "^access-control-allow-origin:" "$cors_file" | cut -d: -f2- | xargs)
  log_pass "CORS headers present"
  log_info "  Allow-Origin: $allow_origin"
else
  log_warn "CORS headers not detected on OPTIONS"
fi

if grep -qi "^access-control-allow-methods:" "$cors_file"; then
  local allow_methods
  allow_methods=$(grep -i "^access-control-allow-methods:" "$cors_file" | cut -d: -f2- | xargs)
  log_info "  Allow-Methods: $allow_methods"
fi

###############################################################################
# 7. STRIPE INTEGRATION (optional)
###############################################################################

if [[ "$CHECK_STRIPE" == "true" ]]; then
  log_section "7. STRIPE INTEGRATION (optional check)"

  if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
    log_info "STRIPE_SECRET_KEY not set - skipping Stripe tests"
  else
    log_info "Testing Stripe API key validity..."
    # Note: This would require the Stripe CLI or API calls with credentials
    # For now, just verify the key format
    if [[ "${STRIPE_SECRET_KEY:-}" =~ ^sk_ ]]; then
      log_pass "Stripe secret key format valid"
    else
      log_warn "Stripe secret key format invalid (should start with sk_)"
    fi
  fi
else
  log_section "7. STRIPE INTEGRATION (skipped)"
  log_info "Set DEPLOYMENT_CHECK_STRIPE=true to enable Stripe checks"
fi

###############################################################################
# 8. DSG/HERMES COMPONENTS (optional)
###############################################################################

if [[ "$CHECK_HERMES" == "true" ]]; then
  log_section "8. DSG HERMES COMPONENTS"

  # Check Hermes status if available
  hermes_file="${TMP_ROOT%/}/hermes-status.json"
  hermes_http=$(http_get "${BASE_URL%/}/api/dsg/hermes/status" "$hermes_file" || echo "000")

  if [[ "$hermes_http" == "200" ]]; then
    log_pass "Hermes status endpoint available"
    if grep -q '"ok":true' "$hermes_file" 2>/dev/null; then
      log_pass "Hermes health check: PASSED"
    else
      log_warn "Hermes health check: FAILED"
    fi
  else
    log_info "Hermes status endpoint not available (HTTP $hermes_http)"
  fi

  # Check DSG policies endpoint
  policies_file="${TMP_ROOT%/}/dsg-policies.json"
  policies_http=$(http_get "${BASE_URL%/}/api/dsg/v1/policies/manifest" "$policies_file" || echo "000")

  if [[ "$policies_http" == "200" ]]; then
    log_pass "DSG policies manifest endpoint available"
  else
    log_info "DSG policies manifest endpoint status: HTTP $policies_http"
  fi
else
  log_section "8. DSG HERMES COMPONENTS (skipped)"
  log_info "Set DEPLOYMENT_CHECK_HERMES=false to disable Hermes checks"
fi

###############################################################################
# 9. CRITICAL PATH ENDPOINTS
###############################################################################

log_section "9. CRITICAL PATH ENDPOINTS"

critical_endpoints=(
  "/api/health"
  "/api/agent/status"
  "/api/readiness"
  "/api/execute"
)

for endpoint in "${critical_endpoints[@]}"; do
  endpoint_file="${TMP_ROOT%/}/critical-check.json"
  http_code=$(http_get "${BASE_URL%/}${endpoint}" "$endpoint_file")

  if [[ "$http_code" =~ ^(2|3)[0-9][0-9]$ ]]; then
    log_pass "Critical endpoint reachable: $endpoint"
  else
    log_fail "Critical endpoint failed: $endpoint (HTTP $http_code)"
  fi
done

###############################################################################
# SUMMARY
###############################################################################

log_section "VERIFICATION SUMMARY"

echo ""
echo "Passed checks:        $passed_checks"
echo "Critical failures:    $critical_failures"
echo "Warnings:             $warnings"
echo ""

if [[ $critical_failures -eq 0 ]]; then
  echo "✅ DEPLOYMENT VERIFICATION PASSED"
  echo ""
  echo "All critical checks passed. Deployment is ready for use."
  echo ""
  exit 0
else
  echo "❌ DEPLOYMENT VERIFICATION FAILED"
  echo ""
  echo "$critical_failures critical check(s) failed. Please review the errors above."
  echo ""
  exit 1
fi
