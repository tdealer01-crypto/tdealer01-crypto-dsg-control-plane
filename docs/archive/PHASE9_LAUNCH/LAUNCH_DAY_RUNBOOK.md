# Phase 9: Launch Day Hour-by-Hour Timeline

**Status:** Critical Execution Path for Go-Live  
**Date:** After Stripe Approval (Phase 9 Days 43-49)  
**Owner:** DevOps, Product, Engineering, Marketing, Support  
**Duration:** 72 hours (Day -2 to Day +1)

---

## Overview

This document provides an **exact timeline** for launch day execution. Every hour is mapped with specific actions, owners, and success criteria.

**Key Principle:** Predictability. Nothing surprises us. Every team member knows exactly what they're doing and when.

---

## T-48 Hours: Final Pre-Flight Checklist

**Time Window:** 48 hours before marketplace activation  
**Owner:** Engineering Lead + DevOps

### Morning: Code & Build Verification

**T-48:00 — Code Verification (30 min)**
```bash
# Engineering Lead
git log --oneline -10 main | head -10
git diff origin/main...HEAD  # Should be empty (no pending changes)
npm run typecheck              # 0 errors expected
```

**Success Criteria:**
- ✅ All Phase 9 code merged to main
- ✅ No pending commits
- ✅ Zero TypeScript errors
- ✅ Latest commit is Phase 9 final

**Output:** Slack message to #launch channel: "✅ Code verification passed"

---

**T-47:30 — Build Test (45 min)**
```bash
# In CI/CD or local
npm ci
npm run build
npm run test:unit
npm run test:integration
```

**Success Criteria:**
- ✅ Next.js build completes (no errors)
- ✅ All tests pass or marked as expected failures
- ✅ Build artifacts are valid
- ✅ No security warnings (npm audit)

**Output:** Slack thread: Build log snippet + ✅ passed

---

### Afternoon: Environment & Database Verification

**T-46:00 — Staging Deployment Check (30 min)**
```bash
# DevOps
curl -fsSL https://staging.yourapp.com/api/health
curl -fsSL https://staging.yourapp.com/api/agent/status
# Verify recent logs in Vercel dashboard
```

**Success Criteria:**
- ✅ Staging is "Ready" (green) in Vercel dashboard
- ✅ Health check returns `{"status":"ok","database":"connected"}`
- ✅ Agent status shows correct version
- ✅ No error logs in last 1 hour

**Output:** Vercel link + health check screenshot to Slack

---

**T-45:00 — Supabase Capacity Check (30 min)**
```sql
-- Run in Supabase SQL Editor
SELECT
  (SELECT COUNT(*) FROM stripe_merchants) as merchant_count,
  (SELECT COUNT(*) FROM stripe_operations) as operation_count,
  (SELECT COUNT(*) FROM runtime_intents) as intent_count,
  (SELECT SUM(pg_total_relation_size(schemaname||'.'||tablename))/1024/1024 
   FROM pg_tables WHERE schemaname='public') as db_size_mb;

-- Check connections
SELECT count(*) as active_connections FROM pg_stat_activity;
```

**Success Criteria:**
- ✅ Database size < 100MB (you have 500GB)
- ✅ Active connections < 10
- ✅ All required tables exist
- ✅ No locks or slow queries

**Output:** Query results screenshot to #launch

---

**T-44:00 — Environment Variables Audit (15 min)**

**Verification Checklist (verify names only, never values):**

Staging (`staging.yourapp.com`):
- [ ] `NEXT_PUBLIC_STRIPE_CLIENT_ID` - set
- [ ] `STRIPE_SECRET_KEY` - set
- [ ] `STRIPE_WEBHOOK_SECRET` - set
- [ ] `SUPABASE_URL` - set
- [ ] `SUPABASE_ANON_KEY` - set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - set
- [ ] `STRIPE_APP_ID` - set
- [ ] `CRON_SECRET` - set

Production (`tdealer01-crypto-dsg-control-plane.vercel.app`):
- [ ] All above variables set
- [ ] Production-specific secrets set
- [ ] Database pointing to production Supabase

**Output:** Slack: "✅ Environment variables verified (names only, values not printed)"

---

**T-43:00 — Marketplace Configuration Review (30 min)**

**In Stripe Dashboard:**
1. Navigate to **Apps & Integrations** → **Your App**
2. Verify these details are production-ready:
   - [ ] App name: "DSG Governance Gate"
   - [ ] Category: "Risk Management & Compliance"
   - [ ] App icon: High-res (256x256 or larger)
   - [ ] Short description: Accurate, marketing-ready
   - [ ] Long description: Complete with features, pricing, links
   - [ ] Screenshots: 3-5 high-quality images
   - [ ] Support email: monitored daily
   - [ ] Terms of Service URL: Valid, links to real page
   - [ ] Privacy Policy URL: Valid, links to real page
   - [ ] Required scopes: `read_write` for charges/payouts/refunds

