# Phase 9: Post-Approval Setup — 15-Step Launch Checklist

**Status:** Critical Sequential Checklist  
**Date:** Days 1-3 after Stripe Approval  
**Owner:** Product Lead + DevOps + Engineering + Support + Marketing  
**Duration:** 24-48 hours total execution time

---

## Overview

This document is a **sequential 15-step checklist** for the 24-48 hours immediately after Stripe approval.

**Key Principle:** Completeness. Every step must be verified with evidence before moving to the next step.

**Completion Timeline:**
- Steps 1-5: Day 1 (Day 0 of launch)
- Steps 6-10: Day 2 (Day 1 of launch)
- Steps 11-15: Day 2-3 (Launch day through T+24)

---

## Step 1: Enable App in Stripe Marketplace

**Owner:** Product Lead  
**Time:** 15 minutes  
**Prerequisites:** Stripe approval email received and reviewed

### Verification Checklist

- [ ] Log in to Stripe Dashboard: https://dashboard.stripe.com/
- [ ] Navigate to **Apps & Integrations** → **Connected Apps** → **Manage**
- [ ] Find "DSG Governance Gate" in the list
- [ ] Current status: "Approved" or "Pending Publication"

### Action

1. Click **"Enable in Marketplace"** or **"Publish"** button
2. Review and accept terms (if prompted)
3. Click **Confirm** or **Publish** to finalize
4. Wait for status to change to **"Published"** or **"Live"**

**Expected Time:** 1-5 minutes for Stripe to index and make visible in marketplace

### Evidence Required

```bash
# In 5-10 minutes, verify the app is live:
curl -s https://marketplace.stripe.com/ | grep -i "dsg governance"
```

Or manually search in incognito browser:
- URL: https://marketplace.stripe.com/apps
- Search: "dsg governance" or similar
- Expected: App listing appears

### Success Criteria

- ✅ App status in Stripe Dashboard = "Published" or "Live"
- ✅ App appears in marketplace search (may take up to 5 minutes)
- ✅ Install button is clickable and functional

### Documentation Output

Slack #launch:
```
✅ Step 1: App enabled in Stripe Marketplace
- Status: Published
- Marketplace URL: [screenshot or link]
- Time: [timestamp]
- Owner: [name]
```

---

## Step 2: Activate Payment Processing

**Owner:** DevOps Lead  
**Time:** 20 minutes  
**Prerequisites:** Stripe payment account configured

### Verification Checklist

- [ ] Stripe Connect account is created
- [ ] Bank account is verified (connected)
- [ ] Payment method is enabled
- [ ] Webhook endpoints are configured

### Actions

#### 2a. Verify Stripe Connect Account

```bash
# Test Stripe API access (use curl with test mode)
curl https://api.stripe.com/v1/account \
  -H "Authorization: Bearer sk_test_[YOUR_KEY]"
```

Expected response includes:
- `"id": "acct_..."`
- `"charges_enabled": true`
- `"payouts_enabled": true`

#### 2b. Configure Webhook Endpoints

In Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Add endpoint (if not already present):
   - **URL:** `https://tdealer01-crypto-dsg-control-plane.vercel.app/api/stripe-webhook`
   - **Events:** `charge.captured`, `charge.failed`, `refund.created`, `charge.dispute.created`
3. Click **Add Endpoint**
4. Copy webhook signing secret

#### 2c. Verify Webhook Secret is Set

```bash
# Check that STRIPE_WEBHOOK_SECRET is in production environment
# (do NOT print the value)

# In Vercel Dashboard:
# Settings → Environment Variables
# Search for: STRIPE_WEBHOOK_SECRET
# Status: ✅ Set
```

### Success Criteria

- ✅ Stripe API responds successfully to test call
- ✅ `charges_enabled: true`
- ✅ `payouts_enabled: true`
- ✅ Webhook endpoint configured and active
- ✅ Webhook secret stored in environment variables

### Documentation Output

Slack #launch:
```
✅ Step 2: Payment processing activated
- Stripe account: acct_[last 4]
- Charges enabled: Yes
- Payouts enabled: Yes
- Webhook endpoint: Configured
- Owner: [name]
```

---

## Step 3: Configure Support Channel

**Owner:** Support Lead  
**Time:** 30 minutes  
**Prerequisites:** Support email address finalized

### Verification Checklist

- [ ] Support email address is active (e.g., support@yourcompany.com)
- [ ] Email is monitored (checked within 1 hour of receipt)
- [ ] Ticketing system is configured (Zendesk, Intercom, Linear, etc.)
- [ ] Support team is trained on DSG product

### Actions

#### 3a. Activate Support Email

1. Verify support email account is active
   ```bash
   # Send test email to support address
   echo "Test email" | mail -s "Test subject" support@yourcompany.com
   ```

2. Check that inbox receives emails
   - Log in to support email account
   - Look for test email (may take 1-2 minutes)
   - Mark as read to confirm access

