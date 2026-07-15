#!/bin/bash
# Phase 1 Verification Script: Check Stripe Setup
# Run this to verify Stripe account is configured correctly before launch
# Usage: bash scripts/verify-stripe-setup.sh

set -e

echo "=========================================="
echo "DSG ONE Phase 1: Stripe Setup Verification"
echo "=========================================="
echo ""

# Check environment variables
echo "✓ Checking environment variables..."
MISSING_VARS=()

if [ -z "$STRIPE_SECRET_KEY" ]; then
  MISSING_VARS+=("STRIPE_SECRET_KEY")
fi

if [ -z "$STRIPE_PUBLISHABLE_KEY" ]; then
  MISSING_VARS+=("STRIPE_PUBLISHABLE_KEY")
fi

if [ -z "$STRIPE_WEBHOOK_SECRET" ]; then
  MISSING_VARS+=("STRIPE_WEBHOOK_SECRET")
fi

if [ -z "$STRIPE_METER_ID" ]; then
  MISSING_VARS+=("STRIPE_METER_ID")
fi

if [ -z "$STRIPE_METER_EVENT_NAME" ]; then
  MISSING_VARS+=("STRIPE_METER_EVENT_NAME")
fi

if [ -z "$CRON_SECRET" ]; then
  MISSING_VARS+=("CRON_SECRET")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Missing environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  echo ""
  echo "Set these variables in Vercel or .env.production before proceeding."
  exit 1
fi

echo "✅ All required environment variables present"
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
  echo "⚠️  Stripe CLI not found. Install from https://stripe.com/docs/stripe-cli"
  echo "   Skipping Stripe API verification (can be done manually)"
  echo ""
else
  echo "✓ Stripe CLI found"
  echo ""

  # Verify Stripe API access
  echo "Testing Stripe API connectivity..."
  if stripe products list --limit 1 > /dev/null 2>&1; then
    echo "✅ Stripe API connectivity OK"
  else
    echo "❌ Stripe API connectivity failed"
    echo "   Check STRIPE_SECRET_KEY is correct and Stripe CLI is authenticated"
    exit 1
  fi
  echo ""

  # Check products exist
  echo "Checking Stripe products..."
  PRODUCTS=$(stripe products list --limit 100 --format=json 2>/dev/null | grep -c '"name"' || true)
  if [ "$PRODUCTS" -ge 3 ]; then
    echo "✅ Found $PRODUCTS products (expected: Pro, Business, Enterprise, + skills bundles)"
  else
    echo "⚠️  Only found $PRODUCTS products (expected: 8+)"
    echo "   Make sure Pro, Business, Enterprise, and Skills bundles are created in Stripe"
  fi
  echo ""

  # Check prices exist
  echo "Checking Stripe prices..."
  PRICES=$(stripe prices list --limit 100 --format=json 2>/dev/null | grep -c '"object": "price"' || true)
  if [ "$PRICES" -ge 6 ]; then
    echo "✅ Found $PRICES prices (expected: Pro month/year, Business month/year, Enterprise month/year, + bundles)"
  else
    echo "⚠️  Only found $PRICES prices (expected: 12+)"
    echo "   Make sure monthly + yearly prices are created for each plan"
  fi
  echo ""

  # Check meters
  echo "Checking Stripe billing meters..."
  METERS=$(stripe billing meters list --limit 10 --format=json 2>/dev/null | grep -c '"event_name"' || true)
  if [ "$METERS" -ge 1 ]; then
    echo "✅ Found $METERS meter(s)"
  else
    echo "❌ No billing meters found!"
    echo "   Create a meter named 'dsg_execution' in Stripe Dashboard → Billing → Meters"
    exit 1
  fi
  echo ""

  # Check webhook endpoints
  echo "Checking Stripe webhook endpoints..."
  WEBHOOKS=$(stripe webhook_endpoints list --format=json 2>/dev/null | grep -c '"url"' || true)
  if [ "$WEBHOOKS" -ge 1 ]; then
    echo "✅ Found $WEBHOOKS webhook endpoint(s)"
  else
    echo "⚠️  No webhook endpoints configured"
    echo "   Configure: https://your-production-url/api/billing/webhook"
  fi
  echo ""