**Output:** Checklist screenshot + approval from Product Lead

---

### Evening: Final Dry Run

**T-42:00 — Dry Run (2 hours)**

**Simulate the entire launch sequence (without going live):**

1. **OAuth Flow Test (20 min)**
   - Use test Stripe account
   - Click "Connect" on marketplace listing
   - Complete OAuth flow
   - Verify redirect to your app works
   - Check test merchant appears in dashboard

2. **First Policy Test (20 min)**
   - Create test policy: "Block all refunds > $100"
   - Create test charge: $150
   - Verify policy blocks the charge
   - Review audit trail in dashboard

3. **Webhook Test (20 min)**
   - Trigger test webhook from Stripe Dashboard
   - Verify webhook is received and processed
   - Check database record is created

4. **Support Email Test (20 min)**
   - Send test email to support address
   - Verify it arrives in ticketing system
   - Respond with test response
   - Confirm response is sent back

**Success Criteria:**
- ✅ All 4 flow tests pass
- ✅ No errors in application logs
- ✅ Data appears correctly in Supabase
- ✅ Support email flow works end-to-end

**Output:** Dry run report to #launch channel

---

## T-24 Hours: Team Standup & Final Checks

**Time Window:** 24 hours before going live

**Meeting:** 9:00 AM (1 hour)

**Attendees:**
- Engineering Lead
- DevOps Lead
- Product Lead
- Marketing Lead
- Support Lead
- CEO/Founder

**Agenda (60 min):**

1. **Status Review (10 min)**
   - Engineering: "Code is locked, all tests pass"
   - DevOps: "Staging is ready, capacity is good"
   - Product: "Marketplace listing is complete"
   - Marketing: "Announcement emails drafted"
   - Support: "Team is briefed and ready"

2. **Risk Assessment (10 min)**
   - Any concerns or red flags?
   - Have we missed anything?
   - Is anyone NOT ready?

3. **Go/No-Go Decision (5 min)**
   - Team votes: Ready to launch tomorrow?
   - If any "No," discuss blocker
   - Default decision: GO (unless blocker exists)

4. **Final Checklist (20 min)**
   - Walk through launch day timeline together
   - Assign owners for each T-hour window
   - Review escalation procedures
   - Discuss communication plan

5. **Celebration (15 min)**
   - Acknowledge the work that got us here
   - Set expectations for next 24-72 hours
   - Remind team: We launch together

**Output:** Slack message: "✅ Team standup complete. GO decision made. Launching tomorrow at [TIME]"

---

## T-2 Hours: Pre-Launch Huddle

**Time Window:** 2 hours before marketplace activation

**Meeting:** 30 minutes, 2 hours before launch

**Attendees:**
- Engineering (on call)
- DevOps (on call)
- Product Lead
- Marketing Lead
- Support Lead

**Checklist (20 min):**
```
[ ] Vercel production deployment: Ready
[ ] Supabase production database: Healthy (capacity check)
[ ] Stripe API keys working (test call to /api/stripe-webhook)
[ ] Monitoring alerts enabled (Vercel + Slack)
[ ] Support email is being monitored
[ ] Team messaging tools ready (Slack, Discord)
[ ] Announcement email drafted (ready to send)
[ ] Blog post staged (ready to publish)
[ ] Twitter/LinkedIn posts scheduled (ready to publish)
```

**Final Questions (10 min):**
- "Does anyone see a reason NOT to launch?"
- "Are we confident in our production state?"
- "Is support team ready for customer inquiries?"

**Output:** Slack: "✅ Pre-launch huddle complete. Ready for T-0."

---

## T-0: Go-Live (Launch)

**Time Window:** 30 minutes at the exact launch moment

### T-0:00 — Marketplace Activation (10 min)

**Owner:** Product Lead (or DevOps Lead)

**Steps:**
1. Log in to Stripe Dashboard
2. Navigate to **Apps & Integrations** → **Your App**
3. Click **Enable in Marketplace** or **Publish** button
4. Confirm the action
5. Wait for status to change to "Published" or "Live"

**Success Criteria:**
- ✅ Status in Stripe Dashboard is "Published"
- ✅ Marketplace URL is active

**Verification:**
```bash
# After clicking publish, verify in marketplace (may take 1-5 min)
curl -s https://marketplace.stripe.com/ | grep "DSG Governance Gate"
# Or manually check in incognito browser
```