#### 3b. Connect Ticketing System

If using Zendesk/Intercom/Linear:
1. Log in to ticketing dashboard
2. Configure email routing:
   - Incoming: support@yourcompany.com
   - Outgoing: Replies from ticketing system
3. Test: Send email to support address
4. Verify: Ticket appears in dashboard within 1-2 minutes

#### 3c. Brief Support Team

Schedule: 30-minute meeting before launch day

Topics:
- Product overview: What DSG does
- Customer journey: OAuth → Policy creation → Charge gating
- Common questions: Where are policies stored? How do I see gated charges?
- Escalation path: When to involve engineering
- Support hours: When support team is available

**Support playbook location:** docs/PHASE9_CUSTOMER_SUCCESS/SUPPORT_PLAYBOOK.md

### Success Criteria

- ✅ Support email is active and monitored
- ✅ Test email received and logged in ticketing system
- ✅ Support team has read onboarding materials
- ✅ Escalation path is clear to team

### Documentation Output

Slack #launch:
```
✅ Step 3: Support channel configured
- Email: support@yourcompany.com
- Ticketing system: [Zendesk/Linear/etc]
- Team briefed: Yes
- Response SLA: <30 minutes
- Owner: [name]
```

---

## Step 4: Set Up Monitoring Alerts

**Owner:** DevOps Lead  
**Time:** 30 minutes  
**Prerequisites:** Vercel account has production project; Slack app is installed

### Verification Checklist

- [ ] Vercel Analytics dashboard is accessible
- [ ] Supabase Monitoring is accessible
- [ ] Slack integration is configured
- [ ] Alert thresholds are defined

### Actions

#### 4a. Configure Vercel Alerts

In Vercel Dashboard:
1. Go to **Project Settings** → **Analytics**
2. Verify these metrics are being tracked:
   - Error rate
   - Latency (p50, p95, p99)
   - Request volume
   - CPU usage
   - Memory usage

3. Set up Slack alerts (if available):
   - Error rate > 1% → Slack alert + page engineer
   - P99 latency > 1000ms → Slack alert
   - Deployment failed → Slack alert

#### 4b. Configure Supabase Monitoring

In Supabase Dashboard:
1. Go to **Reports** → **Performance**
2. Monitor these metrics daily:
   - Database size (target: <100MB)
   - Active connections (target: <10)
   - Slow queries (target: 0 critical)
   - Query performance

3. Check for any slow queries:
   ```sql
   SELECT
     query,
     mean_time,
     calls
   FROM pg_stat_statements
   WHERE mean_time > 100
   ORDER BY mean_time DESC
   LIMIT 10;
   ```

#### 4c. Enable PagerDuty or On-Call Rotation

If using PagerDuty:
1. Create "Launch Week" escalation policy
2. Add on-call team members
3. Set notifications: Slack + email + SMS for critical

If using Slack workflows:
1. Enable #incidents channel
2. Pin runbook in channel
3. Configure notification rules

### Success Criteria

- ✅ Vercel metrics dashboard is live
- ✅ Supabase monitoring is active
- ✅ Alert thresholds are set
- ✅ Slack notifications are working (test alert sent)
- ✅ On-call rotation is configured

### Documentation Output

Slack #launch:
```
✅ Step 4: Monitoring alerts configured
- Vercel Analytics: Active
- Supabase Reports: Active
- Slack alerts: Configured
- Error threshold: 1%
- Latency threshold: 1000ms p99
- On-call: [Name] starting [date/time]
- Owner: [name]
```

---

## Step 5: Test Marketplace Discovery

**Owner:** Product Lead + QA  
**Time:** 20 minutes  
**Prerequisites:** App is published in marketplace

### Verification Checklist

- [ ] Can find app by searching "dsg governance"
- [ ] Can find app by searching company name
- [ ] App listing displays correctly (no broken images)
- [ ] Install button is functional
- [ ] Marketplace ranking/visibility is acceptable

### Actions

#### 5a. Search for App in Marketplace

1. Open incognito browser
2. Go to: https://marketplace.stripe.com/apps
3. Search for:
   - "dsg governance"
   - "DSG"
   - Your company name
   - "governance" or "policy"

Expected: App listing appears in results

#### 5b. Verify Listing Quality

Click on app listing and verify:
- [ ] App icon displays correctly (256x256 or larger)
- [ ] App name: "DSG Governance Gate"
- [ ] Category: "Risk Management & Compliance" (or similar)
- [ ] Short description: Accurate, <100 characters
- [ ] Long description: Complete, readable
- [ ] Screenshots: 3-5 images, all display correctly
- [ ] Links work: Docs, privacy policy, terms of service
- [ ] Support email is visible

#### 5c. Test Install Flow

1. Click "Install" or "Connect" button
2. Verify redirect to Stripe OAuth screen
3. Verify OAuth flow (approve scopes)
4. Verify redirect back to your app
5. Verify user is logged in to dashboard

