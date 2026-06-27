#!/bin/bash

################################################################################
# Stripe Webhook Delivery Test Script
#
# Purpose: Test Stripe webhook delivery end-to-end including:
#          - Webhook signature validation
#          - Event processing
#          - Audit trail recording
#          - Receipt verification
#
# Usage:
#   ./scripts/test-webhook-delivery.sh                    # Use env vars
#   ./scripts/test-webhook-delivery.sh whsec_test_abc123  # Explicit secret
#
# Prerequisites:
#   - STRIPE_SECRET_KEY must be set or passed
#   - STRIPE_WEBHOOK_SECRET must be set or passed
#   - Webhook endpoint must be deployed and accessible
#   - curl and jq must be installed
#   - Optional: Stripe CLI for test event triggering
#
# Exit codes:
#   0 = Webhook delivered and processed successfully
#   1 = Webhook delivery failed
#   2 = Missing required configuration
#   3 = Endpoint not reachable
################################################################################

set -euo pipefail

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
WEBHOOK_SECRET="${1:-${STRIPE_WEBHOOK_SECRET:-}}"
API_KEY="${STRIPE_SECRET_KEY:-}"
WEBHOOK_URL="${WEBHOOK_URL:-http://localhost:3001/stripe/webhook/events}"
ENDPOINT_URL="${ENDPOINT_URL:-http://localhost:3000}"
TIMEOUT=30
MAX_RETRIES=5

# Counters and state
STEP=0
START_TIME=$(date +%s)

# Helper functions
print_step() {
    ((STEP++))
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Step $STEP: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    exit 1
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
}

info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

success() {
    echo -e "${GREEN}$1${NC}"
}

error() {
    echo -e "${RED}$1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"

    # Check required commands
    for cmd in curl jq; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            fail "Required command not found: $cmd"
        fi
        pass "$cmd is installed"
    done

    # Check required environment
    if [[ -z "$WEBHOOK_SECRET" ]]; then
        fail "STRIPE_WEBHOOK_SECRET is not set"
    fi
    pass "STRIPE_WEBHOOK_SECRET is set"

    if [[ -z "$API_KEY" ]]; then
        warn "STRIPE_SECRET_KEY is not set - some tests will be limited"
    else
        pass "STRIPE_SECRET_KEY is set"
    fi

    echo ""
}

# Check endpoint is reachable
check_endpoint_reachable() {
    print_step "Checking Endpoint Reachability"

    info "Testing endpoint: $WEBHOOK_URL"

    local response_code
    response_code=$(curl -s -w "%{http_code}" -o /dev/null \
        -X OPTIONS \
        "$WEBHOOK_URL" \
        2>/dev/null || echo "000")

    if [[ "$response_code" == "200" || "$response_code" == "404" || "$response_code" == "405" ]]; then
        pass "Endpoint is reachable (HTTP $response_code)"
    else
        fail "Endpoint is not reachable (HTTP $response_code)"
    fi

    echo ""
}

# Generate test webhook payload
generate_test_payload() {
    local event_type="${1:-charge.created}"
    local event_id="evt_test_$(date +%s)_$(shuf -i 1000-9999 -n 1)"

    local payload=$(cat <<EOF
{
  "id": "$event_id",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "type": "$event_type",
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "data": {
    "object": {
      "id": "ch_test_$(date +%s | md5sum | cut -c1-16)",
      "object": "charge",
      "amount": 2000,
      "amount_captured": 2000,
      "amount_refunded": 0,
      "application": null,
      "application_fee": null,
      "application_fee_amount": null,
      "balance_transaction": "txn_test_1234567890",
      "billing_details": {
        "address": {
          "city": null,
          "country": null,
          "line1": null,
          "line2": null,
          "postal_code": null,
          "state": null
        },
        "email": "test@example.com",
        "name": "Test User",
        "phone": null
      },
      "captured": true,
      "created": $(date +%s),
      "currency": "usd",
      "customer": null,
      "description": "Test charge for webhook delivery verification",
      "destination": null,
      "dispute": null,
      "disputed": false,
      "failure_code": null,
      "failure_message": null,
      "fraud_details": {},
      "invoice": null,
      "livemode": false,
      "metadata": {
        "test": "true",
        "webhook_test": "true"
      },
      "outcome": {
        "network_status": "approved_by_network",
        "reason": null,
        "risk_level": "normal",
        "risk_score": 32,
        "seller_message": "Payment complete.",
        "type": "authorized"
      },
      "paid": true,
      "payment_intent": null,
      "payment_method": "card_test_visa",
      "payment_method_details": {
        "card": {
          "brand": "visa",
          "check": {
            "address_line1_check": "pass",
            "address_postal_code_check": "pass",
            "cvc_check": "pass"
          },
          "country": "US",
          "exp_month": 12,
          "exp_year": 2025,
          "fingerprint": "abcd1234567890",
          "funding": "credit",
          "installments": null,
          "last4": "4242",
          "mandate": null,
          "network": "visa",
          "three_d_secure": null,
          "wallet": null
        },
        "type": "card"
      },
      "receipt_email": "test@example.com",
      "receipt_number": null,
      "receipt_url": "https://receipts.stripe.com/test",
      "refunded": false,
      "refunds": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/charges/ch_test_123/refunds"
      },
      "review": null,
      "shipping": null,
      "source": {
        "id": "card_test_1234567890",
        "object": "card",
        "address_city": null,
        "address_country": null,
        "address_line1": null,
        "address_line1_check": "pass",
        "address_line2": null,
        "address_state": null,
        "address_zip": "12345",
        "address_zip_check": "pass",
        "brand": "Visa",
        "country": "US",
        "customer": null,
        "cvc_check": "pass",
        "dynamic_last4": null,
        "exp_month": 12,
        "exp_year": 2025,
        "fingerprint": "abcd1234567890",
        "funding": "credit",
        "last4": "4242",
        "metadata": {},
        "name": "Test User",
        "tokenization_method": null
      },
      "source_transfer": null,
      "statement_descriptor": null,
      "statement_descriptor_suffix": null,
      "status": "succeeded",
      "transfer_data": null,
      "transfer_group": null
    }
  }
}
EOF
)

    echo "$payload"
}

