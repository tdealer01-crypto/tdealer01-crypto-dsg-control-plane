#!/bin/bash
# 🚀 Stripe Environment Setup — One-time only!
# Run once, never again. Saves all keys locally.

set -e

echo "🔐 DSG Stripe Environment Setup"
echo "================================"
echo ""
echo "⚠️  This script will save your Stripe keys locally (DO NOT commit!)"
echo ""

# 1. Get Stripe Keys
read -p "Enter Stripe SECRET KEY (sk_live_...): " STRIPE_SECRET_KEY
read -p "Enter Stripe PUBLISHABLE KEY (pk_live_...): " STRIPE_PUBLISHABLE_KEY
read -p "Enter Stripe WEBHOOK SECRET (whsec_...): " STRIPE_WEBHOOK_SECRET
read -p "Enter Stripe PRICE ID (price_...): " STRIPE_PRICE_PRO

# 2. Supabase
read -p "Enter Supabase URL (https://...supabase.co): " SUPABASE_URL
read -p "Enter Supabase SERVICE ROLE KEY: " SUPABASE_SERVICE_ROLE_KEY

# 3. Save to .env.local (Git ignored)
cat > .env.local << EOF
# 🔐 STRIPE - DO NOT COMMIT
STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO=$STRIPE_PRICE_PRO

# 🗄️  SUPABASE
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY

# Generated: $(date)
EOF

echo ""
echo "✅ Saved to .env.local (local only, not committed)"
echo ""

# 4. Save to Vercel (automated)
echo "🚀 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
    echo "Setting Vercel environment variables..."
    vercel env add STRIPE_SECRET_KEY < <(echo "$STRIPE_SECRET_KEY")
    vercel env add STRIPE_PUBLISHABLE_KEY < <(echo "$STRIPE_PUBLISHABLE_KEY")
    vercel env add STRIPE_WEBHOOK_SECRET < <(echo "$STRIPE_WEBHOOK_SECRET")
    vercel env add STRIPE_PRICE_PRO < <(echo "$STRIPE_PRICE_PRO")
    vercel env add NEXT_PUBLIC_SUPABASE_URL < <(echo "$SUPABASE_URL")
    vercel env add SUPABASE_SERVICE_ROLE_KEY < <(echo "$SUPABASE_SERVICE_ROLE_KEY")
    echo "✅ Vercel environment variables set!"
else
    echo "⚠️  Vercel CLI not installed. Manual setup needed:"
    echo "   1. Go: https://vercel.com/dashboard"
    echo "   2. Settings → Environment Variables"
    echo "   3. Add each variable above"
fi

echo ""
echo "================================"
echo "✅ Setup Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Deploy: git push origin main"
echo "2. Test: https://tdealer01-crypto-dsg-control-plane.vercel.app/checkout"
echo ""