**Output:** Slack #launch: "🚀 T-0:00 — APP LIVE IN MARKETPLACE!"

---

### T-0:10 — Send Announcement Email (5 min)

**Owner:** Marketing Lead

**Action:**
1. Open email tool (Gmail, Mailchimp, etc.)
2. Send pre-drafted launch email to early access customers
3. Copy all recipients to Slack channel as confirmation

**Template (from PHASE9_POST_APPROVAL_SETUP.md):**

```
Subject: 🚀 DSG Governance Gate is Now Available in Stripe Marketplace

Hi [CUSTOMER_NAME],

We're excited to announce that DSG Governance Gate is now live in the 
Stripe App Marketplace!

INSTALL: https://marketplace.stripe.com/apps/[YOUR_APP_SLUG]
DOCS: https://yourcompany.com/docs
SUPPORT: support@yourcompany.com

Welcome to governed AI operations!
```

**Output:** Slack: "✅ Launch email sent to [X] customers"

---

### T-0:15 — Publish Blog & Social Posts (5 min)

**Owner:** Marketing Lead

**Actions:**
1. Publish blog post to company website
2. Publish Twitter thread
3. Publish LinkedIn article
4. Tag Stripe and relevant communities

**Examples:**

Blog: `https://yourcompany.com/blog/dsg-governance-gate-launched`

Twitter (thread):
```
🧵 We're launching in the Stripe App Marketplace! 🚀

After 6 months of building and careful review, DSG Governance Gate 
is now officially live.

Install now: https://marketplace.stripe.com/apps/dsg-governance-gate
Learn more: https://yourcompany.com
```

LinkedIn:
```
Excited to announce that DSG Governance Gate is now available in 
the Stripe App Marketplace!

For 6 months, our team has built the governance layer that Stripe 
merchants need for AI-driven operations...

[Read full article with link]
```

**Output:** Slack with links to blog, Twitter, LinkedIn posts

---

### T-0:20 — Activate Monitoring Dashboard (5 min)

**Owner:** DevOps Lead

**Actions:**
1. Open Vercel Analytics dashboard for production
2. Open Supabase Reports dashboard for production
3. Open Slack channel #incidents (pin it)
4. Open PagerDuty or on-call rotation (verify alert routing)

**Verify These Metrics Are Tracking:**
- `/api/stripe-callback` requests (OAuth completions)
- `/api/stripe-webhook` requests (webhook deliveries)
- `/api/execute` requests (gating operations)
- Error rate (5xx responses)
- API latency (p50, p95, p99)

**Set Up Alerts:**
- [ ] Error rate > 1% = Slack alert + page engineer
- [ ] Latency p99 > 1000ms = Slack alert
- [ ] Webhook failures > 10/hour = Slack alert

**Output:** Slack: "✅ Monitoring active. All dashboards live."

---

## T+1 Hour: First Customer Health Check

**Time Window:** 1 hour after going live

**Owner:** Support Lead + Engineering

**Actions:**

1. **Check for First Installations (15 min)**
   ```sql
   -- In Supabase
   SELECT COUNT(*) as installations_count 
   FROM stripe_merchants 
   WHERE created_at >= NOW() - INTERVAL '1 hour';
   ```
   - Expected: At least 1-3 new installations
   - If 0: Check if marketplace is live (may still be indexing)

2. **Monitor Application Logs (10 min)**
   - Vercel dashboard: Logs tab
   - Look for any errors or warnings
   - Check for slow API calls

3. **Test First Customer Flow (20 min)**
   - If customers have installed, pick one (or use test account)
   - Verify they can create a policy
   - Verify a test charge flows through the gate
   - Check audit trail is recording

4. **Support Inbox Check (15 min)**
   - Check support email and ticketing system
   - Respond to any urgent questions within 15 minutes
   - Escalate critical issues to engineering immediately

**Output:** Slack #launch: "✅ T+1:00 — First hour health check passed. [X] installations. 0 critical issues."

---

## T+4 Hours: First Customer Check-In

**Time Window:** 4 hours after going live

**Owner:** Customer Success Lead

**Actions:**

1. **Proactive Customer Outreach (30 min)**
   - Message first 5 customers who installed
   - "Welcome to DSG! Any questions or feedback?"
   - Offer 15-minute onboarding call if they need help

2. **Marketplace Verification (15 min)**
   - Search for app in incognito browser
   - Verify listing displays correctly
   - Click install button to verify it works
   - Check for any typos or rendering issues

3. **Support Metrics Review (15 min)**
   - Count total support tickets/emails received
   - Categorize: onboarding questions vs bugs vs feature requests
   - Response time: Should be <30 minutes average

