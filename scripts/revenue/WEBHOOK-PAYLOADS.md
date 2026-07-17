# Webhook Payload Examples

Reference payloads for testing the revenue automation webhook with each marketplace.

## AWS Marketplace Payload

**Trigger:** Customer inquiry or subscription event

```json
{
  "email": "enterprise@company.com",
  "name": "Jane Smith",
  "company": "Enterprise Corp",
  "source": "aws-marketplace",
  "pricingTier": "Enterprise"
}
```

**Test command:**
```bash
npm run revenue:test:webhook aws
```

## AppSumo Payload

**Trigger:** Purchase or lead generation

```json
{
  "email": "startup@startup.io",
  "name": "John Chen",
  "company": "StartUp AI Labs",
  "source": "appsumo",
  "pricingTier": "Professional"
}
```

**Test command:**
```bash
npm run revenue:test:webhook appsumo
```

## G2 Payload

**Trigger:** Review posted or lead inquiry (via Zapier)

```json
{
  "email": "manager@company.com",
  "name": "Sarah Johnson",
  "company": "Tech Solutions Inc",
  "source": "g2-reviews",
  "pricingTier": "Standard"
}
```

**Test command:**
```bash
npm run revenue:test:webhook g2
```

---

## Required Fields

All webhooks must include these fields:

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `email` | string | user@company.com | Lead's email address |
| `name` | string | John Doe | Lead's full name |
| `company` | string | ACME Corp | Company name |
| `source` | string | aws-marketplace | Source identifier (aws-marketplace, appsumo, g2-reviews) |
| `pricingTier` | string | Enterprise | Subscription tier (Basic, Professional, Enterprise) |

## Optional Fields

These are ignored by the webhook but can be included:

```json
{
  "email": "user@company.com",
  "name": "Full Name",
  "company": "Company Name",
  "source": "marketplace-source",
  "pricingTier": "Professional",
  
  // Optional fields:
  "phone": "+1-555-0100",
  "website": "https://company.com",
  "industry": "Technology",
  "employeeCount": "100-500",
  "budget": "50000",
  "timeline": "Q3",
  "useCase": "AI Governance"
}
```

---

## Testing Locally

### Test AWS Marketplace webhook:
```bash
npm run revenue:test:webhook aws
```

### Test AppSumo webhook:
```bash
npm run revenue:test:webhook appsumo
```

### Test G2 webhook:
```bash
npm run revenue:test:webhook g2
```

### Manual curl test:
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "company": "Test Corp",
    "source": "test",
    "pricingTier": "Basic"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Lead received",
  "id": "lead_1234567890_xxxxx",
  "received_at": "2026-07-17T13:54:42.885Z"
}
```

---

## Webhook Integration Points

### AWS Marketplace
Configure in: **Seller Central → Settings → Notifications → Webhooks**

Event types:
- Customer Inquiry
- New Customer
- Subscription Changed
- Refund Requested

### AppSumo
Configure in: **Dashboard → Integrations → Webhooks** (if available in your tier)

Event types:
- Purchase
- Lead Generated
- Trial Started

### G2
Configure via: **Zapier** → **G2 Trigger** → **Webhook Action**

Event types:
- Review Posted
- Lead Inquiry
- Rating Changed

---

## Lead Scoring

After webhook receives a lead, run scoring:

```bash
npm run revenue:process:leads
```

This will:
1. Load all captured leads
2. Score based on engagement metrics
3. Assign priority (high/medium/low)
4. Send Slack notifications for high-value leads (75+ score)
5. Prepare for HubSpot sync

---

## Response Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Lead captured, process continues |
| 400 | Bad Request | Missing required fields, check payload |
| 405 | Method Not Allowed | Use POST, not GET |
| 500 | Server Error | Webhook handler error, check logs |

---

## Troubleshooting

**Webhook not receiving events:**
- Verify URL matches exactly: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
- Check marketplace webhook is enabled
- Verify event types are selected
- Test with `npm run revenue:test:webhook`

**Leads not scoring:**
- Run: `npm run revenue:process:leads`
- Check for errors in output
- Verify leads exist in captured log

**Missing Slack notifications:**
- Set `SLACK_WEBHOOK_URL` environment variable
- Check Slack webhook URL is valid
- Test notification manually

---

## Example: AWS Marketplace to HubSpot Flow

1. **Customer inquires in AWS Marketplace**
2. **AWS sends webhook to `/api/webhooks/zapier/marketplace`**
3. **Webhook captures lead:**
   ```
   {
     "email": "enterprise@acme.com",
     "name": "Jane Smith",
     "company": "ACME Corp",
     "source": "aws-marketplace",
     "pricingTier": "Enterprise"
   }
   ```
4. **Lead stored locally**
5. **Run scoring:** `npm run revenue:process:leads`
6. **High-value lead (75+) triggers Slack notification**
7. **Lead synced to HubSpot** (requires `HUBSPOT_API_KEY`)
8. **Sales team notified and follows up**

---

## Next Steps

1. ✅ Deploy webhook endpoint (already done)
2. 🔄 Configure marketplace webhooks (AWS/AppSumo/G2)
3. 🧪 Test with `npm run revenue:test:webhook`
4. 📊 Run `npm run revenue:process:leads` to score
5. 🔔 Setup Slack notifications
6. 📈 Monitor lead quality and adjust scoring
