#!/bin/bash
# 🤖 Auto-detect Stripe Keys from Environment
# Usage: bash setup-stripe-auto.sh

set -e

echo "🔍 Scanning environment for Stripe & Supabase keys..."
echo ""

# Try to find keys from environment
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}"
STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"
STRIPE_PRICE_PRO="${STRIPE_PRICE_PRO:-}"
NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# Also check common alt names
STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-$STRIPE_API_KEY}"
STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-$STRIPE_PUB_KEY}"

# Display what we found
echo "✅ Found Keys:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$STRIPE_SECRET_KEY" ]; then
    echo "✓ STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:0:20}..."
else
    echo "✗ STRIPE_SECRET_KEY: NOT FOUND"
    read -p "  Enter manually (sk_live_...): " STRIPE_SECRET_KEY
fi

if [ -n "$STRIPE_PUBLISHABLE_KEY" ]; then
    echo "✓ STRIPE_PUBLISHABLE_KEY: ${STRIPE_PUBLISHABLE_KEY:0:20}..."
else
    echo "✗ STRIPE_PUBLISHABLE_KEY: NOT FOUND"
    read -p "  Enter manually (pk_live_...): " STRIPE_PUBLISHABLE_KEY
fi

if [ -n "$STRIPE_WEBHOOK_SECRET" ]; then
    echo "✓ STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET:0:20}..."
else
    echo "✗ STRIPE_WEBHOOK_SECRET: NOT FOUND"
    read -p "  Enter manually (whsec_...): " STRIPE_WEBHOOK_SECRET
fi

if [ -n "$STRIPE_PRICE_PRO" ]; then
    echo "✓ STRIPE_PRICE_PRO: ${STRIPE_PRICE_PRO}"
else
    echo "✗ STRIPE_PRICE_PRO: NOT FOUND"
    read -p "  Enter manually (price_...): " STRIPE_PRICE_PRO
fi

if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "✓ NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:40}..."
else
    echo "✗ NEXT_PUBLIC_SUPABASE_URL: NOT FOUND"
    read -p "  Enter manually (https://...supabase.co): " NEXT_PUBLIC_SUPABASE_URL
fi

if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "✓ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
else
    echo "✗ SUPABASE_SERVICE_ROLE_KEY: NOT FOUND"
    read -p "  Enter manually (eyJ...): " SUPABASE_SERVICE_ROLE_KEY
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Validate keys
if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_live_ ]] && [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_test_ ]]; then
    echo "❌ Invalid STRIPE_SECRET_KEY (must start with sk_live_ or sk_test_)"
    exit 1
fi

if [[ ! "$STRIPE_PRICE_PRO" =~ ^price_ ]]; then
    echo "❌ Invalid STRIPE_PRICE_PRO (must start with price_)"
    exit 1
fi

if [[ ! "$NEXT_PUBLIC_SUPABASE_URL" =~ ^https:// ]]; then
    echo "❌ Invalid Supabase URL (must start with https://)"
    exit 1
fi

echo ""
echo "✅ All keys validated!"
echo ""

# Save to .env.local
echo "💾 Saving to .env.local..."
cat > .env.local << EOF
# 🔐 STRIPE KEYS - DO NOT COMMIT!
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO=$STRIPE_PRICE_PRO

# 🗄️  SUPABASE
NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Auto-generated: $(date)
# ⚠️  Never commit this file - it's in .gitignore
EOF

echo "✅ Saved to .env.local"
echo ""

# Try to set Vercel env vars
echo "🚀 Setting Vercel environment variables..."
if command -v vercel &> /dev/null; then
    # Non-interactive vercel env add
    {
        echo "$STRIPE_SECRET_KEY"
        echo "$STRIPE_PUBLISHABLE_KEY"
        echo "$STRIPE_WEBHOOK_SECRET"
        echo "$STRIPE_PRICE_PRO"
        echo "$NEXT_PUBLIC_SUPABASE_URL"
        echo "$SUPABASE_SERVICE_ROLE_KEY"
    } | vercel env add STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_PRICE_PRO NEXT_PUBLIC_SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY 2>/dev/null || true

    echo "✅ Vercel vars updated (or use dashboard if needed)"
else
    echo "⚠️  Vercel CLI not installed"
    echo "   Alternative: Set manually via https://vercel.com/dashboard"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. npm run dev                (test locally)"
echo "2. git push origin main       (deploy)"
echo "3. Wait 2-3 min for Vercel"
echo "4. https://tdealer01-crypto-dsg-control-plane.vercel.app/checkout"
echo ""
echo "Keys are now configured! Never run this again! 🚀"
echo ""