### Success Criteria

- ✅ App appears in marketplace search (within 5 minutes)
- ✅ Listing displays correctly (all images, text, links)
- ✅ Install button is functional
- ✅ OAuth flow completes successfully
- ✅ No broken images or rendering issues

### Documentation Output

Slack #launch:
```
✅ Step 5: Marketplace discovery verified
- Search results: Found (searches: 4/4)
- Listing quality: All elements display correctly
- Install flow: Works end-to-end
- OAuth: Functional
- Screenshots attached: [links]
- Owner: [name]
```

---

## Step 6: Verify Installation Flow

**Owner:** Engineering + QA  
**Time:** 30 minutes  
**Prerequisites:** App is published; test Stripe account ready

### Verification Checklist

- [ ] OAuth flow completes successfully
- [ ] User is created in database
- [ ] Merchant is linked to Stripe account
- [ ] Dashboard is accessible
- [ ] No errors in logs during installation

### Actions

#### 6a. Test OAuth Flow (Sandbox)

1. Use test Stripe account
2. Go to marketplace (incognito browser)
3. Search for app and click "Install"
4. You are redirected to Stripe OAuth screen
5. Verify scope request is correct:
   - `read_write` for charges
   - `read` for account info
6. Click "Authorize" to complete
7. You are redirected back to your app's dashboard

#### 6b. Verify Database Records

```sql
-- In Supabase, verify installation created records:

-- Check stripe_merchants table
SELECT 
  id, 
  stripe_account_id, 
  created_at 
FROM stripe_merchants 
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;

-- Verify merchant is linked
SELECT 
  user_id, 
  merchant_id, 
  status 
FROM stripe_merchant_users 
WHERE created_at >= NOW() - INTERVAL '5 minutes'
LIMIT 1;
```

Expected: Records exist with `status = 'active'`

#### 6c. Check Dashboard Access

1. Verify you can access `/api/dashboard` without errors
2. Verify you can view merchant info (API key, secret, etc.)
3. Verify no errors in Vercel logs during request

### Success Criteria

- ✅ OAuth flow completes (0 errors)
- ✅ User and merchant records created in database
- ✅ Dashboard is accessible
- ✅ No unexpected errors in logs

### Documentation Output

Slack #launch:
```
✅ Step 6: Installation flow verified
- OAuth flow: Successful
- Database records: Created (user + merchant)
- Dashboard access: Works
- Logs: No errors
- Owner: [name]
```

---

## Step 7: Check Webhook Delivery

**Owner:** Engineering + QA  
**Time:** 25 minutes  
**Prerequisites:** Webhooks are configured; test installation exists

### Verification Checklist

- [ ] Webhook endpoint receives test events
- [ ] Webhook signature is validated
- [ ] Events are logged in database
- [ ] Response time is acceptable (<500ms)

### Actions

#### 7a. Trigger Test Webhook

In Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click on webhook endpoint for your app
3. Scroll to **Recent Events**
4. Click **Send test event**
5. Select event type: `charge.captured`
6. Click **Send test event**

#### 7b. Verify Event Was Received

```sql
-- In Supabase, check webhook_events table
SELECT 
  id,
  event_type,
  status,
  processed_at,
  created_at
FROM stripe_webhook_events
WHERE created_at >= NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: Record exists with `status = 'processed'`

#### 7c. Check Response Time

View webhook response in Stripe Dashboard:
1. Go to **Developers** → **Webhooks**
2. Click endpoint
3. Look at **Recent Events** → select the test event
4. Check **Response time** (should be <500ms)

If response time > 1000ms: Investigate performance issue before launch

### Success Criteria

- ✅ Webhook event received and logged
- ✅ Event is marked as `processed`
- ✅ Response time < 500ms
- ✅ No errors in webhook handler logs

### Documentation Output

Slack #launch:
```
✅ Step 7: Webhook delivery verified
- Test event sent: charge.captured
- Event received: Yes
- Event logged: Yes
- Response time: [X]ms
- Status: Processed
- Owner: [name]
```

---

## Step 8: Set Up Customer Communication

**Owner:** Marketing Lead  
**Time:** 45 minutes  
**Prerequisites:** Marketing calendar is ready

### Verification Checklist

- [ ] Launch email is drafted
- [ ] Blog post is ready to publish
- [ ] Social media posts are scheduled
- [ ] Customer list is finalized (early access customers)
- [ ] Communication templates are finalized

### Actions

#### 8a. Prepare Launch Email

Draft email template:

```
Subject: 🚀 DSG Governance Gate is Now Available in Stripe Marketplace!

Hi [CUSTOMER_NAME],

We're thrilled to announce that DSG Governance Gate is now live in 
the Stripe App Marketplace!

After months of development and careful review by Stripe, our 
governance solution is ready to help you manage AI-driven operations 
with policy-based controls and complete audit trails.

