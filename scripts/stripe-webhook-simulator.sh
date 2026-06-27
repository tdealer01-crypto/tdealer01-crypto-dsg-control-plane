#!/bin/bash

##############################################################################
# Stripe Webhook Simulator
#
# Simulates Stripe webhook events with valid HMAC-SHA256 signatures.
# Supports all major event types and sends them to a target webhook endpoint.
#
# Usage:
#   ./scripts/stripe-webhook-simulator.sh \
#     --event charge.created \
#     --url https://your-app.vercel.app/api/stripe/webhook \
#     --secret whsec_live_xxxxx \
#     [--dry-run] [--verbose]
#
# Supported events:
#   - charge.created
#   - charge.updated
#   - payout.created
#   - payout.updated
#   - refund.created
#   - payment_intent.created
#   - payment_intent.processing
#   - checkout.session.completed
#   - customer.subscription.updated
#   - customer.subscription.deleted
#
# Requirements:
#   - curl (for HTTP requests)
#   - openssl (for HMAC-SHA256 signature generation)
#   - jq (optional, for JSON formatting)
##############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EVENT_TYPE=""
WEBHOOK_URL=""
WEBHOOK_SECRET=""
DRY_RUN=false
VERBOSE=false
STRIPE_ACCOUNT_ID="acct_1234567890123456"

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
    echo -e "${BLUE}[DEBUG]${NC} $1"
  fi
}

# Generate random IDs matching Stripe formats
generate_charge_id() {
  echo "ch_$(openssl rand -hex 12)"
}

generate_event_id() {
  echo "evt_$(openssl rand -hex 8)"
}

generate_customer_id() {
  echo "cus_$(openssl rand -hex 8)"
}

generate_payout_id() {
  echo "po_$(openssl rand -hex 12)"
}

generate_refund_id() {
  echo "re_$(openssl rand -hex 12)"
}

generate_payment_intent_id() {
  echo "pi_$(openssl rand -hex 12)"
}

generate_session_id() {
  echo "cs_$(openssl rand -hex 12)"
}

generate_subscription_id() {
  echo "sub_$(openssl rand -hex 12)"
}

# Generate Stripe webhook signature
# Stripe signature format: t=<timestamp>,v1=<signature>
generate_signature() {
  local payload="$1"
  local secret="$2"

  local timestamp=$(date +%s)
  local signed_content="${timestamp}.${payload}"

  # Generate HMAC-SHA256 signature
  local signature=$(echo -n "$signed_content" | openssl dgst -sha256 -hmac "$secret" -hex | cut -d' ' -f2)

  echo "${timestamp}:${signature}"
}

# Generate charge.created event
generate_charge_created() {
  local charge_id="$1"
  local amount="${2:-5000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$charge_id",
      "object": "charge",
      "amount": $amount,
      "amount_captured": $amount,
      "amount_refunded": 0,
      "application_fee": null,
      "balance_transaction": "txn_$(openssl rand -hex 8)",
      "billing_details": null,
      "captured": true,
      "created": $(date +%s),
      "currency": "$currency",
      "customer": "$(generate_customer_id)",
      "description": "Test charge from webhook simulator",
      "destination": null,
      "dispute": null,
      "disputed": false,
      "failure_code": null,
      "failure_message": null,
      "fraud_details": null,
      "livemode": false,
      "metadata": {
        "order_id": "order_$(openssl rand -hex 4)",
        "source": "webhook-simulator"
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
      "payment_method": "card_$(openssl rand -hex 8)",
      "receipt_email": null,
      "receipt_number": null,
      "receipt_url": "https://receipts.stripe.com/test",
      "refunded": false,
      "refunds": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/charges/$charge_id/refunds"
      },
      "review": null,
      "shipping": null,
      "source": {
        "id": "card_$(openssl rand -hex 8)",
        "object": "card",
        "brand": "Visa",
        "country": "US",
        "customer": "$(generate_customer_id)",
        "exp_month": 12,
        "exp_year": $(date +%Y | awk '{print $1 + 2}'),
        "fingerprint": "$(openssl rand -hex 8)",
        "funding": "credit",
        "last4": "4242"
      },
      "source_transfer": null,
      "statement_descriptor": null,
      "status": "succeeded",
      "transfer_data": null,
      "transfer_group": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": "$(uuidgen 2>/dev/null || echo 'sim-' $(openssl rand -hex 12))"
  },
  "type": "charge.created"
}
EOF
}

