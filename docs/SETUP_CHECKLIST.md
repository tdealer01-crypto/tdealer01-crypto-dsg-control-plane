# Zapier Revenue Automation - Complete Setup Checklist

**Status:** Ready for Implementation | **Date:** 2026-07-13

---

## 📋 Pre-Setup Verification

Before starting, ensure you have:

- [ ] Slack workspace admin access
- [ ] Stripe account with API keys
- [ ] Google Workspace account
- [ ] Gmail authorized for sending
- [ ] Zapier account (at least Professional plan for webhooks)
- [ ] PostHog account access
- [ ] Control plane API access (for API integration)

---

## 🔄 6-Step Setup Sequence

### Step 1: Slack Channel Setup ✅
**Estimated Time:** 5 minutes

#### 1.1 Create #revenue Channel
- [ ] Go to Slack workspace: https://app.slack.com
- [ ] Click "+" or "Browse channels"
- [ ] Click "Create channel"
- [ ] Channel name: `revenue`
- [ ] Description: "Automated revenue tracking & payment notifications"
- [ ] Visibility: Private (recommended for sensitive data)
- [ ] Click "Create"

**Slack Channel URL:** `slack://channel/revenue`

#### 1.2 Add Zapier Bot to Channel
- [ ] Go to: https://zapier.com/apps/slack
- [ ] Click "Connect" or "Add to Slack"
- [ ] Authorize Zapier app for your workspace
- [ ] Select `#revenue` channel
- [ ] Click "Authorize"
- [ ] Verify bot added: Zapier should appear in channel members

**Verification:**
- [ ] Zapier bot visible in #revenue channel
- [ ] Can send test message: "@Zapier test"

---

### Step 2: Stripe Webhook Configuration 🔗
**Estimated Time:** 5 minutes

#### 2.1 Get Zapier Webhook URL
- [ ] Open Zapier dashboard
- [ ] Navigate to your Revenue Tracking Zap
- [ ] Find Stripe trigger
- [ ] Copy webhook URL (format: `https://hooks.zapier.com/hooks/...`)

#### 2.2 Create Webhook in Stripe
- [ ] Go to: https://dashboard.stripe.com/webhooks
- [ ] Click "Add endpoint"
- [ ] Paste Zapier webhook URL
- [ ] Select events:
  - [ ] `charge.succeeded`
  - [ ] `payment_intent.succeeded`
  - [ ] `invoice.payment_succeeded`
  - [ ] `customer.created`
  - [ ] `invoice.created`
- [ ] Click "Add endpoint"

#### 2.3 Test Webhook Connection
- [ ] In Stripe webhook details, click "Send test event"
- [ ] Select `charge.succeeded`
- [ ] Verify Zapier receives the event
- [ ] Check webhook logs show HTTP 200 response

**Verification Checklist:**
- [ ] Webhook endpoint created
- [ ] All 5 events selected
- [ ] Test event received successfully
- [ ] Zapier logs show successful trigger

---

### Step 3: Dashboard Visualization Setup 📊
**Estimated Time:** 15 minutes

#### 3.1 Access Google Sheet
- [ ] Go to: https://docs.google.com/spreadsheets/d/1wu9v5AsukM4XminIeO12ACEGwi5aEkHUEWTkudnsxBc/edit
- [ ] Verify all 4 worksheets present:
  - [ ] Payments
  - [ ] Customers
  - [ ] Service Delivery
  - [ ] Communications

#### 3.2 Create Charts Sheet
- [ ] Click "+" to create new sheet
- [ ] Rename to "Dashboard"
- [ ] This will hold all visualizations

#### 3.3 Add Chart 1: Daily Revenue Trend
- [ ] On Dashboard sheet, click "Insert" → "Chart"
- [ ] Data range: `Payments!A:F` (Date through Currency columns)
- [ ] Chart type: Line chart
- [ ] X-axis: Date
- [ ] Y-axis: Amount (sum)
- [ ] Title: "Daily Revenue Trend"
- [ ] Click "Insert"

#### 3.4 Add Chart 2: Revenue by Top Customers
- [ ] Insert new chart
- [ ] Data range: `Customers!A:H` (Customer_Name, Lifetime_Value)
- [ ] Chart type: Bar chart (top 10)
- [ ] Title: "Revenue by Customer (Top 10)"
- [ ] Sort: Descending by Lifetime_Value

#### 3.5 Add Chart 3: Payment Status Distribution
- [ ] Insert new chart
- [ ] Data range: `Payments!D:H` (Status, Amount)
- [ ] Chart type: Pie chart
- [ ] Title: "Payment Status Distribution"
- [ ] Segments: Status (Completed, Failed, Pending)

