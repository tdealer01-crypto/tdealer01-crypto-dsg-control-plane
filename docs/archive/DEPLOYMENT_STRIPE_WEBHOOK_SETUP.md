# Stripe Webhook Configuration Guide

This guide walks through setting up and validating Stripe webhooks for the DSG Control Plane billing system.

## Overview

Stripe webhooks allow real-time notification of billing events (subscription updates, charges, refunds, payouts) to your application. The webhook endpoint receives signed HTTPS POST requests that must be verified before processing.

**Current Production URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

---

## 1. Webhook Endpoint Setup

### 1.1 Endpoint URL Format

For development and production:

```
https://[YOUR_VERCEL_URL]/api/stripe/webhook/events
```

Replace `[YOUR_VERCEL_URL]` with:

- **Development (local Stripe CLI):** `http://localhost:3000` or your tunnel URL
- **Preview/Staging:** `https://[preview-deployment].vercel.app`
- **Production:** `https://tdealer01-crypto-dsg-control-plane.vercel.app`

### 1.2 Current Implementation

The webhook route is implemented in:

```
app/api/stripe/webhook/route.ts
```

**Key characteristics:**

- Accepts `POST` requests only
- Requires `stripe-signature` header (set by Stripe)
- Verifies signature using `stripe.webhooks.constructEvent()`
- Fails closed: returns `400` on invalid signature
- Requires both `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` environment variables

---

## 2. Stripe Dashboard Configuration

### 2.1 Navigate to Webhooks Section

1. Log in to your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Developers** (left sidebar, bottom section)
3. Click **Webhooks**
4. You'll see two sections:
   - **Hosted endpoints** — webhooks created in the dashboard
   - **Endpoints** — your application's webhook endpoints

### 2.2 Add a New Endpoint

If this is your first webhook:

1. Click **+ Add endpoint** button
2. Enter your endpoint URL:
   ```
   https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events
   ```
3. Click **Select events** to choose which events to listen for
4. When finished, click **Add endpoint**

If you already have an endpoint, click on it to view/edit events.

---

## 3. Required Webhook Events

Enable the following events in your webhook configuration:

### Billing & Payment Events

| Event | Purpose | Handler |
|-------|---------|---------|
| `charge.created` | New charge created | Finance governance audit trail |
| `charge.updated` | Charge status changed | Audit trail update |
| `payout.created` | Payout initiated | Finance reconciliation |
| `payout.updated` | Payout status changed (succeeded, failed) | Payout tracking |
| `refund.created` | Refund issued | Compliance audit trail |

### Subscription Events

| Event | Purpose | Handler |
|-------|---------|---------|
| `customer.subscription.created` | New subscription (already handled by checkout.session.completed) | Entitlement creation |
| `customer.subscription.updated` | Subscription changed (plan upgrade/downgrade, status change) | Entitlement update |
| `customer.subscription.deleted` | Subscription canceled | Entitlement revocation |
| `customer.subscription.trial_will_end` | Trial ending in 3 days | Email notification |

### Checkout Events

| Event | Purpose | Handler |
|-------|---------|---------|
| `checkout.session.completed` | Checkout completed; subscription created | Entitlement sync |

### Full Event Selection Process

In the Stripe Dashboard:

1. Click **Select events** (or if editing, click **Select events** to update)
2. A modal appears with searchable event categories:
   - Search for `charge` → enable `charge.created`, `charge.updated`
   - Search for `payout` → enable `payout.created`, `payout.updated`
   - Search for `refund` → enable `refund.created`
   - Search for `customer.subscription` → enable subscription events
   - Search for `checkout.session` → enable `checkout.session.completed`
3. Click **Save events** or **Add events**

---

## 4. Signing Secret Retrieval and Storage

### 4.1 Find Your Signing Secret

1. In the **Webhooks** section of the Stripe Dashboard, click your endpoint URL
2. Scroll down to **Signing secret**
3. The secret will be displayed as: `[YOUR_WEBHOOK_SIGNING_SECRET]`
4. Click **Reveal** to display the full secret
5. Click **Copy** to copy it to clipboard

**Important:** This secret is sensitive. Never commit it to version control.

### 4.2 Store in Environment Variables

#### For Development (Local `.env.local`)

Create or edit `.env.local` in the project root:

```bash
STRIPE_SECRET_KEY=[YOUR_STRIPE_SECRET_KEY]
STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SIGNING_SECRET]
```