# Generate charge.updated event
generate_charge_updated() {
  local charge_id="$1"
  local amount="${2:-5000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$charge_id",
      "object": "charge",
      "amount": $amount,
      "amount_captured": $amount,
      "amount_refunded": 0,
      "captured": true,
      "created": $(($(date +%s) - 300)),
      "currency": "$currency",
      "customer": "$(generate_customer_id)",
      "description": "Test charge updated",
      "paid": true,
      "refunded": false,
      "status": "succeeded"
    },
    "previous_attributes": {
      "description": "Test charge"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_$(openssl rand -hex 8)",
    "idempotency_key": null
  },
  "type": "charge.updated"
}
EOF
}

# Generate payout.created event
generate_payout_created() {
  local payout_id="$1"
  local amount="${2:-100000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$payout_id",
      "object": "payout",
      "amount": $amount,
      "arrival_date": $(($(date +%s) + 86400)),
      "automatic": true,
      "balance_transaction": "txn_$(openssl rand -hex 8)",
      "created": $(date +%s),
      "currency": "$currency",
      "description": "STRIPE PAYOUT",
      "destination": "ba_$(openssl rand -hex 12)",
      "failure_balance_transaction": null,
      "failure_code": null,
      "failure_message": null,
      "livemode": false,
      "method": "standard",
      "original_payout": null,
      "reversed_by": null,
      "source_type": "card",
      "statement_descriptor": null,
      "status": "pending",
      "type": "bank_account"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "payout.created"
}
EOF
}

# Generate payout.updated event
generate_payout_updated() {
  local payout_id="$1"
  local amount="${2:-100000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$payout_id",
      "object": "payout",
      "amount": $amount,
      "arrival_date": $(date +%s),
      "automatic": true,
      "created": $(($(date +%s) - 300)),
      "currency": "$currency",
      "livemode": false,
      "status": "paid",
      "type": "bank_account"
    },
    "previous_attributes": {
      "status": "pending"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_$(openssl rand -hex 8)",
    "idempotency_key": null
  },
  "type": "payout.updated"
}
EOF
}

# Generate refund.created event
generate_refund_created() {
  local refund_id="$1"
  local charge_id="$2"
  local amount="${3:-5000}"
  local currency="${4:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$refund_id",
      "object": "refund",
      "amount": $amount,
      "balance_transaction": "txn_$(openssl rand -hex 8)",
      "charge": "$charge_id",
      "created": $(date +%s),
      "currency": "$currency",
      "description": "Refund from webhook simulator",
      "failure_balance_transaction": null,
      "failure_reason": null,
      "metadata": {
        "reason": "test",
        "simulator": "true"
      },
      "payment_intent": null,
      "reason": "requested_by_customer",
      "receipt_number": null,
      "source_transfer_reversal": null,
      "status": "succeeded",
      "transfer_reversal": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "refund.created"
}
EOF
}

# Generate payment_intent.created event
generate_payment_intent_created() {
  local pi_id="$1"
  local amount="${2:-5000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$pi_id",
      "object": "payment_intent",
      "amount": $amount,
      "amount_capturable": 0,
      "amount_details": {
        "tip": 0
      },
      "amount_received": 0,
      "application": null,
      "application_fee_amount": null,
      "canceled_at": null,
      "cancellation_reason": null,
      "capture_method": "automatic",
      "charges": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0,
        "url": "/v1/charges?payment_intent=$pi_id"
      },
      "client_secret": "pi_secret_$(openssl rand -hex 16)",
      "confirmation_method": "automatic",
      "created": $(date +%s),
      "currency": "$currency",
      "customer": "$(generate_customer_id)",
      "description": "Test payment intent from webhook simulator",
      "last_payment_error": null,
      "livemode": false,
      "metadata": {
        "order_id": "order_$(openssl rand -hex 4)"
      },
      "next_action": null,
      "on_behalf_of": null,
      "payment_method": null,
      "payment_method_options": {},
      "payment_method_types": ["card"],
      "processing": null,
      "quote": null,
      "receipt_email": null,
      "review": null,
      "setup_future_usage": null,
      "shipping": null,
      "statement_descriptor": null,
      "status": "requires_payment_method",
      "transfer_data": null,
      "transfer_group": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "payment_intent.created"
}
EOF
}

