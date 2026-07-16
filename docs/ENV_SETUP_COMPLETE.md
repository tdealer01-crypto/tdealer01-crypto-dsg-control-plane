# Complete Environment Variables Setup Guide

This guide covers setting up environment variables for both local development and Vercel production deployment.

## Overview

The system requires three categories of environment variables:

1. **CRITICAL** — Required for build and runtime
2. **REQUIRED** — Needed for core functionality  
3. **OPTIONAL** — For advanced features (billing, notifications, etc.)

## Environment Variables by Category

### ✅ CRITICAL (Must Set)

#### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (e.g., `https://project.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Public anon key for client-side operations
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side service role key (keep secret!)

#### DSG Core
- `DSG_CORE_MODE` — Set to `internal` (uses local routes) or `remote` (uses external API)
- `NEXT_PUBLIC_APP_URL` — Application URL (e.g., `http://localhost:3000` for dev, `https://tdealer01-crypto-dsg-control-plane.vercel.app` for prod)

#### Authentication
- `NEXTAUTH_SECRET` — NextAuth.js secret for session signing

### 📋 REQUIRED (For Full Functionality)

#### Billing & Stripe
- `STRIPE_SECRET_KEY` — Stripe live secret key (for production)
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `STRIPE_PRICE_PRO_MONTHLY` — Pro plan monthly price ID
- `STRIPE_PRICE_PRO_YEARLY` — Pro plan yearly price ID
- `STRIPE_PRICE_BUSINESS_MONTHLY` — Business plan monthly price ID
- `STRIPE_PRICE_BUSINESS_YEARLY` — Business plan yearly price ID
- `STRIPE_PRICE_ENTERPRISE_MONTHLY` — Enterprise plan monthly price ID
- `STRIPE_PRICE_ENTERPRISE_YEARLY` — Enterprise plan yearly price ID
- `STRIPE_METER_EVENT_NAME` — Metered billing event name (e.g., `dsg_execution_overage`)
- `STRIPE_METER_ID` — Metered billing meter ID

#### Cron & Security
- `CRON_SECRET` — Secret for cron endpoints (fail-closed without this)

#### AI & Notifications
- `ANTHROPIC_API_KEY` — Claude API key for marketing agent and content generation
- `RESEND_API_KEY` — Resend email service API key (optional fallback)

#### Integrations
- `GITHUB_TOKEN` — GitHub personal access token for leads scraper
- `MARKETING_OUTREACH_MODE` — `queue` (human approval), `auto` (automatic), or `off` (disabled)
- `TELEGRAM_BOT_TOKEN` — Telegram bot token for notifications (optional)
- `TELEGRAM_CHAT_ID` — Telegram chat ID for founder notifications (optional)

## Setup Instructions

### 1. Development Setup (.env.local)

**Step 1: Copy template**
```bash
cp .env.example .env.local
```

**Step 2: Get your credentials**

You'll need to gather credentials from:

- **Supabase**: 
  - Go to your Supabase project → Settings → API
  - Copy: Project URL, Anon key, Service Role key
  
- **Stripe** (test mode for dev):
  - Go to Stripe Dashboard → Developers → API keys
  - Use restricted test keys (not live keys for dev!)
  - Create test prices for each plan/tier
  
- **Anthropic**:
  - Get API key from https://console.anthropic.com
  
- **GitHub**:
  - Create personal access token at https://github.com/settings/tokens
  - Need `repo` and `user` scopes at minimum
  
- **Other services** (optional):
  - Resend: https://resend.com/api-keys
  - Telegram: Create bot via @BotFather, get chat ID via @userinfobot

**Step 3: Fill in .env.local**
```bash
# Edit with your values
nano .env.local
```

**Step 4: Verify setup**
```bash
./scripts/verify-env-setup.sh

# Run tests to confirm
npm run typecheck
npm run test

# Start development server
npm run dev
```

### 2. Production Setup (Vercel)

**Step 1: Prepare credentials**