#### 3.6 Add Chart 4: Service Quota Usage
- [ ] Insert new chart
- [ ] Data range: `Service Delivery!B:I` (Customer, Usage_Percent)
- [ ] Chart type: Gauge chart or Bar
- [ ] Title: "Service Quota Usage (%)"
- [ ] Conditional formatting: Red at 80%+

#### 3.7 Add Chart 5: Customer Acquisition Rate
- [ ] Insert new chart
- [ ] Data range: `Customers!G:G` (First_Payment_Date)
- [ ] Chart type: Column chart
- [ ] Aggregation: Count by week
- [ ] Title: "Customer Acquisition (Weekly)"

#### 3.8 Add Chart 6: Communication Activity
- [ ] Insert new chart
- [ ] Data range: `Communications!A:F` (Date, Communication_Type)
- [ ] Chart type: Stacked area chart
- [ ] Title: "Communication Activity by Type"
- [ ] Stacked: By Communication_Type

**Verification Checklist:**
- [ ] Dashboard sheet created
- [ ] All 6 charts inserted and visible
- [ ] Charts have proper titles
- [ ] Charts update when data changes (test by adding row)

---

### Step 4: Control Plane API Integration 🤖
**Estimated Time:** 10 minutes

The real, deployed endpoint is `app/api/webhooks/zapier/[...path]/route.ts` — it verifies an HMAC-SHA256 signature on every POST and persists rows into `zapier_payment_events`, `zapier_quota_events`, and `zapier_communication_events` in Supabase (migration `20260716120000_create_zapier_webhook_events.sql`). There is no separate "API key" concept for this integration — auth is the shared `ZAPIER_WEBHOOK_SECRET` used to sign requests.

#### 4.1 Generate and store the webhook secret
- [ ] Generate a secret: `openssl rand -hex 32`
- [ ] Set it on Vercel (Production environment) as `ZAPIER_WEBHOOK_SECRET`
- [ ] ⚠️ **Store securely — never commit to git.** See `docs/ENV_VARS_REFERENCE.md` for full setup details.

#### 4.2 Create Webhook Actions in Zapier
Each Zap needs a **Code by Zapier** step immediately before the webhook POST to compute the signature, since Zapier's built-in webhook action can't sign requests itself:

```js
const crypto = require('crypto');
const body = JSON.stringify(inputData); // must match the POST body exactly, byte-for-byte
const signature = crypto.createHmac('sha256', 'YOUR_ZAPIER_WEBHOOK_SECRET').update(body).digest('hex');
output = [{ signature, body }];
```

**Webhook 1: Revenue Logging**
- [ ] In Revenue Tracking Zap, add the Code step above, then add action after Slack notification
- [ ] Action: "Webhooks by Zapier" → "POST"
- [ ] URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/revenue`
- [ ] Headers:
  - [ ] `x-zapier-signature`: `{{signature}}` (from the Code step)
  - [ ] `Content-Type`: `application/json`
- [ ] Body: `{{body}}` (the exact JSON string from the Code step, not a re-serialized copy) containing:
```json
{
  "customer_id": "CUSTOMER_ID_FROM_SHEET",
  "amount": "AMOUNT_FROM_PAYMENTS",
  "currency": "CURRENCY_FROM_PAYMENTS",
  "payment_id": "PAYMENT_ID",
  "invoice_number": "INVOICE_NUMBER",
  "status": "STATUS",
  "timestamp": "DATE_AND_TIME"
}
```
- [ ] Test webhook — expect `{"success": true}` with HTTP 200

**Webhook 2: Quota Update**
- [ ] Add the same Code-step-then-webhook pattern in Service Delivery Manager Zap
- [ ] Action: "Webhooks by Zapier" → "POST"
- [ ] URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/quota`
- [ ] Test webhook

**Webhook 3: Communication Logging**
- [ ] Add the same Code-step-then-webhook pattern in Customer Outreach Zap
- [ ] Action: "Webhooks by Zapier" → "POST"
- [ ] URL: `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/communication`
- [ ] Test webhook

#### 4.3 Verify persistence
- [ ] `GET https://tdealer01-crypto-dsg-control-plane.vercel.app/api/webhooks/zapier/health` returns `"status": "healthy"` (means `ZAPIER_WEBHOOK_SECRET` is configured)
- [ ] Query Supabase directly to confirm rows landed:
  ```sql
  select * from zapier_payment_events order by created_at desc limit 5;
  select * from zapier_quota_events order by created_at desc limit 5;
  select * from zapier_communication_events order by created_at desc limit 5;
  ```