# Generate payment_intent.processing event
generate_payment_intent_processing() {
  local pi_id="$1"
  local amount="${2:-5000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$pi_id",
      "object": "payment_intent",
      "amount": $amount,
      "currency": "$currency",
      "status": "processing",
      "created": $(($(date +%s) - 10)),
      "charges": {
        "object": "list",
        "data": [
          {
            "id": "$(generate_charge_id)",
            "object": "charge",
            "status": "succeeded"
          }
        ],
        "has_more": false,
        "total_count": 1
      },
      "livemode": false
    },
    "previous_attributes": {
      "status": "requires_action"
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_$(openssl rand -hex 8)",
    "idempotency_key": null
  },
  "type": "payment_intent.processing"
}
EOF
}

# Generate checkout.session.completed event
generate_checkout_session_completed() {
  local session_id="$1"
  local amount="${2:-5000}"
  local currency="${3:-usd}"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$session_id",
      "object": "checkout.session",
      "after_expiration": null,
      "allow_promotion_codes": null,
      "amount_subtotal": $amount,
      "amount_total": $amount,
      "automatic_tax": {
        "enabled": false,
        "status": null
      },
      "billing_address_collection": null,
      "cancel_url": "https://example.com/cancel",
      "client_reference_id": "ref_$(openssl rand -hex 8)",
      "consent": null,
      "consent_collection": null,
      "currency": "$currency",
      "customer": "$(generate_customer_id)",
      "customer_creation": "if_required",
      "customer_email": "test@example.com",
      "expires_at": $(($(date +%s) + 86400)),
      "livemode": false,
      "locale": null,
      "mode": "subscription",
      "payment_intent": null,
      "payment_link": null,
      "payment_method_collection": null,
      "payment_method_options": null,
      "payment_method_types": ["card"],
      "payment_status": "paid",
      "phone_number_collection": {
        "enabled": false
      },
      "recovered_from": null,
      "setup_intent": null,
      "status": "complete",
      "submit_type": null,
      "subscription": "$(generate_subscription_id)",
      "success_url": "https://example.com/success",
      "total_details": {
        "amount_discount": 0,
        "amount_shipping": 0,
        "amount_tax": 0
      },
      "url": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "checkout.session.completed"
}
EOF
}

# Generate customer.subscription.updated event
generate_subscription_updated() {
  local subscription_id="$1"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$subscription_id",
      "object": "subscription",
      "application": null,
      "automatic_tax": {
        "enabled": false
      },
      "billing_cycle_anchor": $(date +%s),
      "billing_thresholds": null,
      "cancel_at": null,
      "cancel_at_period_end": false,
      "canceled_at": null,
      "collection_method": "charge_automatically",
      "created": $(($(date +%s) - 2592000)),
      "currency": "usd",
      "current_period_end": $(($(date +%s) + 2592000)),
      "current_period_start": $(date +%s),
      "customer": "$(generate_customer_id)",
      "days_until_due": null,
      "default_payment_method": "pm_$(openssl rand -hex 12)",
      "default_source": null,
      "default_tax_rates": [],
      "description": null,
      "discount": null,
      "ended_at": null,
      "items": {
        "object": "list",
        "data": [
          {
            "id": "si_$(openssl rand -hex 12)",
            "object": "subscription_item",
            "billing_thresholds": null,
            "created": $(date +%s),
            "currency": "usd",
            "custom_price": null,
            "metadata": {},
            "price": {
              "id": "price_1234567890",
              "object": "price",
              "active": true,
              "billing_scheme": "per_unit",
              "created": 1609459200,
              "currency": "usd",
              "custom_unit_amount": null,
              "livemode": false,
              "lookup_key": null,
              "metadata": {},
              "nickname": null,
              "object": "price",
              "product": "prod_1234567890",
              "recurring": {
                "aggregate_usage": null,
                "interval": "month",
                "interval_count": 1,
                "meter": null,
                "trial_period_days": null,
                "usage_type": "licensed"
              },
              "tax_behavior": "unspecified",
              "tiers_mode": null,
              "transform_quantity": null,
              "type": "recurring",
              "unit_amount": 999,
              "unit_amount_decimal": "999"
            },
            "quantity": 1,
            "subscription": "$subscription_id",
            "tax_rates": []
          }
        ],
        "has_more": false,
        "total_count": 1,
        "url": "/v1/subscription_items?subscription=$subscription_id"
      },
      "latest_invoice": "in_$(openssl rand -hex 12)",
      "livemode": false,
      "metadata": {
        "plan": "pro",
        "workspace_id": "ws_$(openssl rand -hex 8)"
      },
      "next_pending_invoice_item_invoice": null,
      "on_behalf_of": null,
      "pause_collection": null,
      "payment_settings": {
        "payment_method_options": null,
        "payment_method_types": null,
        "save_default_payment_method": null
      },
      "pending_invoice_item_interval": null,
      "pending_setup_intent": null,
      "pending_update": null,
      "schedule": null,
      "start_date": $(($(date +%s) - 2592000)),
      "status": "active",
      "test_clock": null,
      "transfer_data": null,
      "trial_end": null,
      "trial_settings": null,
      "trial_start": null
    },
    "previous_attributes": {
      "current_period_end": $(($(date +%s) + 2592000 - 3600)),
      "current_period_start": $(($(date +%s) - 3600))
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": "req_$(openssl rand -hex 8)",
    "idempotency_key": null
  },
  "type": "customer.subscription.updated"
}
EOF
}