fi

# Check API routes exist
echo "Checking API routes..."
ROUTES_OK=true

if [ ! -f "app/api/billing/checkout/route.ts" ]; then
  echo "❌ /api/billing/checkout not found"
  ROUTES_OK=false
fi

if [ ! -f "app/api/billing/webhook/route.ts" ]; then
  echo "❌ /api/billing/webhook not found"
  ROUTES_OK=false
fi

if [ ! -f "app/api/revenue/events/route.ts" ]; then
  echo "❌ /api/revenue/events not found"
  ROUTES_OK=false
fi

if [ ! -f "app/api/cron/billing-sync/route.ts" ]; then
  echo "❌ /api/cron/billing-sync not found"
  ROUTES_OK=false
fi

if [ ! -f "app/api/cron/flush-meter-outbox/route.ts" ]; then
  echo "❌ /api/cron/flush-meter-outbox not found"
  ROUTES_OK=false
fi

if [ "$ROUTES_OK" = true ]; then
  echo "✅ All required API routes present"
else
  echo "❌ Some API routes missing"
  exit 1
fi
echo ""

# Check database migrations
echo "Checking database migrations..."
MIGRATIONS_OK=true

if ! grep -q "billing_customers" supabase/migrations/*.sql; then
  echo "❌ billing_customers migration not found"
  MIGRATIONS_OK=false
fi

if ! grep -q "billing_subscriptions" supabase/migrations/*.sql; then
  echo "❌ billing_subscriptions migration not found"
  MIGRATIONS_OK=false
fi

if ! grep -q "billing_meter_outbox" supabase/migrations/*.sql; then
  echo "❌ billing_meter_outbox migration not found"
  MIGRATIONS_OK=false
fi

if ! grep -q "revenue_events" supabase/migrations/*.sql; then
  echo "❌ revenue_events migration not found"
  MIGRATIONS_OK=false
fi

if [ "$MIGRATIONS_OK" = true ]; then
  echo "✅ All required database migrations present"
else
  echo "❌ Some migrations missing"
  exit 1
fi
echo ""

# Check libraries
echo "Checking billing libraries..."
LIBS_OK=true

if [ ! -f "lib/billing/metered.ts" ]; then
  echo "❌ lib/billing/metered.ts not found"
  LIBS_OK=false
fi

if [ ! -f "lib/billing/pricing-catalog.ts" ]; then
  echo "❌ lib/billing/pricing-catalog.ts not found"
  LIBS_OK=false
fi

if [ ! -f "lib/revenue/events.ts" ]; then
  echo "❌ lib/revenue/events.ts not found"
  LIBS_OK=false
fi

if [ "$LIBS_OK" = true ]; then
  echo "✅ All required billing libraries present"
else
  echo "❌ Some libraries missing"
  exit 1
fi
echo ""

# Summary
echo "=========================================="
echo "✅ Phase 1 Verification Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Set environment variables in Vercel:"
echo "   - STRIPE_SECRET_KEY"
echo "   - STRIPE_PUBLISHABLE_KEY"
echo "   - STRIPE_WEBHOOK_SECRET"
echo "   - STRIPE_METER_ID"
echo "   - STRIPE_METER_EVENT_NAME"
echo "   - CRON_SECRET"
echo ""
echo "2. Deploy to production:"
echo "   git push origin main"
echo ""
echo "3. Verify deployment:"
echo "   curl https://your-production-url/api/billing/meter-health"
echo ""
echo "4. Test first checkout:"
echo "   bash scripts/test-checkout.sh"
echo ""
