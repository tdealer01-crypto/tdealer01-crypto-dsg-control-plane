# 🚀 Revenue Automation Setup Guide

Complete step-by-step setup for DSG ONE marketplace revenue automation.

## ⏱️ Timeline: Complete in 1-2 Days

- **Day 1 Morning (30 min):** Get API keys
- **Day 1 Afternoon (1 hour):** Run setup scripts
- **Day 1 Evening (1 hour):** Configure Zapier & verify
- **Day 2:** Deploy to production
- **Day 3+:** Monitor and optimize

## 🔑 Step 1: Collect API Keys (30 minutes)

### HubSpot API Key
1. Go to: https://app.hubspot.com/private-apps
2. Click **"Create app"**
3. Name: `DSG ONE Automation`
4. Permissions needed:
   - ✅ crm.objects.contacts.read
   - ✅ crm.objects.contacts.write
   - ✅ crm.objects.contacts.create
   - ✅ crm.objects.deals.read
   - ✅ crm.objects.deals.write
   - ✅ crm.objects.deals.create
   - ✅ crm.objects.companies.read/write
5. Copy the access token (starts with `pat-na1-`)
6. **Save this safely** ⚠️

### Slack Webhook URL (optional but recommended)
1. Go to: https://api.slack.com/apps
2. Create New App
3. From "Basic Information", click "Incoming Webhooks"
4. Click "Add New Webhook to Workspace"
5. Select your channel
6. Copy the Webhook URL
7. **Save this** ⚠️

### AWS Credentials (optional)
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY

Already have these from AWS Marketplace setup? Great! Will use for monitoring.

## 🔧 Step 2: Setup Environment Variables

### Option A: .env.local (Development)
```bash
# Create/edit .env.local
HUBSPOT_API_KEY="pat-na1-..."
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

### Option B: Vercel (Production)
1. Go to: https://vercel.com/settings/environment-variables
2. Add:
   - `HUBSPOT_API_KEY`
   - `SLACK_WEBHOOK_URL`
3. Make sure variables are for "Production"

### Option C: Command Line
```bash
export HUBSPOT_API_KEY="pat-na1-..."
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

## ✅ Step 3: Run Setup Scripts (1 hour)

### 3a. Setup HubSpot Properties and Stages
```bash
npm run revenue:setup:hubspot
```

What it does:
- ✅ Tests HubSpot connection
- ✅ Creates 5 custom properties:
  - `hs_lead_score` (number)
  - `marketplace_source` (text)
  - `pricing_tier_interested` (text)
  - `demo_requested` (yes/no)
  - `api_keys_sent` (yes/no)
- ✅ Creates deal stages:
  - Prospect → Lead → Qualified → Trial → Negotiation → Won → Lost
- ✅ Creates test contact (optional)

**Expected output:**
```
✅ Connected to HubSpot!
✅ Created property: Lead Score
✅ Created property: Marketplace Source
✅ Created property: Pricing Tier Interested
✅ Created property: Demo Requested
✅ Created property: API Keys Sent
✅ Created stage: Prospect
...
✨ HubSpot setup complete!
```

### 3b. Setup Zapier Webhook Handler
```bash
npm run revenue:webhook:setup
```

What it does:
- ✅ Creates webhook route: `app/api/webhooks/zapier/marketplace/route.ts`
- ✅ Handles CORS and validation
- ✅ Receives leads from Zapier

**Expected output:**
```
✅ Created directory: app/api/webhooks/zapier/marketplace
✅ Created webhook handler: app/api/webhooks/zapier/marketplace/route.ts

📋 Zapier Webhook Setup Instructions:
1. Your webhook URL (when deployed):
   https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace
```

### 3c. Test Webhook Locally
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Test webhook
curl -X POST http://localhost:3000/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "company": "Test Co",
    "source": "aws-marketplace",
    "pricingTier": "professional"
  }'