# Generate customer.subscription.deleted event
generate_subscription_deleted() {
  local subscription_id="$1"

  cat <<EOF
{
  "id": "$(generate_event_id)",
  "object": "event",
  "api_version": "2024-04-10",
  "created": $(date +%s),
  "data": {
    "object": {
      "id": "$subscription_id",
      "object": "subscription",
      "application": null,
      "automatic_tax": {
        "enabled": false
      },
      "billing_cycle_anchor": $(($(date +%s) - 2592000)),
      "billing_thresholds": null,
      "cancel_at": null,
      "cancel_at_period_end": false,
      "canceled_at": $(date +%s),
      "collection_method": "charge_automatically",
      "created": $(($(date +%s) - 5184000)),
      "currency": "usd",
      "current_period_end": $(date +%s),
      "current_period_start": $(($(date +%s) - 2592000)),
      "customer": "$(generate_customer_id)",
      "days_until_due": null,
      "default_payment_method": null,
      "default_source": null,
      "default_tax_rates": [],
      "description": null,
      "discount": null,
      "ended_at": $(date +%s),
      "items": {
        "object": "list",
        "data": [],
        "has_more": false,
        "total_count": 0
      },
      "latest_invoice": null,
      "livemode": false,
      "metadata": {},
      "next_pending_invoice_item_invoice": null,
      "on_behalf_of": null,
      "pause_collection": null,
      "payment_settings": {
        "payment_method_options": null,
        "payment_method_types": null,
        "save_default_payment_method": null
      },
      "pending_invoice_item_interval": null,
      "pending_setup_intent": null,
      "pending_update": null,
      "schedule": null,
      "start_date": $(($(date +%s) - 5184000)),
      "status": "canceled",
      "test_clock": null,
      "transfer_data": null,
      "trial_end": null,
      "trial_settings": null,
      "trial_start": null
    }
  },
  "livemode": false,
  "pending_webhooks": 1,
  "request": {
    "id": null,
    "idempotency_key": null
  },
  "type": "customer.subscription.deleted"
}
EOF
}

# Generate event payload based on type
generate_event_payload() {
  local event_type="$1"

  case "$event_type" in
    charge.created)
      generate_charge_created "$(generate_charge_id)"
      ;;
    charge.updated)
      generate_charge_updated "$(generate_charge_id)"
      ;;
    payout.created)
      generate_payout_created "$(generate_payout_id)"
      ;;
    payout.updated)
      generate_payout_updated "$(generate_payout_id)"
      ;;
    refund.created)
      local charge_id=$(generate_charge_id)
      generate_refund_created "$(generate_refund_id)" "$charge_id"
      ;;
    payment_intent.created)
      generate_payment_intent_created "$(generate_payment_intent_id)"
      ;;
    payment_intent.processing)
      generate_payment_intent_processing "$(generate_payment_intent_id)"
      ;;
    checkout.session.completed)
      generate_checkout_session_completed "$(generate_session_id)"
      ;;
    customer.subscription.updated)
      generate_subscription_updated "$(generate_subscription_id)"
      ;;
    customer.subscription.deleted)
      generate_subscription_deleted "$(generate_subscription_id)"
      ;;
    *)
      log_error "Unknown event type: $event_type"
      exit 1
      ;;
  esac
}

