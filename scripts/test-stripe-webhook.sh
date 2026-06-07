#!/bin/bash

###############################################################################
# Stripe Webhook Testing Script
#
# This script helps test Stripe webhook signature verification by:
# 1. Simulating Stripe's webhook signature computation
# 2. Sending a test webhook with proper HMAC-SHA256 signature
# 3. Validating the webhook endpoint response
#
# Usage:
#   bash scripts/test-stripe-webhook.sh [OPTIONS]
#
# Examples:
#   # Test with Stripe CLI locally
#   stripe trigger charge.created
#
#   # Send a test webhook directly (requires signing secret)
#   bash scripts/test-stripe-webhook.sh \
#     --url https://example.com/api/stripe/webhook/events \
#     --secret whsec_test_xxx \
#     --event charge.created
#
#   # Use stored secret from env variable
#   export STRIPE_WEBHOOK_SECRET=whsec_test_xxx
#   bash scripts/test-stripe-webhook.sh \
#     --url https://localhost:3000/api/stripe/webhook/events \
#     --event charge.created
#
#   # Dry run: show signature but don't send
#   bash scripts/test-stripe-webhook.sh \
#     --url https://example.com/api/stripe/webhook/events \
#     --secret whsec_test_xxx \
#     --event charge.created \
#     --dry-run
#
# Environment Variables:
#   STRIPE_WEBHOOK_SECRET - webhook signing secret (whsec_...)
#   DRY_RUN - if set to "true", show but don't send webhook
#
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
URL=""
SECRET=""
EVENT="charge.created"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE=false
TIMEOUT=10

# Function to print help
print_help() {
  cat << 'EOF'
Stripe Webhook Testing Script

USAGE:
  bash scripts/test-stripe-webhook.sh [OPTIONS]

OPTIONS:
  --url URL              Webhook endpoint URL (required)
  --secret SECRET        Stripe webhook signing secret (required unless in env)
  --event EVENT          Event type to send (default: charge.created)
  --dry-run              Show signature but don't send webhook
  --verbose              Print detailed debugging info
  --timeout SECONDS      Request timeout (default: 10)
  --help                 Show this help message

ENVIRONMENT VARIABLES:
  STRIPE_WEBHOOK_SECRET  Webhook signing secret (can be used instead of --secret)
  DRY_RUN               If "true", enable dry-run mode

SUPPORTED EVENTS:
  charge.created
  charge.updated
  payout.created
  payout.updated
  refund.created
  customer.subscription.created
  customer.subscription.updated
  customer.subscription.deleted
  checkout.session.completed

EXAMPLES:
  # Test with explicit secret
  bash scripts/test-stripe-webhook.sh \
    --url https://example.com/api/stripe/webhook/events \
    --secret whsec_test_xxx \
    --event charge.created

  # Use secret from environment variable
  export STRIPE_WEBHOOK_SECRET=whsec_test_xxx
  bash scripts/test-stripe-webhook.sh \
    --url https://example.com/api/stripe/webhook/events \
    --event customer.subscription.updated

  # Dry run: show signature computation
  bash scripts/test-stripe-webhook.sh \
    --url https://example.com/api/stripe/webhook/events \
    --secret whsec_test_xxx \
    --dry-run

  # Test local development server
  bash scripts/test-stripe-webhook.sh \
    --url http://localhost:3000/api/stripe/webhook/events \
    --secret whsec_test_local \
    --event charge.created \
    --verbose
EOF
}

# Function to print colored output
log_info() {
  echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

log_verbose() {
  if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}[DEBUG]${NC} $*"
  fi
}