#### For Preview/Staging (Vercel)

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add new variable:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `[YOUR_WEBHOOK_SIGNING_SECRET]`
   - Environment: Select applicable (Preview, Production, or both)
4. Click **Save**

#### For Production (Vercel)

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `[YOUR_WEBHOOK_SIGNING_SECRET]` (production signing secret)
   - Environment: **Production** only
4. Click **Save**
5. Trigger a production deployment to apply the variable

**Verification:**

```bash
curl -fsSL https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status | jq .
```

Should return `200` and confirm deployment.

---

## 5. Testing Webhook Delivery

### 5.1 Using the Stripe Dashboard (Easiest)

1. In the **Webhooks** section, click your endpoint
2. Scroll to **Recent events**
3. Click **Send test event** → Select event type (e.g., `charge.created`)
4. Click **Send event**
5. In **Recent events**, you should see:
   - Status: **200** (success) or error code
   - Attempt response body
   - Timestamp

### 5.2 Using Stripe CLI (Development)

For local development:

1. Install [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Log in and link your account:
   ```bash
   stripe login
   ```
3. Forward Stripe events to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook/events
   ```
4. This outputs your signing secret (starts with `whsec_`). Add it to `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=[YOUR_WEBHOOK_SIGNING_SECRET]
   ```
5. In another terminal, trigger a test event:
   ```bash
   stripe trigger charge.created
   ```
6. Monitor the forwarded request in the first terminal

### 5.3 Direct cURL Test (Production/Staging)

Use the `/scripts/test-stripe-webhook.sh` script to send a webhook with proper HMAC signature:

```bash
bash scripts/test-stripe-webhook.sh \
  --url https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
  --secret [YOUR_WEBHOOK_SIGNING_SECRET] \
  --event charge.created
```

See [Stripe Webhook Signature Verification](./STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md) for the signing formula.

---

## 6. Webhook Verification Checklist

Use this checklist after webhook setup:

- [ ] Endpoint URL is registered in Stripe Dashboard
- [ ] All required events are enabled (charge, payout, refund, subscription)
- [ ] Signing secret (`STRIPE_WEBHOOK_SECRET`) is stored in:
  - [ ] `.env.local` for local development
  - [ ] Vercel Environment Variables for staging/production
- [ ] Environment variables are set and app has been redeployed
- [ ] Test webhook sent from dashboard returns `200` status
- [ ] Webhook route logs show successful signature verification
- [ ] Database entitlements table reflects test subscription update
- [ ] Email notifications (if configured) sent on subscription events
- [ ] Webhook timeouts are configured (Stripe default is 3 seconds)

---

## 7. Troubleshooting

### 7.1 Invalid Signature Errors

**Symptom:** Webhook returns `400` with `"error": "invalid_signature"`

**Causes & Solutions:**

1. **Wrong signing secret used**
   - Verify you're using the correct `STRIPE_WEBHOOK_SECRET` (for that environment)
   - If testing locally with Stripe CLI, use the secret output by `stripe listen`
   - Do NOT use the publishable key (`pk_test_...`) or API key (`sk_test_...`)

2. **Body was modified before verification**
   - The route must read the raw request body as text before JSON parsing
   - Current implementation: `const body = await req.text()`
   - If body is read twice, signature will fail

3. **Timestamp too old (Stripe CLI / dashboard test)**
   - Stripe verifies that the timestamp in the signature is recent (within 5 minutes)
   - Dashboard tests add `t=` timestamp automatically
   - If testing from cURL, ensure your machine clock is in sync:
     ```bash
     ntpdate -s time.nist.gov
     ```

**Fix:**

```typescript
// Correct: read body as raw text first
const body = await req.text();
const sig = req.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);

