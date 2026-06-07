#!/usr/bin/env bash
##############################################################################
# continuous-monitor.sh
#
# Continuous deployment health monitoring with uptime tracking.
# Runs health checks on a configurable interval and alerts on failures.
#
# Usage:
#   ./scripts/continuous-monitor.sh https://your-app.vercel.app          # 60s interval (default)
#   ./scripts/continuous-monitor.sh https://your-app.vercel.app 30       # 30s interval
#   ./scripts/continuous-monitor.sh https://your-app.vercel.app 10 false # quiet mode
#
# Arguments:
#   $1  Target URL (required)
#   $2  Check interval in seconds (default: 60)
#   $3  Display output for each check (default: true, set to false for quiet)
#
# Exit codes:
#   0 = Interrupted by user
#   1 = First health check failed before starting monitor
#   2 = Usage error
#
# Environment:
#   MONITOR_INTERVAL    Override check interval in seconds
#   MONITOR_MAX_CHECKS  Stop after N checks (default: continuous)
#
##############################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse arguments
BASE_URL="${1:-${BASE_URL:-}}"
INTERVAL="${2:-${MONITOR_INTERVAL:-60}}"
SHOW_OUTPUT="${3:-true}"
MAX_CHECKS="${MONITOR_MAX_CHECKS:-}"

if [[ -z "$BASE_URL" ]]; then
  cat >&2 <<'EOF'
Usage: ./scripts/continuous-monitor.sh <base-url> [interval] [show-output]

Arguments:
  <base-url>      Target deployment URL (required)
  [interval]      Check interval in seconds (default: 60)
  [show-output]   true/false to show each check output (default: true)

Examples:
  ./scripts/continuous-monitor.sh https://your-app.vercel.app
  ./scripts/continuous-monitor.sh https://your-app.vercel.app 30
  ./scripts/continuous-monitor.sh https://your-app.vercel.app 10 false

Environment:
  MONITOR_INTERVAL    Override check interval
  MONITOR_MAX_CHECKS  Stop after N checks (default: continuous until Ctrl+C)
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
# State tracking
###############################################################################

total_checks=0
passed_checks=0
failed_checks=0
current_downtime_start=""
last_status="unknown"

start_time=$(date +%s)

###############################################################################
# Helper Functions
###############################################################################

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

fetch_health() {
  local url="$1"
  local output_file="$2"

  curl --noproxy '*' --proxy '' \
    -s -f -o "$output_file" \
    --max-time 8 \
    "$url" 2>/dev/null && echo "200" || echo "000"
}

format_duration() {
  local seconds=$1
  local hours=$((seconds / 3600))
  local minutes=$(((seconds % 3600) / 60))
  local secs=$((seconds % 60))

  if [[ $hours -gt 0 ]]; then
    printf "%dh %dm %ds\n" $hours $minutes $secs
  elif [[ $minutes -gt 0 ]]; then
    printf "%dm %ds\n" $minutes $secs
  else
    printf "%ds\n" $secs
  fi
}

calculate_uptime_percent() {
  if [[ $total_checks -eq 0 ]]; then
    echo "0%"
    return
  fi
  local percent=$((passed_checks * 100 / total_checks))
  echo "${percent}%"
}

display_status_line() {
  local check_num=$1
  local status=$2
  local error=$3
  local timestamp=$4

  if [[ "$status" == "UP" ]]; then
    echo -e "${GREEN}✓${NC} [Check $check_num] $timestamp - ${GREEN}UP${NC} - All systems healthy"
  else
    echo -e "${RED}✗${NC} [Check $check_num] $timestamp - ${RED}DOWN${NC} - Error: $error"
  fi
}