```

**Expected response:**
```json
{
  "success": true,
  "message": "Lead received",
  "id": "lead_123456_abc...",
  "received_at": "2026-07-17T10:30:00Z"
}
```

## 🔗 Step 4: Configure Zapier Workflows (1-2 hours)

See: [AUTHORIZATION-GUIDE-ZAPIER.md](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-ZAPIER.md)

### Quick Summary:
1. Create Zapier account
2. Connect HubSpot (use your API key)
3. Create 5 workflows:
   - AWS Marketplace → HubSpot Contact
   - AppSumo → HubSpot Contact
   - G2 → HubSpot Contact
   - Lead Scoring → Slack Alert
   - Stripe → Customer Setup

Each workflow ends with POST to:
```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace
```

## 🌐 Step 5: Deploy to Production (30 minutes)

### 5a. Deploy to Vercel
```bash
npm run deploy:prod
```

Or manually:
```bash
git add -A
git commit -m "feat: add revenue automation scripts"
git push origin claude/mcp-aws-revenue-apps-hfd73j
```

Then go to Vercel dashboard and "Deploy" the PR.

### 5b. Verify Production Webhook
```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{"email":"test@prod.com","name":"Prod Test","source":"aws-marketplace"}'
```

### 5c. Update Zapier Webhooks
Go to each Zapier workflow and update webhook URL from local to production:
```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace
```

## 📊 Step 6: Monitor and Process Leads (Daily)

### Daily Lead Processing
```bash
npm run revenue:process:leads
```

This will:
- ✅ Fetch all recent leads from HubSpot
- ✅ Score them using engagement metrics
- ✅ Update scores in HubSpot
- ✅ Send Slack alerts for hot leads (75+)

**Example output:**
```
🔄 Processing leads...

Found 25 leads

🔥 HOT:  John Doe (john@company.com) - 87/100
🌤️  WARM: Jane Smith (jane@company.com) - 65/100
❄️  COLD: Bob Johnson (bob@company.com) - 42/100

📊 Results:
   🔥 Hot leads (75+):  3
   🌤️  Warm leads (50-74): 8
   ❄️  Cold leads (<50):  14
```

### Weekly Marketplace Check
```bash
npm run revenue:monitor:marketplace
```

Checks:
- AWS Marketplace seller dashboard
- AppSumo vendor dashboard
- G2 review status

## 🎯 Verify Everything Works

### Checklist
- [ ] HubSpot properties created
- [ ] HubSpot deal stages created
- [ ] Webhook route deployed
- [ ] Webhook responds locally
- [ ] Zapier workflows created
- [ ] Zapier connected to HubSpot
- [ ] Zapier webhook URL correct
- [ ] Webhook responds in production
- [ ] Test lead created via webhook
- [ ] Lead appears in HubSpot
- [ ] `npm run revenue:process:leads` runs successfully
- [ ] Slack notifications sent (if configured)

## 🚦 Expected Data Flow

```
Customer Purchase
     ↓
AWS/AppSumo/G2
     ↓
Zapier Workflow
     ↓
POST /api/webhooks/zapier/marketplace
     ↓
Lead Data Processed
     ↓
Create/Update HubSpot Contact
     ↓
Score Lead (run daily)
     ↓
High-value lead? → Slack Alert
     ↓
Sales Team Follows Up
     ↓
Revenue Booked
```

## 🔐 Security Checklist

- [ ] API keys are in .env.local (not in code)
- [ ] API keys are in Vercel (production)
- [ ] API keys never logged or printed
- [ ] Webhook validates input
- [ ] CORS headers set correctly
- [ ] Rate limiting configured (if needed)
- [ ] Only authorized Zapier IPs can POST

## 🆘 Troubleshooting

### "HUBSPOT_API_KEY not set"
```bash
export HUBSPOT_API_KEY="your-key"
npm run revenue:setup:hubspot
```

### Webhook returns 401
- Check API key in .env.local or Vercel
- Verify Vercel environment variables are deployed
- Test: `npm run dev` and retry locally

### No leads in HubSpot
- Create test contact via setup script
- Check Zapier workflow is "ON"
- Test workflow manually in Zapier
- Check webhook URL is correct

### Slack not getting alerts
- Verify SLACK_WEBHOOK_URL is set
- Check webhook URL is valid
- Test manually:
  ```bash
  curl -X POST $SLACK_WEBHOOK_URL \
    -H "Content-Type: application/json" \
    -d '{"text":"Test message"}'
  ```

## 📚 Related Documentation

- [Scripts README](./README.md)
- [HubSpot Authorization](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-HUBSPOT.md)
- [Zapier Workflows](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-ZAPIER.md)
- [AWS Marketplace](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-AWS.md)
- [AppSumo Setup](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-APPSUME.md)

## ✨ Success! 🎉

Once everything is set up, you have:

```
✅ HubSpot CRM with custom fields
✅ Lead scoring system
✅ Zapier automation workflows
✅ Webhook receiver in Next.js
✅ Slack alerts for hot leads
✅ Production deployment
✅ Daily lead processing
✅ Marketplace monitoring
```

**Your revenue automation is ready!**

Next: Monitor leads daily, respond to customers, track growth in Stripe dashboard.

---

**Questions?** Check [README.md](./README.md) or the authorization guides above.
