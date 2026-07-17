# Zapier Workflows Setup Guide

Complete step-by-step guide to connect AWS Marketplace, AppSumo, and G2 to your customer acquisition system.

## Overview

3 Zapier workflows will be created:
1. **AWS Marketplace → HubSpot** (lead capture)
2. **AppSumo → HubSpot** (customer tracking)
3. **G2 Reviews → Slack** (reputation monitoring)

All send data to: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`

---

## Workflow 1: AWS Marketplace → Lead Capture

### Step 1: Create New Zap in Zapier

1. Go to https://zapier.com
2. Click **"Create"** (top left)
3. Search for **"AWS Marketplace"**
4. Look for **"New Customer"** or **"New Seller Lead"** trigger
   - If not found, use **"Webhooks by Zapier"** → **"Catch Raw Hook"** as trigger
5. Click **Continue**

### Step 2: Set Up Trigger (AWS Marketplace)

**If using AWS Marketplace trigger:**
- Connect your AWS account (follow Zapier auth flow)
- Select **"New Customer"** or **"New Seller Inquiry"**
- Set any filters you need (e.g., product = DSG ONE)

**If using Webhook trigger (fallback):**
- Copy the webhook URL that appears
- Go to AWS Marketplace Seller Console
- Add this webhook to **"Seller Central" → "Notifications" → "Webhooks"**

Click **Continue**

### Step 3: Set Up Action (Webhook)

1. Click **Add step**
2. Search for **"Webhooks by Zapier"**
3. Select **"POST"**
4. Click **Continue**

### Step 4: Configure POST Request

Fill in the fields:

```
URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace

Payload Type: JSON

Body:
{
  "email": "INSERT AWS_CUSTOMER_EMAIL",
  "name": "INSERT AWS_CUSTOMER_NAME",
  "company": "INSERT AWS_CUSTOMER_COMPANY",
  "source": "aws-marketplace",
  "pricingTier": "INSERT TIER OR LEAVE BLANK"
}
```

**To map fields:**
- Click into each "INSERT" section
- Select the corresponding field from AWS trigger (will show as blue pills like `Customer Email`, `Customer Name`, etc.)

Example after mapping:
```json
{
  "email": Customer Email,
  "name": Customer Name,
  "company": Customer Company,
  "source": "aws-marketplace",
  "pricingTier": Pricing Tier or null
}
```

### Step 5: Test & Publish

1. Click **"Test"** to verify connection
   - Check your terminal: `npm run revenue:process:leads` should show new lead
   - Check HubSpot: New contact should appear
2. If test passes, click **"Publish"**
3. Name the Zap: **"AWS Marketplace → DSG Lead Capture"**

✅ **Workflow 1 Complete!**

---

## Workflow 2: AppSumo → Lead Capture

### Step 1: Create New Zap

1. Go to https://zapier.com → **Create**
2. Search **"AppSumo"**
3. Choose **"New Customer"** trigger
4. Click **Continue**

### Step 2: Connect AppSumo

1. Click **"Sign in with AppSumo"**
2. Authorize Zapier to access your AppSumo account
3. Select your vendor account
4. Choose trigger: **"New Purchase"** or **"New Deal Inquiry"**
5. Click **Continue**

### Step 3: Set Up Webhook Action

1. Click **"Add step"**
2. Search **"Webhooks by Zapier"** → **"POST"**
3. Click **Continue**

### Step 4: Configure POST

```
URL: https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace

Body:
{
  "email": Customer Email,
  "name": Customer Name,
  "company": Customer Company,
  "source": "appsume",
  "pricingTier": Selected Plan or Tier
}
```

Map fields from AppSumo trigger to JSON body.

### Step 5: Test & Publish

1. Click **"Test"**
2. Verify in HubSpot that contact appears
3. Click **"Publish"**
4. Name: **"AppSumo → DSG Lead Capture"**

✅ **Workflow 2 Complete!**

---

## Workflow 3: G2 Reviews → Slack Alert

### Step 1: Create New Zap

1. Go to https://zapier.com → **Create**
2. Search **"G2"**
3. Choose **"New Review"** trigger
4. Click **Continue**

### Step 2: Connect G2

1. Click **"Connect a New Account"**
2. Sign in with G2 credentials
3. Select your product: **"DSG ONE"**
4. Choose **"New Review Posted"** trigger
5. Click **Continue**

### Step 3: Set Up Slack Action

1. Click **"Add step"**
2. Search **"Slack"** → **"Send Channel Message"**
3. Click **Continue**

### Step 4: Configure Slack Message

1. Select your Slack workspace & channel: **#reviews** (or #alerts)
2. Message template:

```
🌟 New G2 Review - DSG ONE

