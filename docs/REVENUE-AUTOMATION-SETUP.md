# Complete Revenue Automation Setup Guide

Master orchestration guide for DSG ONE customer acquisition automation across AWS Marketplace, AppSumo, and G2.

---

## Overview

This system automates:
- 📥 Lead capture from multiple marketplaces
- 🎯 Lead scoring and qualification
- 📊 CRM integration (HubSpot)
- 📢 Team notifications (Slack)
- 📈 Revenue tracking and analytics

**Status:** Setup-ready with 3 parallel webhook paths + lead scoring engine

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│           Marketplace Lead Sources                              │
├──────────────┬────────────────────────┬────────────────────────┤
│ AWS Marketplace (Direct Webhook)     │ AppSumo (Direct Webhook) │ G2 (Zapier)
└──────────────┬────────────────────────┬────────────────────────┘
               │                        │
               └────────────┬───────────┘
                           ▼
        ┌──────────────────────────────────┐
        │  Webhook Handler                 │
        │ /api/webhooks/zapier/marketplace │
        └──────────────┬───────────────────┘
                       ▼
        ┌──────────────────────────────────┐
        │  Lead Scoring Engine             │
        │ (npm run revenue:process:leads)   │
        └──────────────┬───────────────────┘
                       ▼
        ┌──────────────────────────────────┐
        │  CRM & Notification Layer        │
        ├─────────────────────────────────┤
        │  • HubSpot Contact Sync          │
        │  • Slack Notifications           │
        │  • Revenue Tracking              │
        └──────────────────────────────────┘
```

---

## Setup Checklist

Follow these steps in order:

### Phase 1: Infrastructure (Already Done ✅)

- [x] Webhook endpoint deployed: `/api/webhooks/zapier/marketplace`
- [x] Lead scoring engine ready: `scripts/revenue/process-leads.mjs`
- [x] HubSpot integration scaffolded: `scripts/revenue/setup-hubspot.mjs`
- [x] Environment variables documented: `.env.example`

### Phase 2: Marketplace Integrations (In Progress 🔄)

#### AWS Marketplace Setup
- [ ] Follow: `docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md`
- [ ] Actions:
  1. Access AWS Marketplace Seller Central
  2. Navigate to Webhooks/Notifications settings
  3. Add webhook: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
  4. Test with sample event
  5. Monitor Vercel logs

**Time estimate:** 15-20 minutes

#### AppSumo Setup
- [ ] Follow: `docs/APPSUMO-WEBHOOK-SETUP.md`
- [ ] Actions:
  1. Access AppSumo Seller Dashboard
  2. Navigate to Webhooks/Integrations
  3. Add webhook URL
  4. Subscribe to lead/purchase events
  5. Test webhook
  6. Monitor logs

**Time estimate:** 15-20 minutes

#### G2 Setup (via Zapier)
- [ ] Follow: `docs/ZAPIER-SETUP-GUIDE.md` (Workflow 3)
- [ ] Actions:
  1. Create Zapier account (if needed)
  2. Create G2 Reviews trigger
  3. Connect to Slack/HubSpot action
  4. Test trigger

**Time estimate:** 10-15 minutes

### Phase 3: Lead Scoring Setup (Next 📋)

- [ ] Configure HubSpot API key in environment:
  ```bash
  # In Vercel or .env.local
  HUBSPOT_API_KEY=pat-na2-xxxxx
  ```

- [ ] Test HubSpot connection:
  ```bash
  npm run revenue:setup:hubspot
  ```

- [ ] Enable lead scoring:
  ```bash
  npm run revenue:process:leads
  ```

**Time estimate:** 10 minutes

### Phase 4: Notifications Setup (Later 📢)

- [ ] Get Slack webhook URL:
  1. Go to [Slack Apps](https://api.slack.com/apps)
  2. Create "Incoming Webhook"
  3. Copy webhook URL

- [ ] Add to environment:
  ```bash
  SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00/B00/XXX
  ```

- [ ] Test notification:
  ```bash
  npm run revenue:monitor:marketplace
  ```

**Time estimate:** 5-10 minutes

### Phase 5: Revenue Analytics (Advanced 📊)

- [ ] Configure Stripe API key (optional):
  ```bash
  STRIPE_SECRET_KEY=sk_test_xxxxx
  ```

- [ ] Run revenue proof script:
  ```bash
  npm run proof:revenue
  ```

**Time estimate:** 15 minutes

---

## Detailed Setup Paths

### Path A: AWS Marketplace Direct Integration

**Why direct instead of Zapier?**
- AWS doesn't have native Zapier integration
- Direct webhooks are simpler and faster
- Full control over payload mapping

**Steps:**
1. Read: `docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md`
2. Access AWS Seller Central
3. Configure webhook in notification settings
4. Test with sample event
5. Monitor Vercel logs for incoming leads

### Path B: AppSumo Direct Integration

**Why direct?**
- AppSumo webhooks available only to certain partner tiers
- Fallback: manual CSV export monthly

**Steps:**
1. Read: `docs/APPSUMO-WEBHOOK-SETUP.md`
2. Check if webhooks available in your tier
3. If yes: configure webhook endpoint
4. If no: export CSV leads and run:
   ```bash
   npm run revenue:process:leads -- --file=appsumo.csv
   ```

### Path C: G2 Reviews via Zapier

**Why Zapier?**
- G2 has native Zapier integration
- Easy two-step workflow setup

**Steps:**
1. Read: `docs/ZAPIER-SETUP-GUIDE.md` (Workflow 3)
2. Create Zapier account
3. Set up G2 → Slack webhook
4. Test trigger in Zapier editor

---

## Testing Each Path

### Test AWS Marketplace Webhook

```bash
# Verify endpoint is live
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@aws.com",
    "name": "AWS Test Lead",
    "company": "Test Corp",
    "source": "aws-marketplace",
    "pricingTier": "Enterprise"
  }'

