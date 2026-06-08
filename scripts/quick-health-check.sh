#!/usr/bin/env bash
##############################################################################
# quick-health-check.sh
#
# Fast 10-second lightweight health check for deployed service.
# Returns a single overview of critical health indicators.
#
# Usage:
#   ./scripts/quick-health-check.sh https://your-app.vercel.app
#   ./scripts/quick-health-check.sh                            # uses BASE_URL env var
#
# Exit codes:
#   0 = Health check passed (all critical services ok)
#   1 = One or more services failing
#   2 = Usage error
#
# Environment:
#   BASE_URL    Target deployment URL
#
##############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Extract base URL
BASE_URL="${1:-${BASE_URL:-}}"

if [[ -z "$BASE_URL" ]]; then
  cat >&2 <<'EOF'
Usage: ./scripts/quick-health-check.sh <base-url>
       BASE_URL=<base-url> ./scripts/quick-health-check.sh

Example:
  ./scripts/quick-health-check.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
EOF
  exit 2
fi

# Clear proxy settings
unset HTTP_PROXY HTTPS_PROXY ALL_PROXY http_proxy https_proxy all_proxy \
  NPM_CONFIG_PROXY NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY \
  npm_config_proxy npm_config_http_proxy npm_config_https_proxy || true
export NO_PROXY="*"
export no_proxy="*"

# Temp directory
TMP_ROOT="${TMPDIR:-./.tmp}"
mkdir -p "$TMP_ROOT"

###############################################################################
# Helper Functions
###############################################################################

fetch_health_json() {
  local url="$1"
  local output_file="$2"

  curl --noproxy '*' --proxy '' \
    -s -f -o "$output_file" \
    --max-time 8 \
    "$url" 2>/dev/null || echo "000"
}

get_json_bool() {
  local file="$1"
  local field="$2"

  if [[ ! -f "$file" ]]; then
    echo "unknown"
    return
  fi

  grep -o "\"$field\":[^,}]*" "$file" 2>/dev/null | \
    head -1 | \
    cut -d':' -f2- | \
    tr -d '"' | \
    tr '[:upper:]' '[:lower:]' || echo "unknown"
}

get_json_str() {
  local file="$1"
  local field="$2"
  local default="${3:-unknown}"

  if [[ ! -f "$file" ]]; then
    echo "$default"
    return
  fi

  grep -o "\"$field\":\"[^\"]*\"" "$file" 2>/dev/null | \
    head -1 | \
    cut -d':' -f2- | \
    tr -d '"' || echo "$default"
}

status_icon() {
  local value="$1"
  if [[ "$value" == "true" ]]; then
    echo -e "${GREEN}✓${NC}"
  elif [[ "$value" == "false" ]]; then
    echo -e "${RED}✗${NC}"
  else
    echo -e "${YELLOW}?${NC}"
  fi
}

###############################################################################
# Main Health Check
###############################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  QUICK HEALTH CHECK${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Target: $BASE_URL"
echo "Time: $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Fetch health response
response_file="${TMP_ROOT}/quick-health.json"
http_code=$(fetch_health_json "${BASE_URL%/}/api/health" "$response_file")

if [[ "$http_code" != "200" ]]; then
  echo -e "${RED}✗ UNREACHABLE${NC}"
  echo ""
  echo "Health endpoint returned HTTP $http_code (expected 200)"
  echo "Service may be down or unreachable."
  echo ""
  exit 1
fi

# Parse response
overall_ok=$(get_json_bool "$response_file" "ok")
db_ok=$(get_json_bool "$response_file" "db_ok")
core_ok=$(get_json_bool "$response_file" "core_ok")
ratelimit_ok=$(get_json_bool "$response_file" '"rateLimiter":"ok' | grep -o 'true\|false' | head -1 || echo "unknown")
error=$(get_json_str "$response_file" "error" "none")

# Display status indicators
echo "Status Indicators:"
echo ""
echo "  Overall Health:      $(status_icon "$overall_ok") $overall_ok"
echo "  Database:            $(status_icon "$db_ok") $db_ok"
echo "  Core Service:        $(status_icon "$core_ok") $core_ok"
echo "  Rate Limiter (Redis): $(status_icon "$ratelimit_ok") $ratelimit_ok"
echo ""

# Service details
if [[ -f "$response_file" ]]; then
  service=$(get_json_str "$response_file" "service" "unknown")
  timestamp=$(get_json_str "$response_file" "timestamp" "unknown")

  echo "Service Details:"
  echo "  Service: $service"
  echo "  Timestamp: $timestamp"
  echo ""
fi

# Error information if present
if [[ "$error" != "none" && "$error" != "null" ]]; then
  echo -e "${YELLOW}⚠️  Error Detail: $error${NC}"
  echo ""
fi

# Final status
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [[ "$overall_ok" == "true" ]]; then
  echo -e "${GREEN}✓ HEALTHY${NC} - All systems operational"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  exit 0
else
  echo -e "${RED}✗ DEGRADED${NC} - One or more services failing"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Run './scripts/full-deployment-check.sh $BASE_URL' for detailed diagnostics"
  echo ""
  exit 1
fi
