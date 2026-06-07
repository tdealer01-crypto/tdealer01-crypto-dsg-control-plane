#!/bin/bash

##############################################################################
# Stripe Webhook Receipt Verification
#
# Verifies that a Stripe webhook was received and processed correctly.
# Checks Supabase audit trail for the corresponding entry and validates
# signature verification and decision processing.
#
# Usage:
#   ./scripts/verify-webhook-received.sh [OPTIONS]
#
# Required environment variables:
#   SUPABASE_URL        - Supabase project URL
#   SUPABASE_ANON_KEY   - Supabase anon key (or service role key)
#
# Optional environment variables:
#   DB_CHECK_TIMEOUT    - How long to wait for webhook in audit (default: 30)
#
# Usage Examples:
#   # Check for webhook from last 5 minutes
#   ./scripts/verify-webhook-received.sh --minutes 5
#
#   # Check for specific event ID
#   ./scripts/verify-webhook-received.sh --event-id evt_1234567890
#
#   # Check with verbose output
#   ./scripts/verify-webhook-received.sh --verbose
#
#   # Poll until webhook appears (with timeout)
#   ./scripts/verify-webhook-received.sh --wait
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}"
MINUTES_BACK="${MINUTES_BACK:-5}"
EVENT_ID="${EVENT_ID:-}"
STRIPE_ACCOUNT_ID="${STRIPE_ACCOUNT_ID:-}"
WAIT_FOR_WEBHOOK=false
VERBOSE=false
TIMEOUT="${DB_CHECK_TIMEOUT:-30}"
CHECK_INTERVAL=2

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_debug() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "${MAGENTA}[DEBUG]${NC} $1"
  fi
}

# Load environment if .env exists
load_env() {
  if [[ -f .env.local ]]; then
    log_debug "Loading environment from .env.local"
    set -a
    source .env.local
    set +a
  elif [[ -f .env ]]; then
    log_debug "Loading environment from .env"
    set -a
    source .env
    set +a
  fi
}

# Validate required environment
validate_env() {
  if [[ -z "$SUPABASE_URL" ]]; then
    log_error "SUPABASE_URL is not set"
    return 1
  fi

  if [[ -z "$SUPABASE_ANON_KEY" ]]; then
    log_error "SUPABASE_ANON_KEY is not set"
    return 1
  fi

  return 0
}

# Query Supabase for recent webhook events
query_webhook_events() {
  local table="$1"
  local minutes_back="$2"
  local filter="${3:-}"

  local timestamp=$(date -u -d "$minutes_back minutes ago" +"%Y-%m-%dT%H:%M:%S" 2>/dev/null || date -u -v-${minutes_back}M +"%Y-%m-%dT%H:%M:%S")

  log_debug "Querying $table for events after $timestamp"

  local query="select=*&created_at=gt.$timestamp"

  if [[ -n "$filter" ]]; then
    query="${query}&${filter}"
  fi

  # URL encode the query
  local encoded_query=$(echo "$query" | sed 's/ /%20/g' | sed 's/=/%3D/g' | sed 's/\./%2E/g' | sed 's/>/%3E/g' | sed 's/</%3C/g' | sed 's/&/%26/g')

  log_debug "Query parameters: $query"

  # Use curl to query Supabase REST API
  curl -s -X GET \
    -H "apikey: $SUPABASE_ANON_KEY" \
    -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
    -H "Content-Type: application/json" \
    "$SUPABASE_URL/rest/v1/$table?$query&order=created_at.desc" 2>/dev/null || echo "[]"
}

# Check if jq is available for JSON parsing
check_jq() {
  if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. JSON parsing will be limited."
    return 1
  fi
  return 0
}

# Parse and display webhook event
display_webhook_event() {
  local event_json="$1"

  if ! check_jq; then
    echo "$event_json"
    return
  fi

  log_success "Found webhook event:"
  echo ""
  echo "  Event ID: $(echo "$event_json" | jq -r '.stripe_event_id // "N/A"')"
  echo "  Object Type: $(echo "$event_json" | jq -r '.object_type // "N/A"')"
  echo "  Object ID: $(echo "$event_json" | jq -r '.object_id // "N/A"')"
  echo "  Status: $(echo "$event_json" | jq -r '.decision // "N/A"')"
  echo "  Amount: $(echo "$event_json" | jq -r '.amount_cents // "N/A"') cents"
  echo "  Currency: $(echo "$event_json" | jq -r '.currency // "N/A"')"
  echo "  Account ID: $(echo "$event_json" | jq -r '.stripe_account_id // "N/A"')"
  echo "  Created At: $(echo "$event_json" | jq -r '.created_at // "N/A"')"

  # Check for decision-specific fields
  local decision=$(echo "$event_json" | jq -r '.decision // "N/A"')
  if [[ "$decision" != "N/A" ]]; then
    echo "  Decision: $decision"
  fi

  # Check for signature validation result
  if echo "$event_json" | jq -e '.signature_valid // false' > /dev/null 2>&1; then
    if [[ "$(echo "$event_json" | jq -r '.signature_valid')" == "true" ]]; then
      log_success "HMAC signature validation: PASSED"
    else
      log_error "HMAC signature validation: FAILED"
    fi
  fi

  echo ""
}

