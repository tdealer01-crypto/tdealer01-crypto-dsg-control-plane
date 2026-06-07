# Stripe Configuration Verification Guide

Complete step-by-step guide to verify Stripe configuration across local environment, Stripe Dashboard, and deployed endpoints.

**Table of Contents:**
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Configuration Checklist](#configuration-checklist)
- [Stripe Dashboard Verification](#stripe-dashboard-verification)
- [Webhook Configuration & Testing](#webhook-configuration--testing)
- [OAuth Configuration & Testing](#oauth-configuration--testing)
- [API Key Validation](#api-key-validation)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

---

## Prerequisites

### Required Tools

- **Bash** (4.0+) — Script execution
- **curl** — HTTP requests for testing
- **jq** — JSON parsing
- **Node.js** (16+) — Project dependencies
- **Stripe CLI** (optional but recommended) — Webhook testing and local forwarding

### Required Credentials

- **Stripe Secret Key** — Format: `sk_test_*` or `sk_live_*`
- **Stripe Webhook Secret** — Format: `whsec_test_*` or `whsec_live_*`
- **Stripe App Client ID** — Format: `ca_*` or `ca_oauth_*`
- **Stripe App Client Secret** — (OAuth completion)

### Environment Setup

Create or update `.env.local` in the project root:

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_YOUR_SECRET_HERE
STRIPE_APP_CLIENT_ID=ca_oauth_YOUR_CLIENT_ID
STRIPE_APP_CLIENT_SECRET=your_client_secret_here

# Optional: Restrict API keys (for enhanced security)
STRIPE_RESTRICTED_KEY=rk_test_YOUR_RESTRICTED_KEY

# Deployment URLs
WEBHOOK_URL=http://localhost:3001/stripe/webhook/events  # Local dev
WEBHOOK_URL=https://your-app.vercel.app/api/stripe/webhook/events  # Production

# Supabase (for audit trail verification)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## Quick Start

### 1. Validate Configuration Locally

```bash
# Run all configuration checks
./scripts/validate-stripe-config.sh

# Expected output:
# ✓ PASS: STRIPE_SECRET_KEY is set
# ✓ PASS: STRIPE_SECRET_KEY format is valid
# ✓ PASS: Stripe API key is valid and connected
# ✓ PASS: STRIPE_WEBHOOK_SECRET format is valid
# ... (more checks)
```

### 2. Test Webhook Delivery

```bash
# Send test webhook to local endpoint
./scripts/test-webhook-delivery.sh

# Expected output:
# ✓ PASS: Webhook delivered successfully (HTTP 200)
# ✓ PASS: Audit trail entry created
```

### 3. Verify in Stripe Dashboard

Visit https://dashboard.stripe.com/webhooks and confirm:
- Webhook endpoint is registered
- Events are being received
- Recent test events show "Sent" status

---

## Configuration Checklist

### Local Configuration

- [ ] `.env.local` or `.env` file created with Stripe credentials
- [ ] `STRIPE_SECRET_KEY` set to `sk_test_*` or `sk_live_*`
- [ ] `STRIPE_WEBHOOK_SECRET` set to `whsec_test_*` or `whsec_live_*`
- [ ] `STRIPE_APP_CLIENT_ID` set to `ca_*` pattern
- [ ] `STRIPE_APP_CLIENT_SECRET` set (if using OAuth)
- [ ] All required environment variables pass validation check
- [ ] No secrets committed to git (verify with `git log -p --all -S STRIPE_SECRET_KEY`)

### Code Configuration

- [ ] Webhook handler exists at `packages/stripe-app/src/routes/webhooks.ts`
- [ ] Webhook signature validation implemented (`stripe.webhooks.constructEvent`)
- [ ] OAuth handler exists at `packages/stripe-app/src/routes/oauth.ts`
- [ ] OAuth state token validation implemented
- [ ] Error handling for missing secrets (fail-closed)
- [ ] Audit trail recording implemented

### Deployment Configuration

- [ ] Environment variables set in Vercel dashboard
- [ ] Webhook endpoint deployed and accessible
- [ ] Webhook secret deployed (not hardcoded)
- [ ] OAuth redirect URI matches registered URI
- [ ] CORS headers configured if needed
- [ ] Rate limiting configured

### Stripe Dashboard

- [ ] Webhook endpoint registered
- [ ] Webhook signing secret visible and matches local secret
- [ ] OAuth client ID visible in app settings
- [ ] OAuth redirect URI registered
- [ ] Required events enabled on webhook
- [ ] API key has necessary permissions

---

## Stripe Dashboard Verification

### Access Stripe Dashboard

1. Go to https://dashboard.stripe.com
2. Log in with your Stripe account
3. Select the correct account (test or live)

### Verify API Keys

**Location:** Dashboard → [Developers] → API Keys

1. Copy **Secret Key** (labeled as "Secret key")
   - Must start with `sk_test_` (test) or `sk_live_` (production)
   - Ensure it's the **secret key**, not the publishable key

2. Verify API key has required permissions:
   - Read charges
   - Read refunds
   - Read payouts
   - Read webhooks

**Action:** Copy the secret key and verify it matches `STRIPE_SECRET_KEY` in `.env.local`

```bash
# Quick verification
echo "Secret key in file: $(cat .env.local | grep STRIPE_SECRET_KEY)"
echo "Secret key in Dashboard: sk_test_XXXXXXXX... (see above)"
```

### Verify Webhook Endpoint

**Location:** Dashboard → [Developers] → Webhooks

1. Find your endpoint or create a new one:
   - Click **+ Add endpoint**
   - Enter endpoint URL: `https://your-app.vercel.app/api/stripe/webhook/events`
   - Select events to listen for:
     - `charge.created`
     - `charge.updated`
     - `payout.created`
     - `payout.updated`
     - `refund.created`
     - `refund.updated`
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`

2. View webhook details:
   - Click the endpoint to see details
   - Under "Signing secret", copy the secret
   - Must start with `whsec_test_` (test) or `whsec_live_` (production)

3. Verify signing secret matches:

```bash
# Compare signing secret
DASHBOARD_SECRET="whsec_test_..."  # Copy from dashboard
ENV_SECRET=$(grep STRIPE_WEBHOOK_SECRET .env.local | cut -d= -f2)

if [[ "$DASHBOARD_SECRET" == "$ENV_SECRET" ]]; then
    echo "✓ Webhook secrets match"
else
    echo "✗ Webhook secrets DO NOT match"
fi
```

4. Test webhook delivery:
   - In the webhook details page, scroll to "Recent events"
   - Click **Send test event** → **charge.created**
   - Should see event appear with "Sent" status
   - Check your endpoint logs/Supabase for receipt

### Verify OAuth Configuration

**Location:** Dashboard → [Settings] → Connected applications or Apps

1. Find your Stripe App:
   - Look for app with name matching `ca_*` pattern
   - Or go to: https://dashboard.stripe.com/apps

2. Verify OAuth settings:
   - **Client ID:** Should match `STRIPE_APP_CLIENT_ID`
   - **Redirect URIs:** Should include your callback URL
   - **Scopes:** Should include required permissions

3. Add/Update Redirect URI:
   - Click **Edit settings** or **OAuth settings**
   - Add: `https://your-app.vercel.app/stripe/oauth/callback`
   - For local development: `http://localhost:3000/stripe/oauth/callback`
   - Save changes

### Verify API Key Permissions

**Location:** Dashboard → [Developers] → API Keys → (Secret key) → Permissions

Recommended permissions for webhook processing:

```
✓ Read charges
✓ Read refunds
✓ Read payouts
✓ Read payment intents
✓ Read webhooks
✓ Read webhook endpoints
✓ Read events
```

Webhook-specific permissions (if using restricted keys):

```
✓ Read charges data
✓ Read all webhooks
✓ Write webhook endpoints
```

---

## Webhook Configuration & Testing

### 1. Local Webhook Testing

#### Using Stripe CLI

**Prerequisites:**
- Stripe CLI installed: `npm install -g @stripe/stripe-cli`
- Stripe account authenticated: `stripe login`

**Steps:**

```bash
# Terminal 1: Start local dev server
npm run dev  # or: cd packages/stripe-app && npm run dev

# Terminal 2: Forward webhooks to local endpoint
stripe listen --forward-to http://localhost:3001/stripe/webhook/events --events charge.created,charge.updated

# Terminal 3: Trigger test events
stripe trigger charge.created
stripe trigger charge.updated
stripe trigger payout.created
```

**Expected output:**

```
Terminal 2 (stripe listen):
→ webhook        [2024-01-15 10:30:45] charge.created [evt_test_abc123]
→ webhook        [2024-01-15 10:30:45] Webhook signature verified

Terminal 3:
✓ Event created: evt_test_abc123
```

#### Using Test Script

```bash
# Run automated webhook test
./scripts/test-webhook-delivery.sh

# Expected output:
# ✓ PASS: Webhook delivered successfully (HTTP 200)
# ✓ PASS: Webhook signature validated
# ✓ PASS: Audit trail entry created
```

### 2. Production Webhook Testing

#### Send Test Event from Dashboard

1. Go to Dashboard → [Developers] → Webhooks
2. Click your endpoint URL
3. Scroll to "Recent events"
4. Click **Send test event**
5. Select event type (e.g., `charge.created`)
6. Click **Send event**

**Verification:**

```bash
# Check endpoint logs in Vercel dashboard
# Or check Supabase for audit entry

# Query Supabase:
psql $SUPABASE_CONNECTION_STRING -c \
  "SELECT id, event_type, webhook_signature_valid, created_at
   FROM stripe_operation_audits
   ORDER BY created_at DESC
   LIMIT 10;"
```

### 3. Webhook Signature Validation

#### Verify Signature Implementation

```bash
# Check webhook handler for signature validation
grep -n "stripe.webhooks.constructEvent\|webhooks.construct\|verifyWebhook" \
    packages/stripe-app/src/routes/webhooks.ts

# Expected: Find signature validation logic
```

#### Test Signature Validation

```bash
# This script tests signature generation and validation
./scripts/test-webhook-delivery.sh

# The script performs:
# 1. Generates test payload
# 2. Calculates HMAC-SHA256 signature
# 3. Sends POST with Stripe-Signature header
# 4. Verifies webhook is accepted (HTTP 200)
```

#### Signature Format

Stripe webhook signatures follow this format:

```
Stripe-Signature: t=1234567890,v1=abc123def456...
```

Where:
- `t` = timestamp (Unix epoch seconds)
- `v1` = HMAC SHA256 hex digest of `timestamp.payload`

**Manual verification:**

```bash
# Given a webhook signature from Stripe, extract components
SIGNATURE="t=1234567890,v1=abc123def456"
TIMESTAMP=$(echo "$SIGNATURE" | grep -oP 't=\K[^,]+')
SIGNATURE_V1=$(echo "$SIGNATURE" | grep -oP 'v1=\K\S+')

echo "Timestamp: $TIMESTAMP"
echo "Signature: $SIGNATURE_V1"

# Recalculate signature locally
PAYLOAD='{"id":"evt_test_123",...}'
WEBHOOK_SECRET='whsec_test_...'
EXPECTED=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | \
    openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -r | cut -d' ' -f1)

if [[ "$SIGNATURE_V1" == "$EXPECTED" ]]; then
    echo "✓ Signature is valid"
else
    echo "✗ Signature is INVALID"
fi
```

### 4. Webhook Event Processing

#### Verify Event Handlers

```bash
# Check for event handlers in webhook router
ls -la packages/stripe-app/src/handlers/

# Should include:
# - webhook-handler.ts (main router)
# - charge-handler.ts (charge events)
# - payout-handler.ts (payout events)
# - refund-handler.ts (refund events)
```

#### Check Event Processing Flow

```bash
# View webhook processing in logs
curl http://localhost:3000/api/logs?filter=webhook

# Or check Supabase audit table
psql $SUPABASE_CONNECTION_STRING -c \
  "SELECT event_type, decision, reason, created_at
   FROM stripe_operation_audits
   WHERE created_at > now() - interval '1 hour'
   ORDER BY created_at DESC;"
```

---

## OAuth Configuration & Testing

### 1. OAuth Setup in Stripe Dashboard

**Location:** Dashboard → [Settings] → Connected applications

1. Create/Edit OAuth application:
   - **Application name:** "DSG Stripe Gateway"
   - **Application URL:** `https://your-app.vercel.app`
   - **Redirect URIs:** 
     - `https://your-app.vercel.app/stripe/oauth/callback`
     - `http://localhost:3000/stripe/oauth/callback` (local dev)

2. Copy credentials:
   - **Client ID:** Save as `STRIPE_APP_CLIENT_ID`
   - **Client Secret:** Save as `STRIPE_APP_CLIENT_SECRET`

### 2. OAuth Flow Testing

#### Test Authorization Endpoint

```bash
# Simulate OAuth authorization request
curl -X GET "http://localhost:3000/stripe/oauth/authorize" \
  -d "stripe_account_id=acct_test_123" \
  -d "redirect_uri=https://your-app/callback"

# Expected response:
# {
#   "oauth_url": "https://connect.stripe.com/oauth/authorize?client_id=..."
# }
```

#### Test OAuth Callback

```bash
# Simulate OAuth callback from Stripe
curl -X POST "http://localhost:3000/stripe/oauth/callback" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ac_test_abc123",
    "state": "state_xyz789"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Account linked successfully"
# }
```

### 3. OAuth Token Management

#### Verify Token Storage

```bash
# Check that tokens are encrypted in Supabase
psql $SUPABASE_CONNECTION_STRING -c \
  "SELECT id, stripe_account_id, access_token_encrypted, status
   FROM stripe_app_accounts
   LIMIT 5;"

# Verify:
# - access_token_encrypted should not contain plain text
# - status should be 'active'
```

#### Test Token Refresh

```bash
# Check token refresh implementation
grep -n "refresh_token\|refreshToken" \
    packages/stripe-app/src/routes/oauth.ts

# Verify:
# - Refresh token is stored securely
# - Refresh endpoint exists
# - Expired tokens are refreshed automatically
```

---

## API Key Validation

### 1. Key Format Validation

All Stripe keys follow specific formats:

| Key Type | Format | Example |
|----------|--------|---------|
| Secret Key | `sk_test_*` or `sk_live_*` | `sk_test_abc123def456` |
| Publishable Key | `pk_test_*` or `pk_live_*` | `pk_test_xyz789abc` |
| Webhook Secret | `whsec_test_*` or `whsec_live_*` | `whsec_test_def456ghi789` |
| Restricted Key | `rk_test_*` or `rk_live_*` | `rk_test_mno123pqr456` |
| OAuth Client ID | `ca_*` | `ca_oauth_abc123` |

### 2. Key Validation Script

```bash
# Run comprehensive key validation
./scripts/validate-stripe-config.sh

# This checks:
# ✓ Key format is valid
# ✓ Key is accessible (API connectivity)
# ✓ Key has required permissions
# ✓ Key is not expired
```

### 3. Manual API Key Test

```bash
# Test with curl
curl -H "Authorization: Bearer sk_test_YOUR_KEY" \
  https://api.stripe.com/v1/balance

# Expected response:
# {
#   "object": "balance",
#   "available": [...],
#   "pending": [...]
# }

# If you get 401, key is invalid
# If you get 403, key lacks permissions
```

### 4. Key Permissions Check

```bash
# List API key permissions
curl -s -H "Authorization: Bearer sk_test_YOUR_KEY" \
  https://api.stripe.com/v1/api_keys \
  | jq '.data[] | {id, type, restrictions}'

# Verify required permissions:
# - read_charges
# - read_refunds
# - read_payouts
# - read_webhooks
```

---

## Troubleshooting

### Issue: "Webhook signature verification failed"

**Symptoms:**
- Webhook returns HTTP 401
- Log shows: `Invalid signature`

**Root Causes:**
1. Webhook secret doesn't match Stripe Dashboard
2. Timestamp is too old (>5 minutes)
3. Request body was modified in transit

**Solution:**

```bash
# Step 1: Verify webhook secret matches
WEBHOOK_SECRET=$(grep STRIPE_WEBHOOK_SECRET .env.local | cut -d= -f2)
echo "Local webhook secret: ${WEBHOOK_SECRET:0:20}..."

# Go to Dashboard → Webhooks → [Your Endpoint]
# Copy secret shown there and compare

# Step 2: Check timestamp validation
grep -n "timestamp\|time_tolerance\|tolerance" \
    packages/stripe-app/src/routes/webhooks.ts

# Ensure signature validation includes timestamp check
# Default Stripe tolerance is 5 minutes

# Step 3: Check if body is being modified
# Ensure body is not parsed before signature validation
# Signature must be calculated on raw body

# Step 4: Update webhook secret
# If mismatched:
# 1. Go to Dashboard → Webhooks → [Your Endpoint]
# 2. Click "Reveal signing secret"
# 3. Copy the secret (starts with whsec_)
# 4. Update .env.local: STRIPE_WEBHOOK_SECRET=whsec_...
# 5. Restart application
```

### Issue: "Webhook endpoint not reachable"

**Symptoms:**
- Dashboard shows "Unable to reach endpoint"
- No events are delivered
- HTTP 404 or timeout

**Root Causes:**
1. Endpoint URL is incorrect
2. Endpoint is not deployed
3. Firewall/CORS is blocking requests
4. Server is returning error responses

**Solution:**

```bash
# Step 1: Verify endpoint URL
echo "Webhook URL configured: https://your-app.vercel.app/api/stripe/webhook/events"

# Step 2: Test endpoint manually
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}' \
  https://your-app.vercel.app/api/stripe/webhook/events

# Should return HTTP 200 or 401 (if signature invalid)
# Not 404 or 500

# Step 3: Check endpoint deployment
# Go to: https://vercel.com/dashboard
# Verify deployment is "Ready"
# Check "Deployments" tab for latest status

# Step 4: Check logs
# Vercel Dashboard → [Your Project] → Functions
# Look for errors in /api/stripe/webhook/events

# Step 5: Update endpoint in Dashboard
# Dashboard → Webhooks → [Your Endpoint]
# Click "Edit endpoint"
# Verify URL is correct
# Click "Send test event" to verify connectivity
```

### Issue: "OAuth state token validation failed"

**Symptoms:**
- OAuth callback fails
- Error: "Invalid state" or "State token not found"

**Root Causes:**
1. State token was not stored during authorization
2. State token expired before callback
3. State token is being modified

**Solution:**

```bash
# Step 1: Verify state generation
grep -n "state\|State\|generateState" \
    packages/stripe-app/src/routes/oauth.ts

# Ensure state is generated randomly and stored with TTL

# Step 2: Check state storage (should use cache)
# Check Redis/cache implementation:
grep -n "redis\|cache\|store" \
    packages/stripe-app/src/routes/oauth.ts

# Step 3: Verify state validation in callback
grep -n "validateState\|verify.*state" \
    packages/stripe-app/src/routes/oauth.ts

# Step 4: Check state TTL
# State should have short TTL (5-10 minutes)
# If TTL is too long, cache may expire

# Step 5: Test with longer TTL temporarily
# Update: OAUTH_STATE_TTL=600  # 10 minutes
# Test OAuth flow again
```

### Issue: "API key rejected - permissions error"

**Symptoms:**
- API calls return HTTP 403
- Error: "Insufficient permissions"

**Root Causes:**
1. API key doesn't have required permissions
2. API key is for live environment but code uses test
3. Restricted key was created without proper scope

**Solution:**

```bash
# Step 1: Identify which operation is failing
# Check logs for the specific API call

# Step 2: Verify key type
KEY=$(grep STRIPE_SECRET_KEY .env.local | cut -d= -f2)
if [[ "$KEY" =~ sk_test ]]; then
    echo "Using TEST key"
elif [[ "$KEY" =~ sk_live ]]; then
    echo "Using LIVE key"
fi

# Step 3: Check key permissions
curl -s https://api.stripe.com/v1/balance \
  -H "Authorization: Bearer $KEY"

# If 403, key lacks permissions

# Step 4: Create new key with proper permissions
# Dashboard → Developers → API Keys
# Click your key → Edit Permissions
# Enable required permissions:
#   - read_charges
#   - read_refunds
#   - read_payouts
#   - read_webhooks

# Step 5: For restricted keys
# Dashboard → Developers → Restricted API Keys
# Create new key with specific restrictions:
#   Resources: Charges, Refunds, Payouts
#   Operations: Read
```

### Issue: "STRIPE_SECRET_KEY not configured"

**Symptoms:**
- Server returns 500 error
- Logs show: "STRIPE_SECRET_KEY is required"

**Root Causes:**
1. .env file not loaded
2. Environment variable not exported
3. Key name is incorrect

**Solution:**

```bash
# Step 1: Verify .env file exists
ls -la .env .env.local packages/stripe-app/.env*

# Step 2: Verify variable is set
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-NOT SET}"

# Step 3: Load environment manually
source .env.local
echo "STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY:-NOT SET}"

# Step 4: Check variable name in code
grep -r "STRIPE_SECRET_KEY" packages/stripe-app/src/

# Ensure code uses exact variable name

# Step 5: Restart application
npm run dev

# Or for Vercel:
# Go to Dashboard → Settings → Environment Variables
# Verify STRIPE_SECRET_KEY is set
# Redeploy application
```

---

## Security Considerations

### 1. Secret Management

**DO:**
- Store secrets in `.env.local` (never commit)
- Use environment variables for deployment
- Rotate secrets regularly
- Use different keys for test vs. production
- Enable key expiration if available

**DON'T:**
- Commit `.env` files to git
- Print secrets in logs
- Use same key across multiple environments
- Share secrets via email/Slack
- Use hardcoded keys in source code

### 2. Webhook Security

**DO:**
- Always validate webhook signatures
- Check timestamp (reject if >5 minutes old)
- Use signed webhook secret (not API key)
- Process webhooks idempotently
- Log all webhook events for audit

**DON'T:**
- Accept webhooks without signature validation
- Use API key as webhook secret
- Trust webhook content without verification
- Process duplicate webhook IDs
- Expose webhook secret in logs

### 3. OAuth Security

**DO:**
- Use secure random state tokens
- Store state tokens with short TTL
- Validate state on callback
- Use PKCE for OAuth
- Validate redirect URIs

**DON'T:**
- Reuse state tokens
- Store state in URL/cookies
- Accept OAuth callbacks without state
- Store access tokens unencrypted
- Expose tokens in logs

### 4. API Key Security

**DO:**
- Use restricted keys when possible
- Limit key permissions to minimum needed
- Rotate keys annually
- Monitor key usage
- Delete unused keys

**DON'T:**
- Share API keys between apps
- Use publishable key for sensitive operations
- Store keys in source code
- Log API keys
- Use same key for multiple environments

### 5. Audit & Compliance

**DO:**
- Log all Stripe operations
- Record decision reason in audit trail
- Maintain audit logs for 7+ years
- Review logs for suspicious activity
- Document configuration changes

**DON'T:**
- Delete audit logs
- Store sensitive data in logs
- Log customer PII beyond last 4 digits
- Disable audit logging
- Share audit logs publicly

### 6. Deployment Security

**DO:**
- Use HTTPS only
- Enable CORS correctly
- Set rate limits
- Use WAF if available
- Monitor for DDoS

**DON'T:**
- Deploy with debug logging enabled
- Use HTTP for sensitive endpoints
- Allow CORS from `*`
- Skip rate limiting
- Expose internal error messages

---

## Testing Checklist

Before deploying to production, verify:

### Local Testing
- [ ] `./scripts/validate-stripe-config.sh` passes all checks
- [ ] `./scripts/test-webhook-delivery.sh` delivers successfully
- [ ] Webhook events are logged in Supabase
- [ ] OAuth flow completes without errors
- [ ] API key connectivity test passes

### Staging Testing
- [ ] Webhook endpoint is reachable from Stripe
- [ ] Test webhook events are delivered and processed
- [ ] Audit trail entries are created for each webhook
- [ ] OAuth callback redirects correctly
- [ ] Rate limiting works as expected

### Dashboard Verification
- [ ] Webhook endpoint shows "Verified" in Dashboard
- [ ] Recent events show "Sent" status
- [ ] OAuth redirect URI is registered
- [ ] API key has required permissions
- [ ] No warning messages in Dashboard

### Production Pre-Flight
- [ ] Environment variables are set in Vercel
- [ ] HTTPS is enabled
- [ ] Database migrations are applied
- [ ] Backup of Supabase is recent
- [ ] Incident response plan is documented

---

## Getting Help

If you encounter issues not covered here:

1. **Check logs**
   ```bash
   # Local logs
   npm run dev 2>&1 | grep -i stripe
   
   # Vercel logs
   vercel logs
   
   # Supabase logs
   # Go to: https://app.supabase.com → Logs
   ```

2. **Check Stripe Dashboard**
   - Dashboard → Developers → Logs
   - View recent API calls and errors

3. **Consult Stripe Documentation**
   - Webhooks: https://stripe.com/docs/webhooks
   - OAuth: https://stripe.com/docs/connect/oauth-standard-accounts
   - API Reference: https://stripe.com/docs/api

4. **Contact Support**
   - Stripe Support: https://support.stripe.com
   - Project Issues: GitHub Issues

---

## Related Documentation

- **API Reference:** `/docs/API_REFERENCE_TIER2.md`
- **Deployment Guide:** `/docs/DEPLOYMENT_RUNBOOK.md`
- **Stripe OAuth Setup:** `/docs/DEPLOYMENT_STRIPE_OAUTH_SETUP.md`
- **Stripe Webhook Setup:** `/docs/DEPLOYMENT_STRIPE_WEBHOOK_SETUP.md`
- **Supabase Setup:** `/docs/DEPLOYMENT_SUPABASE_SETUP.md`
- **Audit Trail Guide:** `/docs/AUDIT_TRAIL_GUIDE.md`

---

**Last Updated:** 2026-06-07  
**Verification Status:** Active Configuration Guide  
**Version:** 1.0
