# 💰 Revenue Automation Scripts

Complete automation toolkit for DSG ONE multi-marketplace revenue generation system.

## 📋 Quick Start

### 1. Get API Keys
Before running any scripts, collect your API keys:

```bash
# HubSpot - https://app.hubspot.com/private-apps
export HUBSPOT_API_KEY="pat-na1-..."

# Slack (optional) - https://api.slack.com/apps
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."

# AWS (for marketplace monitoring)
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="..."
```

### 2. Setup HubSpot

```bash
node scripts/revenue/setup-hubspot.mjs
```

This will:
- ✅ Connect to your HubSpot account
- ✅ Create custom properties for lead scoring
- ✅ Set up deal pipeline stages
- ✅ Create a test contact

### 3. Process Leads

```bash
node scripts/revenue/process-leads.mjs
```

This will:
- ✅ Fetch recent leads from HubSpot
- ✅ Score them based on engagement metrics
- ✅ Update scores in HubSpot
- ✅ Send Slack notifications for hot leads

### 4. Monitor Marketplaces

```bash
node scripts/revenue/marketplace-monitor.mjs
```

Shows:
- AWS Marketplace product status
- AppSumo vendor dashboard links
- G2 review metrics (if API key provided)

## 🔧 Available Scripts

### setup-hubspot.mjs
**Setup HubSpot for DSG ONE**

```bash
HUBSPOT_API_KEY=... node scripts/revenue/setup-hubspot.mjs
```

Creates:
- Custom contact properties (lead score, marketplace source, etc.)
- Deal pipeline stages (Prospect → Lead → Won → Lost)
- Test contact for verification

**Interactive:** Yes (prompts for test contact)

---

### process-leads.mjs
**Score and process leads from HubSpot**

```bash
HUBSPOT_API_KEY=... node scripts/revenue/process-leads.mjs
SLACK_WEBHOOK_URL=... node scripts/revenue/process-leads.mjs
```

Scoring algorithm:
- Email engagement (opens, clicks): +10-15 points
- Website visits (5+, 10+): +20-30 points
- Marketplace source (AWS +25, AppSumo +20, G2 +15)
- Demo requests: +30 points
- Trial interest: +15 points
- Recency bonus (visited <7 days): +20 points

Output:
- 🔥 Hot leads (75+/100) - sent to Slack
- 🌤️ Warm leads (50-74/100) - logged
- ❄️ Cold leads (<50/100) - logged

---

### zapier-webhook-handler.mjs
**Setup Zapier webhook receiver**

```bash
node scripts/revenue/zapier-webhook-handler.mjs
```

Creates:
- `app/api/webhooks/zapier/marketplace/route.ts`
- Webhook endpoint for Zapier to send leads
- CORS handling and validation

Webhook URL:
```
https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace
```

Receives:
```json
{
  "email": "customer@company.com",
  "name": "John Doe",
  "company": "ACME Corp",
  "source": "aws-marketplace",
  "pricingTier": "professional"
}
```

---

### marketplace-monitor.mjs
**Monitor marketplace product status**

```bash
node scripts/revenue/marketplace-monitor.mjs
```

Checks:
- AWS Marketplace seller dashboard
- AppSumo vendor dashboard
- G2 reviews and ratings

Provides links to:
- AWS Marketplace management console
- AppSumo vendor dashboard
- G2 product profile

---

## 🔄 Workflow Integration

### Full Automation Loop

```
1. Customer buys on AWS Marketplace / AppSumo / G2
              ↓
2. Zapier webhook sends lead data
              ↓
3. Webhook handler processes lead
              ↓
4. Lead stored in HubSpot
              ↓
5. process-leads.mjs scores the lead
              ↓
6. High-value leads sent to Slack
              ↓
7. Sales team follows up
              ↓
8. Revenue tracked in Stripe
```

## 📊 Environment Variables

```bash
# Required
HUBSPOT_API_KEY=pat-na1-...

# Optional but recommended
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
G2_API_KEY=...

# Deployment (Vercel)
NEXT_PUBLIC_APP_URL=https://tdealer01-crypto-dsg-control-plane.vercel.app
```

## 🚀 Deployment

### Local Development
```bash
# Start dev server
npm run dev

# Test webhook locally
curl -X POST http://localhost:3000/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","name":"Test User","source":"aws-marketplace"}'
```

### Production (Vercel)
```bash
# Deploy to production
npm run deploy:prod

# Set environment variables in Vercel dashboard
# - HUBSPOT_API_KEY
# - SLACK_WEBHOOK_URL
```

## 📈 Monitoring

### Daily Tasks
```bash
# Check lead scoring
node scripts/revenue/process-leads.mjs

# Monitor marketplace status
node scripts/revenue/marketplace-monitor.mjs
```

### Weekly Tasks
- Review high-value leads in HubSpot
- Check marketplace dashboards
- Verify Zapier workflow status
- Review Stripe revenue

### Monthly Tasks
- Generate revenue report
- Analyze lead sources (AWS vs AppSumo vs G2)
- Optimize lead scoring algorithm
- Plan marketing campaigns

## 🔐 Security

⚠️ **Never:**
- Commit API keys to Git
- Share keys in messages
- Print keys in logs
- Use in client-side code

✅ **Do:**
- Use environment variables
- Rotate keys monthly
- Limit API key scopes
- Audit access logs

## 🐛 Troubleshooting

### "HUBSPOT_API_KEY not set"
```bash
export HUBSPOT_API_KEY="your-key-here"
# or
HUBSPOT_API_KEY=... node scripts/revenue/setup-hubspot.mjs
```

### "HubSpot API error 401"
- API key is invalid or expired
- Generate a new key: https://app.hubspot.com/private-apps
- Check key has correct permissions

### "No leads found"
- HubSpot account is new (no leads yet)
- Run Zapier workflows to generate leads
- Create test contact manually

### Webhook not receiving leads
- Check webhook URL is deployed to Vercel
- Verify Zapier webhook is configured correctly
- Check environment variables in Vercel dashboard
- Test with curl command

## 📚 Related Documentation

- [HubSpot Authorization Guide](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-HUBSPOT.md)
- [Zapier Workflows Guide](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-ZAPIER.md)
- [AWS Marketplace Setup](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-AWS.md)
- [AppSumo Setup](../../scratchpad/dsg-automation/AUTHORIZATION-GUIDE-APPSUME.md)
- [Master Checklist](../../scratchpad/dsg-automation/5-MASTER-CHECKLIST.md)
- [Execution Status Report](../../scratchpad/dsg-automation/6-EXECUTION-STATUS-REPORT.md)

## ✨ Next Steps

1. ✅ Collect API keys
2. ✅ Run `setup-hubspot.mjs`
3. ✅ Deploy webhook handler
4. ✅ Configure Zapier workflows
5. ✅ Run `process-leads.mjs` daily
6. ✅ Monitor with `marketplace-monitor.mjs`
7. 🎉 Track revenue growth!

---

**Version:** 1.0.0  
**Last Updated:** 2026-07-17  
**Maintainer:** DSG ONE Revenue Team
