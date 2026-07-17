# AppSumo Direct Webhook Setup Guide

Configure AppSumo to send lead notifications directly to your DSG ONE control plane.

---

## Prerequisites

- AppSumo seller account (or promoted partner account)
- DSG ONE deployment running at `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- Webhook endpoint ready at `/api/webhooks/zapier/marketplace`

---

## Step 1: Verify Webhook Endpoint

Test the endpoint before configuring AppSumo:

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@appsumo.com",
    "name": "Test AppSumo Lead",
    "company": "Test Corp",
    "source": "appsumo-test",
    "pricingTier": "Standard"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Lead received",
  "id": "lead_1234567890_xxxx",
  "received_at": "2026-07-17T13:54:42.885Z"
}
```

Proceed if you get a 200 response with `"success": true`.

---

## Step 2: Access AppSumo Seller Dashboard

### 2.1 Seller Portal Access

1. Go to [AppSumo Seller Central](https://appsumo.com/seller-central)
2. Sign in with your seller/partner account
3. Navigate to **Product Dashboard** or **My Products**

### 2.2 Find Webhook Settings

Look for:
- **Webhooks** (under Settings or Product Settings)
- **Integrations** (under Account or Product)
- **API & Webhooks** (under Advanced Settings)
- **Events** or **Notifications**

If you don't see a webhooks section, AppSumo may require:
- Contacting their support team (`partnerships@appsumo.com`)
- Using their native integrations instead of webhooks
- Upgrading to a partner/enterprise tier

---

## Step 3: Add Webhook Endpoint

If webhooks are available in your seller dashboard:

### 3.1 Create New Webhook

Click **"Add Webhook"** or **"New Integration"**

Enter:
- **URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
- **Method:** POST
- **Content-Type:** application/json

### 3.2 Subscribe to Events

Select events to trigger webhook calls:
- `purchase` or `order_completed`
- `lead_generated`
- `trial_started`
- `subscription_renewed`

Or subscribe to all events if available.

### 3.3 Security (Optional)

If AppSumo offers webhook signing/verification:
- AppSumo will include a signature header in requests
- You can add verification in the route handler (optional)
- Keep the signing secret in `.env.local` for now

---

## Step 4: Test AppSumo → Webhook

### 4.1 Send Test Event

In AppSumo webhooks settings, look for:
- **"Send Test Event"**
- **"Test Webhook"**
- **"Trigger Sample Event"**

Click it to send a test payload to your webhook.

### 4.2 Check Vercel Logs

Monitor for the test event:

```bash
# Using Vercel CLI
vercel logs https://tdealer01-crypto-dsg-control-plane.vercel.app --follow

# Watch for:
# 📥 Lead received from Zapier: { email, name, source, timestamp }
```

### 4.3 Verify Response

AppSumo should receive:
```json
{
  "success": true,
  "message": "Lead received",
  "id": "lead_<timestamp>_<random>",
  "received_at": "2026-07-17T13:54:42.885Z"
}
```

---

## Step 5: Expected AppSumo Payload

AppSumo typically sends events with this structure:

```json
{
  "event_type": "lead_generated",
  "event_id": "evt_abcdef123456",
  "timestamp": "2026-07-17T13:54:42Z",
  "data": {
    "customer": {
      "email": "john.doe@company.com",
      "name": "John Doe",
      "company": "Company Inc",
      "phone": "+1-555-0100"
    },
    "product_id": "dsg-one-control-plane",
    "product_name": "DSG ONE Control Plane",
    "plan": "Professional",
    "coupon_code": "APPSUMO50",
    "price": 99.00,
    "currency": "USD"
  }
}
```

If the structure is different:
- Request documentation from AppSumo
- Update route handler field mapping if needed

---

## Step 6: Field Mapping (if needed)

If AppSumo sends different field names, update the route handler:

**Current handler expects:**
- `email` → customer email
- `name` → customer name
- `company` → customer company
- `source` → lead source identifier
- `pricingTier` → subscription plan

**If AppSumo sends different structure:**

Edit `app/api/webhooks/zapier/marketplace/route.ts`:

```typescript
// Example: if AppSumo sends nested structure
const { data } = parsed.value;
const email = data?.customer?.email;
const name = data?.customer?.name;
const company = data?.customer?.company;
const source = 'appsumo';
const pricingTier = data?.plan;
```

---

## Step 7: Production Setup

### Security Considerations

The webhook endpoint provides:
- ✅ JSON size limit (1024 bytes)
- ✅ Required field validation
- ✅ Unique lead ID generation
- ✅ Timestamp tracking

For production, consider adding:

1. **IP Whitelisting** (optional)
   - Request AppSumo IP ranges
   - Validate sender IP in route handler

2. **Webhook Signature Verification** (if AppSumo supports)
   - Use HMAC signing key
   - Validate request signature before processing

3. **Rate Limiting**
   - Max requests per minute per IP
   - Max total requests per hour

4. **Dead Letter Queue**
   - Log failed lead captures
   - Retry mechanism for transient failures

---

## Step 8: Integration with Lead Scoring

Once leads arrive from AppSumo:

### 8.1 Process Leads

```bash
npm run revenue:process:leads
```

This will:
- Score each lead based on company size, engagement, etc.
- Assign priority (high/medium/low)
- Format for HubSpot sync

### 8.2 Send to HubSpot (optional)

If HubSpot is configured:
```bash
# Create HubSpot contacts from leads
npm run revenue:setup:hubspot
```

### 8.3 Monitor in Slack (optional)

High-value leads can trigger Slack notifications.
Requires: `SLACK_WEBHOOK_URL` in `.env.local`

---

## Troubleshooting

### Webhook Not Firing

**Check:**
1. Webhook URL is exactly: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
2. No extra spaces or trailing slashes
3. Webhook is enabled in AppSumo settings
4. Event types are selected
5. AppSumo account status is active

### 400 Bad Request

**Cause:** Payload format mismatch

**Fix:**
1. Request payload schema from AppSumo
2. Update route handler field extraction
3. Test with curl to verify structure

### 403 Forbidden

**Cause:** IP not whitelisted (if whitelisting enabled)

**Fix:**
1. Check AppSumo webhook logs
2. Add your IP to whitelist if available
3. Contact AppSumo support if issues persist

### 500 Internal Server Error

**Cause:** Unhandled exception in route handler

**Check:**
1. Vercel Function logs for error details
2. Ensure all required fields are being extracted
3. Verify environment variables are set

### Leads Not Appearing in System

**Verify:**
1. Check Vercel logs for "Lead received" message
2. Run `npm run revenue:process:leads` to trigger scoring
3. Check HubSpot for contacts (if integrated)
4. Review server logs for errors

---

## AppSumo Support Resources

- **Email:** partnerships@appsumo.com
- **Portal:** https://appsumo.com/seller-central
- **Docs:** https://appsumo.com/api/docs (if available)

---

## Next Steps

1. ✅ Deploy webhook endpoint (already done)
2. 🔄 Configure AppSumo webhooks (this guide)
3. 📊 Set up lead scoring (npm run revenue:process:leads)
4. 🎯 Connect to HubSpot CRM (HUBSPOT_API_KEY)
5. 📢 Enable Slack alerts (SLACK_WEBHOOK_URL)

---

## Alternative: Manual CSV Sync

If AppSumo doesn't offer webhooks:

1. Export leads as CSV monthly from AppSumo dashboard
2. Run a script to parse and sync to HubSpot:
   ```bash
   npm run revenue:process:leads -- --file=appsumo-leads.csv
   ```
3. Monitor and score new leads automatically

---

## Questions?

1. Check webhook payload in AppSumo logs
2. Test endpoint with curl (Step 1)
3. Review route handler source code
4. Check Vercel deployment logs
5. Contact AppSumo support for API schema