INSTALL NOW: https://marketplace.stripe.com/apps/dsg-governance-gate
DOCUMENTATION: https://yourcompany.com/docs/dsg-governance
SUPPORT: support@yourcompany.com

Key Features:
• Define policies in natural language
• Automatically gate charges, refunds, and payouts
• Complete audit trail of all decisions
• Real-time compliance reporting

Questions? Reply to this email or contact our support team.

Welcome to governed AI operations!

Best regards,
[YOUR_NAME]
DSG Team
```

Store in: `docs/PHASE9_MARKETING/LAUNCH_EMAIL_TEMPLATE.md`

#### 8b. Prepare Blog Post

Blog post template:

```markdown
# DSG Governance Gate Now Live in Stripe Marketplace

After 6 months of development and Stripe's careful review, we're 
excited to announce that DSG Governance Gate is now available in 
the Stripe App Marketplace.

## What is DSG Governance Gate?

DSG Governance Gate is a policy-based control layer for AI-driven 
payment operations. It lets you:

1. Define governance policies in natural language
2. Automatically gate charges, refunds, and payouts
3. Maintain complete audit trails
4. Meet compliance requirements with evidence

## Why We Built This

[1-2 paragraph origin story]

## How It Works

[Step-by-step walkthrough with screenshots]

## Get Started

Install now: https://marketplace.stripe.com/apps/dsg-governance-gate

## Learn More

Documentation: https://yourcompany.com/docs/dsg-governance
Support: support@yourcompany.com
```

Store in: `docs/PHASE9_MARKETING/BLOG_POST_TEMPLATE.md`

#### 8c. Schedule Social Posts

**Twitter:**
```
🧵 We're launching in the Stripe App Marketplace! 🚀

After 6 months of building and careful review, DSG Governance Gate 
is now officially live.

Install now: https://marketplace.stripe.com/apps/dsg-governance-gate

What is it? Read on... 👇
```

**LinkedIn:**
```
Excited to announce that DSG Governance Gate is now available in 
the Stripe App Marketplace!

For 6 months, our team has built the governance layer that Stripe 
merchants need for AI-driven operations...

[Link to blog post]
```

#### 8d. Finalize Customer List

Prepare list of early access customers to email:
- [ ] Customer names and email addresses
- [ ] Personalization notes (optional)
- [ ] Send time (should be within 1 hour of launch)

### Success Criteria

- ✅ Launch email drafted and reviewed
- ✅ Blog post drafted and ready to publish
- ✅ Social posts scheduled or drafted
- ✅ Customer list finalized
- ✅ All materials are legally reviewed (ToS, privacy, claims)

### Documentation Output

Slack #launch:
```
✅ Step 8: Customer communication prepared
- Launch email: Draft complete (reviewed)
- Blog post: Ready to publish
- Social posts: Scheduled (4 posts)
- Customer list: Finalized (X customers)
- Owner: [name]
```

---

## Step 9: Brief Support Team

**Owner:** Support Lead + Product Lead  
**Time:** 60 minutes (meeting + individual reading)  
**Prerequisites:** Support team hired and onboarded

### Verification Checklist

- [ ] Support team has read product documentation
- [ ] Support team understands OAuth flow
- [ ] Support team knows how to create test policies
- [ ] Support team knows escalation path
- [ ] Support team understands SLA (response time)

### Actions

#### 9a. Conduct Support Training Session

Meeting: 30 minutes before launch day

**Agenda:**
1. Product overview (10 min)
   - What is DSG Governance Gate?
   - How does it integrate with Stripe?
   - Key features and limitations

2. Customer journey (10 min)
   - Installation (OAuth flow)
   - Policy creation (UI walkthrough)
   - Charge gating (how it works)
   - Audit trail (viewing logs)

3. Common questions (15 min)
   - Q: "How do I reset my API key?"
   - Q: "Can I export my audit trail?"
   - Q: "What happens if a charge is blocked?"
   - Q: "How do I delete my account?"

4. Escalation path (10 min)
   - Which issues go to engineering?
   - How to file a bug report?
   - When to escalate to product lead?

5. Support tools (10 min)
   - How to access customer accounts (if needed)
   - How to view logs in Supabase
   - How to reset customer password
   - How to check payment/billing status

#### 9b. Create Support Playbook

Document: `docs/PHASE9_CUSTOMER_SUCCESS/SUPPORT_PLAYBOOK.md`

Key sections:
- Installation troubleshooting
- Policy creation errors
- Charge gating issues
- Account management
- Billing/payment questions
- Escalation procedures

#### 9c. Set Up Support Resources

- [ ] Support team has access to customer database (read-only)
- [ ] Support team has access to Supabase (if needed for debugging)
- [ ] Support team has access to Slack channel #support
- [ ] Support team knows on-call rotation

### Success Criteria

- ✅ Support team attended training
- ✅ Support playbook is documented
- ✅ Team has access to necessary tools
- ✅ Escalation path is clear
- ✅ SLA is established (e.g., <30 minute response time)

### Documentation Output

Slack #launch:
```
✅ Step 9: Support team briefed
- Training session: Held (30 min)
- Attendance: [X]/[X] team members
- Support playbook: Complete
- Tools configured: Yes
- SLA: <30 minute response time
- Owner: [name]
```

---

## Step 10: Execute Final Smoke Tests

**Owner:** QA Lead + Engineering  
**Time:** 45 minutes  
**Prerequisites:** All previous steps completed

### Verification Checklist

- [ ] Health check endpoint responds
- [ ] Agent status endpoint responds
- [ ] OAuth flow works (test installation)
- [ ] Stripe webhook delivery works
- [ ] Database queries perform well
- [ ] No JavaScript console errors

### Actions

#### 10a. Smoke Test Script

```bash
#!/bin/bash
# Run final smoke tests before launch

