# Zapier Revenue Automation - Deployment Guide

**Quick Start for Production Deployment**

---

## 🚀 Deployment Phases

### Phase 1: Slack Setup (5 minutes)

```bash
# Step 1: Create #revenue channel
# In Slack workspace → Create Channel → revenue

# Step 2: Add Zapier bot
# Go to: slack.com/apps/A0106R0UF-zapier
# Click "Add to Slack" → Select #revenue channel

# Step 3: Test notification
# Message should appear: "✅ Zapier installed in #revenue"
```

### Phase 2: Stripe Webhook (5 minutes)

```bash
# Step 1: Navigate to Stripe Dashboard
# https://dashboard.stripe.com/webhooks

# Step 2: Add new endpoint
# Endpoint URL: [Zapier will provide this]

# Step 3: Select events
# Events:
#   - payment_intent.succeeded
#   - charge.succeeded
#   - invoice.payment_succeeded

# Step 4: Test webhook
# Stripe will show: "200 OK - Endpoint working"
```

### Phase 3: Gmail Authorization (3 minutes)

```bash
# Step 1: In Zapier, connect Gmail
# Zapier → Apps → Gmail → Connect

# Step 2: Authorize with your email
# Email: invoices@dsg.pics (or your domain)

# Step 3: Test send
# Send test email to test.customer@dsg.pics
```

### Phase 4: Live Testing (10 minutes)

```bash
# Step 1: Create test payment
# Stripe Dashboard → Payments → Create test charge
# Amount: $5,000 USD
# Customer: Test Customer - DSG Enterprise

# Step 2: Monitor workflow
# Watch in real-time:
# ✓ 0-5 seconds: Payment event fires
# ✓ 5-15 seconds: Sheet updates
# ✓ 10-20 seconds: Slack notification appears
# ✓ 15-30 seconds: Email sent to customer

# Step 3: Verify all sheets updated
# Payments sheet: Row added with transaction
# Customers sheet: Lifetime value updated
# Communications sheet: Email logged
# Service Delivery sheet: Service initialized

# Step 4: Confirm customer received email
# Check test.customer@dsg.pics inbox
# Look for: "Invoice & Receipt - Payment Confirmed"
```

---

## 📋 Deployment Checklist

```
PRE-DEPLOYMENT
□ Zapier account configured
□ Google Sheet access granted to team
□ Stripe API keys loaded in Zapier
□ Gmail authorized for sending

DEPLOYMENT
□ #revenue Slack channel created
□ Zapier bot added to #revenue
□ Stripe webhooks configured
□ Gmail sending tested
□ Test payment created & verified

POST-DEPLOYMENT
□ All 3 skills activated
□ First real payment processed
□ Team notified of system live
□ Monitoring dashboard set up
□ Backup procedures documented

MONITORING (First 7 days)
□ Daily review of Payments sheet
□ Daily Slack alert review
□ Monitor email delivery
□ Track quota usage patterns
□ Review customer data accuracy
```

---

## 🔄 Deployment Commands

### Enable All Workflows

```bash
# Load in Zapier:
get_zapier_skill "revenue tracking & customer log"
get_zapier_skill "service delivery manager"
get_zapier_skill "automated customer outreach"

# Status: All should show "✅ SAVED & READY"
```

### Test Individual Components

```bash
# Test Stripe connection:
# Zapier → Stripe → Test connection

# Test Google Sheets:
# Zapier → Google Sheets → Find sheet → Test access

# Test Slack:
# Zapier → Slack → Send test message to #revenue

# Test Gmail:
# Zapier → Gmail → Send test email
```

### Monitor Live

```bash
# Dashboard: https://docs.google.com/spreadsheets/d/1wu9v5AsukM4XminIeO12ACEGwi5aEkHUEWTkudnsxBc/edit
# Refresh every 5 minutes during business hours
# Key metrics:
#   - Payments sheet: New transactions
#   - Customers sheet: New/updated records
#   - Service Delivery sheet: Active services
#   - Communications sheet: Sent emails
```

---

## 🎯 Success Metrics

### Target Timeline
- **Deployment**: < 30 minutes
- **First payment processing**: < 2 minutes
- **Data accuracy**: 100%
- **Slack alert delivery**: < 1 minute
- **Email delivery**: < 5 minutes

### Expected Results (After First 24 Hours)
```
Dashboard should show:
✓ Payments: 1+ transactions logged
✓ Customers: 1+ customer records
✓ Service Delivery: 1+ active services
✓ Communications: 1+ emails logged
✓ Slack: #revenue channel has 5+ notifications
```

---

## ⚠️ Common Issues & Fixes

### Issue: Slack notifications not appearing

**Solution:**
1. Verify #revenue channel exists
2. Check Zapier bot is in the channel
3. Review Zapier automation logs
4. Re-authenticate Slack if needed

### Issue: Payments not appearing in sheet

**Solution:**
1. Verify Stripe webhook is active
2. Check Google Sheet has write permissions
3. Ensure correct sheet ID in Zapier
4. Test with manual sheet entry first

### Issue: Emails not sending

**Solution:**
1. Verify Gmail is authenticated
2. Check email addresses are valid
3. Review Gmail spam folder
4. Test with different email address

### Issue: Quota alerts not triggering

**Solution:**
1. Verify Service Delivery sheet exists
2. Check quota usage is calculated correctly
3. Confirm alert threshold is 80%
4. Test with manual usage entry

---

## 🔐 Security Checklist

```
□ Stripe API keys are restricted (read-only where possible)
□ Google Sheet is shared only with necessary team members
□ Gmail account is service account (not personal)
□ Slack bot has minimal required permissions
□ Zapier account has 2FA enabled
□ All credentials stored securely (not in code)
□ Audit logs are enabled for all integrations
□ Data retention policies are set
□ GDPR compliance reviewed
```

---

## 📊 Rollback Procedure

If issues occur:

```bash
# Step 1: Disable Zapier workflows
Zapier Dashboard → Turn off all 3 skills

# Step 2: Stop Stripe webhooks
Stripe Dashboard → Webhooks → Disable endpoints

# Step 3: Verify no data loss
Google Sheet → Check last entry timestamp

# Step 4: Debug and re-enable
Review Zapier execution logs
Fix configuration
Re-enable workflows one at a time
Test before full rollout
```

---

## 📞 Support Contacts

- **Zapier Support**: support.zapier.com
- **Stripe Support**: support.stripe.com
- **Google Workspace**: support.google.com
- **Slack Support**: slack.com/help

---

## 🎉 Deployment Complete

Once all steps are complete:
1. Document completion date
2. Notify team in #revenue
3. Set up monitoring schedule
4. Archive this deployment guide
5. Update runbooks with new process

**Expected Go-Live: Within 1 hour of starting deployment**

---

**Last Updated:** 2026-07-13  
**Status:** Ready for Deployment  
**Estimated Deployment Time:** 30-45 minutes