# Expected: 200 OK with success=true
```

### Test AppSumo Webhook

```bash
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@appsumo.com",
    "name": "AppSumo Test Lead",
    "company": "Test Corp",
    "source": "appsumo",
    "pricingTier": "Professional"
  }'

# Expected: 200 OK
```

### Test Lead Scoring

```bash
npm run revenue:process:leads

# Output should show:
# ✓ Scored X leads
# ✓ High priority: N leads
# ✓ Medium priority: N leads
# ✓ Low priority: N leads
```

### Test HubSpot Integration

```bash
npm run revenue:setup:hubspot

# Output should show:
# ✓ Connected to HubSpot
# ✓ Created/verified properties
# ✓ Test contact created: test-xxx@dsg.pics
```

---

## Environment Variables Required

Set in Vercel or `.env.local`:

```bash
# HubSpot (for CRM sync)
HUBSPOT_API_KEY=pat-na2-xxxxx

# Slack (for notifications) - optional
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Stripe (for revenue tracking) - optional
STRIPE_SECRET_KEY=sk_test_xxxxx

# Anthropic (for agent features) - optional
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

**Never commit these values. Use Vercel secrets UI or local `.env.local`**

---

## Key Files and Scripts

| File | Purpose | Usage |
|------|---------|-------|
| `app/api/webhooks/zapier/marketplace/route.ts` | Lead capture webhook | POST requests from marketplaces |
| `scripts/revenue/process-leads.mjs` | Lead scoring | `npm run revenue:process:leads` |
| `scripts/revenue/setup-hubspot.mjs` | HubSpot setup | `npm run revenue:setup:hubspot` |
| `scripts/revenue/marketplace-monitor.mjs` | Status monitor | `npm run revenue:monitor:marketplace` |
| `docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md` | AWS integration | Step-by-step AWS setup |
| `docs/APPSUMO-WEBHOOK-SETUP.md` | AppSumo integration | Step-by-step AppSumo setup |
| `docs/ZAPIER-SETUP-GUIDE.md` | Zapier workflows | G2 and advanced workflows |

---