# Validate inputs
validate_inputs() {
  if [ -z "$URL" ]; then
    log_error "Webhook URL is required (use --url or check documentation)"
    print_help
    exit 1
  fi

  if [ -z "$SECRET" ]; then
    # Try to get from environment variable
    SECRET="${STRIPE_WEBHOOK_SECRET:-}"
    if [ -z "$SECRET" ]; then
      log_error "Webhook signing secret is required"
      log_error "Provide with --secret or set STRIPE_WEBHOOK_SECRET environment variable"
      exit 1
    fi
  fi

  # Validate secret format
  if [[ ! "$SECRET" =~ ^whsec_ ]]; then
    log_warn "Secret does not start with 'whsec_' (expected format for Stripe)"
    log_warn "Make sure you're using the webhook signing secret, not the API key"
  fi

  # Validate URL format
  if [[ ! "$URL" =~ ^https?:// ]]; then
    log_error "URL must start with http:// or https://"
    exit 1
  fi
}

# Get event payload based on event type
get_event_payload() {
  local event_type="$1"
  local event_id="evt_test_$(date +%s%N | md5sum | head -c 12)"

  case "$event_type" in
    charge.created)
      cat << EOF
{
  "id": "$event_id",
  "type": "charge.created",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "ch_test_$(date +%s%N | md5sum | head -c 12)",
      "amount": 1000,
      "currency": "usd",
      "status": "succeeded",
      "customer": "cus_test_$(date +%s%N | md5sum | head -c 12)",
      "description": "Test charge from test script",
      "source": {
        "id": "card_test_$(date +%s%N | md5sum | head -c 12)",
        "object": "card",
        "brand": "visa",
        "last4": "4242"
      }
    }
  }
}
EOF
      ;;
    charge.updated)
      cat << EOF
{
  "id": "$event_id",
  "type": "charge.updated",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "ch_test_$(date +%s%N | md5sum | head -c 12)",
      "amount": 1000,
      "currency": "usd",
      "status": "succeeded"
    },
    "previous_attributes": {
      "status": "pending"
    }
  }
}
EOF
      ;;
    payout.created)
      cat << EOF
{
  "id": "$event_id",
  "type": "payout.created",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "po_test_$(date +%s%N | md5sum | head -c 12)",
      "amount": 50000,
      "currency": "usd",
      "status": "pending",
      "type": "bank_account"
    }
  }
}
EOF
      ;;
    payout.updated)
      cat << EOF
{
  "id": "$event_id",
  "type": "payout.updated",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "po_test_$(date +%s%N | md5sum | head -c 12)",
      "amount": 50000,
      "currency": "usd",
      "status": "succeeded"
    },
    "previous_attributes": {
      "status": "pending"
    }
  }
}
EOF
      ;;
    refund.created)
      cat << EOF
{
  "id": "$event_id",
  "type": "refund.created",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "re_test_$(date +%s%N | md5sum | head -c 12)",
      "amount": 500,
      "currency": "usd",
      "charge": "ch_test_$(date +%s%N | md5sum | head -c 12)",
      "status": "succeeded"
    }
  }
}
EOF
      ;;
    customer.subscription.created)
      cat << EOF
{
  "id": "$event_id",
  "type": "customer.subscription.created",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "sub_test_$(date +%s%N | md5sum | head -c 12)",
      "customer": "cus_test_$(date +%s%N | md5sum | head -c 12)",
      "status": "active",
      "current_period_start": $(date +%s),
      "current_period_end": $(($(date +%s) + 2592000))
    }
  }
}
EOF
      ;;
    customer.subscription.updated)
      cat << EOF
{
  "id": "$event_id",
  "type": "customer.subscription.updated",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "sub_test_$(date +%s%N | md5sum | head -c 12)",
      "customer": "cus_test_$(date +%s%N | md5sum | head -c 12)",
      "status": "active",
      "current_period_start": $(date +%s),
      "current_period_end": $(($(date +%s) + 2592000))
    },
    "previous_attributes": {
      "status": "trialing"
    }
  }
}
EOF
      ;;
    customer.subscription.deleted)
      cat << EOF
{
  "id": "$event_id",
  "type": "customer.subscription.deleted",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "sub_test_$(date +%s%N | md5sum | head -c 12)",
      "customer": "cus_test_$(date +%s%N | md5sum | head -c 12)",
      "status": "canceled"
    }
  }
}
EOF
      ;;
    checkout.session.completed)
      cat << EOF
{
  "id": "$event_id",
  "type": "checkout.session.completed",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "cs_test_$(date +%s%N | md5sum | head -c 12)",
      "customer": "cus_test_$(date +%s%N | md5sum | head -c 12)",
      "payment_status": "paid",
      "subscription": "sub_test_$(date +%s%N | md5sum | head -c 12)"
    }
  }
}
EOF
      ;;
    *)
      log_error "Unknown event type: $event_type"
      echo "Supported events: charge.created, charge.updated, payout.created, payout.updated,"
      echo "  refund.created, customer.subscription.created, customer.subscription.updated,"
      echo "  customer.subscription.deleted, checkout.session.completed"
      exit 1
      ;;
  esac
}

# Compute HMAC-SHA256 signature
compute_signature() {
  local secret="$1"
  local timestamp="$2"
  local body="$3"

  # Construct signed content
  local signed_content="${timestamp}.${body}"

  # Compute HMAC-SHA256
  local signature
  signature=$(echo -n "$signed_content" | openssl dgst -sha256 -mac HMAC -macopt "key=${secret}" | sed 's/^.* //')

  echo "$signature"
}

