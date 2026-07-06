#!/usr/bin/env bash
# Vercel Environment Setup Script
# Run: chmod +x scripts/vercel-setup.sh && ./scripts/vercel-setup.sh

set -euo pipefail

echo "🚀 Vercel Environment Setup for DSG Control Plane"
echo "=================================================="

# Check prerequisites
command -v vercel >/dev/null 2>&1 || { echo "❌ vercel CLI not installed. Run: npm i -g vercel"; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "❌ gh CLI not installed. Run: pkg install gh"; exit 1; }

# Verify login
echo "🔐 Checking Vercel login..."
vercel whoami || { echo "Run: vercel login"; exit 1; }

echo "🔐 Checking GitHub login..."
gh auth status || { echo "Run: gh auth login"; exit 1; }

PROJECT_NAME="tdealer01-crypto-dsg-control-plane"
ORG_ID="tdealer01-cryptos-projects"

echo "📦 Linking Vercel project..."
vercel link --project "$PROJECT_NAME" --scope "$ORG_ID" --yes 2>/dev/null || true

# Required Environment Variables
declare -A ENV_VARS=(
  ["NEXT_PUBLIC_APP_URL"]="https://tdealer01-crypto-dsg-control-plane.vercel.app"
  ["APP_URL"]="https://tdealer01-crypto-dsg-control-plane.vercel.app"
  ["DSG_CORE_URL"]=""
  ["DSG_CORE_API_KEY"]=""
  ["DSG_API_KEY"]=""
  ["DSG_API_URL"]=""
  ["NEXT_PUBLIC_SUPABASE_URL"]=""
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]=""
  ["SUPABASE_SERVICE_ROLE_KEY"]=""
  ["SUPABASE_URL"]=""
  ["SUPABASE_SERVICE_KEY"]=""
  ["SUPABASE_JWT_SECRET"]=""
  ["STRIPE_SECRET_KEY"]=""
  ["STRIPE_WEBHOOK_SECRET"]=""
  ["STRIPE_CONNECT_CLIENT_ID"]=""
  ["STRIPE_CONNECT_STATE_SECRET"]=""
  ["STRIPE_METER_EVENT_NAME"]="dsg_meter_event"
  ["STRIPE_METER_ID"]=""
  ["STRIPE_PRICE_PRO_MONTHLY"]=""
  ["STRIPE_PRICE_PRO_YEARLY"]=""
  ["STRIPE_PRICE_BUSINESS_MONTHLY"]=""
  ["STRIPE_PRICE_BUSINESS_YEARLY"]=""
  ["STRIPE_PRICE_ENTERPRISE_MONTHLY"]=""
  ["STRIPE_PRICE_ENTERPRISE_YEARLY"]=""
  ["STRIPE_PRICE_OVERAGE_MONTHLY"]=""
  ["NEXT_PUBLIC_STRIPE_CLIENT_ID"]=""
  ["OPENAI_API_KEY"]=""
  ["OPENROUTER_API_KEY"]=""
  ["OPENROUTER_MODEL"]="openrouter/auto"
  ["ANTHROPIC_API_KEY"]=""
  ["NVIDIA_API_KEY"]=""
  ["NVIDIA_NGC_MODEL"]=""
  ["UPSTASH_REDIS_REST_URL"]=""
  ["UPSTASH_REDIS_REST_TOKEN"]=""
  ["GITHUB_APP_ID"]=""
  ["GITHUB_APP_PRIVATE_KEY"]=""
  ["GITHUB_APP_WEBHOOK_SECRET"]=""
  ["GITHUB_WEBHOOK_SECRET"]=""
  ["GITHUB_MARKETPLACE_WEBHOOK_SECRET"]=""
  ["GITHUB_TOKEN"]=""
  ["RESEND_API_KEY"]=""
  ["ADMIN_SETUP_SECRET"]=""
  ["CRON_SECRET"]=""
  ["FOUNDER_EMAIL"]="founder@tdealer01.com"
  ["DSG_ALLOWED_ORIGINS"]="https://tdealer01-crypto-dsg-control-plane.vercel.app"
  ["DSG_ALLOW_DEV_AUTH_HEADERS"]="false"
  ["ENABLE_DEMO_BOOTSTRAP"]="true"
  ["ACCESS_MODE"]="production"
  ["ACCESS_POLICY"]="paid"
  ["OVERAGE_RATE_USD"]="0.10"
  ["DSG_DEFAULT_POLICY_ID"]="default"
  ["DSG_BUILDER_GITHUB_OWNER"]="tdealer01-crypto"
  ["DSG_BUILDER_GITHUB_REPO"]="tdealer01-crypto-dsg-control-plane"
  ["DSG_BUILDER_BASE_BRANCH"]="main"
  ["TRINITY_ENABLE_LIVE_SOL_TRANSFER"]="false"
  ["SOLANA_TREASURY_PRIVATE_KEY"]=""
  ["SOLANA_WALLET_KEYPAIR"]=""
  ["NEXT_PUBLIC_POSTHOG_API_KEY"]=""
  ["ZAPIER_WEBHOOK_URL"]=""
  ["WORKOS_API_KEY"]=""
  ["WORKOS_CLIENT_ID"]=""
  ["TELEGRAM_BOT_TOKEN"]=""
  ["TELEGRAM_CHAT_ID"]=""
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]=""
  ["SUPABASE_PUBLISHABLE_KEY"]=""
  ["SUPABASE_SECRET_KEY"]=""
  ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]=""
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]=""
  ["DSG_ONE_V1_URL"]=""
  ["DSG_ONE_V1_WORKSPACE_ID"]=""
  ["DSG_INCOMING_WEBHOOK_SECRET"]=""
  ["DSG_ONE_V1_WEBHOOK_SECRET"]=""
  ["DSGINCOMINGWEBHOOKSECRET"]=""
  ["CONTROL_PLANE_WEBHOOK_SECRET"]=""
  ["APPROVAL_NOTIFY_EMAIL"]=""
  ["DSG_INCOMINGWEBHOOKSECRET"]=""
  ["TOGETHER_API_KEY"]=""
  ["BROWSERBASE_API_KEY"]=""
  ["BROWSERBASE_PROJECT_ID"]=""
  ["PLAYWRIGHT_BASE_URL"]=""
  ["PLAYWRIGHT_STAGING_GATE"]="true"
  ["E2E_PAID_AGENT_ID"]=""
  ["E2E_PAID_API_KEY"]=""
  ["E2E_FREE_AGENT_ID"]=""
  ["E2E_FREE_API_KEY"]=""
  ["DSG_INCOMINGWEBHOOKSECRET"]=""
  ["PIPELINE_TOKEN"]=""
  ["DSG_ONE_V1_WEBHOOK_SECRET"]=""
  ["DSGINCOMINGWEBHOOKSECRET"]=""
  ["VALUE"]=""
  ["VERCEL_TOKEN"]=""
  ["DSG_ONE_V1_WEBHOOK_SECRET"]=""
  ["DSGINCOMINGWEBHOOKSECRET"]=""
  ["DSG_ONE_V1_WEBHOOK_SECRET"]=""
  ["DSGINCOMINGWEBHOOKSECRET"]=""
)