// Wrong: parsing JSON first loses signature verification ability
const jsonData = await req.json(); // ← Don't do this before verification
```

### 7.2 Webhook Timeout Errors

**Symptom:** Stripe shows `504 Gateway Timeout` or `408 Request Timeout` in webhook events

**Causes:**

1. Vercel function timeout (default 60 seconds for hobby, 900 for pro)
2. Database query is slow (Supabase cold start)
3. Stripe API call during webhook processing is slow

**Solutions:**

1. **Check Vercel function logs:**
   ```bash
   vercel logs --follow
   ```

2. **Optimize database queries:**
   - Cache customer lookups
   - Use indexes on `stripe_customer_id` and `stripe_subscription_id`
   - Check Supabase query logs for slow queries

3. **Reduce webhook processing time:**
   - Move non-critical work to background jobs (e.g., email sending)
   - Queue events for asynchronous processing if needed

4. **Increase Vercel function timeout:**
   - Go to Vercel Project Settings → Functions → Adjust timeout
   - Production plan allows up to 900 seconds (15 minutes)

### 7.3 Missing or Mismatched Environment Variables

**Symptom:** Webhook returns `501` with `"error": "stripe_not_configured"`

**Causes:**

1. `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` not set
2. Variables set in wrong environment (preview vs production)
3. App not redeployed after variable update

**Solutions:**

1. Verify variables are set in Vercel:
   ```bash
   vercel env ls
   ```

2. Check environment targeting:
   - Go to Vercel Project Settings → Environment Variables
   - Ensure variable is set for your target environment (Preview/Production)

3. Redeploy to apply:
   ```bash
   vercel deploy --prod
   ```

4. Verify deployment includes the variable:
   ```bash
   curl -fsSL https://[YOUR_URL]/api/agent/status
   ```

### 7.4 Webhook Events Not Received

**Symptom:** Dashboard shows `Recent events` but no log entries; webhook never called

**Causes:**

1. Endpoint URL is incorrect or unreachable
2. Firewall/network blocking inbound Stripe IP addresses
3. SSL certificate issue (if using custom domain)
4. Endpoint removed or disabled

**Solutions:**

1. **Test endpoint is reachable:**
   ```bash
   curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
     -H "stripe-signature: t=invalid,v1=invalid" \
     -H "content-type: application/json" \
     -d '{}'
   ```
   Should return `400` (invalid signature), not timeout or 404.

2. **Verify endpoint in dashboard:**
   - Go to Developers → Webhooks
   - Click your endpoint
   - Scroll to **API version** — ensure it's the version your Stripe SDK uses
   - Check **Status** — should be "Enabled"

3. **Check Stripe IP allowlist:**
   - If your Vercel project is IP-restricted, add Stripe IPs to allowlist
   - Stripe publishes IPs at https://stripe.com/files/ip-addresses/ip-addresses.json

4. **SSL certificate validation:**
   - Ensure domain has valid certificate (Vercel provides this automatically)
   - Test: `curl -I https://tdealer01-crypto-dsg-control-plane.vercel.app`

### 7.5 Signature Verification Failures in Tests

**Symptom:** Unit tests fail with `invalid_signature` when mocking Stripe

**Solution:** Mock `stripe.webhooks.constructEvent` to return a valid event:

```typescript
const mockEvent = {
  id: 'evt_1',
  type: 'charge.created',
  data: { object: { id: 'ch_1', amount: 1000 } },
} as Stripe.Event;

mockStripeInstance.webhooks.constructEvent.mockReturnValue(mockEvent);
```

See `tests/unit/billing/stripe-webhook.test.ts` for full examples.

---

## 8. Monitoring & Alerts

### 8.1 Webhook Health Checks

Periodically verify webhook connectivity:

```bash
# Test signature verification
bash scripts/test-stripe-webhook.sh \
  --url https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe/webhook/events \
  --secret [YOUR_WEBHOOK_SIGNING_SECRET] \
  --event charge.created \
  --dry-run
```

### 8.2 Stripe Dashboard Alerts

1. Go to Developers → Webhooks → Your endpoint
2. If status is **Disabled**, click **Enable** to re-enable
3. Monitor **Recent events** for failures:
   - Status codes other than `200` indicate processing errors
   - Check response body for error messages

### 8.3 Application Logs

Check application logs for webhook processing errors:

```bash
# Vercel logs
vercel logs --follow app/api/stripe/webhook

# Local development
npm run dev
# Monitor console output
```

---

## Next Steps

1. **Complete Stripe OAuth setup** — See [DEPLOYMENT_STRIPE_OAUTH_SETUP.md](./DEPLOYMENT_STRIPE_OAUTH_SETUP.md)
2. **Verify webhook signatures** — See [STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md](./STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md)
3. **Test webhook delivery** — Run `bash scripts/test-stripe-webhook.sh`
4. **Monitor production** — Set up alerts in Stripe Dashboard for failed webhooks
5. **Schedule regular tests** — Add webhook health checks to your monitoring pipeline

---

## References

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Stripe Event Types](https://stripe.com/docs/api/events/types)
- [Webhook Signature Verification](./STRIPE_WEBHOOK_SIGNATURE_VERIFICATION.md)
