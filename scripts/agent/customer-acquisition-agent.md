# Customer Acquisition Agent

AI Agent for automated lead finding and customer acquisition across marketplaces.

## Agent Role

- **Primary Goal**: Find, score, and acquire high-value customers from AWS Marketplace, AppSumo, G2
- **Methods**: Automated lead capture, scoring algorithms, marketplace monitoring, targeted outreach
- **Tools**: HubSpot CRM, Zapier Workflows, Slack notifications, Stripe billing

## Key Capabilities

### 1. Lead Finding & Capture
- Monitor AWS Marketplace for product inquiries
- Track AppSumo deal performance and customer feedback
- Watch G2 reviews and user feedback
- Auto-capture leads via webhook: `/api/webhooks/zapier/marketplace`

**Usage:**
```bash
@agent-customer-acquisition "Find new leads from our AWS Marketplace listings"
```

### 2. Lead Scoring & Qualification
Automatic scoring based on:
- Marketplace source (AWS +25, AppSumo +20, G2 +15)
- Company presence (+10)
- Pricing tier interest (+15)
- Email engagement tracking
- Website visit frequency

**Thresholds:**
- 🔥 **HOT** (75+): Instant Slack alert + create deal
- 🌤️ **WARM** (50-74): Track + add to nurture list
- ❄️ **COLD** (<50): Monitor + add to future outreach

**Usage:**
```bash
@agent-customer-acquisition "Score our leads and show me the hot ones (75+)"
```

### 3. HubSpot CRM Management
- Create/update contacts from leads
- Create deals for qualified opportunities
- Segment by source and engagement
- Track deal pipeline progression

**Usage:**
```bash
@agent-customer-acquisition "Show me hot leads from this week by marketplace source"
@agent-customer-acquisition "Create deals for all leads scoring above 70"
```

### 4. Slack Notifications
- Real-time alerts for hot leads (score 75+)
- Daily digest of new leads by source
- Deal stage updates
- Revenue milestones

**Setup:**
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
@agent-customer-acquisition "Send daily lead summary to #sales"
```

### 5. Marketplace Monitoring
- AWS Marketplace product status
- AppSumo deal performance metrics
- G2 review sentiment analysis
- Competitor tracking

**Usage:**
```bash
@agent-customer-acquisition "Monitor our marketplace performance today"
@agent-customer-acquisition "How many new leads from each marketplace?"
```

### 6. Revenue Tracking
- Connect Stripe payment events
- Log to Google Sheets for analytics
- Calculate customer acquisition cost (CAC)
- Track revenue by source

**Usage:**
```bash
@agent-customer-acquisition "Show me revenue and lead volume by marketplace this month"
```

## Integration Points

```
Marketplace (AWS/AppSumo/G2)
         ↓
    Webhook Receiver
         ↓
    Lead Scoring Engine
         ↓
    HubSpot CRM ←→ Slack Notifications
         ↓
    Deal Pipeline
         ↓
    Stripe/Revenue Tracking
```

## Configuration

### Environment Variables
```bash
# HubSpot
HUBSPOT_API_KEY=pat-na2-XXXXXXXXXXXXX

# Slack (optional but recommended)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX

# Stripe (for revenue tracking)
STRIPE_API_KEY=sk_live_XXXXXXXXXXXXXXXX

# PostHog (for analytics)
POSTHOG_API_KEY=phc_XXXXXXXXXXXXXXXX
```

### Required Zapier Workflows

1. **AWS Marketplace → Webhook** 
   - Trigger: New product inquiry
   - Action: POST to `/api/webhooks/zapier/marketplace`

2. **AppSumo → Webhook**
   - Trigger: New customer
   - Action: POST to `/api/webhooks/zapier/marketplace`

3. **G2 Reviews → HubSpot**
   - Trigger: New review
   - Action: Create contact/log review in HubSpot

4. **Stripe Charges → Google Sheets**
   - Trigger: Payment succeeded
   - Action: Log to "Revenue Tracking" sheet

5. **HubSpot Hot Leads → Slack**
   - Trigger: Contact score > 75
   - Action: Send Slack notification

## Daily Workflow

### Morning (8 AM)
```
Agent runs:
1. Fetch leads from past 24h
2. Score all new contacts
3. Create deals for qualified leads (50+)
4. Send morning digest to #sales Slack
```

### Throughout Day
- Real-time Slack alerts for hot leads (75+)
- Continuous marketplace monitoring
- Lead engagement tracking

### End of Day (5 PM)
- Daily summary email with metrics
- Revenue update in Google Sheets
- Deal pipeline review

## Success Metrics

Track monthly:
- **Lead Volume**: Total new leads by source
- **Conversion Rate**: Leads → Deals → Customers
- **Average Score**: Lead quality trend
- **CAC**: Cost per acquisition by source
- **Revenue per Source**: AWS vs AppSumo vs G2 performance

## Commands

### View All Leads
```bash
@agent-customer-acquisition "Show me all leads from this week"
@agent-customer-acquisition "Filter leads: score > 50, source = aws-marketplace"
```

### Create Outreach
```bash
@agent-customer-acquisition "Draft outreach email for hot leads"
@agent-customer-acquisition "Schedule follow-up for warm leads"
```

### Monitor Performance
```bash
@agent-customer-acquisition "Monthly revenue by marketplace"
@agent-customer-acquisition "Lead quality trend - are scores going up?"
```

### Manual Actions
```bash
@agent-customer-acquisition "Move contact to nurture list"
@agent-customer-acquisition "Create deal for [email]"
```

## Limitations & Next Steps

**Current State** ✅
- ✅ Lead capture via webhook
- ✅ HubSpot integration ready
- ✅ Zapier workflows configured
- ✅ Slack notifications setup
- ✅ Lead scoring algorithm

**Coming Soon** 🚀
- [ ] Email outreach sequences (awaiting email integration)
- [ ] Predictive scoring (ML model)
- [ ] Competitive intelligence dashboard
- [ ] Multi-language outreach templates
- [ ] Advanced analytics & CAC reporting

## Running the Agent

### Option 1: Claude Code (Recommended)
```bash
# In Claude Code session:
/remember customer-acquisition-agent
# Then ask questions about leads, scoring, revenue, etc.
```

### Option 2: Direct Commands
```bash
npm run revenue:process:leads     # Score all current leads
npm run revenue:monitor:marketplace # Check marketplace status
npm run revenue:webhook:setup      # Verify webhook endpoint
```

### Option 3: Scheduled Runs (Vercel Cron)
```bash
# In vercel.json - runs automatically each morning:
"crons": [{
  "path": "/api/cron/lead-processing",
  "schedule": "0 8 * * *"  # 8 AM daily
}]
```

## Support & Troubleshooting

**Leads not appearing?**
- Verify HubSpot API key has correct scopes
- Check webhook is deployed: `curl https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/marketplace`
- Check Zapier workflow logs for errors

**Scores look wrong?**
- Review scoring algorithm in `/scripts/revenue/process-leads.mjs`
- Check HubSpot custom property names match

**Slack not notifying?**
- Verify SLACK_WEBHOOK_URL env var is set
- Test manually: `npm run revenue:process:leads`

**Need help?**
- Check documentation in `scripts/revenue/README.md`
- Review HubSpot setup guide
- Test with sample lead via curl command above