# Print usage
usage() {
  cat <<EOF
Stripe Webhook Simulator

Simulates Stripe webhook events with valid HMAC-SHA256 signatures.

Usage:
  $0 --event <type> --url <endpoint> --secret <signing_secret> [OPTIONS]

Required Arguments:
  --event <type>        Event type (see supported events below)
  --url <endpoint>      Target webhook endpoint URL
  --secret <secret>     Webhook signing secret (whsec_... or equivalent)

Optional Arguments:
  --account-id <id>     Stripe account ID (default: acct_1234567890123456)
  --dry-run             Show payload without sending
  --verbose             Enable debug output
  --help                Show this help message

Supported Events:
  - charge.created                  New charge created
  - charge.updated                  Charge updated
  - payout.created                  Payout initiated
  - payout.updated                  Payout status changed
  - refund.created                  Refund issued
  - payment_intent.created          Payment intent created
  - payment_intent.processing       Payment intent processing
  - checkout.session.completed      Checkout session completed
  - customer.subscription.updated   Subscription updated
  - customer.subscription.deleted   Subscription canceled

Examples:
  # Simulate charge.created event
  $0 --event charge.created \\
    --url https://your-app.vercel.app/api/stripe/webhook \\
    --secret whsec_live_xxxxx

  # Dry run (show payload without sending)
  $0 --event payout.created \\
    --url https://localhost:3000/api/stripe/webhook \\
    --secret whsec_test_xxxxx \\
    --dry-run

  # Enable verbose output
  $0 --event charge.created \\
    --url https://your-app.vercel.app/api/stripe/webhook \\
    --secret whsec_live_xxxxx \\
    --verbose

EOF
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --event)
      EVENT_TYPE="$2"
      shift 2
      ;;
    --url)
      WEBHOOK_URL="$2"
      shift 2
      ;;
    --secret)
      WEBHOOK_SECRET="$2"
      shift 2
      ;;
    --account-id)
      STRIPE_ACCOUNT_ID="$2"
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
    --help|-h)
      usage
      ;;
    *)
      log_error "Unknown option: $1"
      usage
      ;;
  esac
done

# Validate required arguments
if [[ -z "$EVENT_TYPE" || -z "$WEBHOOK_URL" || -z "$WEBHOOK_SECRET" ]]; then
  log_error "Missing required arguments"
  usage
fi

log_info "Stripe Webhook Simulator"
log_info "Event Type: $EVENT_TYPE"
log_info "Webhook URL: $WEBHOOK_URL"
log_debug "Account ID: $STRIPE_ACCOUNT_ID"

# Generate payload
log_debug "Generating event payload..."
PAYLOAD=$(generate_event_payload "$EVENT_TYPE")

# Pretty print if jq is available
if command -v jq &> /dev/null; then
  PAYLOAD=$(echo "$PAYLOAD" | jq '.')
fi

if [[ "$DRY_RUN" == "true" ]]; then
  log_info "DRY RUN: Generated payload for $EVENT_TYPE"
  echo ""
  echo "$PAYLOAD"
  echo ""
  exit 0
fi

# Generate signature
log_debug "Generating HMAC-SHA256 signature..."
SIGNATURE=$(generate_signature "$PAYLOAD" "$WEBHOOK_SECRET")
log_debug "Signature: $SIGNATURE"

# Send webhook
log_info "Sending webhook to: $WEBHOOK_URL"

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: t=$SIGNATURE" \
  -H "User-Agent: StripeWebhookSimulator/1.0" \
  -d "$PAYLOAD" \
  "$WEBHOOK_URL" 2>&1)

# Extract HTTP status code
HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | sed '$d')

log_debug "HTTP Status: $HTTP_CODE"

if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "204" ]]; then
  log_success "Webhook sent successfully! (HTTP $HTTP_CODE)"
  if [[ -n "$BODY" ]]; then
    log_debug "Response:"
    if command -v jq &> /dev/null; then
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
      echo "$BODY"
    fi
  fi
else
  log_error "Webhook delivery failed! (HTTP $HTTP_CODE)"
  if [[ -n "$BODY" ]]; then
    log_error "Response:"
    if command -v jq &> /dev/null; then
      echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    else
      echo "$BODY"
    fi
  fi
  exit 1
fi

exit 0