Before setting env vars in Vercel, you must have:
- Live Stripe API keys and price IDs
- Production Supabase project credentials
- Production API keys for all integrations
- VERCEL_TOKEN and Vercel CLI installed

**Step 2: Set environment variables in Vercel**

Using the setup script (recommended):
```bash
export VERCEL_TOKEN="your-vercel-token"
./scripts/set-vercel-env.sh production
```

Or manually via CLI:
```bash
npx vercel login
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... repeat for all required variables
```

**Step 3: Deploy**
```bash
git push origin main
# Or manually:
npx vercel --prod
```

**Step 4: Verify**
```bash
# Check health endpoint
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Check readiness
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness
```

## Validation Commands

### Local Development
```bash
# Verify environment setup
./scripts/verify-env-setup.sh

# Type checking
npm run typecheck

# Run all tests
npm run test

# Start development server
npm run dev

# Health check (after dev server starts)
curl http://localhost:3000/api/health
```

### Production
```bash
# List production env vars
npx vercel env ls production

# Check deployment
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health

# Verify billing setup
curl -sS https://tdealer01-crypto-dsg-control-plane.vercel.app/api/readiness

# Run go/no-go checks
npm run go:no-go https://tdealer01-crypto-dsg-control-plane.vercel.app
```

## Security Best Practices

### ✅ DO:
- Use environment variables for all secrets
- Store `.env.local` in `.gitignore` (already configured)
- Use restricted keys when possible
- Rotate keys regularly
- Use separate credentials for dev vs production
- Never commit `.env` files to Git

### ❌ DON'T:
- Hardcode secrets in source code
- Share API keys in chat or emails
- Use production keys for development
- Commit `.env.local` to Git
- Print secrets in logs

## Stripe Setup Details

### Getting Stripe Price IDs

1. Go to Stripe Dashboard → Products
2. Create products if they don't exist:
   - DSG Pro
   - DSG Business
   - DSG Enterprise
   - DSG Execution Overage (metered)

3. For each product (except overage), create prices:
   - Monthly price (e.g., $99/month)
   - Yearly price (e.g., $990/year)

4. Copy price IDs (format: `price_1Tn...`) into env vars

### Webhook Configuration

1. Go to Stripe Dashboard → Developers → Webhooks
2. Create endpoint: `https://your-domain/api/billing/webhook`
3. Subscribe to events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `usage_record_summary.reported`

4. Copy signing secret into `STRIPE_WEBHOOK_SECRET`

## Troubleshooting

### "Missing Supabase public environment variables"
**Cause**: `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set
**Fix**: Set both variables and rebuild

### "Cron endpoints return 401"
**Cause**: `CRON_SECRET` not set or incorrect
**Fix**: Set `CRON_SECRET` to a secure random string

### "Stripe webhook fails"
**Cause**: `STRIPE_WEBHOOK_SECRET` incorrect or webhook not configured
**Fix**: Verify secret in Stripe Dashboard, check webhook URL is correct

### "API calls timeout"
**Cause**: `ANTHROPIC_API_KEY` invalid or missing
**Fix**: Get a valid key from https://console.anthropic.com

## Next Steps

1. **Development**: Set up `.env.local` and run `npm run dev`
2. **Testing**: Run test suite to verify env vars are correct
3. **Production**: Use `set-vercel-env.sh` to configure Vercel
4. **Verification**: Run health/readiness checks to confirm deployment
5. **Monitoring**: Check logs for any env-related errors

## References

- [TRACK_A_ACTIVATION_STATUS.md](./revenue/TRACK_A_ACTIVATION_STATUS.md) — Production env requirements
- [PACKAGES_PRICING_MARKETPLACE_STRIPE_2026-06-20.md](./PACKAGES_PRICING_MARKETPLACE_STRIPE_2026-06-20.md) — Stripe mapping
- [ENVIRONMENT_SETUP_GUIDE.md](./ENVIRONMENT_SETUP_GUIDE.md) — Basic setup (from previous setup)