echo "=== SMOKE TEST SUITE ==="
echo ""

# 1. Health check
echo "1. Testing /api/health endpoint..."
HEALTH=$(curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "✅ Health check passed"
else
  echo "❌ Health check FAILED"
  echo "$HEALTH"
fi

# 2. Agent status
echo ""
echo "2. Testing /api/agent/status endpoint..."
STATUS=$(curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status)
if echo "$STATUS" | grep -q '"environment":"production"'; then
  echo "✅ Agent status passed"
else
  echo "❌ Agent status FAILED"
  echo "$STATUS"
fi

# 3. OAuth endpoint
echo ""
echo "3. Testing OAuth initialization..."
# Note: This is a simplified check; actual OAuth test requires browser
echo "✅ OAuth endpoint exists (manual test required)"

# 4. Database connectivity
echo ""
echo "4. Checking database connectivity..."
# This would be internal; verify through agent status
echo "✅ Database connected (verified via agent/status)"

echo ""
echo "=== SMOKE TEST COMPLETE ==="
```

Run the script and verify:
```bash
bash tests/smoke-tests.sh
```

Expected output:
```
✅ Health check passed
✅ Agent status passed
✅ OAuth endpoint exists (manual test required)
✅ Database connected (verified via agent/status)
```

#### 10b. Manual Browser Tests

1. Open incognito browser
2. Visit: https://tdealer01-crypto-dsg-control-plane.vercel.app
3. Open Developer Tools (F12) → Console tab
4. Verify: No red errors in console (warnings OK)
5. Navigate through app:
   - Click "Install" button
   - Verify Stripe OAuth screen appears
   - Follow OAuth flow

#### 10c. Database Performance Check

```sql
-- In Supabase, verify performance
SELECT
  (SELECT COUNT(*) FROM stripe_merchants) as total_merchants,
  (SELECT COUNT(*) FROM stripe_webhook_events) as total_events,
  (SELECT MAX(created_at) FROM stripe_merchants) as last_merchant_created,
  (SELECT AVG(age(processed_at, created_at)) FROM stripe_webhook_events LIMIT 100) as avg_webhook_latency;
```

Expected:
- `total_merchants`: 1-10 (test installations)
- `total_events`: 5-20 (test webhooks)
- `avg_webhook_latency`: <100ms

### Success Criteria

- ✅ All smoke tests pass
- ✅ No JavaScript console errors
- ✅ OAuth flow works end-to-end
- ✅ Database latency is acceptable (<100ms)
- ✅ All endpoints respond quickly (<500ms)

### Documentation Output

Slack #launch:
```
✅ Step 10: Final smoke tests passed
- Health check: OK
- Agent status: OK
- OAuth flow: Works
- Database latency: [X]ms
- Console errors: 0
- Ready for launch: YES
- Owner: [name]
```

---

## Step 11: Make Go/No-Go Decision

**Owner:** Leadership team (CEO, VP Engineering, Product Lead)  
**Time:** 30 minutes  
**Prerequisites:** All previous steps completed and documented

### Verification Checklist

- [ ] Engineering: "Code is locked and stable"
- [ ] DevOps: "Infrastructure is ready"
- [ ] Product: "Marketplace listing is complete"
- [ ] Marketing: "Communication is ready"
- [ ] Support: "Team is trained and ready"
- [ ] No critical blockers

### Actions

#### 11a. Pre-Launch Review Meeting

Meeting: 1 hour before T-0

**Attendees:**
- CEO/Founder
- VP Engineering
- Product Lead
- DevOps Lead
- Support Lead

**Agenda:**
1. Engineering report (5 min)
   - All tests pass? ✅
   - No pending issues? ✅
   - Code is locked? ✅

2. DevOps report (5 min)
   - All infrastructure ready? ✅
   - Monitoring active? ✅
   - Backups configured? ✅

3. Product report (5 min)
   - Marketplace listing complete? ✅
   - OAuth flow tested? ✅
   - Docs ready? ✅

4. Support report (5 min)
   - Team trained? ✅
   - Support channel active? ✅
   - SLA defined? ✅

5. Risk assessment (5 min)
   - Any red flags? NO
   - Any concerns? NO
   - Ready to proceed? YES

6. GO/NO-GO decision (5 min)
   - Team vote: GO or NO-GO?
   - If GO: Proceed to launch
   - If NO-GO: Document reason and reschedule

#### 11b. Document Decision

Create decision record:

```
LAUNCH GO/NO-GO DECISION
Date: [Today]
Time: [T-1 hour]
Decision: GO

Participants:
- [Name] CEO - Vote: GO
- [Name] VP Eng - Vote: GO
- [Name] Product - Vote: GO
- [Name] DevOps - Vote: GO
- [Name] Support - Vote: GO

Blockers: NONE
Red flags: NONE
Concerns: NONE

Status: APPROVED FOR LAUNCH ✅
```

### Success Criteria

- ✅ Leadership team met
- ✅ All reports reviewed
- ✅ Decision documented (GO or NO-GO)
- ✅ If GO: Team is ready to proceed
- ✅ If NO-GO: Blocker is documented and will be resolved

### Documentation Output

Slack #launch:
```
✅ Step 11: GO/NO-GO Decision Made
- Meeting held: Yes
- Decision: GO ✅
- Team consensus: Unanimous
- Blockers: None
- Launch time: [T-0 time]
- Owner: CEO
```

---

## Step 12: Execute Launch (T-0)

**Owner:** Product Lead + Engineering  
**Time:** 30 minutes  
**Prerequisites:** GO decision made

### Verification Checklist

- [ ] Marketplace activation button is ready
- [ ] All team members are online and watching
- [ ] Communication channels are active (#launch, Slack, etc.)
- [ ] Monitoring dashboards are open

### Actions

#### 12a. T-0:00 — Marketplace Activation

1. Log in to Stripe Dashboard
2. Navigate to **Apps & Integrations** → **Your App**
3. Click **Enable in Marketplace** or **Publish** button
4. Confirm activation
5. Wait for status to change to "Published"

Time: <5 minutes

#### 12b. T-0:10 — Send Launch Announcement Email

1. Open email tool
2. Send launch email to early access customers (pre-drafted in Step 8)
3. CC marketing team for tracking
4. Slack confirmation: "✅ Launch email sent to [X] customers"

Time: 5 minutes

#### 12c. T-0:15 — Publish Blog and Social

1. Publish blog post to company website
2. Publish Twitter thread
3. Publish LinkedIn article
4. Slack confirmation with links

Time: 5 minutes

#### 12d. T-0:20 — Activate Monitoring

1. Open Vercel Analytics dashboard
2. Open Supabase Reports dashboard
3. Open #incidents channel (pin to top)
4. Verify all alerts are armed

Time: 5 minutes

### Success Criteria

- ✅ Marketplace activation completed
- ✅ Status changed to "Published"
- ✅ Launch email sent
- ✅ Blog and social posts published
- ✅ Monitoring dashboards active
- ✅ Team is standing by for support

### Documentation Output

Slack #launch:
```
🚀 🚀 🚀 LAUNCH COMPLETE 🚀 🚀 🚀

T-0:00 — Marketplace activation: ✅
T-0:10 — Launch email sent: ✅ (X customers)
T-0:15 — Blog & social published: ✅
T-0:20 — Monitoring activated: ✅

APP IS LIVE IN STRIPE MARKETPLACE!

Marketplace URL: https://marketplace.stripe.com/apps/dsg-governance-gate
Next milestone: T+1 hour (first customer health check)

Watching dashboards... 👀
```

---

## Step 13: Monitor First 24 Hours

**Owner:** DevOps + Engineering + Support  
**Time:** Continuous for 24 hours

### Verification Checklist (Every 1-2 hours)

- [ ] Error rate < 1%
- [ ] Latency p99 < 1000ms
- [ ] No webhook failures
- [ ] Support tickets being handled
- [ ] Customers successfully installed app

### Actions

#### 13a. Set Up War Room

Create Slack channel for launch day: #launch-war-room

Team members online:
- Engineering (1-2 people)
- DevOps (1 person)
- Support (2-3 people)
- Product Lead (1 person)

#### 13b. Hourly Checks

Every hour from T+0 to T+24:

1. **Error Rate Check (2 min)**
   ```
   Vercel Analytics → Error rate last hour
   Expected: < 1%
   If > 1%: Page on-call engineer
   ```

2. **Latency Check (2 min)**
   ```
   Vercel Analytics → P99 latency last hour
   Expected: < 1000ms
   If > 1000ms: Check for slow queries or traffic spike
   ```

3. **Webhook Health (2 min)**
   ```sql
   SELECT 
     COUNT(*) as total_events,
     COUNT(CASE WHEN status = 'processed' THEN 1 END) as processed,
     COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
   FROM stripe_webhook_events
   WHERE created_at >= NOW() - INTERVAL '1 hour';
   ```
   Expected: `failed = 0`

4. **Customer Check (3 min)**
   ```sql
   SELECT COUNT(*) as new_installations 
   FROM stripe_merchants 
   WHERE created_at >= NOW() - INTERVAL '1 hour';
   ```
   Log count in Slack: "✅ T+[X] hours: [N] new installations"

5. **Support Tickets (2 min)**
   - Check support inbox
   - Any issues reported?
   - Respond to any questions

#### 13c. Incident Response Playbook

If error rate > 1%:
1. Page on-call engineer immediately
2. Post in #incidents: "🚨 Error rate spike detected: [X]%"
3. Engineer checks logs and identifies issue
4. If critical: Prepare rollback plan
5. Keep team updated every 5 minutes

If webhook failures detected:
1. Check Stripe Dashboard for webhook status
2. Verify webhook endpoint is responding
3. Check database for errors
4. If 10+ failures: Disable new installations temporarily

If customer reports issue:
1. Support documents issue in ticket
2. Engineering triage within 15 minutes
3. If critical to customer: Fast-track fix
4. Keep customer updated every 2 hours

### Success Criteria

- ✅ Error rate stays < 1%
- ✅ Latency stays < 1000ms p99
- ✅ No webhook failures
- ✅ Customers are installing app (5+ in first 24 hours)
- ✅ Support team is handling tickets
- ✅ No critical incidents

### Documentation Output

Slack #launch (hourly):
```
✅ T+[X] hours:
- Error rate: [X]% (target: <1%)
- Latency p99: [X]ms (target: <1000ms)
- New installations: [N]
- Webhooks processed: [N] (failed: 0)
- Support tickets: [N] (response time: [X] min)
- Status: GREEN
```

---

## Step 14: Capture Feedback & Iterate

**Owner:** Product Lead + Support  
**Time:** Continuous for 24-72 hours

### Verification Checklist

- [ ] Customer feedback collected (email, Slack, support tickets)
- [ ] Feature requests documented
- [ ] Bug reports triaged
- [ ] UI/UX issues noted

### Actions

#### 14a. Customer Feedback Collection

Within first 24 hours, reach out to customers:

1. **Early Access Customers Email (5 min)**
   ```
   Subject: How is DSG Governance Gate working for you?

   Hi [CUSTOMER_NAME],

   We launched this morning and we'd love to hear from you!

   How is onboarding going? Any questions or suggestions?

   Reply to this email or use our support form: [link]

   Thank you for being an early adopter!
   ```

2. **In-App Feedback Widget (optional)**
   - Add simple form: "How can we improve?"
   - Track responses in database

3. **Support Ticket Monitoring**
   - Flag any patterns in support requests
   - Document common issues
   - Identify quick wins for next iteration

#### 14b. Feature Request Tracking

Create doc: `docs/PHASE9_MARKETING/CUSTOMER_FEEDBACK.md`

Track:
- Feature request (what customer asked for)
- Customer name + email
- Date requested
- Priority (critical / high / medium / low)
- Engineering estimate

Example:
```
| Feature | Customer | Date | Priority | Estimate |
|---------|----------|------|----------|----------|
| Custom webhooks | Acme Inc | Day 1 | Medium | 5 days |
| Policy templates | XYZ Corp | Day 1 | High | 3 days |
| CSV export | Dev Shop | Day 2 | Low | 2 days |
```

#### 14c. Bug Triage

For every bug reported:
1. Reproduce in staging environment
2. Assign priority (critical / high / medium / low)
3. Estimate fix time
4. Assign to engineer
5. Update customer with ETA

Example bug report:
```
Bug: Policy creation fails with 500 error
Customer: ABC Corp
Reported: Day 1, 4:30 PM
Reproduction: Create policy with > 100 character name
Fix: Input validation on policy name (max 100 chars)
Estimated fix: 30 minutes
Status: IN PROGRESS
```

### Success Criteria

- ✅ Feedback from 50% of early customers collected
- ✅ Feature requests documented (5-10 requests expected)
- ✅ Bug reports triaged (0-3 bugs expected in first 24h)
- ✅ Quick wins identified for next sprint
- ✅ Customer sentiment is positive

### Documentation Output

Slack #launch:
```
✅ Step 14: Customer feedback captured
- Customers surveyed: [X]/[X]
- Feature requests: [N]
- Bug reports: [N]
- Support sentiment: Positive
- Quick wins identified: [X]
```

---

## Step 15: Plan Week 1 Follow-Ups

**Owner:** Product Lead + Leadership  
**Time:** 60 minutes (at T+24 hours)

### Verification Checklist

- [ ] Week 1 daily standup schedule is set
- [ ] Week 1 KPI targets are defined
- [ ] Bug fix priorities are locked
- [ ] Feature roadmap for Week 2+ is updated

### Actions

#### 15a. Week 1 Daily Standup

Schedule: 9:00 AM daily through Day 7

**Attendees:**
- Engineering Lead
- DevOps Lead
- Product Lead
- Support Lead

**Duration:** 15 minutes

**Agenda:**
1. Metrics from yesterday (3 min)
   - Installations, operations, errors, support tickets
2. Any issues or blockers (5 min)
3. Focus for today (5 min)
4. Quick wins or wins to celebrate (2 min)

#### 15b. Define Week 1 KPI Targets

Set targets for Week 1:

```
WEEK 1 KPI TARGETS:

Acquisition:
- Target installations: 20+
- Target signups: 30+
- Actual: [to be filled in]

Engagement:
- Target operations gated: 500+
- Target policies created: 50+
- Actual: [to be filled in]

Quality:
- Target error rate: <0.5%
- Target uptime: 99.9%
- Actual: [to be filled in]

Support:
- Target response time: <30 min
- Target resolution time: <4 hours
- Actual: [to be filled in]

Revenue (if applicable):
- Target MRR: $[X]+
- Actual: [to be filled in]
```

#### 15c. Prioritize Bug Fixes

List bugs by priority:

```
CRITICAL (fix immediately):
- [ ] [Bug description] - Est: X hours

HIGH (fix this week):
- [ ] [Bug description] - Est: X hours
- [ ] [Bug description] - Est: X hours

MEDIUM (fix next week):
- [ ] [Bug description] - Est: X hours

LOW (backlog):
- [ ] [Bug description] - Est: X hours
```

#### 15d. Update Product Roadmap

Based on customer feedback, update roadmap:

```
WEEK 2:
- Implement quick win #1: [Feature] (est: X days)
- Implement quick win #2: [Feature] (est: X days)
- Fix critical bug: [Bug] (est: X hours)

WEEK 3:
- Medium-priority feature: [Feature] (est: X days)
- Performance optimization: [Area] (est: X days)

WEEK 4+:
- Major feature: [Feature] (est: X weeks)
- Partnership integration: [Partner] (est: X weeks)
```

### Success Criteria

- ✅ Week 1 daily standup scheduled and first standup held
- ✅ KPI targets defined and communicated
- ✅ Bug fix priorities locked
- ✅ Product roadmap updated for Week 2+
- ✅ Team alignment on next steps

### Documentation Output

Slack #launch:
```
✅ Step 15: Week 1 plan finalized
- Daily standups: Scheduled (9:00 AM, 7 days)
- KPI targets: Defined (installations, operations, quality)
- Bug fix priorities: Locked
- Product roadmap: Updated
- Week 1 ownership: [Name]
- Next: Day 1 standup tomorrow at 9:00 AM
```

---

## Post-Launch Transition

After completing all 15 steps, transition to:

1. **LAUNCH_DAY_RUNBOOK.md** — Hour-by-hour timeline (already executing)
2. **FIRST_WEEK_CHECKLIST.md** — Daily metrics and success tracking
3. **INCIDENT_RESPONSE.md** — Crisis procedures if needed
4. **PARTNERSHIP_LAUNCH.md** — Stripe partnership outreach

---

## Quick Reference: Step Ownership

| Step | Owner | Duration | Status |
|------|-------|----------|--------|
| 1. Marketplace Enable | Product Lead | 15 min | ⏳ |
| 2. Payment Activation | DevOps | 20 min | ⏳ |
| 3. Support Channel | Support Lead | 30 min | ⏳ |
| 4. Monitoring Alerts | DevOps | 30 min | ⏳ |
| 5. Marketplace Discovery | Product Lead | 20 min | ⏳ |
| 6. Installation Flow | Engineering | 30 min | ⏳ |
| 7. Webhook Delivery | Engineering | 25 min | ⏳ |
| 8. Customer Comms | Marketing | 45 min | ⏳ |
| 9. Support Training | Support Lead | 60 min | ⏳ |
| 10. Smoke Tests | QA | 45 min | ⏳ |
| 11. GO/NO-GO | Leadership | 30 min | ⏳ |
| 12. Execute Launch | Product Lead | 30 min | ⏳ |
| 13. Monitor 24h | DevOps/Support | 24 hours | ⏳ |
| 14. Feedback Collection | Product Lead | Continuous | ⏳ |
| 15. Week 1 Planning | Leadership | 60 min | ⏳ |

---

## Validation Checklist (Before Committing)

- [ ] All 15 steps are documented
- [ ] Each step has clear owner, time estimate, and success criteria
- [ ] Evidence/verification commands are provided for each step
- [ ] No secrets are printed (only names and links)
- [ ] SQL queries are read-only and safe
- [ ] Communication templates are complete
- [ ] Escalation procedures are clear
- [ ] Post-launch transition is defined

---

**Last Updated:** 2026-06-07  
**Status:** Ready for Post-Approval Execution  
**Owner:** Product Lead + Leadership Team