4. **Engineering Standup (20 min)**
   - Quick check: Any issues reported?
   - Any performance concerns?
   - Any unexpected patterns in logs?

**Success Criteria:**
- ✅ 5+ new customers installed
- ✅ 0 critical bugs reported
- ✅ Support response time < 30 minutes
- ✅ No unexpected error spikes

**Output:** Slack #launch: "✅ T+4:00 — Early adoption metrics healthy. Customer feedback positive."

---

## T+24 Hours: Post-Launch Review

**Time Window:** 24 hours after going live

**Meeting:** 9:00 AM next day (60 min)

**Attendees:**
- Engineering Lead
- DevOps Lead
- Product Lead
- Marketing Lead
- Support Lead
- CEO/Founder

**Agenda:**

1. **Metrics Summary (20 min)**
   - Total installations (Target: 5+)
   - Operations processed (Target: 50+)
   - Support tickets (Target: <10)
   - Error rate (Target: <1%)
   - Latency p99 (Target: <500ms)

2. **Customer Feedback (15 min)**
   - What did customers love?
   - What confused them?
   - Any feature requests?
   - Any bugs to fix?

3. **Incident Review (10 min)**
   - Did any incidents occur?
   - How quickly were they resolved?
   - What did we learn?

4. **Support Readiness (10 min)**
   - Is support team handling load?
   - Are response times acceptable?
   - Any escalations?

5. **Next 7 Days Plan (5 min)**
   - Focus areas for Week 1
   - Daily standups (same time, same channel)
   - Key milestones

**Output:** Email to leadership with post-launch metrics report

**Report Template:**
```
DSG GOVERNANCE GATE — LAUNCH DAY REPORT

Installation Metrics:
- New installations (24h): 8
- Total signups: 12
- Active merchants: 6

Operations Processed:
- Charges gated: 127
- Refunds gated: 34
- Payouts gated: 8

Quality Metrics:
- Error rate: 0.2%
- Uptime: 100%
- Avg. response time: 185ms

Support:
- Tickets received: 7
- Avg. response time: 22 minutes
- Issues resolved: 6
- Issues pending: 1

Customer Feedback:
- Onboarding was smooth
- Policy creation UI is clear
- Audit trail is impressive
- Feature request: Custom webhooks

Incidents:
- 0 critical incidents
- 0 downtime

Next Steps:
- Daily standups through Day 7
- Monitor installation growth
- Iterate on customer feedback
- Publish first case study (Week 2)
```

---

## T+7 Days: Week 1 Retrospective

**Time Window:** End of first week after launch

**Meeting:** Friday 4:00 PM (90 min)

**Attendees:**
- Full launch team
- Engineering team
- Customer success team
- Marketing team

**Retrospective Format:**

**Part 1: Data Review (30 min)**

Metrics to review:
```
Week 1 Installation Metrics:
- Total new installations: [X]
- Retention rate: [X]%
- Churn rate: [X]%
- Active daily users: [X]

Week 1 Operations:
- Total operations gated: [X]
- Avg. operations per customer: [X]
- Most used policy type: [X]
- Block rate: [X]%

Week 1 Quality:
- Total errors: [X]
- Avg. error rate: [X]%
- Total downtime: [X] minutes
- P99 latency trend: [increasing/stable/decreasing]

Week 1 Support:
- Total tickets: [X]
- Avg. resolution time: [X] minutes
- Escalations to engineering: [X]
- Feature requests captured: [X]

Week 1 Revenue:
- Free signups: [X]
- Paid signups: [X]
- MRR (first week): $[X]
```

**Part 2: What Went Well (20 min)**

Team discussion:
- "What surprised us in a good way?"
- "Which feature resonated most with customers?"
- "Which process worked perfectly?"

**Examples:**
- OAuth flow had 0 issues
- Audit trail impressed customers
- Support team response was fast
- Marketing announcement got X shares

**Part 3: What Was Challenging (20 min)**

Team discussion:
- "What was harder than expected?"
- "Where did we stumble?"
- "What would we do differently?"

**Examples:**
- Onboarding docs could be clearer
- Policy creation needs better defaults
- Support team was understaffed on Day 2
- Marketing reach was lower than expected

**Part 4: Lessons Learned (10 min)**

Document:
- 3-5 key insights from Week 1
- Action items for Week 2
- Changes to support playbook
- Product improvements to prioritize

**Part 5: Week 2+ Planning (10 min)**

Decisions:
- Do we increase marketing spend?
- Do we hire more support staff?
- What features do we build next?
- What partnerships do we pursue?

**Output:** Retrospective notes document + Week 2 action plan