# Wait for webhook to appear in audit trail
wait_for_webhook() {
  local event_id="$1"
  local timeout="$2"
  local elapsed=0

  log_info "Waiting for webhook to appear in audit trail (timeout: ${timeout}s)..."

  while [[ $elapsed -lt $timeout ]]; do
    if [[ -n "$event_id" ]]; then
      local result=$(query_webhook_events "stripe_operation_audits" 0 "stripe_event_id=eq.$event_id")
    else
      local result=$(query_webhook_events "stripe_operation_audits" 1)
    fi

    if check_jq; then
      local count=$(echo "$result" | jq 'length')
      if [[ "$count" -gt 0 ]]; then
        return 0
      fi
    fi

    elapsed=$((elapsed + CHECK_INTERVAL))
    echo -ne "\r  Elapsed: ${elapsed}s..."
    sleep "$CHECK_INTERVAL"
  done

  echo ""
  return 1
}

# Print usage
usage() {
  cat <<EOF
Stripe Webhook Receipt Verification

Verifies that Stripe webhooks were received and processed correctly
by checking the Supabase audit trail.

Usage:
  $0 [OPTIONS]

Required Environment:
  SUPABASE_URL          Supabase project URL (https://xxxxx.supabase.co)
  SUPABASE_ANON_KEY     Supabase anonymous key

Optional Arguments:
  --minutes <N>         Check last N minutes (default: 5)
  --event-id <id>       Check specific event ID (evt_xxx)
  --account-id <id>     Filter by Stripe account ID
  --wait                Wait for webhook to appear (polls with timeout)
  --timeout <seconds>   Timeout for --wait (default: 30)
  --verbose             Enable verbose debug output
  --help                Show this help message

Environment Variables:
  SUPABASE_URL          Supabase project URL
  SUPABASE_ANON_KEY     Supabase API key
  DB_CHECK_TIMEOUT      Timeout for --wait in seconds (default: 30)

Examples:
  # Check for webhooks from last 5 minutes
  $0 --minutes 5

  # Check for specific event ID
  $0 --event-id evt_1234567890abcdef

  # Wait for webhook with 60s timeout
  $0 --wait --timeout 60

  # Check with verbose output
  $0 --minutes 10 --verbose

  # Filter by account ID
  $0 --minutes 5 --account-id acct_1234567890123456 --verbose

EOF
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --minutes)
      MINUTES_BACK="$2"
      shift 2
      ;;
    --event-id)
      EVENT_ID="$2"
      shift 2
      ;;
    --account-id)
      STRIPE_ACCOUNT_ID="$2"
      shift 2
      ;;
    --wait)
      WAIT_FOR_WEBHOOK=true
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --help|-h)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
done

# Main execution
log_info "Stripe Webhook Receipt Verification"

# Load environment
load_env

# Validate environment
if ! validate_env; then
  log_error "Environment validation failed"
  exit 1
fi

log_debug "Supabase URL: $SUPABASE_URL"
log_debug "Checking webhooks from last $MINUTES_BACK minute(s)"

if [[ -n "$EVENT_ID" ]]; then
  log_debug "Filtering by event ID: $EVENT_ID"
fi

if [[ -n "$STRIPE_ACCOUNT_ID" ]]; then
  log_debug "Filtering by account ID: $STRIPE_ACCOUNT_ID"
fi

# Wait for webhook if requested
if [[ "$WAIT_FOR_WEBHOOK" == "true" ]]; then
  if ! wait_for_webhook "$EVENT_ID" "$TIMEOUT"; then
    log_error "Webhook not found after ${TIMEOUT} seconds"
    exit 1
  fi
  log_success "Webhook found in audit trail!"
fi

# Build filter query
FILTER=""
if [[ -n "$EVENT_ID" ]]; then
  FILTER="stripe_event_id=eq.$EVENT_ID"
fi

if [[ -n "$STRIPE_ACCOUNT_ID" ]]; then
  if [[ -n "$FILTER" ]]; then
    FILTER="${FILTER}&stripe_account_id=eq.$STRIPE_ACCOUNT_ID"
  else
    FILTER="stripe_account_id=eq.$STRIPE_ACCOUNT_ID"
  fi
fi

# Query webhook events
RESULT=$(query_webhook_events "stripe_operation_audits" "$MINUTES_BACK" "$FILTER")

# Parse result
if check_jq; then
  COUNT=$(echo "$RESULT" | jq 'length')
else
  COUNT=$(echo "$RESULT" | grep -c "stripe_event_id" || echo "0")
fi

log_debug "Found $COUNT webhook event(s)"

if [[ "$COUNT" -eq 0 ]]; then
  log_error "No webhook events found in the last $MINUTES_BACK minute(s)"
  if [[ "$WAIT_FOR_WEBHOOK" != "true" ]]; then
    log_warning "Tip: Use --wait flag to poll until webhook appears"
  fi
  exit 1
fi

# Display results
if check_jq; then
  echo "$RESULT" | jq -r '.[] | @json' | while read -r event; do
    # Remove JSON quotes
    event=$(echo "$event" | sed 's/^"//;s/"$//')
    display_webhook_event "$(echo "$event" | sed 's/\\"/"/g')"
  done
else
  log_warning "Cannot parse JSON results. Raw output:"
  echo "$RESULT"
fi

log_success "Verification complete. Found $COUNT event(s)."
exit 0