- [ ] A request with a wrong/missing `x-zapier-signature` returns HTTP 401 (confirms signature verification is actually enforced, not skipped)

**Verification Checklist:**
- [ ] `ZAPIER_WEBHOOK_SECRET` generated and set on Vercel
- [ ] All 3 webhooks configured with the Code-step signature pattern
- [ ] Rows visible in `zapier_payment_events` / `zapier_quota_events` / `zapier_communication_events`
- [ ] Unsigned/mis-signed request confirmed to return 401

---

### Step 5: PostHog Analytics Integration 📈
**Estimated Time:** 10 minutes

#### 5.1 Get PostHog API Key
- [ ] Go to: https://us.posthog.com/project/479488/settings/api-keys
- [ ] Copy Personal API Key
- [ ] ⚠️ **Store securely - never commit to git**

#### 5.2 Configure PostHog in Zapier
- [ ] In Zapier, search for "PostHog" app
- [ ] Click "Connect"
- [ ] Paste API key
- [ ] Select Project: "Default project" (479488)

#### 5.3 Add Event Capture to Each Zap

**Revenue Tracking Zap: Capture Payment Event**
- [ ] Add action: "PostHog" → "Capture Event"
- [ ] Event name: `revenue_payment_received`
- [ ] Properties:
  - `customer_id`: from Customers sheet
  - `amount`: from Payments sheet
  - `currency`: from Payments sheet
  - `payment_method`: from Payments sheet
  - `status`: from Payments sheet
- [ ] Test event capture

**Service Delivery Zap: Capture Quota Alert**
- [ ] Add action: "PostHog" → "Capture Event"
- [ ] Event name: `revenue_quota_alert`
- [ ] Properties:
  - `customer_id`: from Service Delivery
  - `quota_allocated`: from Service Delivery
  - `usage_current`: from Service Delivery
  - `usage_percent`: from Service Delivery
  - `alert_level`: from Service Delivery
- [ ] Test event

**Customer Outreach Zap: Capture Email Event**
- [ ] Add action: "PostHog" → "Capture Event"
- [ ] Event name: `revenue_customer_email_sent`
- [ ] Properties:
  - `customer_id`: from Communications
  - `email_type`: from Communications
  - `status`: from Communications
- [ ] Test event

#### 5.4 Verify Event Capture
- [ ] Go to PostHog: https://us.posthog.com/project/479488/events
- [ ] Should see captured events in real-time
- [ ] Filter by event name: `revenue_payment_received`, etc.

**Verification Checklist:**
- [ ] PostHog API key secured
- [ ] All event captures configured in Zapier
- [ ] Events appearing in PostHog dashboard
- [ ] Event properties match configuration

---

### Step 6: Live Payment Test 🧪
**Estimated Time:** 20 minutes

#### 6.1 Prepare Test Environment
- [ ] Ensure all previous steps complete
- [ ] Open in separate tabs:
  - [ ] Slack #revenue channel
  - [ ] Google Sheet (Payments tab)
  - [ ] Stripe Dashboard
  - [ ] Test email inbox: test.customer@dsg.pics
  - [ ] PostHog events: https://us.posthog.com/project/479488/events

#### 6.2 Create Test Payment
- [ ] Go to: https://dashboard.stripe.com/payments
- [ ] Click "Create payment"
- [ ] Fill details:
  - [ ] Amount: `1000` (cents = $10.00)
  - [ ] Currency: `USD`
  - [ ] Customer: Select "Test Customer - DSG Enterprise"
  - [ ] Description: "Test payment for Zapier automation"
- [ ] Click "Complete" to charge

#### 6.3 Monitor Real-Time Execution

**⏱️ Within 30 seconds, verify:**

- [ ] **Slack notification** in #revenue:
  - [ ] Message content shows payment details
  - [ ] Amount: $10.00 USD
  - [ ] Customer: Test Customer - DSG Enterprise
  - [ ] Status: Completed

- [ ] **Google Sheet updates**:
  - [ ] Refresh Payments sheet
  - [ ] New row with: 2026-07-13 | Payment | $10.00 | Complete
  - [ ] Payment_ID: from Stripe
  - [ ] Invoice_Number: (if created)

- [ ] **Customer sheet update**:
  - [ ] Refresh Customers sheet
  - [ ] Lifetime_Value updated: $10.00 (or sum if multiple)
  - [ ] Total_Transactions incremented: +1

- [ ] **Service Delivery initialization**:
  - [ ] Refresh Service Delivery sheet
  - [ ] New row for Test Customer
  - [ ] Status: Active
  - [ ] Quota_Allocated: 10000
  - [ ] Health_Status: Healthy