## Success Indicators

✅ System is working when:

1. **AWS Marketplace** sends event → Vercel logs show "📥 Lead received"
2. **AppSumo** sends event → Webhook returns `success: true`
3. **Lead Scoring** runs → Shows "Scored N leads with priority distribution"
4. **HubSpot Sync** works → Test contact appears in HubSpot dashboard
5. **Slack Alert** fires → High-value leads trigger notifications

---

## Monitoring & Operations

### Daily Checks

```bash
# Check webhook health
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq .

# Process any new leads
npm run revenue:process:leads

# Monitor marketplace status
npm run revenue:monitor:marketplace
```

### Weekly Review

1. Check Vercel logs for webhook errors
2. Review lead scores and quality
3. Verify HubSpot contact count
4. Check Slack notification patterns

### Monthly Reporting

```bash
# Generate revenue proof
npm run proof:revenue

# Output includes:
# - Total leads captured
# - Average lead score
# - Marketplace distribution
# - Revenue impact (if Stripe connected)
```

---

## Troubleshooting Guide

### Problem: Webhook Not Receiving Events

**Check:**
1. URL is exactly correct (no typos)
2. Marketplace webhook is enabled
3. Event types are selected
4. Webhook has been saved in marketplace settings

**Test:**
```bash
# Manually test endpoint
curl -X POST https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","name":"Test","source":"test","company":"Corp","pricingTier":"Basic"}'
```

### Problem: Leads Not Scoring

**Check:**
1. Leads are being captured (see Vercel logs)
2. `npm run revenue:process:leads` runs without errors
3. No environment variables missing

**Fix:**
```bash
# Clear and re-score
rm -f leads-scored.json
npm run revenue:process:leads
```

### Problem: HubSpot Not Syncing

**Check:**
1. `HUBSPOT_API_KEY` is set correctly
2. API key has required scopes (contacts, deals, pipelines)
3. Run test:
   ```bash
   npm run revenue:setup:hubspot
   ```

**Fix:**
1. Regenerate API key in HubSpot dashboard
2. Verify all required scopes are enabled
3. Re-run setup script

### Problem: Slack Notifications Not Firing

**Check:**
1. `SLACK_WEBHOOK_URL` is set
2. Webhook URL is valid (test in Slack)
3. Lead score is high enough (usually > 75)

**Test:**
```bash
# Send test message
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text":"Test notification"}'
```

---

## Next Steps After Setup

### Immediate (Week 1)
1. ✅ Deploy webhook endpoints
2. ✅ Configure marketplace webhooks
3. ✅ Test lead flow end-to-end
4. ✅ Verify scoring logic

### Short Term (Week 2-3)
1. Refine lead scoring algorithm
2. Add Slack notifications for high-value leads
3. Create sales dashboard in HubSpot
4. Train sales team on new lead flow

### Medium Term (Month 2)
1. Analyze lead quality and conversion rates
2. Adjust scoring weights based on data
3. Add revenue attribution tracking
4. Integrate with Stripe for billing automation

### Long Term (Month 3+)
1. Expand to additional marketplaces
2. Build predictive models for lead quality
3. Implement automated outreach campaigns
4. Create executive dashboard for revenue analytics

---

## Support & Documentation

- **AWS Webhook Help:** `docs/AWS-MARKETPLACE-WEBHOOK-SETUP.md`
- **AppSumo Webhook Help:** `docs/APPSUMO-WEBHOOK-SETUP.md`
- **Zapier Setup Help:** `docs/ZAPIER-SETUP-GUIDE.md`
- **Code Location:** `app/api/webhooks/zapier/marketplace/route.ts`
- **Scripts:** `scripts/revenue/*.mjs`

---

## Summary

You now have:
- ✅ Working webhook endpoint for lead capture
- ✅ Lead scoring engine
- ✅ HubSpot integration framework
- ✅ Slack notification capability
- ✅ Complete documentation for 3 marketplace paths

**Next action:** Choose your primary marketplace integration path and follow the corresponding setup guide.