display_summary() {
  local current_time=$(date +%s)
  local elapsed=$((current_time - start_time))
  local uptime_percent=$(calculate_uptime_percent)

  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  MONITOR SUMMARY${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Target: $BASE_URL"
  echo "Checks: $total_checks total (interval: ${INTERVAL}s)"
  echo "Results: $passed_checks UP, $failed_checks DOWN"
  echo "Uptime: $uptime_percent"
  echo "Elapsed: $(format_duration $elapsed)"
  echo ""
}

# Setup signal handlers
cleanup() {
  echo ""
  echo -e "${YELLOW}Monitoring interrupted${NC}"
  display_summary
  exit 0
}

trap cleanup SIGINT SIGTERM

###############################################################################
# Initial Health Check
###############################################################################

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  CONTINUOUS DEPLOYMENT MONITOR${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Target: $BASE_URL"
echo "Interval: ${INTERVAL}s"
echo "Started: $(date)"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Pre-flight check
echo "Performing initial health check..."
response_file="${TMP_ROOT}/monitor-preflight.json"
http_code=$(fetch_health "${BASE_URL%/}/api/health" "$response_file")

if [[ "$http_code" != "200" ]]; then
  echo -e "${RED}✗ Initial health check failed${NC}"
  echo "Service is unreachable at $BASE_URL"
  echo "HTTP response: $http_code"
  exit 1
fi

echo -e "${GREEN}✓ Service is reachable${NC}"
echo ""
echo "Starting continuous monitoring..."
echo ""

###############################################################################
# Continuous Monitoring Loop
###############################################################################

check_count=0

while true; do
  ((check_count++))
  ((total_checks++))

  # Stop if max checks reached
  if [[ -n "$MAX_CHECKS" && $check_count -gt $MAX_CHECKS ]]; then
    display_summary
    exit 0
  fi

  # Current timestamp
  current_timestamp=$(date '+%Y-%m-%d %H:%M:%S')

  # Perform health check
  response_file="${TMP_ROOT}/monitor-check-${check_count}.json"
  http_code=$(fetch_health "${BASE_URL%/}/api/health" "$response_file")

  if [[ "$http_code" == "200" ]]; then
    # Parse response
    overall_ok=$(get_json_bool "$response_file" "ok")

    if [[ "$overall_ok" == "true" ]]; then
      status="UP"
      ((passed_checks++))

      if [[ "$last_status" == "DOWN" && -n "$current_downtime_start" ]]; then
        downtime_end=$(date +%s)
        downtime_duration=$((downtime_end - current_downtime_start))
        echo -e "${GREEN}✓ SERVICE RECOVERED${NC} - Downtime was $(format_duration $downtime_duration)"
        current_downtime_start=""
      fi

      if [[ "$SHOW_OUTPUT" != "false" ]]; then
        display_status_line "$check_count" "$status" "" "$current_timestamp"
      fi

      last_status="UP"
    else
      status="DOWN"
      ((failed_checks++))

      if [[ "$last_status" != "DOWN" ]]; then
        current_downtime_start=$(date +%s)
      fi

      error=$(get_json_bool "$response_file" "error")
      if [[ "$SHOW_OUTPUT" != "false" ]]; then
        display_status_line "$check_count" "$status" "$error" "$current_timestamp"
      else
        echo -e "${RED}✗${NC} [Check $check_count] $current_timestamp - Service degraded"
      fi

      last_status="DOWN"
    fi
  else
    # Network error
    status="DOWN"
    ((failed_checks++))

    if [[ "$last_status" != "DOWN" ]]; then
      current_downtime_start=$(date +%s)
    fi

    if [[ "$SHOW_OUTPUT" != "false" ]]; then
      display_status_line "$check_count" "$status" "HTTP $http_code" "$current_timestamp"
    else
      echo -e "${RED}✗${NC} [Check $check_count] $current_timestamp - Connection failed"
    fi

    last_status="DOWN"
  fi

  # Show compact summary every 10 checks if output is suppressed
  if [[ "$SHOW_OUTPUT" == "false" && $((check_count % 10)) -eq 0 ]]; then
    uptime=$(calculate_uptime_percent)
    elapsed=$(($(date +%s) - start_time))
    echo -e "${CYAN}[Status]${NC} $check_count checks, uptime: $uptime, elapsed: $(format_duration $elapsed)"
  fi

  # Wait before next check
  sleep "$INTERVAL"
done