# Send webhook
send_webhook() {
  local url="$1"
  local body="$2"
  local timestamp="$3"
  local signature="$4"

  local sig_header="t=${timestamp},v1=${signature}"

  log_info "Sending webhook..."
  log_verbose "URL: $url"
  log_verbose "Signature header: $sig_header"
  log_verbose "Body length: ${#body} bytes"

  # Send the webhook
  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" \
    --max-time "$TIMEOUT" \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    -H "stripe-signature: $sig_header" \
    -d "$body")

  http_code=$(echo "$response" | tail -n1)
  local body_response=$(echo "$response" | head -n-1)

  echo "$http_code"
  echo "$body_response"
}

# Validate response
validate_response() {
  local http_code="$1"
  local body="$2"

  log_verbose "HTTP Code: $http_code"
  log_verbose "Response Body: $body"

  case "$http_code" in
    200)
      log_success "Webhook accepted (HTTP 200)"
      return 0
      ;;
    400)
      log_error "Webhook rejected: Invalid signature or format (HTTP 400)"
      log_error "Response: $body"
      return 1
      ;;
    401)
      log_error "Webhook rejected: Unauthorized (HTTP 401)"
      return 1
      ;;
    404)
      log_error "Webhook endpoint not found (HTTP 404)"
      log_error "Check that the URL is correct"
      return 1
      ;;
    408|504)
      log_error "Webhook request timed out (HTTP $http_code)"
      log_error "Endpoint took too long to respond"
      return 1
      ;;
    500|502|503)
      log_error "Server error (HTTP $http_code)"
      log_error "Server may have failed to process the webhook"
      return 1
      ;;
    *)
      log_warn "Unexpected response code: $http_code"
      log_verbose "Response: $body"
      return 0
      ;;
  esac
}

# Parse command-line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --url)
      URL="$2"
      shift 2
      ;;
    --secret)
      SECRET="$2"
      shift 2
      ;;
    --event)
      EVENT="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --timeout)
      TIMEOUT="$2"
      shift 2
      ;;
    --help)
      print_help
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      print_help
      exit 1
      ;;
  esac
done

# Main execution
main() {
  log_info "Stripe Webhook Testing Script"
  log_info "=============================="

  # Validate inputs
  validate_inputs

  log_info "Configuration:"
  log_info "  URL: $URL"
  log_info "  Event Type: $EVENT"
  log_info "  Secret: ${SECRET:0:10}...${SECRET: -4}"
  log_info "  Dry Run: $DRY_RUN"
  echo ""

  # Get event payload
  log_info "Generating event payload for: $EVENT"
  local payload
  payload=$(get_event_payload "$EVENT")
  log_success "Event payload generated"
  log_verbose "Payload: $payload"
  echo ""

  # Get current timestamp
  local timestamp
  timestamp=$(date +%s)
  log_verbose "Timestamp: $timestamp"

  # Compute signature
  log_info "Computing HMAC-SHA256 signature..."
  local signature
  signature=$(compute_signature "$SECRET" "$timestamp" "$payload")
  log_success "Signature computed"
  log_verbose "Signature: $signature"
  echo ""

  # Show signature info
  echo -e "${BLUE}=== Signature Information ===${NC}"
  echo "Timestamp: $timestamp"
  echo "Signature: $signature"
  echo "Header:    t=${timestamp},v1=${signature}"
  echo ""

  # If dry run, exit here
  if [ "$DRY_RUN" = true ]; then
    log_success "Dry run complete. Signature would be sent with the webhook."
    exit 0
  fi

  # Send webhook
  echo -e "${BLUE}=== Sending Webhook ===${NC}"
  local http_code
  local response_body
  read -r http_code response_body < <(send_webhook "$URL" "$payload" "$timestamp" "$signature")

  echo ""
  echo -e "${BLUE}=== Response ===${NC}"
  echo "HTTP Code: $http_code"
  if [ -n "$response_body" ]; then
    echo "Response Body:"
    echo "$response_body" | jq . 2>/dev/null || echo "$response_body"
  fi
  echo ""

  # Validate response
  if validate_response "$http_code" "$response_body"; then
    log_success "Webhook test completed successfully!"
    exit 0
  else
    log_error "Webhook test failed. See errors above."
    exit 1
  fi
}

# Run main function
main "$@"
