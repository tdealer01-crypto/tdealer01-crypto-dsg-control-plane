# Lead Discovery System - Environment Setup

This document guides you through configuring the environment variables needed for the automated lead discovery, trial onboarding, and conversion system.

## Quick Start

### Option 1: Use the Setup Script (Recommended)

```bash
# 1. Get your Vercel token from https://vercel.com/account/tokens
export VERCEL_TOKEN="your_vercel_token_here"

# 2. Get required API keys (see below)
export GITHUB_TOKEN="your_github_token_here"
export TWITTER_BEARER_TOKEN="your_twitter_bearer_token_here"  # Optional
export RESEND_API_KEY="your_resend_api_key_here"              # Optional
export CRON_SECRET="$(openssl rand -base64 32)"               # Generate random

# 3. Run the setup script
bash set-lead-discovery-env.sh
```

### Option 2: Manual Setup via Vercel Dashboard

Go to https://vercel.com/dashboard and navigate to your project settings → Environment Variables.

Add each variable below under the "Production" environment.

---

## Required Environment Variables

### 1. GITHUB_TOKEN (Required)

Used for discovering leads from GitHub repositories and extracting contributor information.

**How to get it:**
1. Go to https://github.com/settings/tokens/new
2. Create "Personal access token (classic)"
3. Select scope: `public_repo`
4. Copy the token (you won't see it again)

**What it does:**
- Searches trending AI/automation repositories
- Extracts contributor information
- Queries user profiles for ICP scoring

---

### 2. TWITTER_BEARER_TOKEN (Optional)

Used for discovering leads from Twitter discussions about AI agents.

**How to get it:**
1. Go to https://developer.twitter.com/
2. Create an app or use existing
3. Go to "Keys and tokens" → "Bearer Token"
4. Copy the token

**What it does:**
- Searches mentions of AI agent keywords
- Extracts author profiles
- Scores engagement based on interactions

**Note:** If not configured, Twitter lead discovery is skipped silently.

---

### 3. RESEND_API_KEY (Optional)

Used for sending outreach emails and onboarding sequences to trial users.

**How to get it:**
1. Go to https://resend.com
2. Create account or sign in
3. Go to "API Keys"
4. Create and copy your API key

**What it does:**
- Sends personalized outreach emails to leads
- Sends onboarding email sequences to trial users
- Sends trial expiration and conversion nudge emails

**Note:** If not configured, email sending falls back gracefully (useful for development).

---

### 4. CRON_SECRET (Recommended)

Security token for protecting scheduled cron jobs from unauthorized access.

**How to generate it:**
```bash
openssl rand -base64 32
```

**What it does:**
- Secures the daily lead discovery cron job at `/api/cron/lead-discovery`
- Verifies that only Vercel's cron scheduler can trigger the job
- Prevents external parties from manually triggering discovery

**Note:** If not configured, cron jobs will still work but will be less secure.

---

## Stripe Price IDs (Already Configured)

These should already be set via `set-vercel-stripe-env.sh`. Verify they exist:

- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_YEARLY`
- `STRIPE_PRICE_BUSINESS_MONTHLY`
- `STRIPE_PRICE_BUSINESS_YEARLY`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY`
- `STRIPE_PRICE_ENTERPRISE_YEARLY`

---

## Verification

After setting environment variables, verify the system is working:

### 1. Check Vercel Deployment

```bash
# Should return 200 if deployment is healthy
curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status
```

### 2. Test Lead Discovery (Requires Auth)

```bash
# Manually trigger the discovery pipeline
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/leads/discover \
  -H "Authorization: Bearer YOUR_INTERNAL_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"discover","limit":5}'
```

### 3. Check Cron Job Status

The cron job runs daily at 8:00 AM UTC:
- Check Vercel Deployment logs: https://vercel.com/dashboard → [Project] → Deployments → Logs
- Search for "lead-discovery" to see recent runs

---

## Troubleshooting

### "GITHUB_TOKEN not configured" warning

**Issue:** Lead discovery skipped on first run
**Fix:** Add GITHUB_TOKEN via Vercel dashboard or script

### Emails not sending

**Issue:** Onboarding emails not received by trial users
**Fix:** Check if RESEND_API_KEY is set. If not set, emails are skipped (development mode).

### Cron job returns 401 Unauthorized

**Issue:** CRON_SECRET mismatch
**Fix:** Generate new secret and update in Vercel:
```bash
export CRON_SECRET="$(openssl rand -base64 32)"
bash set-lead-discovery-env.sh
```

### No leads discovered after 24 hours

**Issue:** GitHub API rate limiting or no matching repositories
**Fix:**
- Check Vercel logs for API errors
- Verify GITHUB_TOKEN has `public_repo` scope
- Try manually triggering: `POST /api/leads/discover?action=discover`

---

## Environment Variables Summary

| Variable | Required | Source | Used For |
|----------|----------|--------|----------|
| GITHUB_TOKEN | ✅ Yes | GitHub Settings | Lead discovery from repos |
| TWITTER_BEARER_TOKEN | ❌ No | Twitter Dev | Lead discovery from tweets |
| RESEND_API_KEY | ❌ No | Resend | Sending emails |
| CRON_SECRET | ✅ Recommended | Generate | Cron job security |
| STRIPE_PRICE_* | ✅ Yes | Stripe | Trial → Paid conversion |

---

## Next Steps

1. ✅ Set up environment variables
2. ⏳ Wait for first cron job run (8 AM UTC daily)
3. ⏳ Check Vercel logs for lead discovery results
4. ⏳ Monitor `/api/leads/discover` endpoint for discovered leads
5. ⏳ Test trial signup and conversion flow end-to-end

---

## API Endpoints Available

### Lead Discovery
- `POST /api/leads/discover` - Manually trigger discovery
- `GET /api/leads/discover?action=discover` - Get discovery status

### Outreach
- `POST /api/leads/outreach` - Send outreach email to lead
- `GET /api/leads/outreach` - Get outreach history

### Trial Activation
- `POST /api/onboarding/activation-events` - Track trial user actions
- `GET /api/onboarding/activation-events` - Get trial status

### Trial Conversion
- `POST /api/onboarding/convert` - Convert trial to paid subscription

### Cron Jobs
- `GET /api/cron/lead-discovery` - Daily lead discovery (runs at 8 AM UTC)

---

## Security Notes

1. Never commit `.env` files or API keys to git
2. Rotate GITHUB_TOKEN and TWITTER_BEARER_TOKEN quarterly
3. Use CRON_SECRET to prevent unauthorized cron triggering
4. Store tokens only in Vercel environment variables, not in code
5. Monitor Vercel logs for API errors and rate limiting