- [ ] **Communications logging**:
  - [ ] Refresh Communications sheet
  - [ ] New row: Invoice email sent
  - [ ] Status: Sent
  - [ ] Subject: Invoice confirmation

- [ ] **Email delivery** (check test.customer@dsg.pics):
  - [ ] Received email from invoices@dsg.pics
  - [ ] Subject: "Invoice & Receipt - Payment Confirmed"
  - [ ] Contains payment details and invoice link

- [ ] **PostHog event**:
  - [ ] Go to: https://us.posthog.com/project/479488/events
  - [ ] Search for `revenue_payment_received`
  - [ ] Event contains correct properties

- [ ] **Control plane API** (if configured):
  - [ ] Check logs: https://tdealer01-crypto-dsg-control-plane.vercel.app/admin/logs
  - [ ] Should see webhook from Zapier
  - [ ] HTTP 200 OK response

#### 6.4 Troubleshooting Guide

**Issue: No Slack notification**
- [ ] Verify Zapier automation is enabled
- [ ] Check Zapier logs for errors
- [ ] Re-test Stripe webhook
- [ ] Verify Zapier bot in #revenue channel

**Issue: Sheet not updating**
- [ ] Refresh page (Ctrl+R)
- [ ] Check Zapier "Add row" action logs
- [ ] Verify Google Sheet permissions
- [ ] Ensure worksheet names match exactly

**Issue: Email not received**
- [ ] Check spam/junk folder
- [ ] Verify Gmail is authorized in Zapier
- [ ] Check email template in Zapier action
- [ ] Verify test email address

**Issue: PostHog event not captured**
- [ ] Verify PostHog API key is correct
- [ ] Check event name matches exactly
- [ ] Verify properties are being passed
- [ ] Check PostHog project ID: 479488

**Issue: Control plane API not receiving webhook**
- [ ] Verify API key is correct
- [ ] Check URL is correct
- [ ] Verify headers include Authorization
- [ ] Check firewall/network access

#### 6.5 Success Verification

All items complete? ✅

- [ ] Slack notification received
- [ ] All 4 sheets updated correctly
- [ ] Invoice email delivered
- [ ] PostHog event captured
- [ ] Control plane API received webhook
- [ ] No errors in any logs

**If all ✅, system is PRODUCTION READY!**

---

## 📊 Final Verification Summary

| Component | Status | Evidence |
|-----------|--------|----------|
| Slack Setup | ✅ | Bot in #revenue, test message sent |
| Stripe Webhook | ✅ | Webhook endpoint active, test event received |
| Dashboard Charts | ✅ | 6 charts created and visible |
| API Integration | ✅ | Control plane receiving webhooks |
| PostHog Analytics | ✅ | Events captured in dashboard |
| Live Payment Test | ✅ | Complete flow verified end-to-end |

---

## 🚀 Go-Live Checklist

Ready for production? Verify:

- [ ] All 6 setup steps complete
- [ ] Live payment test passed (all checks ✅)
- [ ] Team trained on dashboard usage
- [ ] Monitoring dashboards set up
- [ ] Alerts configured in Slack
- [ ] Backup procedures documented
- [ ] Support contacts documented

---

## 📝 Maintenance Schedule

**Daily:**
- [ ] Monitor Slack #revenue for alerts
- [ ] Review Payments sheet for new transactions
- [ ] Check Service Delivery quota alerts

**Weekly:**
- [ ] Review revenue trends in charts
- [ ] Analyze customer acquisition
- [ ] Check communication logs for issues

**Monthly:**
- [ ] Generate revenue report
- [ ] Review quota usage patterns
- [ ] Analyze customer health
- [ ] Update forecasts in PostHog

---

## 🔐 Security Checklist

- [ ] API keys stored securely (not in git)
- [ ] Slack permissions limited to necessary channels
- [ ] Stripe API keys are restricted (no live keys in code)
- [ ] Gmail is service account (not personal)
- [ ] Google Sheet shared only with team members
- [ ] Zapier account has 2FA enabled
- [ ] All logs retention policies set

---

## 📞 Support Contacts

- **Zapier Support:** support.zapier.com
- **Stripe Support:** support.stripe.com
- **Google Workspace:** support.google.com
- **Slack Support:** slack.com/help
- **PostHog Support:** support.posthog.com
- **Control Plane Admins:** [your-team@dsg.pics]

---

**Status:** ✅ Ready for Deployment  
**Last Updated:** 2026-07-13  
**Next Review:** 2026-07-20
