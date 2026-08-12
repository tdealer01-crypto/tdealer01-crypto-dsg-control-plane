#!/bin/bash
# Production verification script: Stripe + DSG ONE billing setup
# Usage: bash scripts/verify-stripe-setup.sh

set -e

echo "=========================================="
echo "DSG ONE: Stripe Production Verification"
echo "=========================================="
echo ""

# Check environment variables
echo "✓ Checking environment variables..."
MISSING_VARS=()

if [ -z "$STRIPE_SECRET_KEY" ]; then
  MISSING_VARS+=("STRIPE_SECRET_KEY")
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  MISSING_VARS+=("STRIPE_WEBHOOK_SECRET")
fi

if [ -z "$STRIPE_PRICE_PRO_MONTHLY" ]; then
  MISSING_VARS+=("STRIPE_PRICE_PRO_MONTHLY")
fi

if [ -z "$STRIPE_PRICE_ENTERPRISE_MONTHLY" ]; then
  MISSING_VARS+=("STRIPE_PRICE_ENTERPRISE_MONTHLY")
fi

if [ -z "$STRIPE_METER_ID" ]; then
  MISSING_VARS+=("STRIPE_METER_ID")
fi

if [ -z "$STRIPE_METER_EVENT_NAME" ]; then
  MISSING_VARS+=("STRIPE_METER_EVENT_NAME")
fi

if [ -z "$STRIPE_PRICE_PRO_OVERAGE" ]; then
  MISSING_VARS+=("STRIPE_PRICE_PRO_OVERAGE")
fi

if [ -z "$CRON_SECRET" ]; then
  MISSING_VARS+=("CRON_SECRET")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Full automatic billing is not configured. Missing:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Fixed subscription checkout may still be live, but Pro overage must remain fail-closed."
  echo "Set verified values in Render before declaring overage active."
  exit 1
fi

echo "✅ All required fixed + usage billing variables present"
echo ""

if [ "$STRIPE_METER_EVENT_NAME" != "dsg_execution_overage" ]; then
  echo "❌ STRIPE_METER_EVENT_NAME must match repository billing contract: dsg_execution_overage"
  exit 1
fi

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo "⚠️  Stripe CLI not found."
  echo "   Skipping provider-object verification; environment checks above still apply."
  echo ""
else
  echo "✓ Stripe CLI found"
  echo ""

  echo "Testing Stripe API connectivity..."
  if stripe products list --limit 1 > /dev/null 2>&1; then
    echo "✅ Stripe API connectivity OK"
  else
    echo "❌ Stripe API connectivity failed"
    exit 1
  fi
  echo ""

  echo "Checking configured fixed prices..."
  stripe prices retrieve "$STRIPE_PRICE_PRO_MONTHLY" > /dev/null
  stripe prices retrieve "$STRIPE_PRICE_ENTERPRISE_MONTHLY" > /dev/null
  echo "✅ Pro and Enterprise fixed prices resolve"
  echo ""

  echo "Checking configured Billing Meter..."
  METER_JSON=$(stripe billing meters retrieve "$STRIPE_METER_ID" --format=json 2>/dev/null || true)
  if [ -z "$METER_JSON" ]; then
    echo "❌ STRIPE_METER_ID does not resolve"
    exit 1
  fi
  if ! printf '%s' "$METER_JSON" | grep -q 'dsg_execution_overage'; then
    echo "❌ Billing Meter event name does not match dsg_execution_overage"
    exit 1
  fi
  echo "✅ Billing Meter resolves with expected event name"
  echo ""

  echo "Checking configured Pro overage price..."
  OVERAGE_JSON=$(stripe prices retrieve "$STRIPE_PRICE_PRO_OVERAGE" --format=json 2>/dev/null || true)
  if [ -z "$OVERAGE_JSON" ]; then
    echo "❌ STRIPE_PRICE_PRO_OVERAGE does not resolve"
    exit 1
  fi
  if ! printf '%s' "$OVERAGE_JSON" | grep -q "$STRIPE_METER_ID"; then
    echo "❌ Pro overage price is not linked to the configured Billing Meter"
    exit 1
  fi
  echo "✅ Pro overage price resolves and references the configured meter"
  echo ""

  echo "Checking canonical Render billing webhook..."
  WEBHOOKS_JSON=$(stripe webhook_endpoints list --limit 100 --format=json 2>/dev/null || true)
  if printf '%s' "$WEBHOOKS_JSON" | grep -q 'tdealer01-crypto-dsg-control-plane.onrender.com/api/billing/webhook'; then
    echo "✅ Canonical Render billing webhook found"
  else
    echo "❌ Canonical Render billing webhook not found"
    exit 1
  fi
  echo ""
fi

# Check API routes exist
echo "Checking API routes..."
ROUTES_OK=true

for route in \
  "app/api/billing/checkout/route.ts" \
  "app/api/billing/webhook/route.ts" \
  "app/api/billing/meter-health/route.ts" \
  "app/api/revenue/events/route.ts" \
  "app/api/cron/flush-meter-outbox/route.ts"
do
  if [ ! -f "$route" ]; then
    echo "❌ Missing $route"
    ROUTES_OK=false
  fi
done

if [ "$ROUTES_OK" = true ]; then
  echo "✅ All required API routes present"
else
  exit 1
fi
echo ""

# Check database migrations
echo "Checking database migrations..."
MIGRATIONS_OK=true
for marker in billing_customers billing_subscriptions billing_meter_outbox revenue_events dsg_gate_usage
do
  if ! grep -q "$marker" supabase/migrations/*.sql; then
    echo "❌ Migration marker not found: $marker"
    MIGRATIONS_OK=false
  fi
done

if [ "$MIGRATIONS_OK" = true ]; then
  echo "✅ Required database migrations present"
else
  exit 1
fi
echo ""

# Check libraries
echo "Checking billing libraries..."
for lib in lib/billing/metered.ts lib/billing/pricing-catalog.ts lib/billing/fulfillment.ts lib/revenue/events.ts
do
  if [ ! -f "$lib" ]; then
    echo "❌ Missing $lib"
    exit 1
  fi
done
echo "✅ Required billing libraries present"
echo ""

echo "=========================================="
echo "✅ Stripe billing configuration is evidence-ready"
echo "=========================================="
echo ""
echo "Final production proof still requires a controlled real customer flow:"
echo "1. authenticated Pro Checkout on Render"
echo "2. Stripe checkout/subscription webhook received by Render"
echo "3. atomic entitlement + Activation Proof persisted"
echo "4. usage beyond included quota appears on the linked Stripe meter/invoice"
echo ""
echo "Do not create fake production billing events merely to make this check pass."