Reviewer: {{Reviewer Name}}
Rating: {{Rating}} / 5 stars
Comment: {{Review Text}}

Link: {{Review URL}}

Sentiment: {{Positive or Negative}}
```

Click **Continue**

### Step 5: Test & Publish

1. Click **"Test"** 
2. Check your Slack channel for message
3. Click **"Publish"**
4. Name: **"G2 Review → Slack Alert"**

✅ **Workflow 3 Complete!**

---

## Alternative: G2 → HubSpot (Instead of Slack)

If you prefer logging G2 reviews to HubSpot instead:

### Step 3 (Alternative): Set Up HubSpot Action

1. Click **"Add step"**
2. Search **"HubSpot"** → **"Create Contact"**
3. Click **Continue**

### Step 4 (Alternative): Configure HubSpot

Map fields:
```
Email: Reviewer Email (or "review@g2.com" if not available)
First Name: Reviewer Name
Last Name: "Review"
Company: Review Company (if available)
Notes: Review Text
Source: "G2 Review"
```

### Step 5: Publish

Name: **"G2 Review → HubSpot Note"**

---

## Testing Your Workflows

### Test 1: Verify Webhook Receiver

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testcustomer@company.com",
    "name": "Test Customer",
    "company": "Test Co",
    "source": "aws-marketplace",
    "pricingTier": "professional"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Lead received",
  "id": "lead_XXXXXXX",
  "received_at": "2026-07-17T12:00:00.000Z"
}
```

### Test 2: Check HubSpot

1. Go to https://app.hubspot.com
2. Navigate to **Contacts**
3. Search for test email
4. Verify contact created with correct data

### Test 3: Check Lead Score

```bash
npm run revenue:process:leads
```

Output should show:
```
📥 Fetching recent leads (limit: 50)...
Found 1 leads

🔥 HOT: Test Customer (testcustomer@company.com) - 55/100
📊 Results:
   🔥 Hot leads (75+): 0
   🌤️  Warm leads (50-74): 1
   ❄️  Cold leads (<50): 0
```

---

## Troubleshooting

### Webhook Returns 400 Error

**Problem**: "Missing required fields"
- **Solution**: Ensure JSON includes `email`, `name`, and `source`
- Check field names are lowercase

### HubSpot Contact Not Created

**Problem**: Contact appears in webhook but not in HubSpot
- **Solution**: 
  1. Check HubSpot API key is valid: `npm run revenue:setup:hubspot`
  2. Verify HubSpot Zapier authentication in Zapier app settings
  3. Check Zapier zap run logs for errors

### Slack Message Not Sending

**Problem**: Zapier test fails with Slack
- **Solution**:
  1. Verify Slack workspace is connected
  2. Confirm channel exists: `/list-channels` in Slack
  3. Check bot has permission to post (channel settings)

### No Leads Showing in HubSpot After Days

**Problem**: Workflows created but no leads appearing
- **Solution**:
  1. Verify marketplace is actually generating leads
  2. Check Zapier task history: https://zapier.com/app/zaps
  3. Look for red X marks (failed tasks)
  4. Click failed task to see error details
  5. Common issues:
     - Webhook URL typo
     - JSON format error
     - API key expired

---

## Monitoring Your Workflows

### Weekly Checklist

- [ ] Check Zapier task history for failed runs
- [ ] Verify leads appearing in HubSpot
- [ ] Run `npm run revenue:process:leads` to see lead scores
- [ ] Check Slack for G2 review alerts
- [ ] Monitor HubSpot deal pipeline

### Monthly Review

```bash
npm run revenue:monitor:marketplace
# Shows AWS, AppSumo, G2 status and manual checklist
```

---

## Next Steps After Setup

1. ✅ Workflows running → Leads capturing
2. ✅ HubSpot syncing → Contacts created
3. 🔄 **Coming**: Email outreach sequences
4. 🔄 **Coming**: Predictive lead scoring (ML)
5. 🔄 **Coming**: Revenue analytics dashboard

---

## Quick Reference: Webhook Format

All workflows POST to the same endpoint with this JSON structure:

```json
{
  "email": "string (required)",
  "name": "string (required)", 
  "company": "string (optional)",
  "source": "string (required) - aws-marketplace|appsume|g2|other",
  "pricingTier": "string (optional) - professional|enterprise|etc"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead received",
  "id": "lead_TIMESTAMP_RANDOM",
  "received_at": "ISO8601_TIMESTAMP"
}
```

---

## Support

- **Zapier Issues**: Check task history at https://zapier.com/app/zaps
- **HubSpot Issues**: `npm run revenue:setup:hubspot`
- **Lead Scoring Issues**: `npm run revenue:process:leads`
- **Webhook Testing**: Use curl command above