---

## Launch Day Success Checklist

Use this checklist to track the entire launch timeline:

### T-48 Hours
- [ ] Code verification passed (git, typecheck)
- [ ] Build test passed (next build, tests)
- [ ] Staging deployment is "Ready"
- [ ] Supabase capacity verified (size, connections)
- [ ] Environment variables verified (names only)
- [ ] Marketplace listing configuration reviewed
- [ ] Dry run completed (all 4 flows tested)

### T-24 Hours
- [ ] Team standup held (9:00 AM)
- [ ] Go/No-Go decision made (GO)
- [ ] All team members confirmed ready
- [ ] Launch day timeline reviewed with team
- [ ] Escalation procedures reviewed

### T-2 Hours
- [ ] Pre-launch huddle held
- [ ] Production deployment verified
- [ ] All monitoring alerts enabled
- [ ] Support email monitored
- [ ] Announcement materials ready
- [ ] Final GO decision confirmed

### T-0 (Launch Moment)
- [ ] Marketplace activation clicked (T-0:00)
- [ ] Status change to "Published" verified
- [ ] Announcement email sent (T-0:10)
- [ ] Blog and social posts published (T-0:15)
- [ ] Monitoring dashboards active (T-0:20)

### T+1 Hour
- [ ] First installations detected
- [ ] Application logs reviewed (0 critical errors)
- [ ] First customer flow tested
- [ ] Support inbox checked

### T+4 Hours
- [ ] Early customers contacted (5+)
- [ ] Marketplace listing verified visually
- [ ] Support metrics reviewed
- [ ] Engineering standup held

### T+24 Hours
- [ ] Post-launch review meeting held
- [ ] Metrics report completed
- [ ] Customer feedback documented
- [ ] Incident review completed
- [ ] Week 1 plan finalized

### T+7 Days
- [ ] Retrospective meeting held
- [ ] Week 1 metrics summarized
- [ ] Lessons learned documented
- [ ] Week 2+ action plan created

---

## Escalation Path

**If something goes wrong during launch:**

### Critical (T-0 to T+4): Error Rate > 5% or Complete Downtime

**Action:**
1. Page on-call engineer immediately
2. Slack: Post in #incidents channel with alert
3. Engineering lead initiates incident response
4. VP Engineering informed within 5 minutes
5. If not resolved in 15 minutes: Rollback or disable new app

**Owner:** VP Engineering

### Urgent (T-0 to T+24): Error Rate > 1% or P99 Latency > 2000ms

**Action:**
1. Alert engineering team (Slack #platform)
2. Engineering lead diagnoses within 15 minutes
3. If data issue: Database rollback
4. If code issue: Deploy hotfix within 1 hour
5. If still not resolved: Disable new features (keep basic API alive)

**Owner:** Engineering Lead

### High (T+0 to T+72): New Customer Issue or Bug Report

**Action:**
1. Support team documents issue
2. Engineering triage within 1 hour
3. If critical for customer: Fast-track fix
4. If feature request: Log for Week 2+
5. Keep customer updated every 2 hours

**Owner:** Support Lead + Engineering

---

## Key Contacts (For Troubleshooting)

**Stripe Support**
- URL: https://support.stripe.com/
- Category: "App Marketplace"
- Response: Usually 24-48 hours
- Emergency: Contact your Stripe account manager directly

**Your Company On-Call**
- Engineering: [Slack handle or phone]
- DevOps: [Slack handle or phone]
- Support: [Email and Slack handle]
- CEO: [Phone number for escalation]

---

## Key Metrics Dashboard Links

**Vercel Analytics:**
- Production: https://vercel.com/[your-org]/[your-project]/analytics
- Look for: Error rate, latency, requests

**Supabase Monitoring:**
- Production: https://app.supabase.com/project/[your-id]/reports
- Look for: Database size, connections, query performance

**Slack Alerts:**
- Channel: #incidents (for critical alerts)
- Channel: #platform (for engineering alerts)
- Channel: #launch (for launch team updates)

---

## Post-Launch: What's Next

After the 72-hour launch window, transition to:

1. **PHASE9_SUCCESS_METRICS.md** — Daily/weekly KPI tracking
2. **PHASE9_SUPPORT_PLAYBOOK.md** — Ongoing support operations
3. **PHASE9_PARTNERSHIP.md** — Partnership outreach
4. **PHASE9_CUSTOMER_SUCCESS/** — Ongoing customer onboarding
5. **Product Roadmap** — Feature prioritization based on customer feedback

---

**Last Updated:** 2026-06-07  
**Status:** Ready for Launch Execution  
**Owner:** Launch Team Lead
