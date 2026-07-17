# AWS Marketplace Direct Webhook Setup Guide

Configure AWS Marketplace to send customer lead notifications directly to your DSG ONE control plane without needing Zapier.

---

## Prerequisites

- AWS Marketplace Seller Central access
- DSG ONE deployment running at `https://tdealer01-crypto-dsg-control-plane.vercel.app`
- Webhook endpoint ready at `/api/webhooks/zapier/marketplace`

---

## Step 1: Verify Webhook Endpoint is Live

Test the endpoint before configuring AWS:

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test Lead",
    "company": "Test Corp",
    "source": "aws-marketplace-test",
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

If you get a 200 response with `"success": true`, proceed to Step 2.

---

## Step 2: Configure AWS Marketplace Seller Notifications

### 2.1 Access Seller Central

1. Go to [AWS Marketplace Seller Central](https://sellercentral.aws.amazon.com)
2. Sign in with your seller account
3. Navigate to **Settings** → **Notification Preferences** or **Account Settings** → **Webhooks**

### 2.2 Add Webhook Endpoint

Look for a section titled:
- "Webhooks"
- "Event Notifications"
- "Seller Notifications"

Click **"Add Webhook"** or **"Add Notification URL"**

Enter:
- **Webhook URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
- **Event Types to Subscribe:** Select all or:
  - `Potential Customer Inquiry`
  - `Customer Inquiry`
  - `Subscription Changed`
  - `Product Update Request`

### 2.3 Configure Event Payload (if available)

AWS Marketplace will send events with metadata. Your webhook handler will receive:

```json
{
  "email": "customer@company.com",
  "name": "John Doe",
  "company": "Customer Inc",
  "source": "aws-marketplace",
  "pricingTier": "Enterprise"
}
```

---

## Step 3: Test AWS → Webhook Integration

Once configured in AWS Marketplace:

1. **Generate Test Event** (if available in Seller Central)
   - Look for "Send Test Event" or "Test Webhook" button
   - Check your server logs or Vercel dashboard for incoming request

2. **Monitor Vercel Logs**
   ```bash
   # View real-time logs (if using Vercel CLI)
   vercel logs https://tdealer01-crypto-dsg-control-plane.vercel.app --follow
   ```

3. **Check Console Logs for Lead Receipt**
   - You should see: `📥 Lead received from Zapier: { email, name, source, timestamp }`

---

## Step 4: Verify Lead Flow (Optional)

After leads start arriving:

### 4.1 Check Server Logs

Look in Vercel Function logs for:
```
📥 Lead received from Zapier: {
  email: 'customer@company.com',
  name: 'John Doe',
  source: 'aws-marketplace',
  timestamp: '2026-07-17T13:54:42.885Z'
}
```

### 4.2 Process Leads Automatically

Once leads arrive, trigger the lead scoring process:

```bash
# Locally
npm run revenue:process:leads

# Via API (future enhancement)
# POST /api/revenue/process-leads
```

### 4.3 Monitor in HubSpot (future)

Leads will be scored and can be synced to HubSpot for sales tracking.

---

## Step 5: Production Considerations

### Security

The webhook endpoint:
- ✅ Validates `Content-Type: application/json`
- ✅ Enforces size limit (1024 bytes max)
- ✅ Requires `email`, `name`, `source` fields
- ✅ Returns unique lead ID for tracking

### Rate Limiting

Currently, the endpoint accepts all requests. For production, you may want to:

1. **Add rate limiting** in route handler:
   ```typescript
   // Example: max 100 leads/minute per IP
   const rateLimiter = new Map();
   ```

2. **Add IP whitelisting** (optional):
   - AWS Marketplace IP ranges can be whitelisted if needed

### Monitoring

Set up alerts for:
- High error rate from webhook
- Missing required fields
- Unusual source patterns

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is exactly: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
2. No typos or trailing slashes
3. AWS Seller Central has confirmed the webhook is active
4. Event types are selected in AWS notification preferences

### 400 Bad Request

**Cause:** Missing required fields in payload

**Fix:** Ensure AWS is sending `email`, `name`, and `source` in the payload

### 405 Method Not Allowed

**Cause:** Using GET instead of POST

**Fix:** AWS must POST to the endpoint, not GET

### Payload Mismatch

**If AWS sends different field names:**
- Contact AWS Marketplace support for schema documentation
- May need to add field mapping in webhook route handler
- Example mapping in route:
  ```typescript
  const email = parsed.value.email || parsed.value.seller_email;
  const name = parsed.value.name || parsed.value.seller_name;
  ```

---

## Example AWS Marketplace Payload Format

AWS Marketplace typically sends events like:

```json
{
  "eventType": "CustomerInquiry",
  "eventId": "evt_123456789",
  "timestamp": "2026-07-17T13:54:42Z",
  "customer": {
    "email": "john.doe@company.com",
    "name": "John Doe",
    "company": "Company Inc",
    "phone": "+1-555-0100"
  },
  "productId": "ami-0123456789abcdef0",
  "inquiry": {
    "type": "pricing",
    "message": "Interested in enterprise plan"
  }
}
```

If AWS sends a different structure, you may need to update the route handler's field extraction logic.

---

## Next Steps

1. ✅ Deploy webhook endpoint (already done)
2. 🔄 Configure AWS Marketplace notifications (this guide)
3. 📊 Set up lead scoring automation (npm run revenue:process:leads)
4. 🎯 Connect to HubSpot CRM (requires HubSpot API key)
5. 📢 Add Slack notifications for high-value leads (requires Slack webhook)

---

## Questions or Issues?

1. Check Vercel deployment logs
2. Verify webhook URL in AWS settings
3. Test with curl command from Step 1
4. Review route handler at `app/api/webhooks/zapier/marketplace/route.ts`