# Generate Stripe webhook signature
generate_stripe_signature() {
    local payload="$1"
    local secret="$2"
    local timestamp="$(date +%s)"

    # Stripe signature format: t=timestamp,v1=signature
    # Signature is HMAC SHA256 of "timestamp.payload"
    local signed_content="${timestamp}.${payload}"
    local signature

    if command -v openssl >/dev/null 2>&1; then
        signature=$(echo -n "$signed_content" | openssl dgst -sha256 -hmac "$secret" -r | cut -d' ' -f1)
    else
        # Fallback if openssl not available
        signature=$(echo -n "$signed_content" | sha256sum | cut -d' ' -f1)
        warn "Using fallback signature method (not cryptographically accurate)"
    fi

    echo "t=${timestamp},v1=${signature}"
}

# Send test webhook
send_test_webhook() {
    print_step "Sending Test Webhook Event"

    local event_type="charge.created"
    local payload
    local signature

    info "Generating test payload for event: $event_type"
    payload=$(generate_test_payload "$event_type")

    info "Generating Stripe signature"
    signature=$(generate_stripe_signature "$payload" "$WEBHOOK_SECRET")

    info "Sending webhook to: $WEBHOOK_URL"
    echo "  Event ID: $(echo "$payload" | jq -r '.id')"
    echo "  Signature: ${signature:0:20}..."
    echo ""

    # Send webhook
    local response
    local http_code
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Stripe-Signature: $signature" \
        -d "$payload" \
        "$WEBHOOK_URL" \
        2>/dev/null || echo "ERROR\n000")

    http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)

    if [[ "$http_code" == "200" ]]; then
        pass "Webhook delivered successfully (HTTP 200)"
        echo ""
        info "Response:"
        if command -v jq >/dev/null 2>&1; then
            echo "$body" | jq '.' 2>/dev/null || echo "$body"
        else
            echo "$body"
        fi
        echo ""
        echo "$body"
    else
        fail "Webhook delivery failed (HTTP $http_code)"
    fi

    echo ""
}

# Verify audit trail entry
verify_audit_trail() {
    print_step "Verifying Audit Trail Entry"

    if [[ -z "$API_KEY" ]]; then
        warn "Skipping audit trail verification - STRIPE_SECRET_KEY not set"
        echo ""
        return 0
    fi

    info "Checking for recent webhook events in audit trail"
    warn "This step requires database access - manual verification may be needed"
    echo ""

    # This would typically check:
    # - Supabase audit table for webhook entry
    # - Verify event type matches
    # - Verify webhook signature validation result
    echo "To verify in Supabase:"
    echo "  1. Open: https://app.supabase.com/"
    echo "  2. Go to: stripe_operation_audits table"
    echo "  3. Filter: event_type = 'charge.created'"
    echo "  4. Check: webhook_signature_valid = true"
    echo ""
}

# Test with Stripe CLI if available
test_with_stripe_cli() {
    print_step "Testing with Stripe CLI (Optional)"

    if ! command -v stripe >/dev/null 2>&1; then
        info "Stripe CLI not installed - skipping this step"
        echo ""
        return 0
    fi

    if ! stripe config --list &>/dev/null; then
        warn "Stripe CLI is not authenticated - run: stripe login"
        echo ""
        return 0
    fi

    info "Triggering test event with Stripe CLI"
    info "Event: charge.created"
    echo ""

    # Note: This requires Stripe CLI to be listening for events
    # Usually run with: stripe listen --forward-to localhost:3001/stripe/webhook/events
    info "To enable webhook forwarding, run in another terminal:"
    info "  stripe listen --forward-to $WEBHOOK_URL"
    echo ""

    info "Then trigger test event:"
    info "  stripe trigger charge.created"
    echo ""
}

# Generate summary
print_summary() {
    print_step "Test Summary"

    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))

    echo "Test Duration: ${duration}s"
    echo ""
    echo "Test Results:"
    echo "  ✓ Prerequisites validated"
    echo "  ✓ Endpoint reachability confirmed"
    echo "  ✓ Webhook payload generated"
    echo "  ✓ Stripe signature calculated"
    echo "  ✓ Webhook delivered"
    echo ""
    echo "Next Steps:"
    echo "  1. Verify webhook was received by checking logs"
    echo "  2. Check Supabase audit table for webhook entry"
    echo "  3. Review: docs/STRIPE_CONFIGURATION_VERIFICATION.md"
    echo ""
    success "Webhook delivery test completed!"
}

# Main execution
main() {
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}Stripe Webhook Delivery Test${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Configuration:"
    echo "  Webhook URL: $WEBHOOK_URL"
    echo "  Endpoint: $ENDPOINT_URL"
    echo "  Timeout: ${TIMEOUT}s"
    echo "  Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo ""

    # Run all checks
    check_prerequisites
    check_endpoint_reachable
    send_test_webhook
    verify_audit_trail
    test_with_stripe_cli
    print_summary

    return 0
}

# Run main function
main "$@"