echo "🔧 Setting Vercel Environment Variables..."

for var in "${!ENV_VARS[@]}"; do
  value="${ENV_VARS[$var]}"
  if [[ -n "$value" ]]; then
    echo "  Setting $var..."
    vercel env add "$var" production <<< "$value" 2>/dev/null || \
      vercel env rm "$var" production --yes 2>/dev/null && \
      vercel env add "$var" production <<< "$value"
  else
    echo "  ⚠️  $var - NEEDS MANUAL SETUP (check vercel env ls)"
  fi
done

echo ""
echo "✅ Vercel Environment Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "  1. Run: vercel env ls production  # verify all vars set"
echo "  2. Run: ./scripts/supabase-init.sh  # setup database"
echo "  3. Deploy: vercel deploy --prod --force"
echo ""
echo "🔗 GitHub Secrets to set (run: gh secret set):"
echo "  VERCEL_TOKEN=$(vercel token create 2>/dev/null || echo 'create at vercel.com/account/tokens')"
echo "  VERCEL_ORG_ID=$(vercel inspect --scope=tdealer01-cryptos-projects 2>/dev/null | grep -o 'orgId: [^ ]*' | cut -d' ' -f2)"
echo "  VERCEL_PROJECT_ID=$(vercel inspect --scope=tdealer01-cryptos-projects 2>/dev/null | grep -o 'projectId: [^ ]*' | cut -d' ' -f2)"
echo "  SUPABASE_SERVICE_KEY (from Supabase dashboard)"
echo "  SUPABASE_URL (from Supabase dashboard)"
echo "  SNYK_TOKEN (optional, for security audit)"
echo "  TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID (for notifications)"