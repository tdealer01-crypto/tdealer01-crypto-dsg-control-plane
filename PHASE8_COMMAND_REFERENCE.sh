#!/bin/bash
# Phase 8 Command Reference
# Copy-paste ready commands organized by task

# ============================================================
# STEP 1: PREPARATION (Copy values from dashboards)
# ============================================================

# Variables you need to gather:
STRIPE_API_KEY="sk_live_XXXXXXXXXXXX"
STRIPE_PUBLISHABLE_KEY="pk_live_XXXXXXXXXXXX"
STRIPE_WEBHOOK_SECRET="whsec_live_XXXXXXXXXXXX"
STRIPE_OAUTH_CLIENT_ID="ca_XXXXXXXXXXXX"
STRIPE_OAUTH_CLIENT_SECRET="XXXXXXXXXXXX"
SUPABASE_URL="https://XXXXXXXXXX.supabase.co"
SUPABASE_ANON_KEY="eyJXXXXXXXXXX..."
SUPABASE_SERVICE_ROLE_KEY="eyJXXXXXXXXXX..."
UPSTASH_REDIS_URL="redis://default:XXXXXXXXXX@XXXXXXXXXX:XXXXX"
DSG_API_KEY="dsg_XXXXXXXXXX"
VERCEL_URL="https://YOUR-APP.vercel.app"

# ============================================================
# STEP 2: CREATE .env.local (Copy-Paste this)
# ============================================================

cat > .env.local << 'EOF'
STRIPE_API_KEY=sk_live_PASTE_HERE
STRIPE_PUBLISHABLE_KEY=pk_live_PASTE_HERE
STRIPE_WEBHOOK_SECRET=whsec_live_PASTE_HERE
STRIPE_OAUTH_CLIENT_ID=ca_PASTE_HERE
STRIPE_OAUTH_CLIENT_SECRET=PASTE_HERE
SUPABASE_URL=https://PASTE_HERE.supabase.co
SUPABASE_ANON_KEY=PASTE_HERE
SUPABASE_SERVICE_ROLE_KEY=PASTE_HERE
UPSTASH_REDIS_URL=redis://default:PASTE_HERE
DSG_API_KEY=dsg_PASTE_HERE
NODE_ENV=production
EOF

# Verify created
cat .env.local

# ============================================================
# STEP 3: VALIDATE ENVIRONMENT (Local)
# ============================================================

# Check all keys are valid
./scripts/validate-stripe-config.sh

# ============================================================
# STEP 4: PREPARE FOR VERCEL (Local)
# ============================================================

# Show formatted env vars for copy-paste to Vercel
./scripts/env-to-vercel.sh

# ============================================================
# STEP 5: VERCEL DEPLOYMENT (Manual - Do in browser)
# ============================================================

# BROWSER STEPS:
# 1. Go to: https://vercel.com/dashboard
# 2. Click "Add New" > "Project"
# 3. Import: tdealer01-crypto-dsg-control-plane
# 4. Deploy
# 5. Settings > Environment Variables > Add 11 vars
# 6. Redeploy
# 7. Copy URL when Ready

# Save your Vercel URL
export VERCEL_URL="https://your-app-xxxxx.vercel.app"

# ============================================================
# STEP 6: STRIPE WEBHOOKS (Manual - Do in browser)
# ============================================================

# BROWSER STEPS:
# 1. Go to: https://dashboard.stripe.com/webhooks
# 2. Add Endpoint
# 3. URL: https://YOUR_VERCEL_URL/api/stripe/webhook/events
# 4. Events: charge.created, charge.updated, payout.created, payout.updated, refund.created
# 5. Get signing secret
# 6. Update .env.local with new secret

# ============================================================
# STEP 7: STRIPE OAUTH (Manual - Do in browser)
# ============================================================

# BROWSER STEPS:
# 1. Go to: https://dashboard.stripe.com/settings/oauth
# 2. Add redirect URIs:
#    https://YOUR_VERCEL_URL/api/stripe/oauth/callback
#    https://YOUR_VERCEL_URL/stripe/oauth/callback
# 3. Save

# ============================================================
# STEP 8: QUICK HEALTH CHECK (Local)
# ============================================================

./scripts/quick-health-check.sh $VERCEL_URL

# Expected output:
# ✓ Health endpoint: OK
# ✓ Database: connected
# ✓ Redis: connected

# ============================================================
# STEP 9: FULL DEPLOYMENT CHECK (Local)
# ============================================================

./scripts/full-deployment-check.sh $VERCEL_URL

# Expected output:
# ✓ All 15 checks pass
# GO DECISION: ✅ GREEN

# ============================================================
# STEP 10: TEST WEBHOOK DELIVERY (Local)
# ============================================================

# Send test webhook
./scripts/stripe-webhook-simulator.sh \
  --event charge.created \
  --url $VERCEL_URL/api/stripe/webhook/events \
  --secret whsec_live_YOUR_WEBHOOK_SECRET

# Expected output:
# ✓ Webhook successfully delivered

# ============================================================
# STEP 11: VERIFY IN AUDIT TRAIL (Local)
# ============================================================

export DSG_API_KEY="dsg_YOUR_API_KEY"

./scripts/verify-webhook-received.sh --wait --timeout 30

# Expected output:
# ✓ Webhook event found in audit trail

# ============================================================
# STEP 12: CONTINUOUS MONITORING (Optional)
# ============================================================

# Monitor health every 60 seconds
./scripts/continuous-monitor.sh $VERCEL_URL

# ============================================================
# DONE! Phase 8 Complete ✅
# ============================================================

echo "✅ Phase 8 Setup Complete!"
echo "Status: All checks pass - Ready for production"
echo "Next: Phase 9 - Stripe App Marketplace Registration"
